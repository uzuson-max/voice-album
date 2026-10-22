-- 매시간 질문 발송·알림. 배포 후 <도메인>과 <CRON_SECRET>을 바꿔서 SQL Editor에서 실행.
-- (Vercel Hobby 크론은 하루 1번이라 Supabase pg_cron으로 부른다 — 참견이와 같은 방식)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'vf-dispatch-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://<도메인>/api/cron/dispatch',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
