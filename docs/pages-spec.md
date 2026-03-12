# Trade Intel — 페이지별 기능 명세

> 기준: `mvp-data-model.md` (확정 17 테이블, 3 프로젝트 분리)
> 
> **운영 Supabase**: 바이어/벤더 포털 + 주문/출고/정산/문의
> **MES**: 재고/생산 원천 (mirror 테이블로 조회)
> **Sales Board**: CRM/AI/미팅/실적분석 (별도 프로젝트, MVP 이후)

---

## 🌐 공통 (운영 Supabase)

### 1. 로그인 `/login`
- Supabase Auth (이메일+비밀번호, Magic Link)
- 역할 기반 자동 라우팅 (로그인 후 각 대시보드로)
- 바이어 회원가입 → 관리자 승인 후 활성화
- 다국어 (i18n — 영어 기본)
- **테이블**: `users`, `organizations`

### 2. 제품 카탈로그 `/catalog`
- 제품 그리드/리스트 뷰 전환
- 브랜드별, 카테고리별 필터
- 제품 카드: `image_url`, `name`, `volume_value`+`volume_unit`, `brand`
- 검색: SKU, 바코드, 품목명
- **테이블**: `products`

### 3. 제품 상세 `/catalog/:id`
- 이미지: `products.image_url` + `documents`(owner_type=product, type=product_sheet)
- 기본 정보: SKU, 바코드, QR, 용량, 브랜드, HS코드
- **국가별 탭**: 현지 상품명, 성분표기, 사용법, 주의사항, 라벨 이미지
- 물류 규격: CBM, 순중량, 입수량, 박스 사이즈 (case_length × case_width × case_height)
- 관련 문서 다운로드 (product_sheet 등)
- **바이어**: "장바구니 추가" 버튼
- **영업/관리자**: 편집 가능
- **테이블**: `products`, `product_market_contents`, `documents`

### 4. 내 프로필 `/profile`
- 기본 정보 수정 (name, phone, locale)
- 비밀번호 변경
- 알림 설정
- **테이블**: `users`

---

## 🛒 바이어 (Buyer)

### 5. 바이어 대시보드 `/buyer`
- 최근 주문 요약 (최근 5건, 상태별 색상 배지)
- 진행 중 주문: `submitted`, `vendor_review`, `sales_review`, `needs_buyer_decision`
- 출하 트래킹: `shipped`, `in_transit` 상태 건
- 담당 영업사원 정보 + 빠른 문의 버튼
- 공지사항 / 신제품 알림
- **테이블**: `orders`, `shipments`, `account_assignments`, `users`

### 6. 발주하기 `/buyer/order/new`
- **장바구니 = draft 주문**: 카탈로그에서 추가한 품목 리스트
- **📦 박스 단위 주문 (필수)**:
  - 모든 수량 입력은 **박스(case) 단위**로만 가능 (낱개 주문 불가)
  - 입력 UI: `[수량 입력] boxes × [입수량] pcs = [총 수량] pcs` 실시간 표시
  - 최소 주문: 1박스
  - `requested_qty` = **박스 수**, `requested_unit_qty` = 박스 수 × `units_per_case` (자동 계산)
  - 입수량 미등록 제품(`units_per_case` = null) → 박스 수량 입력 후 "입수량 확인 필요" 경고 표시
- 희망 납기일 선택 (`requested_delivery_date`)
- 출고지(지사) 선택 — `organizations`(type=buyer_ship_to)
- 메모 입력
- "발주 요청" → `status: submitted`, `submitted_at` 기록
- **재주문**: 과거 주문에서 "동일 발주" 원클릭 → draft 복제
- **테이블**: `orders`(draft→submitted), `order_items`, `products`

### 7. 내 주문 목록 `/buyer/orders`
- 전체 주문 이력 (필터: 기간, 상태)
- 상태 배지: draft~completed/cancelled
- 주문번호(`order_no`) 클릭 → 상세
- **테이블**: `orders`
- **RLS**: `ordering_org_id` = 내 소속 조직 계층만

### 8. 주문 상세 `/buyer/orders/:id`
- 주문 품목 리스트:
  - `requested_qty` vs `vendor_confirmed_qty` vs `sales_confirmed_qty` vs `final_qty` 비교
  - 품목별 상태 (`status`)
  - 조정 사유 (`decision_note`)
