# CHANGELOG — Trade Intel

모든 설계/스키마/기능 변경을 여기 기록한다.
왜 바꿨는지, 누가 결정했는지 남긴다.

---

## 2026-03-13 — 남은 페이지 구현 + 테스트 계정 추가

### 신규 페이지 (3개)
- `/admin/organizations` — 조직 관리 (계층 트리 테이블, org_type/status/search 필터, 페이지네이션, 타입별 컬러 Badge)
- `/admin/orders` — 전체 주문 관리 (모든 바이어 주문 조회, status/buyer/date/search 필터, 행 클릭 → sales order detail)
- `/profile` — 프로필 편집 (이름/전화/locale 수정, 비밀번호 변경, 서버 액션 기반)

### 쿼리 헬퍼 추가
- `getAdminOrganizations` — org_type/status/search 필터, parent org join, 페이지네이션
- `getAdminOrders` — status/orgId/fromDate/toDate/search 필터, org+sales_owner join
- `getAdminOrderFilterOptions` — 주문이 있는 바이어 조직 목록

### 사이드바 업데이트
- Admin 섹션에 Organizations, All Orders 링크 추가

### 테스트 계정 추가
- Sales: `sales@evas.co.kr` / `sales1234!` (UUID: da59c58b-2f8c-47fd-a640-76e1b83f8ff5)
- Logistics: `logistics@evas.co.kr` / `logistics1234!` (UUID: 9a030036-2020-4cee-9543-f83b143bd517)

### 버그 수정
- `BuyerOrgSelector`에서 제거된 `currentOrgName` prop 정리 (buyer/page.tsx, buyer/orders/page.tsx)
- `.next` 캐시 corruption으로 인한 서버 사이드 오류 해결

### Build 결과
- 22 routes, `pnpm build` 통과
- LSP diagnostics clean on all files
- 결정자: passeth

---

## 2026-03-13 — Phase 3-5 구현 (Sales + Logistics + Admin)

### Phase 3: Sales Core (13 files)
- `/sales` — Sales Dashboard (stat cards: Pending Reviews, Awaiting Buyer Decision, Confirmed This Month)
- `/sales/orders` — Order Review List (paginated table, status/buyer/date filters)
- `/sales/orders/[id]` — Order Review Detail (inventory lot context, qty confirmation, allocation type, action buttons: Full Confirm / Request Buyer Decision)
- Server actions: `salesConfirmOrder`, `salesRequestBuyerDecision`
- Query helper: `src/lib/queries/sales-orders.ts` (getSalesOrders, getSalesOrderStats, getInventoryForProducts, getSalesBuyerOrganizations)

### Phase 4: Logistics Core (12 files)
- `/logistics` — Logistics Dashboard (stat cards: Awaiting Shipment, Active Shipments, Delivered This Month)
- `/logistics/shipments` — Shipment List (paginated table, status/date filters, shipment status badges)
- `/logistics/shipments/[id]` — Shipment Detail (header with status transitions, pallet management UI, pallet item display)
- Server actions: `updateShipmentStatus` (with valid transition validation)
- Query helper: `src/lib/queries/shipments.ts` (getShipments, getShipmentById, getShipmentPallets, getLogisticsStats)

### Phase 5: Admin (8 files, replaced 3 placeholders)
- `/admin` — Admin Dashboard (4 stat cards: Total Orders, Active Users, Products, Organizations + pipeline-by-status grid)
- `/admin/users` — User Management (paginated table, role/status badges, org join, role/status filters)
- `/admin/products` — Product Management (paginated table, image thumbnails, brand/category/status/search filters, row click to catalog detail)
- Query helper: `src/lib/queries/admin.ts` (getAdminStats, getOrderPipeline, getAdminUsers, getAdminProducts)

### Build 결과
- 20 routes, `pnpm build` 통과
- LSP diagnostics clean on all files
- 결정자: passeth

---

## 2026-03-13 — Phase 2 구현 + QA (Buyer Core)

### 구현 완료
- `/catalog` — 카탈로그 (리스트뷰 기본, 100개/페이지, 테이블: Image/Product/SKU/Brand/Units per Case/Barcode/CBM/Volume)
- `/catalog/[id]` — 제품 상세 (기본 정보, 물류 규격, 국가별 탭, Add to Order)
- `/buyer` — 바이어 대시보드 (카드 링크)
- `/buyer/orders` — 주문 목록 (20/페이지, 정렬/필터/페이지네이션)
- `/buyer/order/new` — 발주 작성 (배송 정보, 제품 선택 다이얼로그, 박스/유닛 계산)
- `/buyer/orders/[id]` — 주문 상세 (브레드크럼, 수량 비교 테이블, 타임라인, 바이어 의사결정, 인보이스/출하/서류 섹션, 재주문)

