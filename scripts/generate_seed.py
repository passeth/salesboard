"""
order_hx_parsed.csv → Supabase 시드 데이터 생성
1. organizations.csv (거래처 계층)
2. products_seed.csv (제품 마스터)
3. orders_seed.csv (주문 헤더)
4. order_items_seed.csv (주문 품목)
"""

import csv
import uuid
import re
from pathlib import Path
from collections import defaultdict

INPUT = Path(__file__).parent.parent / "supabase/data/order_hx_parsed.csv"
OUT_DIR = Path(__file__).parent.parent / "supabase/data/seed"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ── 고정 UUID (시드 일관성) ──
def make_uuid(name: str) -> str:
    """이름 기반 결정적 UUID (시드 재실행해도 동일)"""
    import hashlib

    h = hashlib.md5(name.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


# ── 국가 매핑 ──
BUYER_COUNTRY_MAP = {
    "직수출(러시아)": "RU",
    "직수출(베트남)": "VN",
    "직수출(베트남2 MYCO)": "VN",
    "직수출(대만)": "TW",
    "직수출(호주)": "AU",
    "직수출(캄보디아)": "KH",
    "직수출(라트비아)": "LV",
    "직수출(슬로바키아)": "SK",
    "직수출(말레이시아)": "MY",
    "직수출(미얀마)": "MM",
    "직수출(우크라이나)": "UA",
    "직수출(우크라이나 ICOSMO)": "UA",
    "직수출(우크라이나KBT)": "UA",
    "직수출(위해방정)": "CN",
    "직수출(유럽)": "EU",
    "직수출(유럽 ICOSMO))": "EU",
    "직수출(마케도니아)": "MK",
    "직수출": "KR",  # 직수출(괄호없음) → 적요에서 판단
}

# 스티물 지사 → 국가
STIMUL_BRANCH_COUNTRY = {
    "모스크바": "RU",
    "노보시비르스크": "RU",
    "블라디보스톡": "RU",
    "크라스노다르": "RU",
    "슬라브스카야": "RU",
    "민스크": "BY",
    "카자흐스탄": "KZ",
    "에스토니아": "EE",
    "우크라이나": "UA",
}

# 도시명 정규화 (오탈자 → 정식 명칭)
CITY_NORMALIZATION = {
    "노보시브르스크": "노보시비르스크",
    "블라디보스크": "블라디보스톡",
}


def load_data():
    """파싱된 CSV 로드"""
    rows = []
    with open(INPUT, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def build_organizations(rows):
    """거래처 → organizations 계층 구조"""
    orgs = {}

    # 1) 내부 회사
    evas_id = make_uuid("EVAS_INTERNAL")
    orgs[evas_id] = {
        "id": evas_id,
        "parent_org_id": "",
        "org_type": "internal",
        "code": "EVAS",
        "name": "에바스코스메틱",
        "name_en": "EVAS Cosmetic",
        "country_code": "KR",
        "currency_code": "KRW",
        "status": "active",
    }

    # 2) 인덜톤 (벤더)
    indulton_id = make_uuid("VENDOR_INDULTON")
    orgs[indulton_id] = {
        "id": indulton_id,
        "parent_org_id": "",
        "org_type": "vendor",
        "code": "INDULTON",
        "name": "인덜톤",
        "name_en": "Indulton",
        "country_code": "KR",
        "currency_code": "KRW",
        "status": "active",
    }

    # 3) 거래처 분석
    buyer_names = set()
    stimul_destinations = set()
    direct_export_regions = set()

    for row in rows:
        buyer = row["buyer_name"]
        buyer_names.add(buyer)

        if "스티물" in buyer and row["destination"]:
            dest = CITY_NORMALIZATION.get(row["destination"], row["destination"])
            stimul_destinations.add(dest)

        if buyer.startswith("직수출") and row["sub_buyer"]:
            direct_export_regions.add((buyer, row["sub_buyer"]))

    # 4) 국가 그룹 생성
    country_orgs = {}  # country_code → org_id

    def get_or_create_country(cc, name_ko, name_en, currency="USD"):
        if cc in country_orgs:
            return country_orgs[cc]
        cid = make_uuid(f"COUNTRY_{cc}")
        orgs[cid] = {
            "id": cid,
            "parent_org_id": "",
            "org_type": "buyer_country",
            "code": cc,
            "name": name_ko,
            "name_en": name_en,
            "country_code": cc,
            "currency_code": currency,
            "status": "active",
        }
        country_orgs[cc] = cid
        return cid

    COUNTRY_NAMES = {
        "RU": ("러시아", "Russia", "USD"),
        "VN": ("베트남", "Vietnam", "USD"),
        "TW": ("대만", "Taiwan", "USD"),
        "AU": ("호주", "Australia", "AUD"),
        "KH": ("캄보디아", "Cambodia", "USD"),
        "LV": ("라트비아", "Latvia", "EUR"),
        "SK": ("슬로바키아", "Slovakia", "EUR"),
        "MY": ("말레이시아", "Malaysia", "USD"),
        "MM": ("미얀마", "Myanmar", "USD"),
        "UA": ("우크라이나", "Ukraine", "USD"),
        "CN": ("중국", "China", "USD"),
        "EU": ("유럽", "Europe", "EUR"),
        "MK": ("북마케도니아", "North Macedonia", "EUR"),
        "BY": ("벨라루스", "Belarus", "USD"),
        "KZ": ("카자흐스탄", "Kazakhstan", "USD"),
        "EE": ("에스토니아", "Estonia", "EUR"),
        "SG": ("싱가포르", "Singapore", "USD"),
        "KR": ("한국", "South Korea", "KRW"),
        "PL": ("폴란드", "Poland", "EUR"),
    }

    # 5) 스티물 그룹 (buyer_company + ship_to 지사들)
    # 스티물 → RU 하위
    ru_country_id = get_or_create_country("RU", *COUNTRY_NAMES["RU"])

    stimul_id = make_uuid("BUYER_STIMUL")
    orgs[stimul_id] = {
        "id": stimul_id,
        "parent_org_id": ru_country_id,
        "org_type": "buyer_company",
        "code": "STIMUL",
        "name": "스티물글로벌",
        "name_en": "Stimul Global",
        "country_code": "RU",
        "currency_code": "USD",
        "status": "active",
    }

    for dest in sorted(stimul_destinations):
        branch_cc = STIMUL_BRANCH_COUNTRY.get(dest, "RU")
        branch_id = make_uuid(f"STIMUL_BRANCH_{dest}")
        orgs[branch_id] = {
            "id": branch_id,
            "parent_org_id": stimul_id,
            "org_type": "buyer_ship_to",
            "code": f"STIMUL_{dest}",
            "name": f"스티물 {dest}",
            "name_en": f"Stimul {dest}",
            "country_code": branch_cc,
            "currency_code": "USD",
            "status": "active",
        }

    # 6) 직수출 거래처 → 국가별 바이어
    for buyer in sorted(buyer_names):
        if "스티물" in buyer:
            continue  # 이미 처리

        m = re.match(r"^직수출\((.+)\)$", buyer)
        if m:
            region = m.group(1).strip()
            cc = BUYER_COUNTRY_MAP.get(buyer, "")
            if not cc:
                continue

            country_id = get_or_create_country(
                cc, *COUNTRY_NAMES.get(cc, (region, region, "USD"))
            )

            buyer_id = make_uuid(f"BUYER_{buyer}")
            # 직수출(X) → 바이어로 등록
            clean_name = region
            orgs[buyer_id] = {
                "id": buyer_id,
                "parent_org_id": country_id,
                "org_type": "buyer_company",
                "code": f"DIRECT_{cc}_{clean_name[:10]}",
                "name": f"직수출 {region}",
                "name_en": f"Direct Export {region}",
                "country_code": cc,
                "currency_code": "USD",
                "status": "active",
            }
        elif buyer == "직수출":
            # 괄호 없는 직수출 → 적요에서 판단해야 하는 건, 일단 기타로
            buyer_id = make_uuid(f"BUYER_{buyer}")
            kr_id = get_or_create_country("KR", *COUNTRY_NAMES["KR"])
            orgs[buyer_id] = {
                "id": buyer_id,
                "parent_org_id": kr_id,
                "org_type": "buyer_company",
                "code": "DIRECT_ETC",
                "name": "직수출 (기타)",
                "name_en": "Direct Export (Others)",
                "country_code": "KR",
                "currency_code": "USD",
                "status": "active",
            }
        else:
            # 국내 에이전트
            buyer_id = make_uuid(f"BUYER_{buyer}")
            kr_id = get_or_create_country("KR", *COUNTRY_NAMES["KR"])

            # 코드 생성 (영문 있으면 추출)
            en_match = re.search(r"\(([A-Za-z\s&.]+)", buyer)
            code = en_match.group(1).strip()[:15] if en_match else buyer[:10]

            orgs[buyer_id] = {
                "id": buyer_id,
                "parent_org_id": kr_id,
                "org_type": "buyer_company",
                "code": f"AGT_{code}",
                "name": buyer,
                "name_en": en_match.group(1).strip() if en_match else buyer,
                "country_code": "KR",
                "currency_code": "KRW",
                "status": "active",
            }

    return orgs


def build_products(rows):
    """제품코드 → products 시드"""
    products = {}

    for row in rows:
        code = row["product_code"]
        if not code or code in products:
            continue

        name = row["product_name"]

        # 브랜드 추출 (품목명 앞부분에서)
        brand = ""
        brand_patterns = [
            (r"^(샤샤)", "SHASHA"),
            (r"^(로에랑스)", "LOERANCE"),
            (r"^(페디슨|PEDISON)", "PEDISON"),
            (r"^(프레쥬르|Fraijour)", "FRAIJOUR"),
            (r"^(세라클리닉|Ceraclinic)", "CERACLINIC"),
            (r"^(배레|BAERE)", "BAERE"),
            (r"^(오리자|ORYZA)", "ORYZA"),
            (r"^(에스떼르|Esterre)", "ESTERRE"),
            (r"^(마녀공장)", "MANYO"),
            (r"^(CP-1|씨피원)", "CP-1"),
            (r"^(ESTHETIC HOUSE|에스테틱하우스)", "ESTHETIC HOUSE"),
            (r"^(MED B|메드비)", "MED B"),
        ]
        for pattern, brand_name in brand_patterns:
            if re.search(pattern, name, re.IGNORECASE):
                brand = brand_name
                break

        products[code] = {
            "id": make_uuid(f"PRODUCT_{code}"),
            "sku": code,
            "name": name,
            "brand": brand,
            "status": "active",
        }

    return products


def build_orders(rows, orgs, products):
    """주문 헤더 + 아이템 생성 (date+packing_no 기준 그룹핑)"""
    # date + packing_no + buyer = 하나의 주문
    order_groups = defaultdict(list)

    for row in rows:
        key = (row["order_date"], row["packing_no"], row["buyer_name"])
        order_groups[key].append(row)

    orders = []
    order_items = []

    # buyer_name → org_id 매핑
    buyer_org_map = {}
    for org_id, org in orgs.items():
        if org["org_type"] in ("buyer_company", "buyer_ship_to"):
            buyer_org_map[org["name"]] = org_id

    # 스티물 매핑
    for name in ["스티물 주식회사", "스티물글로벌 주식회사"]:
        buyer_org_map[name] = make_uuid("BUYER_STIMUL")

    order_no_counter = 0

    for (date, packing_no, buyer_name), items in sorted(order_groups.items()):
        order_no_counter += 1
        order_id = make_uuid(f"ORDER_{date}_{packing_no}_{buyer_name}")

        # 바이어 org 찾기
        ordering_org_id = ""
        if buyer_name in buyer_org_map:
            ordering_org_id = buyer_org_map[buyer_name]
        else:
            ordering_org_id = make_uuid(f"BUYER_{buyer_name}")

        # 벤더 (스티물 → 인덜톤)
        vendor_org_id = ""
        ship_to_org_id = ""
        if "스티물" in buyer_name:
            vendor_org_id = make_uuid("VENDOR_INDULTON")
            dest = items[0].get("destination", "")
            dest = CITY_NORMALIZATION.get(dest, dest)
            if dest:
                ship_to_org_id = make_uuid(f"STIMUL_BRANCH_{dest}")

        # 통화
        first = items[0]
        currency = "KRW"
        if first["usd_amount"]:
            currency = "USD"
        elif first["buyer_type"] == "direct_export":
            currency = "USD"

        # 총액
        total = sum(float(r["total_amount"]) for r in items if r["total_amount"])

        orders.append(
            {
                "id": order_id,
                "order_no": f"HX-{date.replace('-', '')}-{packing_no}",
                "ordering_org_id": ordering_org_id,
                "vendor_org_id": vendor_org_id,
                "ship_to_org_id": ship_to_org_id,
                "status": "completed",
                "currency_code": currency,
                "requested_delivery_date": date,
                "submitted_at": f"{date}T00:00:00+09:00",
                "confirmed_at": f"{date}T00:00:00+09:00",
                "packing_no_legacy": packing_no,
            }
        )

        for line_no, item in enumerate(items, 1):
            product_id = ""
            if item["product_code"] in {p["sku"] for p in products.values()}:
                product_id = make_uuid(f"PRODUCT_{item['product_code']}")

            qty = 0
            try:
                qty = int(float(item["qty"]))
            except:
                pass

            unit_price = 0
            try:
                unit_price = float(item["unit_price"])
            except:
                pass

            order_items.append(
                {
                    "id": make_uuid(f"OI_{order_id}_{line_no}"),
                    "order_id": order_id,
                    "line_no": line_no,
                    "product_id": product_id,
                    "product_code": item["product_code"],
                    "requested_qty": qty,
                    "final_qty": qty,
                    "unit_price": unit_price,
                    "status": "confirmed",
                }
            )

    return orders, order_items


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  → {path.name}: {len(rows)}행")


def main():
    print("데이터 로드...")
    rows = load_data()
    print(f"  입력: {len(rows)}행")

    print("\n1. Organizations 생성...")
    orgs = build_organizations(rows)
    org_list = list(orgs.values())
    write_csv(
        OUT_DIR / "01_organizations.csv",
        org_list,
        [
            "id",
            "parent_org_id",
            "org_type",
            "code",
            "name",
            "name_en",
            "country_code",
            "currency_code",
            "status",
        ],
    )

    # 유형별 통계
    type_counts = defaultdict(int)
    for o in org_list:
        type_counts[o["org_type"]] += 1
    for t, c in sorted(type_counts.items()):
        print(f"    {t}: {c}")

    print("\n2. Products 생성...")
    products = build_products(rows)
    prod_list = list(products.values())
    write_csv(
        OUT_DIR / "02_products.csv", prod_list, ["id", "sku", "name", "brand", "status"]
    )

    print("\n3. Orders + Order Items 생성...")
    orders, order_items = build_orders(rows, orgs, products)
    write_csv(
        OUT_DIR / "03_orders.csv",
        orders,
        [
            "id",
            "order_no",
            "ordering_org_id",
            "vendor_org_id",
            "ship_to_org_id",
            "status",
            "currency_code",
            "requested_delivery_date",
            "submitted_at",
            "confirmed_at",
            "packing_no_legacy",
        ],
    )
    write_csv(
        OUT_DIR / "04_order_items.csv",
        order_items,
        [
            "id",
            "order_id",
            "line_no",
            "product_id",
            "product_code",
            "requested_qty",
            "final_qty",
            "unit_price",
            "status",
        ],
    )

    print("\n완료!")


if __name__ == "__main__":
    main()
