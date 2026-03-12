-- Migration: 팔레트/패킹 기능 강화 (사용자 피드백 반영)
-- 출처: 물류 담당자 의뢰사항 6건

-- 1. 팔레트: CBM 자동 계산 (높이만 입력)
ALTER TABLE shipment_pallets
  ADD COLUMN pallet_width_mm int NOT NULL DEFAULT 1100,
  ADD COLUMN pallet_depth_mm int NOT NULL DEFAULT 1100,
  ADD COLUMN pallet_height_mm int,
  ADD COLUMN pallet_cbm numeric(10,6) GENERATED ALWAYS AS (
    (pallet_width_mm::numeric / 1000) * (pallet_depth_mm::numeric / 1000) * (COALESCE(pallet_height_mm, 0)::numeric / 1000)
  ) STORED,
  ADD COLUMN box_cbm_total numeric(10,6);  -- 박스 기준 CBM 합계 (참고용)

COMMENT ON COLUMN shipment_pallets.pallet_cbm IS '팔레트 실측 CBM (W×D×H). 최종 선적 기준.';
COMMENT ON COLUMN shipment_pallets.box_cbm_total IS '박스 개별 CBM 합계 (참고용, 팔레트 CBM과 비교)';

-- 2. 비완박스(낱개) 출고 지원
ALTER TABLE shipment_pallet_items
  ADD COLUMN is_partial_case boolean NOT NULL DEFAULT false,
  ADD COLUMN partial_reason text;

COMMENT ON COLUMN shipment_pallet_items.is_partial_case IS '박스 해체 출고 여부. true면 packed_unit_qty 수동 입력, packed_case_qty=0';

-- 3. 서류 바이어 공유 토글
ALTER TABLE documents
  ADD COLUMN is_buyer_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN documents.is_buyer_visible IS '바이어 포탈에서 열람 허용 여부';
