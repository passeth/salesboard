# 🎨 Trade Intel Design Tokens

## 원칙

- Figma Variables가 foundation token의 원본입니다.
- 저장소의 [`tokens.json`](/Users/seulkiji/projects/trade-intel/src/design-tokens/tokens.json)은 Figma export 결과를 반영하는 산출물입니다.
- 코드에서는 `tokens.json`과 생성된 [`globals.css`](/Users/seulkiji/projects/trade-intel/src/app/globals.css)를 사용합니다.
- 버튼의 style, 상태, 테이블의 형태 같은 "구성"은 token이 아니라 Figma Component Variant로 관리합니다.

## 구조

```text
src/design-tokens/
├── tokens.json                 ← Figma export를 반영하는 토큰 산출물
├── figma-plugin-setup.js       ← Figma에 collection/page를 bootstrap 하는 콘솔 스크립트
├── figma-export-variables.js   ← Figma Plugin Console에서 실행하는 export 스크립트
├── figma-sync.ts               ← export JSON → tokens.json → globals.css 반영
├── generate-css.ts             ← tokens.json → globals.css 자동 생성
├── index.ts                    ← TypeScript import용
└── README.md
```

## 권장 워크플로우

```text
Figma Variables 수정
    ↓
figma-export-variables.js 실행
    ↓
foundation JSON 저장
    ↓
npm run figma:sync -- ./tmp/figma-foundations.json
    ↓
git commit
```

## 동기화 방법

### 0. Figma 초기 bootstrap

- 처음 세팅할 때는 [`figma-plugin-setup.js`](/Users/seulkiji/projects/trade-intel/src/design-tokens/figma-plugin-setup.js) 또는 [`figma-plugin/code.js`](/Users/seulkiji/projects/trade-intel/figma-plugin/code.js)를 실행합니다.
- 이 스크립트는 아래 항목을 한 번에 맞춥니다.
  - Variable Collection: `color-primitive`, `spacing`, `typography`, `component`
  - 페이지: `🎨 Colors`, `📏 Spacing`, `🔤 Typography`, `🧱 Components`

### 1. Figma에서 foundation token export

- Figma 파일에서 아래 Variable Collection을 수정합니다.
  - `color-primitive`
  - `spacing`
  - `typography` (선택이 아니라 권장)
  - `component` (선택이 아니라 권장)
- [`figma-export-variables.js`](/Users/seulkiji/projects/trade-intel/src/design-tokens/figma-export-variables.js)를 Plugin Console에 붙여 넣고 실행합니다.
- 복사된 JSON을 예를 들어 `tmp/figma-foundations.json`으로 저장합니다.

### 2. 저장소에 반영

```bash
npm run figma:sync -- ./tmp/figma-foundations.json
```

이 명령은 아래를 한 번에 수행합니다.

- `tokens.json` 갱신
- `globals.css` 재생성

## 사용법

### CSS에서

```html
<div class="bg-primary text-primary-foreground rounded-md">
<span class="text-status-confirmed">Confirmed</span>
<div class="bg-sidebar-background text-sidebar-foreground">
```

### TypeScript에서

```ts
import { colors, statusColorMap } from "@/design-tokens"

const statusColor = statusColorMap[order.status]
```

## 현재 Figma에서 관리해야 하는 범위

- `color`
- `radius`
- `spacing`
- `fontSize`
- `font`
- `fontWeight`
- `component`

## Figma에서 token으로 관리하고, 컴포넌트로 관리할 것을 구분

- token으로 관리
  - 색상
  - 폰트 패밀리
  - 폰트 웨이트
  - 폰트 사이즈
  - spacing / radius
  - 버튼 높이, 패딩, gap, icon size
  - input, card, table, sidebar, modal, pagination 같은 치수 계열
- component variant로 관리
  - 버튼 style: primary / outline / ghost / destructive
  - 버튼 state: default / hover / disabled / loading
  - 테이블 타입: default / dense / selectable 같은 구조 차이
  - 아이콘 표시 여부, 슬롯 구조, nested instance 교체

즉, "값"은 Variables, "형태와 상태"는 Components/Variants가 담당합니다.

## 다음 참고 문서

- [Figma design system 기준서](/Users/seulkiji/projects/trade-intel/docs/FIGMA_DESIGN_SYSTEM.md)
- [Figma 구현 프롬프트](/Users/seulkiji/projects/trade-intel/figma-design-system-prompt.md)
- [Pencil 기준 파일](/Users/seulkiji/projects/trade-intel/trade.pen)
