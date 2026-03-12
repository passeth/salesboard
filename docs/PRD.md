# PRD — Trade Intel (B2B Export Salesboard)

> Product Requirements Document v1.0
> 작성일: 2026-03-12
> 작성: RISE + Codex (합본)
> 결정자: passeth

---

## 1. 개요

### 1.1 제품 정의
에바스코스메틱의 B2B 수출 발주 관리 플랫폼. 해외 바이어가 제품을 발주하고, 벤더/영업/물류/관리부가 주문을 처리하는 통합 시스템.

### 1.2 왜 만드는가
- 현재: 이메일/카톡/엑셀 기반 수주 → 누락, 지연, 추적 불가
- 목표: 발주부터 출하까지 **한 곳에서** 처리, 모든 이해관계자가 실시간 현황 파악

### 1.3 핵심 가치
| 이해관계자 | 핵심 가치 |
|-----------|----------|
| 바이어 | 셀프서비스 발주, 내 주문/서류 즉시 확인 |
| 벤더 | 담당 바이어 주문 관리, 커미션 투명성 |
| 영업 | 재고/유통기한/생산예정 종합 검토, 빠른 컨펌 |
| 물류 | 팔레트 적재 시뮬레이션, 쉬핑마크/패킹리스트 자동화 |
| 관리부 | 전사 현황 파악, 정산 관리 |

---

## 2. 사용자 역할

### 2.1 역할 정의

| 역할 | 설명 | 접근 범위 |
|------|------|----------|
| **Buyer** | 해외 바이어 (국가→업체→지사 계층) | 자기 조직 데이터만 |
| **Vendor** | 바이어-회사 중개자 (커미션 있음, 없을 수도 있음) | 담당 바이어 데이터 |
| **Sales** | 영업담당자 | 담당 거래처 주문/재고 |
| **Logistics** | 물류담당자 | 확정 주문 출하 처리 |
| **Admin** | 총괄 관리자 | 전체 |

### 2.2 조직 계층
```
국가 (buyer_country)
 └── 업체 (buyer_company)
      └── 하위발주처/지사 (buyer_ship_to)
```
- 벤더: 독립 조직 (vendor)
- 내부: 에바스코스메틱 (internal)

### 2.3 거래처 배정
- `account_assignments`로 바이어↔벤더↔영업↔물류 매핑
- 벤더 없는 바이어 → 영업 직결
- 커미션 규칙: rate(%) 또는 fixed(정액), 유효기간 설정

---

## 3. 시스템 아키텍처

### 3.1 프로젝트 분리 (3-tier)

```
┌──────────────┐     mirror      ┌──────────────┐    projection    ┌──────────────┐
│   MES/ERP    │ ──────────────→ │   Supabase   │ ──────────────→ │  Sales Board │
│  (원천 재고)  │   단방향 동기화   │  (운영 코어)  │   단방향 동기화   │  (CRM/AI)    │
└──────────────┘                 └──────────────┘                  └──────────────┘
  재고, lot,                      주문, 출고,                       영업 활동,
  생산 예정                        정산, 문의                        실적 분석,
                                                                   AI 제안
```

### 3.2 기술 스택
| 계층 | 기술 |
|------|------|
| Frontend | Next.js 15 + React + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Hosting | Vercel |
| DB 스키마 | 17 테이블 (mvp-data-model.md 참조) |
| 디자인 | Figma + MCP 연동 |
| 개발 도구 | Codex (코딩) + Claude (UI) + fd 스킬 (릴레이) |

### 3.3 데이터 동기화
- **MES → Supabase**: Cron (10분) 또는 Webhook, `inventory_lots` + `supply_plans` 업서트
- **Supabase → Sales Board**: confirmed 주문/출고/매출 이벤트만 projection
- **원칙**: 원가 데이터 절대 미동기화, 각 프로젝트 소유 데이터만 수정

### 3.4 보안
- **RLS (Row Level Security)**: 모든 테이블에 역할별 정책 적용
- **바이어 데이터 격리**: `auth.uid()` 기반, IDOR 원천 차단
- **MES DB 분리**: 바이어가 내부 원가/재고 원본에 접근 불가

---

## 4. 핵심 기능 요구사항

### 4.1 제품 카탈로그

**FR-CAT-01**: 제품 그리드/리스트 뷰 전환
**FR-CAT-02**: 브랜드/카테고리/SKU/바코드 필터 및 검색
**FR-CAT-03**: 제품 상세 — 이미지, 기본정보, 물류규격
**FR-CAT-04**: 국가별 탭 — 현지 상품명, 성분표기, 사용법 (product_market_contents)
**FR-CAT-05**: 제품 관련 문서 다운로드 (documents)

