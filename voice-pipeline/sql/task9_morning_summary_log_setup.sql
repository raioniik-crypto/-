-- =========================================================
-- Task 9: morning_summary_log テーブル
-- 朝サマリーの重複生成防止用
-- =========================================================

create table if not exists public.morning_summary_log (
  date text primary key,
  generated_at timestamptz not null default now(),
  worker_id text not null,
  status text not null default 'completed',
  completed_count integer,
  blocked_count integer,
  failed_count integer,
  vault_path text,
  error_message text
);

comment on table public.morning_summary_log is '朝サマリーの重複生成防止テーブル。日付単位で1レコード。';
