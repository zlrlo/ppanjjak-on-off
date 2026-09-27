# 빤짝 온오프

가족의 돌봄 출퇴근과 급여를 기록하는 Next.js 앱입니다. 카카오 인증은 Supabase Auth가 담당하고, 가족 데이터는 서버 API를 통해서만 접근합니다.

## 로그인과 가족 그룹

1. **카카오로 시작하기**: 처음 사용자는 카카오 인증 후 이름을 입력해 가입을 완료합니다. 기존 사용자는 로그인됩니다.
2. 로그인 후 **우리 가족 공간**에서 참여 중인 그룹과 받은 초대를 확인합니다. 가족이 없어도 가입·로그인은 가능합니다.
3. **새 가족 만들기**로 생성한 그룹의 관리자가 됩니다. 한 계정으로 여러 그룹에 참여할 수 있습니다.
4. 관리자는 **초대 링크 만들기**로 7일짜리 일회용 링크를 만들고 직접 공유합니다. 앱이 카카오 메시지를 자동 전송하지는 않습니다.
5. 받은 사람이 링크를 열고 가입·로그인한 후 **초대함에 추가**를 누르면 그 계정에 초대가 귀속됩니다. 가족 이름을 확인하고 **수락 / 거절**합니다. 수락 전에는 가족 데이터에 접근할 수 없습니다.
6. 가입자는 기본 `member` 권한·시급 0원으로 참여합니다. 관리자는 그룹 안의 관리 탭에서 시급을 설정합니다. 생성자는 관리자이며, 현재 UI에서는 관리자 권한 위임을 제공하지 않습니다.
7. **보낸 초대**에서 상태를 확인하고 미수락 초대를 취소할 수 있습니다. 링크는 발급 직후에만 표시되며, 잃어버리면 취소 후 새로 발급합니다.
8. 대시보드 상단의 가족 아이콘으로 그룹 목록에 돌아갑니다. 각 탭의 API 요청은 해당 화면의 그룹 ID와 서버에서 검증한 회원 소속을 함께 사용합니다.

## Supabase 준비

SQL Editor에서 다음 파일을 순서대로 실행합니다. 이미 001을 실행했다면 002만 실행하세요.

- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_kakao_families.sql`

002는 계정 프로필, 가족별 계정 연결, 초대 및 원자적 생성/수락 함수를 추가합니다. 기존 가족·출퇴근·급여 데이터는 보존하며, 기존 PIN 로그인과 공개 회원 목록 API는 더 이상 사용하지 않습니다. 변경 함수는 `service_role`만 호출할 수 있고, 모든 테이블에 RLS를 사용합니다. 브라우저용 직접 데이터 접근 정책은 없습니다.

기존 PIN 회원을 카카오 계정에 연결하려면, 해당 사용자가 카카오로 가입한 후 Supabase의 Authentication → Users에서 UUID를 확인하고, DB 관리자가 정확한 기존 `members.id` 행에 그 UUID를 `auth_user_id`로 지정해야 합니다. 이름이 같다는 이유로 자동 연결하지 않습니다. 기존 그룹을 유지하려는 사용자는 새 그룹을 만들기 전에 이 연결을 마쳐 주세요. 기존 `sessions`, `login_attempts`, `pin_hash`는 호환 데이터로 남지만 새 인증에는 사용하지 않습니다.

## 카카오 설정

1. Kakao Developers에서 앱을 만들고 카카오 로그인을 켭니다.
2. Supabase → Authentication → Sign In / Providers → Kakao를 켭니다.
3. 카카오 **REST API 키**를 Client ID에, 카카오 로그인 **Client Secret**을 Client Secret에 입력합니다.
4. Supabase가 표시하는 `https://<project-ref>.supabase.co/auth/v1/callback`을 카카오의 Redirect URI로 등록합니다.
5. 카카오 동의 항목을 설정합니다. 이메일 없이 운영하려면 Supabase Kakao의 **Allow users without an email**을 켜세요. 앱은 이메일을 회원 식별에 사용하지 않습니다.
6. Supabase → Authentication → URL Configuration에 설정합니다.
   - Site URL: 개발 시 `http://localhost:3000`, 운영 시 실제 HTTPS 도메인
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://실제도메인/auth/callback`
   - `127.0.0.1`로 접속한다면 `http://127.0.0.1:3000/auth/callback`도 추가합니다. 로그인 시작부터 완료까지 같은 호스트를 사용하세요.

공식 문서: https://supabase.com/docs/guides/auth/social-login/auth-kakao

## 환경변수와 실행

`.env.example`을 `.env.local`로 복사하고 값을 입력합니다.

| 변수 | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_URL` | 위와 동일한 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 service_role 키 |
| `NEXT_PUBLIC_DEMO_ONLY` | 실제 로그인은 `false`, UI 데모는 `true` |

기존 `SETUP_SECRET`, `SESSION_SECRET`은 더 이상 사용하지 않습니다. 카카오 키는 Supabase 콘솔에 저장하며 이 파일에 넣지 않습니다. 서버 키는 브라우저나 저장소에 공개하면 안 됩니다.

```bash
npm install
npm run dev
```

환경변수 변경 후 서버를 재시작합니다. 설정 누락이나 DB 오류는 오류 화면으로 표시되며, 실제 로그인 실패를 데모로 전환하지 않습니다.

## 검증

### 작업 재개 메모 (2026-09-27)

- 카카오 로그인 시 `KOE205`를 확인했습니다. 당시 요청한 `account_email`, `profile_image`, `profile_nickname`이 카카오 앱의 동의 항목 설정과 일치하지 않았습니다.
- 현재 로그인 코드는 별도 `scopes`를 지정하지 않습니다. 다음 작업에서 실제 사용할 정보에 맞춰 요청 범위와 카카오 동의 항목을 함께 정리해야 합니다. 앱의 이름은 직접 입력받으며, 카카오 프로필 사진은 사용하지 않습니다.
- 이메일 없이 로그인하려면 Supabase의 **Allow users without an email** 설정도 확인해야 합니다.
- 원격 DB의 002 마이그레이션 적용 여부와 실제 카카오 로그인 완료는 아직 검증하지 않았습니다. 아래 두 계정 시나리오로 가족 생성·초대까지 확인해야 합니다.

```bash
npm test
npx tsc --noEmit --incremental false
npm run build
```

실제 카카오 계정 두 개로 아래 흐름도 확인해 주세요.

- 첫 계정 가입 → 가족 생성 → 초대 링크 생성
- 다른 계정으로 링크 열기 → 가입 → 초대함 등록 → 수락 → 해당 그룹 접근
- 거절·취소·만료한 초대로 참여할 수 없는지 확인
- 그룹 전환 후 출퇴근·급여가 그룹별로 분리되는지 확인
- 새로고침, 로그아웃, 재로그인 확인

## 배포

실제 인증은 Next.js 서버가 실행되는 호스팅에 배포해야 합니다. 위 환경변수를 배포 환경에도 등록하고 Supabase Redirect URLs를 맞춥니다. GitHub Pages 워크플로는 API·콜백·미들웨어를 제외하는 **정적 UI 데모 전용**입니다.

서비스워커는 정적 파일만 캐시합니다. 인증 콜백·페이지·API 응답은 캐시하지 않습니다.