### 4.2 발주 (Order)

**FR-ORD-01**: 장바구니 = draft 주문 (별도 cart 테이블 없음)
**FR-ORD-02**: **📦 박스(case) 단위 주문 필수** — 모든 수량은 박스 단위로만 입력
  - 입력 UI: `[N] boxes × [units_per_case] pcs = [total] pcs` 실시간 표시
  - 최소 주문: 1 box, 낱개 주문 불가
  - `requested_qty` = 박스 수, `requested_unit_qty` = 박스 수 × units_per_case (자동 계산, 저장)
  - units_per_case 미등록 제품 → "입수량 확인 필요" 경고, 주문은 가능하되 pcs 미표시
**FR-ORD-03**: 희망 납기일 선택
**FR-ORD-04**: 출고지(buyer_ship_to) 선택
**FR-ORD-05**: 발주 요청 → status: submitted, submitted_at 기록
**FR-ORD-06**: 재주문 — 과거 주문 복제 원클릭
**FR-ORD-07**: 팔레트/컨테이너 요약 자동 표시
  - 총 박스 수, 총 CBM, 예상 팔레트 수, 컨테이너 타입 추천
  - 발주 전 물류비 감각 제공 (바이어가 수량 조절 유도)

### 4.3 주문 상태 머신

```
draft → submitted → vendor_review → sales_review
  → confirmed → invoiced → partially_shipped → shipped → completed

분기:
  sales_review → needs_buyer_decision (수량/납기/유통기한 협의)
  needs_buyer_decision → sales_review (바이어 응답 후 재검토)
  any → cancelled / rejected
```

### 4.4 벤더 검토

**FR-VND-01**: 담당 바이어 발주 목록 조회
**FR-VND-02**: 품목별 vendor_confirmed_qty 입력
**FR-VND-03**: 컨펌 → vendor_review → sales_review 전달
**FR-VND-04**: 벤더 없는 거래처 → submitted → 바로 sales_review

### 4.5 영업 검토 ⭐ (핵심 기능)

**FR-SAL-01**: 품목별 검토 패널
  - 희망수량 vs 벤더확인수량 vs 가용재고(lot별) vs 생산예정
  - 유통기한, confidence_status(high/medium/low) 표시

**FR-SAL-02**: lot 선택
  - 자동 추천 (FIFO + 유통기한 여유)
  - 수동 변경 가능
  - 유통기한 보더라인 → 경고

**FR-SAL-03**: 재고 부족 대응
  - allocation_type: stock (현재 재고) / production (생산 예정) / mixed
  - 생산 예정 할당 시 납기 자동 조정 제안

**FR-SAL-04**: 수량/납기 조정
  - sales_confirmed_qty 입력, 사유(decision_note) 필수
  - confirmed_delivery_date 설정

**FR-SAL-05**: 바이어 협의 요청
  - needs_buyer_decision 상태 전환
  - order_events에 buyer_decision_requested 기록

**FR-SAL-06**: 4단계 수량 추적
  - requested_qty → vendor_confirmed_qty → sales_confirmed_qty → final_qty

**FR-SAL-07**: 모든 조정/결정 → order_events에 감사 로그 기록

### 4.6 인보이스

**FR-INV-01**: 확정 주문 → 인보이스 생성 (품목/금액 자동 매핑)
**FR-INV-02**: 결제 조건 설정 (payment_terms: Net 30, T/T 등)
**FR-INV-03**: PDF 생성 → documents에 저장
**FR-INV-04**: 결제 상태 추적 (pending → partial → paid / overdue)

### 4.7 커미션

**FR-COM-01**: 주문 확정 시 커미션 자동 산정 (account_assignments 기반)
**FR-COM-02**: 주문 헤더에 snapshot (계약 기준값)
**FR-COM-03**: commissions 테이블에 정산 lifecycle 기록 (accrued → approved → paid)
**FR-COM-04**: 벤더 포탈에서 커미션 현황 조회

### 4.8 출하/물류

**FR-SHP-01**: 확정 주문 → 출하 건 생성 (1 order → N shipments 분할 가능)
**FR-SHP-02**: 포워더, 선적방법(FCL/LCL/Air), ETD/ETA 입력
**FR-SHP-03**: 출고지별 분류