- 상태 타임라인 (`order_events` 기반, 바이어 관련 이벤트만 표시)
- **바이어 의사결정 구간** (status=`needs_buyer_decision`):
  - "유통기한 2026-09-30 로트, 수락하시겠습니까?" → 수락/거절
  - 수량 조정 제안 → 확인/거절
  - 납기일 변경 제안 → 확인/거절
  - → `order_events`에 `buyer_decision_received` 기록
- 인보이스 정보 (`invoices` — 결제 상태, 기한)
- 인보이스 PDF + 관련 서류 다운로드 (`documents`)
- 출하 정보 + 트래킹 (`shipments`)
- **테이블**: `orders`, `order_items`, `order_events`, `invoices`, `shipments`, `documents`

### 9. 바이어 실적 대시보드 `/buyer/analytics`
- 월별/분기별 구매 실적 차트
- 품목별 구매 비중 (파이차트)
- 연간 누적 구매액 (`invoices.total_amount` 집계)
- 전년 대비 성장률
- **테이블**: `orders`, `order_items`, `invoices`

### 10. 문의하기 `/buyer/inquiries`
- 문의 작성 (subject, message)
  - 관련 주문 연결 (`order_id` nullable)
  - 관련 제품 연결 (`product_id` nullable)
  - 우선순위 선택
- 문의 이력 조회 (status별 필터)
- 답변 확인
- **테이블**: `inquiries`
- **RLS**: `buyer_org_id` = 내 조직

### 11. 서류함 `/buyer/documents`
- 내 주문/출하 관련 서류 통합 조회
- 유형별 필터: 인보이스, 패킹리스트, 원산지증명, 트래킹 서류
- 다운로드
- **테이블**: `documents` (owner_type=order/invoice/shipment, owner_id → 내 주문 건)

---

## 🤝 벤더 (Vendor)

### 12. 벤더 대시보드 `/vendor`
- 담당 바이어 목록 (`account_assignments` 기반)
- 바이어별 최근 주문 상태
- 월간 매출 요약 (담당 바이어 합산)
- 커미션 현황: 이번 달 `accrued` / `approved` / `paid`
- 목표 매출 vs 실적 게이지
- **테이블**: `account_assignments`, `orders`, `commissions`

### 13. 바이어 주문 관리 `/vendor/orders`
- 담당 바이어 발주 목록
- `submitted` 상태 건 → 벤더 컨펌 필요 하이라이트
- 품목별 `vendor_confirmed_qty` 입력 (박스 단위, `N boxes × M pcs = total` 표시)
- 컨펌 → `status: vendor_review` → 영업으로 전달
- 반려 → `order_events`에 `vendor_adjusted` + note 기록
- 벤더 없는 거래처 주문은 여기에 안 뜸 (바로 영업으로)
- **테이블**: `orders`, `order_items`, `order_events`

### 14. 매출 모니터링 `/vendor/analytics`
- 바이어별 매출 추이 차트
- 품목별 판매 현황
- 기간별 필터 (월/분기/연)
- 목표 대비 달성률
- **테이블**: `orders`, `order_items`, `invoices`

### 15. 커미션 관리 `/vendor/commissions`
- 주문별 커미션 내역 (`commissions` 테이블)
- 상태별 필터: accrued → approved → paid
- 월별 커미션 합산
- 커미션율/금액: `commission_type`(rate/fixed), `commission_value`, `commission_amount`
- 지급일 (`paid_at`)
- **테이블**: `commissions`
- **RLS**: `vendor_org_id` = 내 조직

### 16. 제품 정보 `/vendor/catalog`
- 카탈로그 동일 (편집 불가, 열람만)
- 국가별 상품 콘텐츠 열람
- 제품 관련 문서 다운로드 (마케팅 자료 등)
- **테이블**: `products`, `product_market_contents`, `documents`

---

## 📊 영업담당자 (Sales) — 운영 Supabase

> CRM/AI/실적분석은 Sales Board 별도 프로젝트. 여기는 **주문 검토용 영업 화면**만.

### 17. 영업 대시보드 `/sales`
- **오늘의 할일**:
  - 컨펌 대기 발주 (`status: sales_review`) 건수
  - 바이어 의사결정 대기 (`needs_buyer_decision`) 건수
  - 미답변 문의 (`inquiries.status: open`) 건수
