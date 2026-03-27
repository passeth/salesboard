# Trade-Intel 개발 규칙

> B2B 수출 발주 플랫폼 — 에바스코스메틱 해외 바이어용

## 패키지 매니저
- **pnpm만 사용** — npm/yarn 절대 금지
- 개발: `pnpm dev`, 빌드: `pnpm build`
- 타입 체크: `pnpm tsc --noEmit`

## 기술 스택
- Next.js (App Router) + TypeScript strict
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Supabase (intel 프로젝트) — `@supabase/ssr`
- shadcn/ui 컴포넌트

## 배포
- GitHub push → Vercel 자동 배포
- 직접 `vercel --prod` 금지
- `vercel.json` 설정 참고

## Supabase
- **intel 프로젝트만** 사용 — commerce(MES) 키 절대 혼용 금지
- RLS 우회 필요 시 service_role 사용 (server side only)
- 클라이언트: `@supabase/ssr` createClient 패턴

## 코드 구조
```
src/
├── app/
│   ├── (auth)/        # 로그인/회원가입
│   └── (dashboard)/
│       ├── admin/     # 관리자
│       ├── buyer/     # 바이어
│       ├── catalog/   # 제품 카탈로그
│       ├── logistics/ # 물류/배송
│       ├── sales/     # 영업
│       └── profile/   # 프로필
├── components/        # 공통 UI
└── lib/               # 유틸, Supabase 클라이언트
```

## 디자인 토큰
- 생성: `pnpm tokens` (`src/design-tokens/generate-css.ts`)
- Figma 동기화: `pnpm figma:sync`
- 수동 변경 금지 — 항상 generate-css.ts 통해서

## 사용자 역할
- **admin**: 에바스 내부 관리자
- **buyer**: 해외 바이어 (읽기 + 발주)
- RLS로 역할별 데이터 분리 필수

## 자주 하는 실수
- intel/commerce Supabase 키 혼용 → 반드시 .env.local 확인
- `pnpm build` 전 타입 에러 해결 필수
- Server Component에서 Supabase 클라이언트: `createServerClient` 사용
