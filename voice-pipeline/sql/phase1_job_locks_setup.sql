-- =========================================================
-- スマホ司令塔プロジェクト Phase 1 タスク 1
-- job_locks テーブル & 排他制御関数群セットアップ SQL
-- =========================================================
--
-- 目的:
--   Routine 実行時の排他制御（同一 scope に対する二重実行防止）を
--   Supabase 上の PostgreSQL テーブル + 関数で実現する。
--
-- 実行手順:
--   1. Supabase Dashboard > SQL Editor を開く
--   2. 新規 Query を作成
--   3. このファイルの全内容を貼り付ける
--   4. Run を押す
--   5. エラーが出なければ末尾のサンプルクエリで動作確認
--
-- 注意事項:
--   - 2 回以上実行しても安全（冪等性を担保済み）
--   - service_role key のみアクセス可能（anon / authenticated は拒否）
--   - TTL デフォルトは 1800 秒（30 分）= _common.md の max_duration と一致
--   - pg_cron で 5 分毎に期限切れロックを自動クリーンアップ
--
-- 生成日時: 2026-04-18
-- 生成者: Claude Code (Phase 1 タスク 1)
-- =========================================================


-- =========================================================
-- 1. 拡張機能の有効化
-- =========================================================

create extension if not exists pg_cron;


-- =========================================================
-- 2. テーブル作成
-- =========================================================

-- scope 単位で排他ロックを管理するテーブル。
-- scope は "{対象種別}:{識別子}" 形式の文字列で、粒度は呼び出し側が制御する。
-- 例: "repo:raioniik-crypto/-"
--      "routine:code_review:repo:raioniik-crypto/-:branch:main"
-- unique(scope) 制約により、同一 scope に対して同時に 1 ロックのみ許可される。
-- Routine 名を scope 文字列に含めることで、同一リポジトリでも
-- 異なる Routine が別 scope として同時実行可能になる。

create table if not exists public.job_locks (
  id uuid primary key default gen_random_uuid(),
  routine_name text not null,
  scope text not null,
  job_id text not null,
  worker_id text not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint job_locks_unique_active unique (scope)
);

comment on table public.job_locks is
  'Routine 排他制御テーブル。scope 単位で同時に 1 ロックのみ許可し、二重実行を防止する。TTL 付きで期限切れは自動クリーンアップされる。';

comment on column public.job_locks.id is 'ロックの一意識別子 (UUID v4 自動生成)';
comment on column public.job_locks.routine_name is 'Routine 名 (例: code_review, claude_implementation)';
comment on column public.job_locks.scope is '排他の単位。"{対象種別}:{識別子}" 形式。unique 制約で同一 scope の二重ロックを防止';
comment on column public.job_locks.job_id is 'このロックを要求した job の ID (例: JOB-20260418-ABC123)';
comment on column public.job_locks.worker_id is 'ロックを取得した worker のインスタンス識別子';
comment on column public.job_locks.acquired_at is 'ロック取得（または延長）日時';
comment on column public.job_locks.expires_at is 'ロック有効期限。この時刻を過ぎると自動クリーンアップ対象になる';
comment on column public.job_locks.metadata is '任意の追加情報 (JSON)。デバッグや監査用';

create index if not exists idx_job_locks_expires_at on public.job_locks (expires_at);
create index if not exists idx_job_locks_job_id on public.job_locks (job_id);
create index if not exists idx_job_locks_routine_name on public.job_locks (routine_name);


-- =========================================================
-- 3. acquire_lock 関数
-- =========================================================
-- scope 単位でロックを取得する。
-- 同一 job_id かつ同一 worker_id による再取得はロック延長として扱う。
-- 別の job または別の worker が保持中の場合は失敗 (success=false) を返す。
-- 引数が null / 空文字の場合は例外を投げる。

