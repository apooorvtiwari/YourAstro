-- ============================================================================
-- AstroTalk MVP — Initial Schema
-- Run this in Supabase SQL Editor (or via CLI migration) on a fresh project.
-- ============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- PROFILES
-- One row per authenticated user. Role determines customer vs astrologer.
-- ----------------------------------------------------------------------------
create type user_role as enum ('customer', 'astrologer');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ASTROLOGER PROFILES
-- Extra fields only astrologers need. 1:1 with profiles where role='astrologer'.
-- ----------------------------------------------------------------------------
create table astrologer_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  bio text,
  specializations text[] not null default '{}',
  languages text[] not null default '{}',
  experience_years integer not null default 0,
  per_minute_rate numeric(10,2) not null default 10.00 check (per_minute_rate > 0),
  is_online boolean not null default false,
  is_approved boolean not null default false, -- manually flip true in table editor for MVP
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- WALLETS
-- One wallet per customer. Balance in smallest currency unit is avoided here —
-- we store as numeric rupees for simplicity at MVP stage.
-- ----------------------------------------------------------------------------
create table wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  balance numeric(10,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- WALLET TRANSACTIONS
-- Immutable ledger. Every balance change must insert a row here.
-- ----------------------------------------------------------------------------
create type wallet_txn_type as enum ('recharge', 'chat_deduction', 'refund', 'astrologer_earning');

create table wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  type wallet_txn_type not null,
  amount numeric(10,2) not null, -- positive = credit, negative = debit
  balance_after numeric(10,2) not null,
  chat_session_id uuid, -- nullable FK added after chat_sessions table exists
  razorpay_payment_id text,
  razorpay_order_id text,
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- CHAT SESSIONS
-- One row per consultation. Tracks timing for billing.
-- ----------------------------------------------------------------------------
create type chat_session_status as enum ('requested', 'active', 'ended', 'rejected', 'cancelled');

create table chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id) on delete cascade,
  astrologer_id uuid not null references profiles(id) on delete cascade,
  status chat_session_status not null default 'requested',
  per_minute_rate numeric(10,2) not null, -- snapshot of rate at session start
  started_at timestamptz,
  ended_at timestamptz,
  total_minutes numeric(10,2) not null default 0,
  total_charged numeric(10,2) not null default 0,
  ended_reason text, -- 'customer_ended' | 'astrologer_ended' | 'low_balance' | 'astrologer_offline'
  created_at timestamptz not null default now()
);

alter table wallet_transactions
  add constraint wallet_transactions_chat_session_fk
  foreign key (chat_session_id) references chat_sessions(id) on delete set null;

-- ----------------------------------------------------------------------------
-- CHAT MESSAGES
-- ----------------------------------------------------------------------------
create table chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- REVIEWS
-- ----------------------------------------------------------------------------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null unique references chat_sessions(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  astrologer_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RAZORPAY ORDERS
-- Tracks orders created server-side (Edge Function) before payment completes.
-- ----------------------------------------------------------------------------
create table razorpay_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  razorpay_order_id text not null unique,
  amount numeric(10,2) not null,
  status text not null default 'created', -- created | paid | failed
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index idx_astrologer_profiles_online on astrologer_profiles(is_online) where is_online = true;
create index idx_chat_sessions_customer on chat_sessions(customer_id);
create index idx_chat_sessions_astrologer on chat_sessions(astrologer_id);
create index idx_chat_sessions_status on chat_sessions(status);
create index idx_chat_messages_session on chat_messages(session_id, created_at);
create index idx_wallet_transactions_wallet on wallet_transactions(wallet_id, created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger trg_astrologer_profiles_updated_at before update on astrologer_profiles
  for each row execute function set_updated_at();

create trigger trg_wallets_updated_at before update on wallets
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-create profile + wallet on signup
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
declare
  v_role user_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer');

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    v_role
  );

  insert into public.wallets (user_id, balance)
  values (new.id, 0);

  -- Astrologers additionally need an astrologer_profiles row so the
  -- dashboard (online toggle, rate, requests) has something to read/write.
  -- Starts unapproved — flip is_approved manually in Table Editor for MVP.
  if v_role = 'astrologer' then
    insert into public.astrologer_profiles (id)
    values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
