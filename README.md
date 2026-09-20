# 빤짝 온오프

가족 돌봄 근무, 월별 급여, 빤짝이의 현재 수면·식사 상태를 함께 관리하는 모바일 우선 PWA입니다.

## 기술 구성

- Next.js App Router + TypeScript
- Supabase Postgres (브라우저 직접 접근 없이 서버 전용 service role 사용)
- 이름 + 6자리 PIN, Argon2id 해시, 30일 HttpOnly 세션
- Vitest 급여 계산 테스트

## 로컬 실행

### UI만 먼저 보기

Supabase 설정 없이 아래 명령만 실행하면 샘플 데이터가 채워진 UI 데모가 자동으로 열립니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 여세요. 출퇴근, 수면, 식사, 지급 버튼을 눌러볼 수 있으며 새로고침하면 샘플 상태로 초기화됩니다.

### 실제 데이터를 저장해서 사용하기

1. Supabase 프로젝트를 만들고 SQL Editor에서 [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)을 실행합니다.
2. `.env.example`을 `.env.local`로 복사하고 값을 채웁니다. `SETUP_SECRET`과 `SESSION_SECRET`은 각각 충분히 긴 서로 다른 임의 문자열을 사용하세요.
3. 의존성을 설치하고 개발 서버를 실행합니다.

```bash
npm install
npm run dev
```

처음 접속하면 `SETUP_SECRET`으로 가족 공간과 첫 부모 관리자를 만듭니다. 이후 관리 탭에서 두 번째 부모와 가족을 등록할 수 있습니다.

## 검증

```bash
npm test
npx tsc --noEmit
npm run build
```

## 배포

Vercel 프로젝트에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SETUP_SECRET`, `SESSION_SECRET`을 등록한 뒤 배포합니다. Service role key는 `NEXT_PUBLIC_` 접두사를 붙이거나 브라우저에 노출하면 안 됩니다.

서비스는 한 가정·한 아기, 한국 시간(`Asia/Seoul`), 원화 기준입니다. 위치 확인, 푸시 알림, 계좌이체, 세무·법정 수당 계산은 포함하지 않습니다.