**FR-PLT-01**: 팔레트 생성 + 적재 시뮬레이션
  - **기본 팔레트 규격: 1100mm × 1100mm** (커스텀 변경 가능)
  - **높이만 입력 → 팔레트 CBM 자동 계산**: `pallet_cbm = W × D × H(m)`
  - 카툰 사이즈(case_length × case_width × case_height) 기반 박스 CBM도 동시 표시
  - **최종 CBM = 팔레트 CBM** (실제 선적 기준), 박스 CBM은 참고용
  - 총중량 자동 계산

**FR-PLT-02**: lot 매칭 + 유통기한
  - inventory_lots → shipment_pallet_items 자동 매칭 (FIFO)
  - expiry_date_snapshot 기록
  - 전산재고 불확실(confidence_status: low) → manual_override 허용

**FR-PLT-03**: 쉬핑마크 자동 발급
  - 팔레트별 shipping_mark (바이어 정보 + 유통기한 + 로트)
  - earliest/latest_expiry_date 자동 집계
  - PDF 생성

**FR-PLT-04**: 📸 패킹 완료 사진 업로드
  - 팔레트별 다중 이미지 업로드 (전/후 태그)
  - documents(owner_type=shipment_pallet, type=packing_photo) 저장
  - 바이어/벤더 공유 옵션

**FR-PLT-05**: 📦 비완박스(낱개) 출고 처리
  - `is_partial_case: true` → 박스 해체 출고 건 표시
  - 낱개 수량 직접 입력 (packed_unit_qty 수동)
  - 낱개 CBM 자동 보정: `unit_cbm = case_cbm / units_per_case × qty`
  - 사유 입력 필수 (partial_reason)
  - 패킹 요약에 비완박스 건 별도 표시

**FR-PKL-01**: 패킹리스트 실수량 표시
  - 총수량(pcs), 총박스(cases), 총금액 = 실제 출고분 기준 (0 표시 방지)
  - 비완박스 건은 별도 행

**FR-PKL-02**: 행선지별 + 팔레트별 요약
  - destination_org_id 기준 행선지 그룹핑 (소계 포함)
  - 팔레트별 품목/수량/CBM/중량 + 패킹 사진 썸네일

**FR-PKL-01**: 패킹리스트 자동 생성
  - 팔레트별 품목/수량/lot/유통기한 집계
  - 출고지별 분류
  - PDF 생성

**FR-DOC-01**: 서류 통합 관리
  - 인보이스, 패킹리스트, 원산지증명, B/L, 트래킹 서류
  - documents 단일 테이블 (owner_type + document_type)
  - 버전 관리 (version_no)

### 4.9 문의

**FR-INQ-01**: 바이어 → 영업 문의 (주문/제품 연결 가능)
**FR-INQ-02**: 우선순위 설정 (low/normal/high/urgent)
**FR-INQ-03**: 상태 추적 (open → in_progress → answered → closed)

### 4.10 관리자

**FR-ADM-01**: 사용자 CRUD + 역할/조직 배정 + 가입 승인
**FR-ADM-02**: 조직 트리 관리 (셀프참조 계층)
**FR-ADM-03**: 거래처 배정 관리 (account_assignments)
**FR-ADM-04**: 제품 마스터 + 국가별 콘텐츠 + 문서 관리
**FR-ADM-05**: 재고 현황 (MES mirror) + 생산 예정 (supply_plans) 조회
**FR-ADM-06**: 전체 주문/인보이스/커미션 관리
**FR-ADM-07**: 시스템 설정 (채번 규칙, 동기화, 다국어, 환율)

---

## 5. 비기능 요구사항

### 5.1 보안
- **NFR-SEC-01**: 모든 테이블 RLS 적용 (역할별 정책)
- **NFR-SEC-02**: 바이어 간 데이터 격리 (IDOR 차단)
- **NFR-SEC-03**: MES 원가 데이터 미노출
- **NFR-SEC-04**: HTTPS 강제

### 5.2 성능
- **NFR-PER-01**: 카탈로그 로딩 < 2초
- **NFR-PER-02**: 발주 목록 로딩 < 1초 (페이지네이션)
- **NFR-PER-03**: MES 동기화 지연 < 15분

### 5.3 다국어
- **NFR-I18N-01**: 영어 기본, 향후 확장 가능 구조 (i18n)
- **NFR-I18N-02**: 제품 정보 국가별 분리 (product_market_contents)

### 5.4 반응형
- **NFR-RES-01**: 데스크탑 우선 (바이어 발주, 영업 검토)
- **NFR-RES-02**: 모바일 기본 대응 (바이어 주문 조회, 트래킹)

---