### 공유 컴포넌트 (8개)
- StatusBadge, OrderItemStatusBadge, BoxQuantityDisplay, EmptyState, PageHeader, DataTable, DataTablePagination, DataTableColumnHeader

### 쿼리 헬퍼 (3개)
- `src/lib/queries/products.ts`, `orders.ts`, `organizations.ts`

### 인프라
- shadcn/ui 23개 설치
- Zod 검증: `src/lib/validations/order.ts`
- 바이어 RLS 정책: `000005_buyer_rls_policies.sql`
- Google OAuth 추가 (미등록 사용자 자동 차단)
- Admin 계정 재생성 (Supabase Admin API, UUID: `1ffa6f06-...`)
- Cloudflare R2 설정 (MVP에서는 Supabase image_url 사용, 향후 전환)
- Playwright QA 전체 페이지 검증 통과
- 결정자: passeth

---

## 2026-03-13 — Supabase DB 셋업 + 시드 데이터 임포트

### 마이그레이션 적용 (4건)
- `000001_trade_intel_mvp.sql` — 17 테이블 DDL (Supabase CLI `db push`)
- `000002_trade_intel_rls_baseline.sql` — RLS 정책 + helper 함수 (Management API)
- `000003_box_unit_ordering.sql` — 박스 단위 주문 컬럼 (수동 분할 적용: units_per_case 먼저, generated 컬럼 후)
- `000004_pallet_enhancements.sql` — 팔레트 기능 강화

### 시드 데이터 임포트
| 테이블 | 목표 | 실제 | 비고 |
|--------|------|------|------|
| organizations | 83 | 83 | name_en → metadata_json |
| products | 605 | 596 | 9건 CSV 중복 제외, name_en → extra_json |
| orders | 2417 | 2417 | packing_no_legacy → metadata_json |
| order_items | 29711 | 29711 | product_code → metadata_json |
| inventory_lots | 468 | 347 | 121건 FK 위반 (product_id 미존재) |
| product image_url | 596 | 430 | SKU 매칭 기준 UPDATE |

### 시스템 사용자 생성
- System Admin (admin@evas.co.kr, role=admin, org=EVAS)
- UUID: `00000000-0000-0000-0000-000000000001`
- orders.sales_owner_user_id FK 해결용

### units_per_case 백필
- 28740/29711 order_items에 products.units_per_case 스냅샷 복사

