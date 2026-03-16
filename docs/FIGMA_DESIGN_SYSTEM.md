# Trade Intel — Figma Design System

> **Figma 파일**: [Trade Intel](https://www.figma.com/design/nZXKaNp3is8VWwQDNwlZMG/Trade-Intel)
> **최종 업데이트**: 2026-03-14

## 개요

Figma Variables를 디자인 토큰의 **source of truth**로 두고, 코드와 양방향 동기화하는 시스템입니다.

```
Figma Variables
    ↓ (수동 export JSON)
tokens.json          ← source of truth (코드 측)
    ↓ (npm run tokens)
globals.css          ← CSS 변수 자동 생성
    ↓ (Tailwind v4 @theme)
UI 컴포넌트           ← var(--component-button-md-height) 등 직접 참조
```

## 현재 구축 상태

### Figma Variable Collections (76개 토큰)

| Collection | 토큰 수 | 모드 | 내용 |
|---|---|---|---|
| Colors | 46 COLOR | Light + Dark | core, semantic, sidebar, status |
| Typography | 14 (STRING + FLOAT) | Light + Dark | font family, sizes, weights |
| Spacing & Radius | 16 FLOAT | Light + Dark | spacing scale, border radius |

### Figma Pages (3개)

| 페이지 | 내용 |
|---|---|
| 🎨 Colors | 46개 색상 스와치 (Core / Semantic / Sidebar / Status) |
| 📝 Typography & Spacing | 타이포그래피 스케일 (8), 폰트 웨이트 (4), 스페이싱 (11), 보더 라디어스 (5) |
| 🧩 Components | Button (6variant × 3size), Badge (4variant × 3size + 9status), Input (3size), Card, Table |

---

## 토큰 파이프라인

### 핵심 파일

| 파일 | 역할 |
|---|---|
| `src/design-tokens/tokens.json` | 전체 디자인 토큰 정의 (397줄) |
| `src/design-tokens/generate-css.ts` | tokens.json → globals.css 변환기 |
| `src/design-tokens/figma-sync.ts` | Figma export JSON → tokens.json 병합 + CSS 재생성 |
| `src/design-tokens/index.ts` | TypeScript에서 토큰 직접 import 가능 |
| `src/app/globals.css` | 자동 생성됨 — 직접 수정 금지 |

### npm 스크립트

```bash
# tokens.json → globals.css 재생성
npm run tokens

# Figma export JSON → tokens.json → globals.css 동기화
npm run figma:sync -- ./tmp/figma-foundations.json
```

---

## 동기화 절차

### Figma → 코드 (디자인 변경 반영)

1. Figma에서 Variable 값 수정 (색상, 스페이싱 등)
2. Figma 플러그인으로 Variables를 JSON export
3. export한 JSON 파일을 프로젝트에 저장 (예: `tmp/figma-foundations.json`)
4. 실행:
   ```bash
   npm run figma:sync -- ./tmp/figma-foundations.json
   ```
5. 변경 확인:
   - `src/design-tokens/tokens.json` — 토큰 값 업데이트됨
   - `src/app/globals.css` — CSS 변수 자동 재생성됨

### 코드 → Figma (개발 측 토큰 변경 반영)

1. `tokens.json` 직접 수정
2. `npm run tokens` 실행 (globals.css 재생성)
3. Figma Variables에 수동 반영

> **참고**: 현재 non-Enterprise 환경이라 Figma REST API를 통한 자동 push는 불가.
> 수동 export/import 방식으로 운영합니다.

---

## 토큰 → 컴포넌트 연결 방식

컴포넌트는 **CSS 변수를 Tailwind 임의값(arbitrary values)으로 직접 참조**합니다.

### 예시: Button

```tsx
// button.tsx — size variant에서 CSS 변수 직접 참조
size: {
  default: "h-[var(--component-button-md-height)] px-[var(--component-button-md-padding-x)] ...",
  sm:      "h-[var(--component-button-sm-height)] px-[var(--component-button-sm-padding-x)] ...",
  lg:      "h-[var(--component-button-lg-height)] px-[var(--component-button-lg-padding-x)] ...",
}
```

### 예시: Badge

```tsx
// badge.tsx — 동일 패턴
size: {
  sm: "px-[var(--component-badge-sm-padding-x)] py-[var(--component-badge-sm-padding-y)] ...",
  md: "px-[var(--component-badge-md-padding-x)] py-[var(--component-badge-md-padding-y)] ...",
}
```

### 색상 연결

```
tokens.json:  "primary": "#605BFF"
    ↓ generate-css.ts (HEX → HSL 변환)
globals.css:  --primary: 242 100% 68%;
    ↓ @theme inline
Tailwind:     --color-primary: hsl(var(--primary));
    ↓
컴포넌트:     className="bg-primary text-primary-foreground"
```

### TypeScript에서 직접 사용

```tsx
import { colors, statusColorMap, component } from "@/design-tokens"

// 동적 스타일링
<div style={{ color: colors.primary.DEFAULT }}>
<div style={{ height: component.button.md.height }}>
```

---

## 다크 모드

- **Light**: `:root`에 정의된 HSL 값 사용
- **Dark**: `.dark` 클래스에서 HSL 값 오버라이드
- Figma Variables도 Light/Dark 두 모드로 분리되어 있음

```css
/* globals.css (자동 생성) */
:root {
  --primary: 242 100% 68%;        /* Light */
  --background: 240 11% 98%;
}
.dark {
  --primary: 242 100% 68%;        /* Dark (동일하거나 다른 값) */
  --background: 240 87% 6%;
}
```

---

## 토큰 목록 요약

### Color (46개)

| 그룹 | 토큰 |
|---|---|
| Core (17) | primary, primary-fg, secondary, secondary-fg, destructive, destructive-fg, accent, accent-fg, muted, muted-fg, background, foreground, card, card-fg, border, input, ring |
| Semantic (12) | success/warning/error/info × (DEFAULT, foreground, bg) |
| Sidebar (5) | bg, foreground, accent, muted, inactive |
| Status (12) | draft, submitted, vendor-review, sales-review, needs-decision, confirmed, rejected, invoiced, partially-shipped, shipped, completed, cancelled |

### Typography (14개)

- font-primary: Inter, font-secondary: Inter
- fontSize: xs(12) sm(13) base(14) lg(16) xl(20) 2xl(24) 3xl(28) 4xl(36)
- fontWeight: normal(400) medium(500) semibold(600) bold(700)

### Spacing (11개)

0(0) 1(4) 2(6) 3(8) 4(10) 5(12) 6(16) 8(20) 10(24) 12(32) 16(64)

### Radius (5개)

none(0) s(5) m(10) l(12) pill(20)

---

## Figma MCP 연결 (선택)

AI 에이전트로 Figma를 직접 제어하려면 figma-console-mcp + Desktop Bridge 플러그인이 필요합니다.

- **플러그인 위치**: `~/projects/figma-desktop-bridge/manifest.json`
- **MCP 서버**: opencode.json의 `mcp.figmaConsole` → `npx -y figma-console-mcp@latest`
- **주의**: manifest.json의 `allowedDomains`에 `127.0.0.1` 사용 불가 — `localhost`만 허용

상세 셋업 가이드는 Obsidian 노트 참고:
`2026-03-14_Figma MCP 연동 셋업 가이드.md`

---

## 운영 원칙

1. **globals.css는 직접 수정하지 않는다** — `🚨 AUTO-GENERATED` 표시가 있으며 `npm run tokens`로 재생성됨
2. **토큰 이름은 CSS 변수 이름과 1:1 유지한다** — 코드에 없는 이름을 임의로 만들지 않음
3. **색상은 tokens.json에서 HEX, globals.css에서 HSL** — generate-css.ts가 자동 변환
4. **컴포넌트 수치(높이, 패딩, 폰트 크기)는 `--component-*` CSS 변수로 관리** — Tailwind arbitrary values로 참조
5. **컴포넌트 색상(variant)은 Tailwind 유틸리티 클래스로 관리** — `bg-primary`, `text-destructive` 등
