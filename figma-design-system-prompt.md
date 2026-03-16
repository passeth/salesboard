# Trade Intel Figma 디자인 시스템 구현 프롬프트

## 목표

현재 개발된 Trade Intel UI를 기준으로 Figma 디자인 시스템 파일을 정리해주세요.

- Figma Variables를 foundation token의 source of truth로 사용
- 비Enterprise 환경 기준으로 운영
- 디자이너가 Figma Variables를 수정한 뒤, 수동 export JSON으로 개발 저장소에 반영할 수 있는 구조로 구성

## 참고 소스

- 앱 레이아웃: `src/app/(dashboard)/layout.tsx`
- 사이드바: `src/components/sidebar.tsx`
- 헤더: `src/components/header-bar.tsx`
- 상태 배지: `src/components/status-badge.tsx`
- 버튼: `src/components/ui/button.tsx`
- 카드: `src/components/ui/card.tsx`
- 로그인 화면: `src/app/(auth)/login/page.tsx`
- Buyer Orders: `src/app/(dashboard)/buyer/orders/page.tsx`
- Catalog: `src/app/(dashboard)/catalog/page.tsx`
- Sales Orders: `src/app/(dashboard)/sales/orders/page.tsx`
- Shipments: `src/app/(dashboard)/logistics/shipments/page.tsx`
- Admin Products: `src/app/(dashboard)/admin/products/page.tsx`

## Step 1. Foundations

다음 Variable Collection을 생성해주세요.

### `color-primitive`

- Core, Semantic, Sidebar, Status 그룹으로 구성
- 현재 저장소의 `tokens.json`과 이름을 맞춤
- 컬렉션 모드는 `Light` 1개

### `spacing`

- `radius/*`
- `spacing/*`
- `fontSize/*`

### `typography`

- `font/primary`
- `font/secondary`
- `fontWeight/normal`
- `fontWeight/medium`
- `fontWeight/semibold`
- `fontWeight/bold`

### `component`

- button, input, badge, card, table, sidebar, headerBar, select, tabs, modal, avatar, toast, tooltip, pagination, checkbox, spinner, emptyState, divider의 수치형 토큰
- padding 배열은 Figma Variables에서 `paddingX`, `paddingY`, `paddingTop` 등으로 쪼개서 관리

## Step 2. Documentation Pages

다음 페이지를 만들어주세요.

- `🎨 Colors`
- `📏 Spacing`
- `🔤 Typography`
- `🧱 Components`
- `🖥️ Screens`

## Step 3. Components

우선 아래 컴포넌트를 Component Set으로 정리해주세요.

### App Shell

- Sidebar
- Sidebar Nav Item
- Header Bar
- Page Header

### Primitives

- Button: primary / outline / ghost / destructive
- Input
- Textarea
- Select
- Checkbox
- Badge
- Avatar
- Card
- Table Row
- Pagination
- Tabs
- Dialog
- Tooltip

### Domain

- Status Badge
- Order Item Status Badge
- Filters Row
- Data Table
- Product Card
- Empty State
- Shipment Pallet Card

## Step 4. Screens

현재 코드 기준 대표 화면을 `🖥️ Screens` 페이지에 배치해주세요.

- Auth / Login
- Buyer / Orders List
- Buyer / Order Detail
- Buyer / New Order
- Catalog / List
- Catalog / Detail
- Sales / Orders List
- Sales / Order Detail
- Logistics / Shipments List
- Logistics / Shipment Detail
- Admin / Products

## Step 5. 운영 기준

- 색상, radius, spacing, fontSize는 반드시 Variables에 연결
- font family, font weight도 Variables에 연결
- 버튼 높이, 패딩, 카드 패딩, 테이블 row/header 높이 같은 치수는 `component` Variables에 연결
- 스와치나 샘플 프레임은 시각화용으로만 사용
- 토큰 이름은 코드의 CSS 변수 이름과 최대한 그대로 맞춤
- 코드에 없는 새 토큰은 만들지 말고, 필요한 경우 기존 토큰을 재사용
- 버튼 variant, 상태, 아이콘 유무, 테이블 구조 차이는 Component Variant Property로 관리
- 대표 상태를 포함
  - default
  - hover
  - active
  - disabled
  - empty
  - loading
  - success / warning / error
