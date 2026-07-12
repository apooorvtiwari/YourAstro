-- ============================================================================
-- AstroTalk MVP — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================================

alter table profiles enable row level security;
alter table astrologer_profiles enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table reviews enable row level security;
alter table razorpay_orders enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- Anyone authenticated can view profiles (needed to see astrologer names etc).
-- Users can only update their own profile.
-- ----------------------------------------------------------------------------
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ASTROLOGER PROFILES
-- Publicly viewable (browsing astrologers). Only the astrologer can edit own.
-- ----------------------------------------------------------------------------
create policy "Astrologer profiles are viewable by authenticated users"
  on astrologer_profiles for select
  to authenticated
  using (true);

create policy "Astrologers can update own profile"
  on astrologer_profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Astrologers can insert own profile"
  on astrologer_profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- WALLETS
-- Users can only see and never directly modify their own wallet.
-- All balance changes happen via Edge Functions using the service role key,
-- which bypasses RLS — so there is NO client-side update policy here.
-- ----------------------------------------------------------------------------
create policy "Users can view own wallet"
  on wallets for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies for regular users — wallet mutations
-- happen exclusively through Edge Functions (service role bypasses RLS).

-- ----------------------------------------------------------------------------
-- WALLET TRANSACTIONS
-- Users can view their own transaction history only.
-- ----------------------------------------------------------------------------
create policy "Users can view own wallet transactions"
  on wallet_transactions for select
  to authenticated
  using (
    wallet_id in (select id from wallets where user_id = auth.uid())
  );

-- No client-side insert — Edge Functions only.

-- ----------------------------------------------------------------------------
-- CHAT SESSIONS
-- Visible to the two participants only.
-- ----------------------------------------------------------------------------
create policy "Participants can view own chat sessions"
  on chat_sessions for select
  to authenticated
  using (auth.uid() = customer_id or auth.uid() = astrologer_id);

create policy "Customers can create chat sessions"
  on chat_sessions for insert
  to authenticated
  with check (auth.uid() = customer_id);

create policy "Participants can update own chat sessions"
  on chat_sessions for update
  to authenticated
  using (auth.uid() = customer_id or auth.uid() = astrologer_id);

-- ----------------------------------------------------------------------------
-- CHAT MESSAGES
-- Visible only to participants of the parent session.
-- ----------------------------------------------------------------------------
create policy "Participants can view messages in own sessions"
  on chat_messages for select
  to authenticated
  using (
    session_id in (
      select id from chat_sessions
      where customer_id = auth.uid() or astrologer_id = auth.uid()
    )
  );

create policy "Participants can send messages in own sessions"
  on chat_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and session_id in (
      select id from chat_sessions
      where (customer_id = auth.uid() or astrologer_id = auth.uid())
      and status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- REVIEWS
-- Publicly viewable (shown on astrologer profile). Only the customer of that
-- session can create a review, once.
-- ----------------------------------------------------------------------------
create policy "Reviews are viewable by authenticated users"
  on reviews for select
  to authenticated
  using (true);

create policy "Customers can review own completed sessions"
  on reviews for insert
  to authenticated
  with check (
    auth.uid() = customer_id
    and session_id in (
      select id from chat_sessions
      where customer_id = auth.uid() and status = 'ended'
    )
  );

-- ----------------------------------------------------------------------------
-- RAZORPAY ORDERS
-- Users can view their own orders. Creation/update happens via Edge Function.
-- ----------------------------------------------------------------------------
create policy "Users can view own razorpay orders"
  on razorpay_orders for select
  to authenticated
  using (auth.uid() = user_id);
