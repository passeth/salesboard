# Salesboard v2 — DB Schema (RISE 설계안)

> 원칙: 최소 테이블, 최대 커버리지. 과도한 정규화 지양.

---

## 전체 구조 (17 테이블)

```
┌─ 사용자/조직 ────────────────────────────┐
│  users · organizations · vendor_assignments │
├─ 제품 ──────────────────────────────────┤
│  products · product_locales · product_media │
├─ 재고 ──────────────────────────────────┤
│  inventory                                  │
├─ 주문 ──────────────────────────────────┤
│  orders · order_items · order_events        │
├─ 정산 ──────────────────────────────────┤
│  invoices · commissions                     │
├─ 물류 ──────────────────────────────────┤
│  shipments · pallets · pallet_items         │
│  shipping_documents                         │
├─ CRM ───────────────────────────────────┤
│  inquiries · meetings                       │
└─────────────────────────────────────────┘
```

---

## 1. 사용자 & 조직

### `users`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | Supabase Auth uid |
| role | enum | `buyer`, `vendor`, `sales`, `logistics`, `admin` |
| org_id | uuid FK → organizations | 소속 조직 |
| name | text | |
| email | text UNIQUE | |
| phone | text | |
| avatar_url | text | |
| is_active | boolean | |
| created_at | timestamptz | |

> RLS: 모든 쿼리에 `auth.uid()` 기반 필터 강제

### `organizations`
바이어 계층: 국가 → 업체 → 하위발주처(지사)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| parent_id | uuid FK → self | 상위 조직 (NULL = 최상위) |
| type | enum | `country`, `company`, `branch` |
| name | text | |
| country_code | text | ISO 3166-1 (KR, US, VN...) |
| address | jsonb | 주소 상세 |
| contact_info | jsonb | 대표 연락처 |
| created_at | timestamptz | |

> 셀프 참조로 3단 계층 표현. 별도 테이블 없이 깔끔.
> 예: 🇻🇳 Vietnam (country) → ABC Corp (company) → Hanoi Branch (branch)

### `vendor_assignments`
벤더 ↔ 바이어 매핑 + 영업 담당 배정

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| vendor_id | uuid FK → users | 벤더 |
| buyer_org_id | uuid FK → organizations | 담당 바이어 조직 |
| sales_user_id | uuid FK → users | 담당 영업사원 |
| commission_rate | numeric(5,2) | 커미션 비율 (%) |
| is_active | boolean | |
| created_at | timestamptz | |

> 벤더가 없는 바이어 → vendor_id NULL, sales_user_id 직접 배정

---

## 2. 제품

### `products`
마스터 + 물류 규격 통합 (분리 불필요한 1:1 관계)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| sku | text UNIQUE | 품목코드 |
| name_ko | text | 품목명 (한국어) |
| name_en | text | 품목명 (영어) |
| volume | text | 용량 (200ml 등) |
| barcode | text | |
| qr_code | text | (향후) |
| category | text | 제품 카테고리 |
| brand | text | 브랜드 |
| --- 물류 규격 --- | | |
| cbm | numeric(8,4) | 단위 CBM |
| net_weight_kg | numeric(8,3) | 순중량 |
| gross_weight_kg | numeric(8,3) | 총중량 |
| units_per_case | integer | 입수량 (낱개/박스) |
| case_size | jsonb | 박스 사이즈 {l, w, h, unit} |
| hs_code | text | HS코드 (수출용) |
| is_active | boolean | |
| created_at | timestamptz | |

> **설계 판단**: 물류 규격을 별도 테이블로 빼면 매번 JOIN 필요. 
> 1:1 관계이므로 한 테이블에 통합. 컬럼 수 많아도 성능 이슈 없음.

### `product_locales`
국가별 성분표기, 사용법 (1:N)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| product_id | uuid FK → products | |
| country_code | text | 대상 국가 |
| ingredients_text | text | 전성분 표기 |
| usage_instructions | text | 사용법 |
| warnings | text | 주의사항 |
| regulatory_info | jsonb | 규제 정보 (인증, 등록번호 등) |

> UNIQUE(product_id, country_code)

### `product_media`
이미지, 컨텐츠 (1:N)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| product_id | uuid FK → products | |
| type | enum | `image`, `video`, `document`, `content` |
| url | text | Storage URL |
| sort_order | integer | 정렬 |
| label | text | 라벨 (thumbnail, detail, catalog...) |

---

## 3. 재고 (MES 동기화)

### `inventory`
MES에서 동기화. Lot 기반 유통기한 관리.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| product_id | uuid FK → products | |
| lot_number | text | 로트 번호 |
| qty_available | integer | 출고 가능 수량 |
| qty_reserved | integer | 예약(발주 확정) 수량 |
| expiry_date | date | 유통기한 |
| manufactured_date | date | 제조일 |
| production_status | enum | `in_stock`, `in_production`, `planned` |
| expected_date | date | 생산 예정일 (planned일 때) |
| synced_at | timestamptz | MES 마지막 동기화 시각 |