### 인프라
- Supabase MCP: remote(OAuth) → local(stdio+PAT)로 전환 (opencode OAuth 버그 #15546 우회)
- Supabase CLI 프로젝트 연결 완료
- 시드 스크립트: `scripts/seed.mjs` 생성

### 알려진 이슈
- inventory_lots 121건 누락: 시드 CSV의 product_id가 products 테이블에 없음 (데이터 품질 문제)
- products 9건 누락: CSV 내 중복 ID
- 결정자: passeth

---

## 2026-03-13 — Phase 1 구현 (로그인 + 역할 라우팅 + 대시보드 셸)

### 구현 완료
- Supabase Auth (서버/클라이언트/미들웨어 헬퍼)
- 로그인 페이지 (split layout: 다크 브랜드 패널 + 폼 카드)
- Auth 미들웨어 (역할별 라우트 보호: buyer→/buyer, vendor→/vendor 등)
- PKCE 콜백 핸들러
- 대시보드 레이아웃 (서버 컴포넌트, 사이드바 + 헤더 + 콘텐츠)
- 사이드바 (다크 #030229, 역할별 네비게이션)
- 헤더바 (sticky, 검색/알림/아바타)
- Design tokens → globals.css (164 lines, Inter 폰트, Primary #605BFF)

### 파일 목록 (13개)
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(auth)/login/page.tsx`
- `src/app/(dashboard)/layout.tsx`, `src/app/auth/callback/route.ts`
- `src/middleware.ts`, `src/components/sidebar.tsx`, `src/components/header-bar.tsx`
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`
- `src/lib/utils.ts`, `src/types/index.ts`
- 결정자: passeth

---

## 2026-03-13 — Figma 분석 + Pencil 와이어프레임 + Next.js 프로젝트 초기화

### Figma 디자인 분석
- SAAS Dashboard Community 파일 (24프레임) 분석
- 디자인 토큰 50+ 추출 (컬러, 타이포, 라디우스, 그림자)
- 사이드바 2종 (Expanded 218px / Collapsed 80px)

### Pencil 와이어프레임
- 14개 재사용 컴포넌트 (Button×4, Input, Card, Badge×4, Sidebar, Header, Table)
- 로그인 화면 + Sales Dashboard 화면 완성
- trade.pen에 디자인 변수 설정

### Next.js 프로젝트 초기화
- Next.js 15 + React 19 + shadcn/ui + Tailwind v4
- `pnpm build` 통과 확인
- 결정자: passeth

---

## 2026-03-13 — 다운로드/출력 기능 추가

### 인보이스·패킹리스트·쉬핑마크 출력 체계
- **인보이스**: PDF + **엑셀(xlsx)** 다운로드, 이메일 첨부 (FR-DL-01)
- **패킹리스트**: PDF + **엑셀(xlsx)** 다운로드, 행선지/팔레트별 시트 분리 (FR-DL-02)
- **쉬핑마크**: PDF + **인쇄 버튼** (개별/일괄), A4 큰글씨 레이아웃 (FR-DL-03)
- 결정자: passeth

---

## 2026-03-13 — 물류 담당자 피드백 반영 (팔레트/패킹 강화)

### 사용자 의뢰사항 6건 → 기능 매핑
| # | 의뢰 | 대응 | FR코드 |
|---|------|------|--------|
| 1 | 패킹 완료 후 사진 업로드 | 팔레트별 다중 사진 + 바이어 공유 | FR-PLT-04 |
| 2 | 패킹요약 총수량/총박스/총금액 "0" → 실수량 표시 | 실제 출고분 기준 집계 | FR-PKL-01 |
| 3 | 행선지별/팔레트별 요약 | destination 그룹핑 + 팔레트별 소계 | FR-PKL-02 |
| 4 | CBM 박스→팔레트 기준, 높이만 입력 | 1100×1100 기본, 높이 입력 → 자동 CBM | FR-PLT-01 수정 |
| 5 | 신제품 패킹 규격 입력 | 제품 관리에 물류규격 필수 패널 | §31 보강 |
| 6 | B/L, 원산지증명서 업로드 | 서류 유형별 업로드 (이미 설계됨, 명시화) | §26 보강 |
| 보너스 | 비완박스(낱개) 발주 시 CBM 처리 | is_partial_case + 낱개 CBM 보정 | FR-PLT-05 |

- **마이그레이션**: `20260313_000004_pallet_enhancements.sql`
- **영향 문서**: PRD.md (§4.8), pages-spec.md (§24, §25, §26, §31)
- 결정자: passeth (사용자 피드백 기반)

---

## 2026-03-13 — 박스 단위 주문 체계

### FR-ORD-02 변경: 박스(case) 단위 주문 필수
- **변경 사유**: 수출은 박스 단위로 적재/출하 — 낱개 주문은 현실과 안 맞음 (passeth 요청)
- **변경 내용**:
  - 모든 qty 입력 = 박스 수량, unit_qty = 자동 계산 (boxes × units_per_case)
  - order_items에 `units_per_case` 스냅샷 + generated `*_unit_qty` 4개 컬럼 추가
  - 발주 UI: `[N] boxes × [M] pcs = [total] pcs` 실시간 표시
  - 발주 요약에 팔레트/컨테이너 시뮬레이션 추가 (FR-ORD-07)
- **마이그레이션**: `20260313_000003_box_unit_ordering.sql`
- **영향 문서**: PRD.md (§4.2), pages-spec.md (§6, §13, §19)
- 결정자: passeth

---

## 2026-03-12 — 프로젝트 킥오프

### 데이터 모델 확정
- 17 테이블 확정 (mvp-data-model.md)
- RISE안 + Codex안 비교 → 합본
- **Codex 채택**: supply_plans 분리, documents 통합, 4단계 수량, confidence_status, 3 프로젝트 경계
- **RISE 채택**: invoices 별도 테이블, commissions ledger, meetings(MVP 이후)
- 결정자: passeth

### 시스템 경계 확정
- **Supabase 운영**: 바이어/벤더 포털 + 주문/출고/정산/문의
- **MES 원천**: 재고/생산 → Supabase에 mirror
- **Sales Board**: CRM/AI/미팅 → 별도 프로젝트 (MVP 이후)
- 동기화 원칙: MES→Supabase→SalesBoard 단방향

### 페이지 명세 작성
- 운영 35페이지 + Sales Board 5페이지
- MVP 1차: 19페이지 (카탈로그→발주→검토→인보이스→출하→서류)
- pages-spec.md 작성 완료

### 프로젝트 구조 정립
- docs/ 관리 지침 수립 (CONTRIBUTING.md)
- 마이그레이션 넘버링 규칙 확정
- CHANGELOG 운영 시작

### DDL 작성 (Codex)
- 17 테이블 전체 DDL 완성 (supabase/migrations/20260312_000001_trade_intel_mvp.sql)
- updated_at 트리거 전 테이블 적용
- 인덱스, 제약조건, UNIQUE 설정 완료
- fd 스킬 (Claude-first UI 릴레이) 추가

### PRD 작성
- docs/PRD.md v1.0 작성
- 기능 요구사항 FR 코드 부여 (CAT/ORD/VND/SAL/INV/COM/SHP/PLT/PKL/DOC/INQ/ADM)
- MVP 1차(19p) / 2차(+16p) / Phase 2(Sales Board) 범위 확정
- 마일스톤 M0~M8 정의