## 6. MVP 범위

### 6.1 MVP 1차 — 핵심 플로우 (19페이지)

**목표**: 카탈로그 조회 → 발주 → 벤더/영업 검토 → 인보이스 → 출하 → 서류

| 영역 | 페이지 | 우선순위 |
|------|--------|---------|
| 공통 | 로그인, 카탈로그, 제품상세, 프로필 | P0 |
| 바이어 | 대시보드, 발주, 주문목록, 주문상세 | P0 |
| 영업 | 대시보드, 발주검토목록, 발주검토상세 | P0 |
| 물류 | 대시보드, 출하관리, 팔레트적재 | P0 |
| 관리자 | 대시보드, 사용자, 조직, 제품, 재고 | P0 |

### 6.2 MVP 2차 — 운영 안정화 (+16페이지)

| 영역 | 페이지 |
|------|--------|
| 바이어 | 실적대시보드, 문의, 서류함 |
| 벤더 | 대시보드, 주문관리, 매출, 커미션, 카탈로그 |
| 영업 | 인보이스, 문의 |
| 물류 | 패킹리스트, 서류관리 |
| 관리자 | 거래처배정, 전체주문, 정산, 설정 |

### 6.3 Phase 2 — Sales Board (별도 프로젝트)

- CRM + 바이어 관리
- 영업 실적 분석
- AI Agentic Sales (패턴 분석, 자동 제안, 레터)
- 세일즈 캠페인
- 화상 미팅 + 실시간 통역

---

## 7. 개발 전략

### 7.1 워크플로우
```
피그마 (UI/UX) → Claude fd 스킬 (UI 초안) → Codex (구현+테스트)
```

### 7.2 관리 규칙
- `docs/CONTRIBUTING.md` 준수
- 스키마 변경 → 마이그레이션 + 문서 동시 업데이트
- CHANGELOG.md에 변경 사유 필수 기록
- 상세: `docs/CONTRIBUTING.md`

### 7.3 데이터베이스
- DDL 작성 완료: `supabase/migrations/20260312_000001_trade_intel_mvp.sql`
- RLS 정책: 다음 스텝
- 시드 데이터: `scripts/seed/`

---

## 8. 마일스톤

| 단계 | 내용 | 예상 |
|------|------|------|
| **M0 설계** | 데이터모델 + 페이지명세 + PRD | ✅ 완료 |
| **M1 인프라** | Supabase 프로젝트 + DDL 실행 + RLS + Auth | 1주 |
| **M2 디자인** | 피그마 스타일 + 주요 화면 | 병렬 진행 |
| **M3 바이어 플로우** | 카탈로그 + 발주 + 주문조회 | 2주 |
| **M4 영업 플로우** | 발주검토 + 인보이스 | 2주 |
| **M5 물류 플로우** | 출하 + 팔레트 + 서류 | 2주 |
| **M6 관리자** | 사용자/조직/제품/재고 관리 | 1주 |
| **M7 통합 테스트** | E2E 테스트 + 버그 수정 | 1주 |
| **M8 MVP 런칭** | 바이어 온보딩 + 프로덕션 배포 | 1주 |

---

## 9. 참조 문서

| 문서 | 위치 |
|------|------|
| 데이터 모델 | `docs/mvp-data-model.md` |
| 페이지 명세 | `docs/pages-spec.md` |
| 변경 이력 | `docs/CHANGELOG.md` |
| 관리 지침 | `docs/CONTRIBUTING.md` |
| DDL | `supabase/migrations/20260312_000001_trade_intel_mvp.sql` |
| UI 디자인 릴레이 | `skills/fd/SKILL.md` |

---

## 10. 용어 정의

| 용어 | 설명 |
|------|------|
| **Buyer** | 해외 바이어 (발주자) |
| **Vendor** | 중개자 (커미션 수취) |
| **Ship-to** | 하위 발주처 / 지사 (실제 배송지) |
| **lot** | 제조 단위 (유통기한 기준) |
| **confidence_status** | 전산재고 신뢰도 (high/medium/low) |
| **allocation_type** | 재고 할당 유형 (stock/production/mixed) |
| **draft** | 장바구니 상태의 주문 |
| **needs_buyer_decision** | 영업→바이어 협의 요청 상태 |
| **COO** | Certificate of Origin (원산지 증명서) |
| **B/L** | Bill of Lading (선하증권) |
| **CBM** | Cubic Meter (부피 단위) |
| **FIFO** | First In First Out (선입선출) |
| **RLS** | Row Level Security (행 수준 보안) |