> UNIQUE(product_id, lot_number)
> 영업이 발주 검토 시: qty_available, expiry_date, production_status 종합 판단

---

## 4. 주문

### `orders`
발주 건 단위

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| order_number | text UNIQUE | 자동 채번 (SB-2026-0001) |
| buyer_user_id | uuid FK → users | 발주자 |
| buyer_org_id | uuid FK → organizations | 발주 조직 |
| vendor_id | uuid FK → users | 벤더 (nullable) |
| sales_user_id | uuid FK → users | 담당 영업 |
| status | enum | 아래 상태머신 참조 |
| requested_delivery_date | date | 희망 납기일 |
| confirmed_delivery_date | date | 확정 납기일 |
| currency | text | USD, EUR... |
| total_amount | numeric(12,2) | 총액 |
| notes | text | 바이어 메모 |
| internal_notes | text | 내부 메모 (바이어 불가시) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**상태 머신:**
```
draft → submitted → vendor_review → sales_review 
  → confirmed → invoiced → packing → shipped → delivered
  
분기:
  sales_review → negotiation (수량/납기/유통기한 조정)
  negotiation → sales_review (재검토)
  any → cancelled
```

### `order_items`
발주 품목별 상세 + 조정 이력

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| product_id | uuid FK → products | |
| qty_requested | integer | 바이어 희망 수량 |
| qty_confirmed | integer | 확정 수량 |
| unit_price | numeric(10,2) | 단가 |
| lot_number | text | 매칭된 로트 (nullable) |
| expiry_date | date | 해당 로트 유통기한 |
| adjustment_reason | text | 수량 조정 사유 |
| status | enum | `pending`, `confirmed`, `partial`, `rejected` |

### `order_events`
상태 변경 + 협의 히스토리 (감사 추적)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| actor_id | uuid FK → users | 누가 |
| event_type | text | `status_change`, `qty_adjust`, `date_adjust`, `note`, `expiry_decision` |
| from_value | text | 변경 전 |
| to_value | text | 변경 후 |
| comment | text | 코멘트 |
| created_at | timestamptz | |

> 바이어-영업 간 네고 과정이 전부 기록됨. 분쟁 방지.

---

## 5. 정산

### `invoices`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| invoice_number | text UNIQUE | |
| order_id | uuid FK → orders | |
| issued_by | uuid FK → users | 발행자 (영업) |
| issued_at | timestamptz | |
| due_date | date | 결제 기한 |
| currency | text | |
| subtotal | numeric(12,2) | |
| tax | numeric(12,2) | |
| total | numeric(12,2) | |
| payment_status | enum | `pending`, `partial`, `paid`, `overdue` |
| payment_terms | text | Net 30, T/T 등 |
| pdf_url | text | 생성된 PDF |

> invoice_items는 별도 테이블 없이 order_items 참조로 충분.
> 인보이스 = 확정된 order의 스냅샷.

### `commissions`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| vendor_id | uuid FK → users | |
| order_id | uuid FK → orders | |
| invoice_id | uuid FK → invoices | |
| rate | numeric(5,2) | 적용 비율 |
| amount | numeric(12,2) | 커미션 금액 |
| status | enum | `pending`, `confirmed`, `paid` |
| paid_at | timestamptz | |

---

## 6. 물류

### `shipments`
출하 건 (1 order → N shipments 가능: 분할 출하)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| shipment_number | text UNIQUE | |
| destination_org_id | uuid FK → organizations | 출고지 (지사) |
| forwarder | text | 포워더사 |
| tracking_number | text | |
| shipping_method | text | FCL, LCL, Air 등 |
| etd | date | 출항 예정 |
| eta | date | 도착 예정 |
| status | enum | `preparing`, `packed`, `shipped`, `in_transit`, `delivered` |
| created_at | timestamptz | |

### `pallets`
팔레트 단위 관리

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| shipment_id | uuid FK → shipments | |
| pallet_number | text | 팔레트 번호 (1, 2, 3...) |
| shipping_mark | text | 쉬핑마크 (자동생성 + 수기조정) |
| total_cbm | numeric(8,4) | |
| total_weight_kg | numeric(8,3) | |
| pallet_size | jsonb | {l, w, h} |

### `pallet_items`
팔레트별 적재 품목 (lot 매칭 + 유통기한)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| pallet_id | uuid FK → pallets | |
| product_id | uuid FK → products | |
| lot_number | text | |
| expiry_date | date | 유통기한 (쉬핑마크 기재용) |
| qty | integer | |
| cases | integer | 카툰 수 |

