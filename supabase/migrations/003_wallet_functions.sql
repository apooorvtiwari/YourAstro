-- ============================================================================
-- AstroTalk MVP — Wallet & Billing Functions
-- Run AFTER 002_rls_policies.sql
--
-- These are SECURITY DEFINER functions callable via RPC from Edge Functions
-- (using service role) or, where explicitly safe, from authenticated clients.
-- They ensure balance changes and ledger entries happen atomically.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- credit_wallet: adds funds after a verified Razorpay payment.
-- Must only ever be called from the razorpay-verify-payment Edge Function
-- (service role), never directly from the client.
-- ----------------------------------------------------------------------------
create or replace function credit_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet wallets%rowtype;
  v_txn wallet_transactions%rowtype;
begin
  if p_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  select * into v_wallet from wallets where user_id = p_user_id for update;

  if not found then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;

  update wallets
  set balance = balance + p_amount
  where user_id = p_user_id
  returning * into v_wallet;

  insert into wallet_transactions (
    wallet_id, type, amount, balance_after, razorpay_order_id, razorpay_payment_id, notes
  ) values (
    v_wallet.id, 'recharge', p_amount, v_wallet.balance, p_razorpay_order_id, p_razorpay_payment_id, 'Wallet recharge via Razorpay'
  )
  returning * into v_txn;

  return v_txn;
end;
$$;

-- ----------------------------------------------------------------------------
-- deduct_for_chat_minute: deducts one minute's worth of chat cost.
-- Called repeatedly (e.g. every 60s) while a session is active, server-side
-- (Edge Function on a schedule, or a trusted server call) — NOT directly
-- exposed to the client, since the client could otherwise under-report time.
--
-- Returns the updated wallet balance so the caller can decide whether to
-- end the session (insufficient funds).
-- ----------------------------------------------------------------------------
create or replace function deduct_for_chat_minute(
  p_session_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session chat_sessions%rowtype;
  v_wallet wallets%rowtype;
  v_new_balance numeric;
begin
  select * into v_session from chat_sessions where id = p_session_id for update;

  if not found or v_session.status != 'active' then
    raise exception 'Session % is not active', p_session_id;
  end if;

  select * into v_wallet from wallets where user_id = v_session.customer_id for update;

  if not found then
    raise exception 'Wallet not found for customer %', v_session.customer_id;
  end if;

  v_new_balance := v_wallet.balance - v_session.per_minute_rate;

  update wallets
  set balance = greatest(v_new_balance, 0)
  where user_id = v_session.customer_id;

  insert into wallet_transactions (
    wallet_id, type, amount, balance_after, chat_session_id, notes
  ) values (
    v_wallet.id, 'chat_deduction', -v_session.per_minute_rate, greatest(v_new_balance, 0), p_session_id, 'Per-minute chat charge'
  );

  update chat_sessions
  set total_minutes = total_minutes + 1,
      total_charged = total_charged + v_session.per_minute_rate
  where id = p_session_id;

  return v_new_balance;
end;
$$;

-- ----------------------------------------------------------------------------
-- end_chat_session: finalizes a session (sets ended_at, status).
-- Safe to call from an authenticated participant of the session.
-- ----------------------------------------------------------------------------
create or replace function end_chat_session(
  p_session_id uuid,
  p_reason text
)
returns chat_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session chat_sessions%rowtype;
begin
  select * into v_session from chat_sessions where id = p_session_id for update;

  if not found then
    raise exception 'Session % not found', p_session_id;
  end if;

  if auth.uid() != v_session.customer_id and auth.uid() != v_session.astrologer_id then
    raise exception 'Not authorized to end this session';
  end if;

  update chat_sessions
  set status = 'ended',
      ended_at = now(),
      ended_reason = p_reason
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

grant execute on function end_chat_session(uuid, text) to authenticated;
-- credit_wallet and deduct_for_chat_minute are intentionally NOT granted to
-- 'authenticated' — they must only be called with the service role key from
-- Edge Functions, so client apps can never call them directly.
