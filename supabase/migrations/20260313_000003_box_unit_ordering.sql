-- Migration: 박스 단위 주문 체계
-- 모든 qty 필드는 박스(case) 수량, unit_qty는 자동 계산된 낱개 수량

-- order_items: 박스 단위 주문 + 낱개 자동 계산
ALTER TABLE order_items
  ADD COLUMN requested_unit_qty bigint GENERATED ALWAYS AS (requested_qty * COALESCE(units_per_case, 1)) STORED,
  ADD COLUMN vendor_confirmed_unit_qty bigint GENERATED ALWAYS AS (vendor_confirmed_qty * COALESCE(units_per_case, 1)) STORED,
  ADD COLUMN sales_confirmed_unit_qty bigint GENERATED ALWAYS AS (sales_confirmed_qty * COALESCE(units_per_case, 1)) STORED,
  ADD COLUMN final_unit_qty bigint GENERATED ALWAYS AS (final_qty * COALESCE(units_per_case, 1)) STORED,
  ADD COLUMN units_per_case int;

-- units_per_case를 products에서 복사 (주문 시점 스냅샷)
COMMENT ON COLUMN order_items.units_per_case IS '주문 시점의 입수량 스냅샷 (products.units_per_case에서 복사). qty 필드는 모두 박스 수량.';
COMMENT ON COLUMN order_items.requested_qty IS '희망 수량 (박스 단위)';
COMMENT ON COLUMN order_items.requested_unit_qty IS '희망 수량 (낱개, 자동 계산)';

-- 기존 시드 데이터 호환: units_per_case 채우기
-- (실행 시점에 products 테이블에서 가져옴)
UPDATE order_items oi
SET units_per_case = p.units_per_case
FROM products p
WHERE oi.product_id = p.id
  AND p.units_per_case IS NOT NULL;
