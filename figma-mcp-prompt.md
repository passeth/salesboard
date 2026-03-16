# Trade Intel 디자인 시스템 — Figma MCP 작업 프롬프트

## 개요
Trade Intel (B2B 수출 발주 시스템)의 현재 개발 UI를 기준으로, Figma에서 디자인 시스템을 관리할 수 있도록 정리해야 합니다.

목표:
- Figma Variables를 source of truth로 사용
- 색상, 폰트 패밀리, 폰트 웨이트, 폰트 사이즈, spacing, radius, 버튼/입력/테이블/카드 등 컴포넌트 치수를 모두 Figma에서 관리
- 버튼 style, 버튼 state, 테이블 구조 차이 등은 Component Variant로 관리
- 비Enterprise 환경 기준으로 운영

Figma 파일: **Trade-Intel** (현재 열린 파일)

---

## Step 1: 기존 페이지 정리

현재 파일에 이전 테스트로 만들어진 빈 페이지들이 있을 수 있습니다.
빈 페이지를 모두 삭제하고, 깨끗한 상태에서 시작해주세요.

---

## Step 2: Variable Collection 생성 — `color-primitive`

아래 컬러 토큰으로 `color-primitive` 컬렉션을 만들어주세요. 모드는 `Light` 하나.

### Core Colors
| 변수명 | HEX |
|--------|-----|
| primary/DEFAULT | #605BFF |
| primary/foreground | #FFFFFF |
| secondary/DEFAULT | #E4E0FB |
| secondary/foreground | #605BFF |
| destructive/DEFAULT | #D11A2A |
| destructive/foreground | #FFFFFF |
| accent/DEFAULT | #E4E0FB |
| accent/foreground | #605BFF |
| muted/DEFAULT | #F7F7F8 |
| muted/foreground | #7E7E8F |
| background | #FAFAFB |
| foreground | #030229 |
| card/DEFAULT | #FFFFFF |
| card/foreground | #030229 |
| border | #E5E7EB |
| input | #E5E7EB |
| ring | #605BFF |

### Semantic Colors
| 변수명 | HEX |
|--------|-----|
| semantic/success | #3A974C |
| semantic/success-fg | #FFFFFF |
| semantic/success-bg | #E8F5E9 |
| semantic/warning | #F29339 |
| semantic/warning-fg | #FFFFFF |
| semantic/warning-bg | #FFF3E0 |
| semantic/error | #D11A2A |
| semantic/error-fg | #FFFFFF |
| semantic/error-bg | #FDECEA |
| semantic/info | #25C0E2 |
| semantic/info-fg | #FFFFFF |
| semantic/info-bg | #E0F7FA |

### Sidebar Colors
| 변수명 | HEX |
|--------|-----|
| sidebar/bg | #030229 |
| sidebar/foreground | #FFFFFF |
| sidebar/accent | #605BFF |
| sidebar/muted | #1A1942 |
| sidebar/inactive | #A0A0B0 |

### Status Colors (B2B 발주 상태)
| 변수명 | HEX |
|--------|-----|
| status/draft | #94A3B8 |
| status/submitted | #605BFF |
| status/vendor-review | #8B5CF6 |
| status/sales-review | #605BFF |
| status/needs-decision | #F29339 |
| status/confirmed | #3A974C |
| status/rejected | #D11A2A |
| status/invoiced | #0891B2 |
| status/partially-shipped | #F59E0B |
| status/shipped | #2563EB |
| status/completed | #16A34A |
| status/cancelled | #6B7280 |

---

## Step 3: Variable Collection 생성 — `spacing`

| 변수명 | 값 |
|--------|-----|
| radius/none | 0 |
| radius/s | 5 |
| radius/m | 10 |
| radius/l | 12 |
| radius/pill | 20 |
| spacing/0 | 0 |
| spacing/1 | 4 |
| spacing/2 | 6 |
| spacing/3 | 8 |
| spacing/4 | 10 |
| spacing/5 | 12 |
| spacing/6 | 16 |
| spacing/8 | 20 |
| spacing/10 | 24 |
| spacing/12 | 32 |
| spacing/16 | 64 |
| fontSize/xs | 12 |
| fontSize/sm | 13 |
| fontSize/base | 14 |
| fontSize/lg | 16 |
| fontSize/xl | 20 |
| fontSize/2xl | 24 |
| fontSize/3xl | 28 |
| fontSize/4xl | 36 |

이 변수들은 모두 `FLOAT` 타입입니다.

---

## Step 4: Variable Collection 생성 — `typography`

다음 타이포그래피 토큰을 Variables로 생성해주세요.