- 전체 파이프라인 요약 (상태별 발주 건수/금액)
- 재고 경고: `inventory_lots.available_qty` 낮은 품목
- **테이블**: `orders`, `inquiries`, `inventory_lots`

### 18. 발주 검토 목록 `/sales/orders`
- 담당 발주 전체 (필터: 상태, 바이어, 기간)
- 발주 건별 요약:
  - 바이어명, 발주일, 희망납기
  - 품목 수, 총액
  - 상태 배지
  - ⚠️ 재고 부족 경고 아이콘
- **테이블**: `orders`, `organizations`
- **RLS**: `sales_owner_user_id` = 나

### 19. 발주 검토 상세 `/sales/orders/:id`
**이 페이지가 운영의 핵심.**

- **품목별 검토 패널** (모든 수량은 박스 단위):
  | 항목 | 데이터 소스 | 표시 |
  |------|-----------|------|
  | 희망수량 | `order_items.requested_qty` | N boxes (M pcs) |
  | 벤더 확인수량 | `order_items.vendor_confirmed_qty` | N boxes (M pcs) |
  | 영업 확인수량 | `order_items.sales_confirmed_qty` | N boxes (M pcs) |
  | 가용재고 (lot별) | `inventory_lots` (available_qty, expiry_date, confidence_status) | 박스 환산 표시 |
  | 생산예정 | `supply_plans` (plan_type, expected_available_date, planned_qty) | 박스 환산 표시 |

- **lot 선택 UI**:
  - lot별 유통기한, 가용수량, 신뢰도(`confidence_status`) 표시
  - 자동 추천 (FIFO + 유통기한 여유 기준) + 수동 변경
  - 유통기한 보더라인 → 🟡 경고 표시

- **재고 부족 대응**:
  - `allocation_type: stock` → 현재 재고 할당
  - `allocation_type: production` → 생산 예정 할당 (납기 조정 필요)
  - `allocation_type: mixed` → 일부 현재 + 일부 생산예정

- **수량 조정**: `sales_confirmed_qty` 입력, 사유 필수 (`decision_note`)
- **납기 조정**: `confirmed_delivery_date` 설정

- **액션 버튼**:
  - "전체 컨펌" → `status: confirmed`, `confirmed_at` 기록
  - "부분 컨펌" → 아이템별 status 분기
  - "바이어 협의 요청" → `status: needs_buyer_decision` + `order_events: buyer_decision_requested`

- **모든 조정은 `order_events`에 기록** (감사 추적)

- **테이블**: `orders`, `order_items`, `order_events`, `inventory_lots`, `supply_plans`

### 20. 인보이스 관리 `/sales/invoices`
- 인보이스 생성: 확정된 주문 → 자동 품목/금액 매핑
  - `invoice_no` 자동 채번
  - `subtotal_amount`, `tax_amount`, `total_amount`
  - `payment_terms` 설정 (Net 30, T/T 등)
  - `due_date` 설정
- PDF 생성 → `documents`(owner_type=invoice)에 저장
- 이메일 발송
- 결제 상태 추적: `payment_status` (pending → partial → paid / overdue)
- **테이블**: `invoices`, `orders`, `order_items`, `documents`

### 21. 문의 관리 `/sales/inquiries`
- 담당 바이어 문의 리스트 (`assignee_user_id` = 나)
- 미답변 건 하이라이트 (`status: open`)
- 답변 작성
- 상태 관리: open → in_progress → answered → closed
- **테이블**: `inquiries`

---

## 📦 물류담당자 (Logistics)

### 22. 물류 대시보드 `/logistics`
- 확정 주문 중 출하 미생성 건 목록 (`orders.status: confirmed`, shipment 미연결)
- 진행 중 출하 현황 (preparing → packed → shipped)
- 오늘/이번 주 ETD 예정 건
- **테이블**: `orders`, `shipments`

### 23. 출하 관리 `/logistics/shipments`
- 확정 주문 → 출하 건 생성
  - `shipment_no` 자동 채번
  - `destination_org_id` (출고지 = buyer_ship_to)
  - 포워더, 선적 방법, ETD, ETA
  - `origin_country_code`
