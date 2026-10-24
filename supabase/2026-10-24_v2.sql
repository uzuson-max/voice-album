-- 우리집 레코드 v2 — 자녀 목소리 질문 / 사진(선택) / 빨간펜 반응 / 이어 말하기(꼬리 질문) / 우리집 신문 글
-- Supabase SQL Editor에 통째로 붙여넣고 Run. 여러 번 실행해도 안전.

alter table vf_prompts add column if not exists masked boolean not null default false;
alter table vf_prompts add column if not exists from_answer_id uuid;
alter table vf_prompts add column if not exists child_audio_path text;      -- 자녀가 직접 녹음한 질문
alter table vf_prompts add column if not exists photo_path text;            -- 선택 사진
alter table vf_prompts add column if not exists article_title text;         -- 우리집 신문 제목
alter table vf_prompts add column if not exists article text;               -- 우리집 신문 본문
alter table vf_prompts add column if not exists finished_at timestamptz;    -- 이어 말하기까지 끝난 시각
alter table vf_prompts add column if not exists reaction_text text;         -- 자녀 빨간펜
alter table vf_prompts add column if not exists reaction_audio_path text;   -- 자녀 음성 반응
alter table vf_prompts add column if not exists reaction_at timestamptz;
alter table vf_prompts add column if not exists reaction_shown_on uuid;     -- 어느 질문 링크에서 부모님께 보여줬는지

alter table vf_answers add column if not exists turn int not null default 0;   -- 0=첫 대답, 1~2=이어 말하기
alter table vf_answers add column if not exists asked text;                    -- 이 대답 직전에 들은 질문 (이어 말하기용)
alter table vf_answers add column if not exists react text;                    -- AI 맞장구
alter table vf_answers add column if not exists followup text;                 -- AI가 이어서 물은 질문

create index if not exists vf_answers_prompt_idx on vf_answers(prompt_id, turn);