### Font Family
| 변수명 | 값 | 타입 |
|--------|-----|------|
| font/primary | Inter | STRING |
| font/secondary | Inter | STRING |

### Font Weight
| 변수명 | 값 | 타입 |
|--------|-----|------|
| fontWeight/normal | 400 | FLOAT |
| fontWeight/medium | 500 | FLOAT |
| fontWeight/semibold | 600 | FLOAT |
| fontWeight/bold | 700 | FLOAT |

---

## Step 5: Variable Collection 생성 — `component`

아래 값들은 모두 component token으로 관리해주세요.

원칙:
- 숫자 값만 Variables로 관리
- padding 배열 값은 `paddingX`, `paddingY`, 또는 `paddingTop/Right/Bottom/Left`로 쪼개서 생성
- 버튼 스타일 이름이나 상태 이름은 Variable이 아니라 Component Variant로 관리

필수 그룹:
- `button/*`
- `toggle/*`
- `input/*`
- `badge/*`
- `card/*`
- `table/*`
- `sidebar/*`
- `headerBar/*`
- `select/*`
- `tabs/*`
- `modal/*`
- `avatar/*`
- `toast/*`
- `tooltip/*`
- `pagination/*`
- `checkbox/*`
- `spinner/*`
- `emptyState/*`
- `divider/*`

---

## Step 6: 🎨 Colors 페이지 — 컬러 스와치 시각화

`🎨 Colors` 페이지를 만들고, `color-primitive`의 모든 변수에 대해:
- 80x80 프레임 (cornerRadius 8)
- fill을 해당 변수에 바인딩
- 프레임 이름 = 변수명
- 10개씩 한 줄 (x: 0~900, 100px 간격)
- 그룹별 구분: Core → Semantic → Sidebar → Status (행 간격 120px)

---

## Step 7: 🧱 Components 페이지 — 컴포넌트 레퍼런스

`🧱 Components` 페이지를 만들고 아래 컴포넌트 샘플 생성:

### Button (4 variants × 3 sizes)
- Variants: Primary (#605BFF), Outline (border #E5E7EB), Ghost (no fill), Destructive (#D11A2A)
- Sizes: sm (h:32, r:5), md (h:40, r:10), lg (h:48, r:10)
- Icon button: 40x40, r:10, fill:#E4E0FB
- Button style과 size는 Component Variant Property로 노출
- 높이, 패딩, gap, iconSize는 `component` Variables에 연결

### Toggle
- Off: fill #E5E7EB / On: fill #605BFF
- Sizes: sm (36x20), md (44x24), lg (52x28)
- cornerRadius: height/2 (pill)

### Badge
- Default (#E4E0FB), Success (#E8F5E9), Warning (#FFF3E0), Error (#FDECEA)
- Size: 80x28, cornerRadius: 20 (pill)

### Input
- 280x40, cornerRadius 10, stroke #E5E7EB, fill white

### Card
- 320x200, cornerRadius 12, stroke #E5E7EB, fill white

### Table Sample
- HeaderRow: 600x44, fill #F7F7F8, stroke bottom #E5E7EB
- DataRow: 600x52, fill white, stroke bottom #E5E7EB
- headerHeight, rowHeight, cellPadding은 `component/table/*` Variables에 연결

### Avatar
- sm: 28x28, md: 36x36, lg: 48x48
- fill #605BFF, cornerRadius: size/2 (circle)

---

## Step 8: 📏 Spacing 페이지 — Radius 시각화

`📏 Spacing` 페이지를 만들고:
- radius 5종 (none/s/m/l/pill)을 80x80 프레임으로 시각화
- fill: #605BFF, 각각의 cornerRadius 적용
- 프레임 이름: radius/none, radius/s, radius/m, radius/l, radius/pill

---

## 완료 조건

- [ ] `color-primitive` 컬렉션: 46개 COLOR 변수
- [ ] `spacing` 컬렉션: 24개 FLOAT 변수
- [ ] `typography` 컬렉션: font family / font weight 변수
- [ ] `component` 컬렉션: 버튼, 입력, 카드, 테이블 등 수치형 토큰
- [ ] 🎨 Colors 페이지: 46개 컬러 스와치 (변수 바인딩)
- [ ] 🧱 Components 페이지: Button/Toggle/Badge/Input/Card/Table/Avatar 샘플
- [ ] 📏 Spacing 페이지: 5개 radius 시각화
- [ ] 버튼 형식/상태, 테이블 구조 차이는 Component Variant로 정리

모든 작업 후 스크린샷으로 결과를 확인해주세요.