- 출고지별 분류 뷰
- 트래킹 번호 입력 (`tracking_no`)
- 상태 관리: preparing → packed → shipped → in_transit → delivered
- **테이블**: `shipments`, `orders`

### 24. 팔레트 적재 `/logistics/shipments/:id/packing`
**물류 핵심 기능.**

- **팔레트 생성**: `pallet_no` 채번, 팔레트 규격 선택
  - **기본 팔레트 규격: 1100mm × 1100mm** (표준)
  - 팔레트별 **적재 높이(mm)만 입력** → 팔레트 CBM 자동 계산
  - `pallet_cbm = 1.1 × 1.1 × (height_mm / 1000)`
  - 커스텀 팔레트 규격 지원 (W × D 변경 가능)

- **📦 CBM 이중 표시** (박스 기준 vs 팔레트 기준):
  - **박스 CBM**: 개별 박스 사이즈 기반 (기존)
  - **팔레트 CBM**: 실제 적재 높이 기반 (현장 실측)
  - ⚠️ 두 값 차이 10% 이상이면 경고 표시
  - **최종 CBM = 팔레트 CBM** (실제 선적 기준)

- **적재 시뮬레이션**:
  - 제품별 `case_length × case_width × case_height` 로드
  - 팔레트 규격 대비 적재 배치 (2D 뷰 / 향후 3D)
  - `simulation_json`에 결과 저장
  - 총중량 자동 계산 (`gross_weight`, `net_weight`)

- **📸 패킹 완료 사진 업로드**:
  - 팔레트별 사진 촬영 후 업로드 (다중 이미지)
  - 패킹 전/후 사진 구분 태그
  - `documents`(owner_type=shipment_pallet, type=packing_photo)에 저장
  - 바이어/벤더에게 사진 공유 가능 (선택)

- **lot 매칭 + 유통기한**:
  - `inventory_lots` → `shipment_pallet_items` 자동 매칭 (FIFO)
  - `expiry_date_snapshot` 기록
  - 전산재고 불확실(`confidence_status: low`) → `manual_override: true`, `override_reason` 입력
  - `packed_case_qty`, `packed_unit_qty` 입력

- **📦 낱개(비완박스) 처리**:
  - `is_partial_case: true` 플래그 → 박스 해체 출고 건
  - 낱개 수량 직접 입력 (`packed_unit_qty` 수동, `packed_case_qty = 0`)
  - **낱개 CBM 자동 보정**: `unit_cbm = case_cbm / units_per_case × packed_unit_qty`
  - 패킹 요약에 "⚠️ 비완박스 포함" 표시
  - 사유 입력 필수 (`partial_reason`)

- **쉬핑마크 자동 발급**:
  - 팔레트별 `shipping_mark` 생성 (바이어 정보 + 유통기한 + 로트)
  - `earliest_expiry_date`, `latest_expiry_date` 자동 집계
  - PDF 생성 → `documents`(owner_type=shipment_pallet, type=shipping_mark)

- **테이블**: `shipment_pallets`, `shipment_pallet_items`, `inventory_lots`, `products`, `documents`

### 25. 패킹리스트 `/logistics/shipments/:id/packing-list`
- **📊 패킹 요약 — 실수량 표시** (0 표시 방지):
  - 총수량(pcs): `Σ packed_unit_qty` (실제 출고 낱개)
  - 총박스(cases): `Σ packed_case_qty` (완박스만)
  - 총금액: `Σ (unit_price × packed_unit_qty)` (실제 출고분 기준)
  - 비완박스 건은 별도 행으로 표시
- **🗂️ 행선지별 요약**:
  - `destination_org_id`(buyer_ship_to) 기준 그룹핑
  - 행선지별 소계: 수량, 박스, CBM, 금액
  - 행선지별 팔레트 목록
- **🔲 팔레트별 요약**:
  - 팔레트 번호 → 적재 품목/수량/lot/유통기한
  - 팔레트 CBM, 팔레트 중량
  - 패킹 사진 썸네일 (있으면)
- PDF 생성 → `documents`(owner_type=shipment, type=packing_list)
- **테이블**: `shipment_pallets`, `shipment_pallet_items`, `documents`

