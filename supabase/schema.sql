-- ==========================================
-- SNS Content Generator - Database Schema
-- Run this in Supabase SQL Editor
-- ==========================================

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = user_id);

-- Credit Wallets
create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz default now()
);

alter table public.credit_wallets enable row level security;
create policy "Users can read own wallet" on public.credit_wallets
  for select using (auth.uid() = user_id);

-- Credit Ledger (immutable log)
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref_id text,
  created_at timestamptz default now()
);

alter table public.credit_ledger enable row level security;
create policy "Users can read own ledger" on public.credit_ledger
  for select using (auth.uid() = user_id);

create index idx_credit_ledger_user on public.credit_ledger(user_id, created_at desc);

-- Payment Orders
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text unique not null,
  credits integer not null,
  amount integer not null,
  currency text not null default 'jpy',
  status text not null default 'pending',
  created_at timestamptz default now()
);

alter table public.payment_orders enable row level security;
create policy "Users can read own orders" on public.payment_orders
  for select using (auth.uid() = user_id);

-- Usage Logs
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  credit_cost integer not null,
  request_id text,
  created_at timestamptz default now()
);

alter table public.usage_logs enable row level security;
create policy "Users can read own usage" on public.usage_logs
  for select using (auth.uid() = user_id);

create index idx_usage_logs_user on public.usage_logs(user_id, created_at desc);

-- ==========================================
-- Function: Auto-create profile + wallet on signup
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);

  insert into public.credit_wallets (user_id, balance)
  values (new.id, 10);  -- 初回10クレジット付与

  insert into public.credit_ledger (user_id, delta, reason)
  values (new.id, 10, 'signup_bonus');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================
-- RPC: Consume credits atomically
-- ==========================================
create or replace function public.consume_credits(
  p_user_id uuid,
  p_cost integer,
  p_reason text,
  p_ref_id text default null
)
returns integer as $$
declare
  new_balance integer;
begin
  update public.credit_wallets
  set balance = balance - p_cost, updated_at = now()
  where user_id = p_user_id
  returning balance into new_balance;

  if not found then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (p_user_id, -p_cost, p_reason, p_ref_id);

  insert into public.usage_logs (user_id, action_type, credit_cost, request_id)
  values (p_user_id, p_reason, p_cost, p_ref_id);

  return new_balance;
end;
$$ language plpgsql security definer;

-- ==========================================
-- RPC: Add credits atomically
-- ==========================================
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_id text default null
)
returns integer as $$
declare
  new_balance integer;
begin
  update public.credit_wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id
  returning balance into new_balance;

  if not found then
    -- Create wallet if missing
    insert into public.credit_wallets (user_id, balance)
    values (p_user_id, p_amount)
    returning balance into new_balance;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (p_user_id, p_amount, p_reason, p_ref_id);

  return new_balance;
end;
$$ language plpgsql security definer;
