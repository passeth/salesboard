# Vendor Module Roadmap

> Vendor 역할: 바이어 주문을 취합하고 커미션을 관리하는 중간 파트너

## Current State

### DB (이미 존재)
- `account_assignments` — vendor_org_id, commission_type, commission_value
- `orders` — vendor_org_id, vendor_commission_type/value/amount
- `commissions` — order_id, vendor_org_id, commission_type/value/amount, status, payable_date, paid_at
- `organizations` — org_type='vendor' records

### Code (이미 존재)
- Middleware: vendor role → `/vendor` prefix 라우팅
- Sidebar: `/vendor` Dashboard 링크 1개
- Pages: **없음** (vendor 디렉토리 미생성)

---

## Phase 1: Vendor Dashboard
**Goal**: Vendor 로그인 시 핵심 지표를 한눈에 볼 수 있는 랜딩 페이지

- [ ] `src/app/(dashboard)/vendor/page.tsx` — 대시보드 페이지
- [ ] `src/lib/queries/vendor.ts` — vendor 쿼리 레이어
- KPI 카드: 담당 바이어 수, 진행중 주문 수, 이번 달 커미션 합계
- 최근 주문 리스트 (최신 5건)

**DB 변경**: 없음 (기존 테이블 활용)

---

## Phase 2: Vendor Orders
**Goal**: Vendor에게 할당된 주문을 조회/필터링

- [ ] `src/app/(dashboard)/vendor/orders/page.tsx` — 주문 목록 페이지
- [ ] 사이드바에 Orders 링크 추가
- 필터: 상태별, 바이어별, 기간별
- 주문 상세 조회 (읽기 전용)
- vendor_review 상태에서 승인/반려 액션 (주문 흐름에 vendor_review 단계 존재 시)

**DB 변경**: 없음

---

## Phase 3: Vendor Accounts
**Goal**: Vendor에게 할당된 바이어 계정 목록 및 상세 조회

- [ ] `src/app/(dashboard)/vendor/accounts/page.tsx` — 바이어 계정 목록
- [ ] `src/app/(dashboard)/vendor/accounts/[orgId]/page.tsx` — 계정 상세 (거래 요약)
- 할당된 바이어 목록 + 커미션 타입/요율 표시
- 바이어별 주문 이력 요약

**DB 변경**: 없음

---

## Phase 4: Vendor Commissions
**Goal**: 커미션 현황 조회 및 정산 관리

- [ ] `src/app/(dashboard)/vendor/commissions/page.tsx` — 커미션 목록
- [ ] 사이드바에 Commissions 링크 추가
- 커미션 상태별 필터 (pending, payable, paid)
- 월별/바이어별 커미션 집계
- 인보이스 연결 (documents 테이블 연계)

**DB 변경**: 없음 (commissions 테이블 이미 완비)

---

## Phase 5: Sidebar & Navigation
**Goal**: Vendor 사이드바 네비게이션 완성

- [ ] 사이드바 vendor 메뉴 확장: Dashboard, Orders, Accounts, Commissions
- [ ] 각 페이지 breadcrumb/header 정리

**DB 변경**: 없음

---

## Implementation Order

```
Phase 1 (Dashboard) → Phase 5 (Sidebar) → Phase 2 (Orders) → Phase 3 (Accounts) → Phase 4 (Commissions)
```

Phase 5를 2번째로 올리는 이유: 네비게이션이 있어야 각 페이지를 개발하면서 바로 테스트 가능

## Dependencies

- 모든 Phase는 기존 DB 구조를 그대로 사용 — **DB 스키마 변경 없음**
- RLS 정책: vendor 역할은 자신의 `vendor_org_id`에 할당된 데이터만 접근 가능
- 기존 쿼리 패턴 (`src/lib/queries/`) 따름
