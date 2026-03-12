"""
제품 시드 데이터 보강
- 02_products.csv (596개, 판매이력 기반)
- ru_products (306개, 물류규격 풍부)
- cm_erp_products (899개, 재고+입수량)
- rise_products (4,138개, 브랜드 매칭)

→ 02_products_enriched.csv (물류규격 보강)
→ 05_inventory.csv (재고 시드)
"""
import csv
from pathlib import Path
from collections import defaultdict

SEED_DIR = Path(__file__).parent.parent / "supabase/data/seed"

def make_uuid(name: str) -> str:
    import hashlib
    h = hashlib.md5(name.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

def load_csv(path):
    with open(path, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def main():
    # 1) 기존 제품 시드 로드
    products = load_csv(SEED_DIR / "02_products.csv")
    print(f"기존 제품 시드: {len(products)}개")
    
    # 2) ru_products 로드 (물류규격)
    ru = load_csv(SEED_DIR / "ru_products_raw.csv")
    ru_map = {r["product_code"]: r for r in ru}
    print(f"ru_products: {len(ru)}개")
    
    # 3) cm_erp_products 로드 (재고)
    erp = load_csv(SEED_DIR / "erp_products_raw.csv")
    erp_map = {r["product_id"]: r for r in erp}
    print(f"cm_erp_products: {len(erp)}개")
    
    # 4) rise_products 로드 (브랜드)
    rise = load_csv(SEED_DIR / "rise_products_raw.csv")
    rise_map = {r["code"]: r for r in rise}
    print(f"rise_products (active): {len(rise)}개")
    
    # 5) 보강
    enriched = []
    matched_ru = 0
    matched_erp = 0
    matched_rise = 0
    
    for p in products:
        sku = p["sku"]
        row = {
            "id": p["id"],
            "sku": sku,
            "name": p["name"],
            "name_en": "",
            "brand": p["brand"],
            "category": "",
            "volume_value": "",
            "volume_unit": "",
            "barcode": "",
            "net_weight": "",
            "gross_weight": "",
            "units_per_case": "",
            "case_length": "",
            "case_width": "",
            "case_height": "",
            "cbm": "",
            "hs_code": "",
            "status": "active",
        }
        
        # ru_products 매칭 (물류규격)
        if sku in ru_map:
            r = ru_map[sku]
            matched_ru += 1
            row["name_en"] = r.get("name_en", "")
            row["barcode"] = r.get("barcode", "")
            row["units_per_case"] = r.get("pcs_per_carton", "")
            row["case_width"] = r.get("width_cm", "")
            row["case_height"] = r.get("height_cm", "")
            row["case_length"] = r.get("depth_cm", "")
            row["cbm"] = r.get("cbm", "")
            row["net_weight"] = r.get("weight_kg", "")
            row["hs_code"] = r.get("hscode", "")
            if r.get("brand"):
                row["brand"] = r["brand"]
            if r.get("volume"):
                row["volume_value"] = r["volume"]
        
        # rise_products 매칭 (브랜드 보강)
        if sku in rise_map:
            r = rise_map[sku]
            matched_rise += 1
            if not row["brand"] and r.get("brand"):
                brand = r["brand"].strip()
                if brand.startswith("_"):
                    brand = brand[1:]
                row["brand"] = brand
            if r.get("category"):
                row["category"] = r["category"]
        
        # cm_erp_products 매칭 (입수량 보강)
        if sku in erp_map:
            r = erp_map[sku]
            matched_erp += 1
            if not row["units_per_case"] and r.get("box_qty"):
                row["units_per_case"] = r["box_qty"]
            if not row["barcode"] and r.get("barcode"):
                row["barcode"] = r["barcode"]
        
        enriched.append(row)
    
    print(f"\n매칭 결과:")
    print(f"  ru_products (물류규격): {matched_ru}/{len(products)} ({matched_ru/len(products)*100:.0f}%)")
    print(f"  rise_products (브랜드): {matched_rise}/{len(products)} ({matched_rise/len(products)*100:.0f}%)")
    print(f"  cm_erp_products (재고): {matched_erp}/{len(products)} ({matched_erp/len(products)*100:.0f}%)")
    
    # 6) 보강된 제품 저장
    fieldnames = ["id", "sku", "name", "name_en", "brand", "category",
                   "volume_value", "volume_unit", "barcode",
                   "net_weight", "gross_weight", "units_per_case",
                   "case_length", "case_width", "case_height",
                   "cbm", "hs_code", "status"]
    
    out_path = SEED_DIR / "02_products_enriched.csv"
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched)
    print(f"\n→ {out_path.name}: {len(enriched)}행")
    
    # 7) 재고 시드 생성 (cm_erp_products → inventory_lots)
    inventory = []
    for sku, erp_row in erp_map.items():
        product_id = make_uuid(f"PRODUCT_{sku}")
        
        bal_qty = 0
        try:
            bal_qty = int(float(erp_row.get("bal_qty", 0)))
        except:
            pass
        
        if bal_qty <= 0:
            continue
        
        inventory.append({
            "id": make_uuid(f"INV_{sku}_{erp_row.get('warehouse_code', 'W100')}"),
            "source_system": "erp",
            "source_record_id": sku,
            "warehouse_code": erp_row.get("warehouse_code", "W100"),
            "product_id": product_id,
            "product_code": sku,
            "lot_no": f"SEED-{sku}",
            "on_hand_qty": bal_qty,
            "reserved_qty": 0,
            "available_qty": bal_qty,
            "confidence_status": "medium",
        })
    
    inv_fields = ["id", "source_system", "source_record_id", "warehouse_code",
                   "product_id", "product_code", "lot_no",
                   "on_hand_qty", "reserved_qty", "available_qty", "confidence_status"]
    
    inv_path = SEED_DIR / "05_inventory.csv"
    with open(inv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=inv_fields)
        writer.writeheader()
        writer.writerows(inventory)
    print(f"→ {inv_path.name}: {len(inventory)}행")
    
    # 8) 통계
    has_barcode = sum(1 for r in enriched if r["barcode"])
    has_cbm = sum(1 for r in enriched if r["cbm"])
    has_units = sum(1 for r in enriched if r["units_per_case"])
    has_brand = sum(1 for r in enriched if r["brand"])
    has_en = sum(1 for r in enriched if r["name_en"])
    has_hs = sum(1 for r in enriched if r["hs_code"])
    
    print(f"\n보강 후 채워진 비율 ({len(enriched)}건):")
    print(f"  brand: {has_brand} ({has_brand/len(enriched)*100:.0f}%)")
    print(f"  barcode: {has_barcode} ({has_barcode/len(enriched)*100:.0f}%)")
    print(f"  name_en: {has_en} ({has_en/len(enriched)*100:.0f}%)")
    print(f"  units_per_case: {has_units} ({has_units/len(enriched)*100:.0f}%)")
    print(f"  cbm: {has_cbm} ({has_cbm/len(enriched)*100:.0f}%)")
    print(f"  hs_code: {has_hs} ({has_hs/len(enriched)*100:.0f}%)")

if __name__ == "__main__":
    main()
