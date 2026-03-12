# CHANGELOG — Trade Intel

모든 설계/스키마/기능 변경을 여기 기록한다.
왜 바꿨는지, 누가 결정했는지 남긴다.

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