create or replace function public.acquire_lock(
  p_scope text,
  p_routine_name text,
  p_job_id text,
  p_worker_id text,
  p_ttl_seconds int default 1800
)
returns table (
  success boolean,
  lock_id uuid,
  existing_job_id text,
  expires_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_existing public.job_locks%rowtype;
  v_new_id uuid;
  v_expires timestamptz;
begin
  -- 引数バリデーション
  if p_scope is null or p_scope = '' then
    raise exception 'acquire_lock: p_scope must not be null or empty';
  end if;
  if p_routine_name is null or p_routine_name = '' then
    raise exception 'acquire_lock: p_routine_name must not be null or empty';
  end if;
  if p_job_id is null or p_job_id = '' then
    raise exception 'acquire_lock: p_job_id must not be null or empty';
  end if;
  if p_worker_id is null or p_worker_id = '' then
    raise exception 'acquire_lock: p_worker_id must not be null or empty';
  end if;

  -- この scope の期限切れロックを先に削除
  delete from public.job_locks
  where job_locks.scope = p_scope and job_locks.expires_at < now();

  -- 既存ロックを排他取得
  select * into v_existing
  from public.job_locks
  where job_locks.scope = p_scope
  for update;

  if found then
    if v_existing.job_id = p_job_id and v_existing.worker_id = p_worker_id then
      -- 同一 job + 同一 worker による延長
      v_expires := now() + (p_ttl_seconds || ' seconds')::interval;
      update public.job_locks
        set expires_at = v_expires,
            acquired_at = now()
        where job_locks.id = v_existing.id;
      return query select true, v_existing.id, p_job_id, v_expires;
      return;
    else
      -- 別 job または別 worker がロック保持中
      return query select false, v_existing.id, v_existing.job_id, v_existing.expires_at;
      return;
    end if;
  end if;

  -- 新規ロック取得
  v_expires := now() + (p_ttl_seconds || ' seconds')::interval;
  begin
    insert into public.job_locks (routine_name, scope, job_id, worker_id, expires_at)
    values (p_routine_name, p_scope, p_job_id, p_worker_id, v_expires)
    returning id into v_new_id;
  exception
    when unique_violation then
      -- 他 TX が同時に insert した場合 (SQLSTATE 23505)
      select * into v_existing
      from public.job_locks
      where job_locks.scope = p_scope;
      return query select false,
        coalesce(v_existing.id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(v_existing.job_id, 'unknown'),
        coalesce(v_existing.expires_at, now());
      return;
  end;

  return query select true, v_new_id, p_job_id, v_expires;
end;
$$;

comment on function public.acquire_lock(text, text, text, text, integer) is
  'scope 単位でロックを取得する。同一 job+worker なら延長、別なら失敗を返す。TTL 付き。';


-- =========================================================
-- 4. release_lock 関数
-- =========================================================
-- 指定 scope + job_id のロックを解放する。

create or replace function public.release_lock(
  p_scope text,
  p_job_id text
)
returns boolean
language plpgsql
security invoker
as $$
declare
  v_count int;
begin
  if p_scope is null or p_scope = '' then
    raise exception 'release_lock: p_scope must not be null or empty';
  end if;
  if p_job_id is null or p_job_id = '' then
    raise exception 'release_lock: p_job_id must not be null or empty';
  end if;

  delete from public.job_locks
  where job_locks.scope = p_scope and job_locks.job_id = p_job_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

comment on function public.release_lock(text, text) is
  '指定 scope + job_id のロックを解放する。解放成功なら true、該当なしなら false。';


-- =========================================================
-- 5. cleanup_expired_locks 関数
-- =========================================================
-- 期限切れの全ロックを一括削除し、削除件数を返す。
-- pg_cron から 5 分毎に自動呼び出しされる。

create or replace function public.cleanup_expired_locks()
returns int
language plpgsql
security invoker
as $$
declare
  v_count int;
begin
  delete from public.job_locks
  where expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.cleanup_expired_locks() is
  '期限切れロックを一括削除する。pg_cron から 5 分毎に自動実行される。';


-- =========================================================
-- 6. check_lock 関数（デバッグ用）
-- =========================================================
-- 指定 scope のロック状態を確認する。残り秒数も返す。

create or replace function public.check_lock(
  p_scope text
)
returns table (
  lock_id uuid,
  routine_name text,
  job_id text,
  worker_id text,
  acquired_at timestamptz,
  expires_at timestamptz,
  remaining_seconds int
)
language sql
security invoker
as $$
  select id, routine_name, job_id, worker_id, acquired_at, expires_at,
         greatest(0, extract(epoch from (expires_at - now()))::int)
  from public.job_locks
  where job_locks.scope = p_scope;
$$;

comment on function public.check_lock(text) is
  'デバッグ用。指定 scope のロック状態と残り秒数を返す。';


-- =========================================================
-- 7. RLS（Row Level Security）設定
-- =========================================================

alter table public.job_locks enable row level security;

-- service_role: フルアクセス許可
drop policy if exists job_locks_service_role_all on public.job_locks;
create policy job_locks_service_role_all on public.job_locks
  for all
  to service_role
  using (true)
  with check (true);

-- anon: 明示拒否（fail-safe）
drop policy if exists job_locks_anon_deny on public.job_locks;
create policy job_locks_anon_deny on public.job_locks
  for all
  to anon
  using (false)
  with check (false);

-- authenticated: 明示拒否（fail-safe）
drop policy if exists job_locks_authenticated_deny on public.job_locks;
create policy job_locks_authenticated_deny on public.job_locks
  for all
  to authenticated
  using (false)
  with check (false);


-- =========================================================
-- 8. pg_cron スケジュール（5 分毎の期限切れクリーンアップ）
-- =========================================================
-- 冪等化: 既存ジョブがあれば先に削除してから再登録する。

do $$
begin
  perform cron.unschedule('cleanup_expired_job_locks');
exception
  when others then
    null; -- ジョブが存在しない場合は無視
end;
$$;

select cron.schedule(
  'cleanup_expired_job_locks',
  '*/5 * * * *',
  $$select public.cleanup_expired_locks();$$
);


-- =========================================================
-- 9. 動作確認用サンプルクエリ（手動実行用）
-- =========================================================

-- サンプル 1: ロック取得（新規）
-- select * from public.acquire_lock('repo:test', 'code_review', 'job-001', 'worker-01', 60);

-- サンプル 2: 同一 job + 同一 worker で再取得（延長される）
-- select * from public.acquire_lock('repo:test', 'code_review', 'job-001', 'worker-01', 60);

-- サンプル 3: 別 job でのロック試行（失敗する）
-- select * from public.acquire_lock('repo:test', 'code_review', 'job-002', 'worker-02', 60);

-- サンプル 4: ロック状態確認
-- select * from public.check_lock('repo:test');

-- サンプル 5: ロック解放
-- select public.release_lock('repo:test', 'job-001');

-- サンプル 6: 期限切れクリーンアップ手動実行
-- select public.cleanup_expired_locks();

-- サンプル 7: pg_cron ジョブ登録確認
-- select jobid, schedule, command from cron.job where jobname = 'cleanup_expired_job_locks';

-- =========================================================
-- 完了。エラーが出なければ全オブジェクトが正常に作成されている。
-- =========================================================