### 26. 서류 관리 `/logistics/shipments/:id/documents`
- **📄 서류 유형별 업로드/관리**:
  - ✅ 원산지 증명서(COO) — 발급/업로드
  - ✅ B/L (선하증권) — 업로드
  - ✅ 인보이스 — 연결 (§20에서 생성된 건)
  - ✅ 패킹리스트 — 자동 생성 (§25)
  - ✅ 통관 서류 — 업로드
  - ✅ 포워더 발급 서류 — 업로드
  - ✅ 트래킹 문서 — 업데이트
  - ✅ 패킹 사진 — 팔레트별 (§24에서 업로드된 건)
- 모든 서류 → `documents`(owner_type=shipment)
- 버전 관리 (`version_no`)
- **바이어 공유 토글**: 서류별 바이어 열람 허용 여부 (`is_buyer_visible`)
- **테이블**: `documents`

---

## ⚙️ 총괄 관리자 (Admin)

### 27. 관리자 대시보드 `/admin`
- 전사 주문 파이프라인 (상태별 건수/금액)
- 매출 요약 (일/주/월)
- 재고 현황: 부족 품목, 유통기한 임박 lot
- MES 동기화 상태 (`inventory_lots.snapshot_at`, `supply_plans.status`)
- **테이블**: `orders`, `invoices`, `inventory_lots`, `supply_plans`

### 28. 사용자 관리 `/admin/users`
- 전체 사용자 CRUD
- 역할 배정/변경 (`role`)
- 조직 배정 (`org_id`)
- 바이어 가입 승인 (`status: active/inactive`)
- **테이블**: `users`

### 29. 조직 관리 `/admin/organizations`
- 조직 트리 뷰 (parent_org_id 기반)
  - internal → vendor → buyer_country → buyer_company → buyer_ship_to
- 조직 CRUD (code, name, country_code, currency_code)
- 조직별 사용자 조회
- **테이블**: `organizations`, `users`

### 30. 거래처 배정 `/admin/assignments`
- `account_assignments` 관리
- 바이어 조직 ↔ 벤더 조직 ↔ 담당 영업 ↔ 담당 물류 매핑
- 커미션 규칙 설정 (type: rate/fixed, value, effective 기간)
- **테이블**: `account_assignments`

### 31. 제품 관리 `/admin/products`
- 제품 CRUD (마스터 + 물류 규격)
- **📦 패킹 규격 관리** (신제품 등록/기존 제품 업데이트):
  - 입수량 (`units_per_case`)
  - 박스 사이즈 (`case_length × case_width × case_height` mm)
  - 박스 CBM (자동 계산 또는 수동 입력)
  - 순중량 (`net_weight`), 총중량 (`gross_weight`)
  - 바코드 (`barcode`), HS코드 (`hs_code`)
  - ⚠️ 필수 물류 규격 미입력 제품 → 경고 배지 (발주/패킹 시 문제 발생)
- 국가별 콘텐츠 관리 (`product_market_contents`)
- 제품 문서/이미지 업로드 (`documents`)
- `extra_json` 활용한 추가 속성
- **테이블**: `products`, `product_market_contents`, `documents`

### 32. 재고 현황 `/admin/inventory`
- 전체 재고 현황 (`inventory_lots`)
  - 제품별, 창고별, lot별 조회
  - 유통기한 임박 건 하이라이트
  - `confidence_status` 표시 (🟢high / 🟡medium / 🔴low)
- 생산 예정 현황 (`supply_plans`)
  - plan_type별 (production/inbound)
  - 예상 가용일, 수량
- MES 동기화 상태 (`snapshot_at`)
- 수동 동기화 트리거 버튼
- **테이블**: `inventory_lots`, `supply_plans`

### 33. 전체 주문 관리 `/admin/orders`
- 모든 주문 조회 (필터: 바이어, 영업, 벤더, 상태, 기간)
- 주문 상태 강제 변경 (비상시, `order_events`에 admin 기록)
- 주문 통계/리포트
- **테이블**: `orders`, `order_items`, `order_events`

### 34. 정산 관리 `/admin/finance`
- **인보이스**:
  - 전체 인보이스 목록
  - 결제 현황 (`payment_status`)
  - 미수금 관리 (overdue 건 하이라이트)
- **커미션**:
  - 전체 커미션 내역
  - 상태 일괄 변경 (accrued → approved → paid)
  - 지급 처리 (`paid_at` 기록)
