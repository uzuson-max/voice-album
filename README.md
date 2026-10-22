# 목소리 앨범 (가칭)

부모님께 매주 질문이 문자로 가고, 링크를 눌러 음성/영상으로 대답하면 봉해두었다가 정한 날 자녀에게 열리는 서비스.

## 세팅 순서 (한 번만)

1. **GitHub**: 새 레포를 만들고 이 폴더 안의 파일을 전부 업로드.
2. **Supabase (참견이와 같은 프로젝트)**
   - SQL Editor에 `supabase/2026-10-23_voice_album.sql` 통째로 붙여넣고 Run.
   - Authentication → URL Configuration → Redirect URLs에 `https://<새 도메인>/app` 추가.
   - Authentication → Providers → Email 이 켜져 있는지 확인 (자녀 로그인은 이메일 링크).
3. **Vercel**: 새 프로젝트로 레포 연결 → Environment Variables에 `.env.example`의 값 입력
   (Supabase/OpenAI/Solapi 값은 참견이 프로젝트와 같은 값 사용 가능, `NEXT_PUBLIC_APP_URL`은 새 도메인).
4. **매시간 발송**: 배포 후 `supabase/cron.sql`의 `<도메인>`, `<CRON_SECRET>`을 바꿔서 SQL Editor에서 Run.

## 테스트

1. 새 도메인 접속 → 시작하기 → 이메일 로그인 → 부모님 등록(번호에 본인 번호) → 질문 고르기
2. 질문함의 "지금 바로 하나 보내기" → 문자로 온 링크 열기 → 녹음 → 보내기
3. 열리는 날을 비워두면 이야기 탭에 바로 보임 (날짜를 넣으면 그날까지 봉인)

## 참고
- 녹음 파일은 서버를 거치지 않고 Supabase Storage(`vf-media`, 비공개)로 바로 올라감.
- 음성은 받아쓰기 → AI 제목·요약 → 이어지는 질문 자동 추가. 25MB 넘는 긴 영상은 받아쓰기 생략.
- Supabase 기본 메일 발송은 시간당 횟수 제한이 있음. 실제 출시 전 SMTP 연결 권장.
- 서비스 이름은 `lib/brand.ts` 한 곳에서 바꿈.
