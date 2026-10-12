-- AI document pre-screening: columns + admin-only report tables + protection trigger.
-- Run once in Supabase (project Redeo). Safe to re-run.

-- What the USER may see about each document: only a verdict and quality issues.
alter table public.verifications
  add column if not exists ai_verdict text,
  add column if not exists ai_checked_at timestamptz,
  add column if not exists ai_storage_path text,
  add column if not exists ai_issues jsonb;

-- Detailed per-document report (authenticity signals, extracted fields): ADMIN ONLY.
create table if not exists public.verification_doc_reports (
  user_id uuid not null,
  doc_type text not null,
  storage_path text,
  report jsonb not null,
  checked_at timestamptz default now(),
  primary key (user_id, doc_type)
);
alter table public.verification_doc_reports enable row level security;
drop policy if exists verification_doc_reports_admin_select on public.verification_doc_reports;
create policy verification_doc_reports_admin_select on public.verification_doc_reports
  for select to authenticated using (public.is_admin());

-- Case summary for the admin (what is clear / missing / doubtful).
create table if not exists public.verification_summaries (
  user_id uuid primary key,
  recommendation text,
  summary_text text,
  missing jsonb default '[]'::jsonb,
  flags jsonb default '[]'::jsonb,
  cross_checks jsonb default '[]'::jsonb,
  doc_count int default 0,
  ai_available boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.verification_summaries enable row level security;
drop policy if exists verification_summaries_admin_select on public.verification_summaries;
create policy verification_summaries_admin_select on public.verification_summaries
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies on either table: only the server (service role) writes them.

-- Users must not be able to forge the AI verdict on their own verification rows.
create or replace function public.protect_verification_ai_columns()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'service_role', 'supabase_admin')
     or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.ai_verdict := null; new.ai_checked_at := null; new.ai_storage_path := null; new.ai_issues := null;
  else
    new.ai_verdict := old.ai_verdict; new.ai_checked_at := old.ai_checked_at;
    new.ai_storage_path := old.ai_storage_path; new.ai_issues := old.ai_issues;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_verification_ai on public.verifications;
create trigger trg_protect_verification_ai
  before insert or update on public.verifications
  for each row execute function public.protect_verification_ai_columns();
