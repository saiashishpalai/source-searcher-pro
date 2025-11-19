-- 1. Create Core Tables (if they don't exist)
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text,
  audio_url text,
  status text default 'processing',
  created_at timestamptz default now()
);

create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings,
  speaker_label text,
  verified_speaker_id uuid references auth.users,
  text text,
  start_time float,
  end_time float
);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings,
  description text,
  assignee_id uuid references auth.users,
  status text default 'open',
  source_quote text
);

-- 2. Add Insights Column (idempotent check)
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'meetings' and column_name = 'insights') then
    alter table meetings add column insights jsonb default '{}';
  end if;
end $$;

-- 3. Enable Vector Extension
create extension if not exists vector;