- 정산 리포트 (기간별, 벤더별)
- **테이블**: `invoices`, `commissions`

### 35. 시스템 설정 `/admin/settings`
- 주문번호 채번 규칙 (`order_no` 포맷)
- 인보이스 번호 채번 규칙
- 이메일 알림 설정
- MES 동기화 설정 (주기, 필터, 대상 테이블)
- 다국어 설정
- 환율 관리

---

## 📱 알림 시스템 (공통 인프라)

| 이벤트 | 수신자 | 채널 | event_type |
|--------|--------|------|-----------|
| 새 발주 접수 | 벤더, 영업 | 이메일+인앱 | `submitted` |
| 벤더 컨펌/조정 | 영업 | 인앱 | `vendor_approved`/`vendor_adjusted` |
| 영업 컨펌/조정 | 바이어 | 이메일+인앱 | `sales_approved`/`sales_adjusted` |
| 바이어 의사결정 요청 | 바이어 | 이메일+인앱 | `buyer_decision_requested` |
| 바이어 의사결정 응답 | 영업 | 인앱 | `buyer_decision_received` |
| 재고 부족 감지 | 영업, 관리자 | 인앱 | `inventory_shortage` |
| 유통기한 경고 | 영업 | 인앱 | `expiry_warning` |
| 인보이스 발행 | 바이어 | 이메일 | `invoice_issued` |
| 출하 완료 | 바이어, 벤더 | 이메일+인앱 | `shipment_confirmed` |
| 결제 기한 임박 | 바이어, 관리자 | 이메일 | (cron 기반) |

> 알림은 `order_events` 기반으로 트리거. 별도 `notifications` 테이블은 MVP 이후.

---

## 🚀 Sales Board (별도 프로젝트, MVP 이후)

운영 Supabase에서 **단방향 projection** 받아서 동작.

### SB-1. 영업 CRM `/sales-board/crm`
- 바이어 카드: 거래 요약, 마지막 활동일
- 구매 패턴 분석 (AI)
- 신제품 추천 (바이어 이력 기반)
- 레터 초안 자동 생성
- 재발주 타이밍 알림

### SB-2. 영업 실적 `/sales-board/analytics`
- 바이어별 매출 차트
- 품목별 판매 순위
- 월별/분기별 실적 추이
- 목표 달성률
- 벤더별 커미션 요약

### SB-3. 세일즈 캠페인 `/sales-board/campaigns`
- 캠페인 생성 (타겟 바이어 그룹)
- 레터/제안서 발송
- 성과 추적

### SB-4. AI Agentic Sales `/sales-board/ai`
- 구매 패턴 기반 자동 제안
- 이탈 예측 알림
- 적정 발주 타이밍 추천

### SB-5. 화상미팅 `/sales-board/meetings` *(MVP+)
- 바이어 캘린더 예약
- 영업 진행
- 실시간 통역 시스템
- 미팅 노트/녹취록

> Sales Board 테이블: `crm_activities`, `sales_campaigns`, `ai_sales_actions`, `meetings`, `meeting_participants`, `meeting_transcripts`

---

## 페이지 수 요약

| 영역 | 페이지 수 | 프로젝트 |
|------|----------|---------|
| 공통 | 4 | 운영 Supabase |
| 바이어 | 7 | 운영 Supabase |
| 벤더 | 5 | 운영 Supabase |
| 영업 (주문 검토) | 5 | 운영 Supabase |
| 물류 | 5 | 운영 Supabase |
| 관리자 | 9 | 운영 Supabase |
| **운영 합계** | **35** | |
| Sales Board (MVP 이후) | 5+ | Sales Board |

### MVP 1차 (핵심 플로우)
```
공통 4 + 바이어 발주 4 + 영업 검토 3 + 물류 기본 3 + 관리자 기본 5 = 19페이지
```
이것만 돌면: 카탈로그 조회 → 발주 → 벤더/영업 검토 → 인보이스 → 출하 → 서류

### MVP 2차 (운영 안정화)
```
바이어 실적/문의/서류 + 벤더 전체 + 관리자 정산 = +16페이지
```

### Phase 2 (Sales Board)
```
CRM + 실적 + 캠페인 + AI + 미팅 = 별도 프로젝트
```
