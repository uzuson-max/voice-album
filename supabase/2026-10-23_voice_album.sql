-- 목소리 앨범(가칭) 테이블 — 참견이와 같은 Supabase 프로젝트, 이름 앞에 vf_ 로 분리.
-- Supabase SQL Editor에 통째로 붙여넣고 Run.
-- 모든 접근은 서버 API(service role)로만 한다. RLS를 켜고 정책을 두지 않아 브라우저에서 직접 읽기는 막힌다.

create extension if not exists pgcrypto;

create table if not exists vf_families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_name text not null,                 -- 부모님이 자녀를 부르는 이름 (예: 지은이)
  created_at timestamptz not null default now()
);
create unique index if not exists vf_families_owner_idx on vf_families(owner_id);

create table if not exists vf_storytellers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references vf_families(id) on delete cascade,
  label text not null,                      -- 자녀 화면 호칭 (예: 엄마)
  honorific text not null,                  -- 질문 속 호칭 (예: 어머니)
  phone text not null,
  send_weekday int not null default 3,      -- 0=일 ... 6=토 (KST)
  send_hour int not null default 9,         -- KST 시
  unseal_at date,                           -- null이면 바로 공개
  profile jsonb not null default '{}'::jsonb, -- 고향, 직업, 좋아하는 것 등
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists vf_storytellers_family_idx on vf_storytellers(family_id);

create table if not exists vf_prompts (
  id uuid primary key default gen_random_uuid(),
  storyteller_id uuid not null references vf_storytellers(id) on delete cascade,
  text text not null,
  format text not null default 'audio' check (format in ('audio','video')),
  source text not null default 'library' check (source in ('library','custom','followup','ai')),
  position int not null default 0,
  status text not null default 'queued' check (status in ('queued','sent','answered')),
  token text unique,
  sent_at timestamptz,
  reminder_count int not null default 0,
  last_reminded_at timestamptz,
  snooze_until timestamptz,
  unseal_at date,                           -- 이 질문만 따로 열리는 날 (미래 편지용, 선택)
  created_at timestamptz not null default now()
);
create index if not exists vf_prompts_st_idx on vf_prompts(storyteller_id, status, position);

create table if not exists vf_answers (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references vf_prompts(id) on delete cascade,
  storyteller_id uuid not null references vf_storytellers(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('audio','video')),
  mime text,
  duration_sec int,
  transcript text,
  title text,
  summary text,
  unseal_at date,
  created_at timestamptz not null default now()
);
create index if not exists vf_answers_st_idx on vf_answers(storyteller_id, created_at desc);

alter table vf_families enable row level security;
alter table vf_storytellers enable row level security;
alter table vf_prompts enable row level security;
alter table vf_answers enable row level security;

-- 녹음 파일 저장소 (비공개, 파일당 60MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('vf-media', 'vf-media', false, 62914560)
on conflict (id) do nothing;