> 쉬핑마크 자동생성: pallet_items의 lot→expiry_date로 매칭
> 전산재고 불확실 시 수기 조정 가능 (shipping_mark 필드 직접 편집)

### `shipping_documents`
출하 관련 서류 통합 관리

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| shipment_id | uuid FK → shipments | |
| type | enum | `packing_list`, `certificate_of_origin`, `bl`, `invoice`, `customs`, `other` |
| file_url | text | Storage URL |
| issued_at | timestamptz | |
| notes | text | |

---

## 7. CRM

### `inquiries`
바이어 → 영업 문의

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| from_user_id | uuid FK → users | |
| to_user_id | uuid FK → users | 담당 영업 |
| subject | text | |
| message | text | |
| status | enum | `open`, `in_progress`, `resolved` |
| order_id | uuid FK → orders | 관련 주문 (nullable) |
| created_at | timestamptz | |

### `meetings`
화상미팅 (MVP 이후)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| requested_by | uuid FK → users | 요청자 (바이어) |
| host_user_id | uuid FK → users | 진행자 (영업) |
| scheduled_at | timestamptz | |
| duration_min | integer | |
| status | enum | `requested`, `confirmed`, `completed`, `cancelled` |
| meeting_url | text | 화상회의 링크 |
| translation_langs | text[] | 통역 언어 쌍 |
| notes | text | |

---

## RLS 정책 요약

| 테이블 | 바이어 | 벤더 | 영업 | 물류 | 관리자 |
|--------|--------|------|------|------|--------|
| users | 자기만 | 담당 바이어 | 담당 바이어 | - | 전체 |
| organizations | 자기 조직 | 담당 조직 | 담당 조직 | - | 전체 |
| products | 전체 (R) | 전체 (R) | 전체 (RW) | 전체 (R) | 전체 |
| inventory | 가용여부만 | 가용여부만 | 전체 | 전체 | 전체 |
| orders | 자기 주문 | 담당 바이어 주문 | 담당 주문 | 확정 주문 | 전체 |
| invoices | 자기 건 | 담당 건 | 발행 가능 | 조회 | 전체 |
| commissions | ❌ | 자기 건 | 조회 | ❌ | 전체 |
| shipments | 자기 건 | 자기 건 | 조회 | 전체 (RW) | 전체 |
| inquiries | 자기 건 | ❌ | 담당 건 | ❌ | 전체 |

---

## 동기화 전략 (MES → Salesboard)

```
[MES commerce DB]
  products → Salesboard products (sku, name, volume, barcode, 물류규격)
  inventory → Salesboard inventory (lot, qty, expiry)
  
방식: Cron (10분 간격) → Edge Function
필터: 원가(cost) 절대 미동기화
방향: MES → Salesboard 단방향
```

---

## ERD 요약

```
organizations (셀프참조 계층)
  └── users
       ├── orders ──→ order_items ──→ products
       │    ├── order_events
       │    ├── invoices ──→ commissions  
       │    └── shipments ──→ pallets ──→ pallet_items
       │         └── shipping_documents
       ├── inquiries
       └── meetings

vendor_assignments (vendor ↔ buyer_org ↔ sales)

products
  ├── product_locales (국가별)
  ├── product_media (이미지/컨텐츠)
  └── inventory (lot 기반, MES 동기화)
```

---

## 설계 포인트

### 왜 17개인가
- 이보다 줄이면 jsonb 남용 → 쿼리 성능/RLS 관리 어려움
- 이보다 늘리면 JOIN 지옥 → 개발 복잡도 증가
- **딱 필요한 만큼**

### 제품 테이블 분리 판단
- `products` (마스터+물류규격): 1:1이므로 통합 ✅
- `product_locales` (국가별): 1:N이므로 분리 ✅
- `product_media` (이미지): 1:N이므로 분리 ✅

### 주문 플로우 핵심
- `order_items.qty_requested` vs `qty_confirmed` → 수량 조정 추적
- `order_events` → 모든 네고/조정/상태변경 기록 (감사 로그)
- `inventory.production_status` → 생산예정 재고 출고 시 납기 조정 근거

### 물류 복잡성 해결
- 팔레트별 적재 → `pallet_items`에서 lot/expiry 매칭
- 쉬핑마크 = `pallets.shipping_mark` (자동생성 후 수기조정 가능)
- 출고지 분류 = `shipments.destination_org_id`
- 서류 통합 = `shipping_documents.type`으로 구분

### AI Driven Agentic Sales (향후)
- `orders` + `order_events` 데이터 → AI가 패턴 분석
- `inquiries` → AI 자동 응답 초안
- CRM 레터/제안 → AI가 바이어 구매 이력 기반 추천
- 별도 테이블 추가 없이 기존 데이터로 가능 (AI 레이어는 앱 로직)
