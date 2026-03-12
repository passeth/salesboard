# CHANGELOG — Trade Intel

모든 설계/스키마/기능 변경을 여기 기록한다.
왜 바꿨는지, 누가 결정했는지 남긴다.

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
