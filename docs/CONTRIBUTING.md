# 개발 관리 지침 — Trade Intel

## 1. 단일 진실 원칙 (Single Source of Truth)

| 문서 | 역할 | 규칙 |
|------|------|------|
| `docs/mvp-data-model.md` | DB 스키마의 진실 | 스키마 변경 시 반드시 동시 업데이트 |
| `docs/pages-spec.md` | 페이지/기능의 진실 | 기능 변경 시 반드시 동시 업데이트 |
| `docs/CHANGELOG.md` | 변경 이력 | 모든 변경에 날짜+사유+결정자 기록 |

**핵심**: 코드 변경 = 문서 변경. 둘 중 하나만 바뀌면 안 된다.

---

## 2. 문서 관리

### docs/ 구조
```
docs/
├── mvp-data-model.md       ← 스키마 (항상 최신)
├── pages-spec.md           ← 기능 명세 (항상 최신)
├── CHANGELOG.md            ← 변경 이력
├── CONTRIBUTING.md         ← 이 파일
└── archive/                ← 폐기된 설계안
```

### 규칙
- `docs/` 안 파일은 **항상 현재 상태**를 반영한다
- 폐기된 설계안 → `docs/archive/YYYY-MM-DD_제목.md`로 이동
- "이전 버전 뭐였지?" → `git log docs/파일명`으로 확인
- 문서에 TODO 남기지 않는다. 구현할 거면 이슈로 뺀다.

### CHANGELOG 작성법
```markdown
## YYYY-MM-DD — 제목

### 카테고리 (스키마/기능/인프라/버그)
- 변경 내용
- 이유: 왜 바꿨는지
- 결정자: 누가 결정했는지
- 영향: 어떤 파일/테이블이 바뀌는지
```

---

## 3. 마이그레이션 관리

### 디렉토리
```
supabase/migrations/
├── 0001_initial_schema.sql
├── 0002_add_supply_plans.sql
├── 0003_add_discount_to_order_items.sql
└── ...
```

### 규칙

**1. 넘버링**: `NNNN_설명.sql` (4자리 순번 + snake_case 설명)

**2. 한 파일 = 한 변경**
- ✅ `0003_add_discount_to_order_items.sql`
- ❌ `0003_various_changes.sql`

**3. 기존 파일 수정 금지**
- 이미 적용된 마이그레이션은 절대 수정하지 않는다
- 실수했으면 새 마이그레이션으로 수정한다
- 예: `0004_fix_0003_discount_default.sql`

**4. 롤백 포함**
```sql
-- UP
ALTER TABLE order_items ADD COLUMN discount_rate numeric(5,2);

-- ROLLBACK (주석으로 보관)
-- ALTER TABLE order_items DROP COLUMN discount_rate;
```

**5. CHANGELOG 동시 업데이트**
- 마이그레이션 추가할 때 CHANGELOG.md에도 기록

---

## 4. 시드 데이터

```
scripts/seed/
├── 01_organizations.sql     ← 조직 (내부, 벤더, 바이어)
├── 02_users.sql              ← 테스트 사용자
├── 03_products.sql           ← 제품 마스터
└── 04_sample_orders.sql      ← 샘플 주문
```

- 시드는 개발/테스트 환경 전용
- 프로덕션 데이터와 절대 섞지 않는다
- 넘버링으로 실행 순서 보장 (FK 의존성)

---

## 5. 코딩 에이전트 위임 규칙

Codex나 OpenCode에 작업 위임할 때 아래를 프롬프트에 포함:

```
스키마 변경 시:
1. supabase/migrations/에 새 넘버링 파일 추가
2. docs/mvp-data-model.md 해당 테이블 업데이트
3. docs/CHANGELOG.md에 변경 사유 기록

기능 변경 시:
1. docs/pages-spec.md 해당 페이지 업데이트
2. docs/CHANGELOG.md에 변경 사유 기록

절대 하지 말 것:
- 기존 마이그레이션 파일 수정
- docs/ 파일 삭제 (archive/로 이동)
- 문서 업데이트 없이 스키마 변경
```

---

## 6. 프로젝트 구조

```
trade-intel/
├── docs/                    ← 설계 문서 (진실의 원천)
│   ├── mvp-data-model.md
│   ├── pages-spec.md
│   ├── CHANGELOG.md
│   ├── CONTRIBUTING.md
│   └── archive/
├── supabase/
│   └── migrations/          ← 넘버링된 SQL
├── scripts/
│   └── seed/                ← 시드 데이터
├── src/                     ← 앱 코드
├── .env                     ← 환경변수 (git 제외)
└── skills/                  ← Codex 스킬
```

---

## 7. 브랜치 전략 (추후)

MVP 단계에서는 `main` 직접 푸시 허용.
팀 확대 시:
```
main ← develop ← feature/기능명
```

---

## 8. 체크리스트

PR/커밋 전 확인:

- [ ] 스키마 바꿨으면 → 마이그레이션 파일 있는가?
- [ ] 마이그레이션 있으면 → mvp-data-model.md 업데이트했는가?
- [ ] 기능 바꿨으면 → pages-spec.md 업데이트했는가?
- [ ] CHANGELOG.md에 기록했는가?
- [ ] 기존 마이그레이션 파일 건드리지 않았는가?
