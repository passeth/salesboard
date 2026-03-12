"""
order_hx.csv 정리 스크립트
- 날짜-일련번호 분리
- 적요에서 출고지/하위바이어, 출고일, 선적일, USD, 환율 추출
- 월계 행 제거
- 정리된 CSV 출력
"""
import csv
import re
import sys
from pathlib import Path

INPUT = Path(__file__).parent.parent / "supabase/data/order_hx.csv"
OUTPUT = Path(__file__).parent.parent / "supabase/data/order_hx_parsed.csv"

# ── 도시/지역 → 국가 매핑 ──
CITY_COUNTRY = {
    "모스크바": "RU", "노보시비르스크": "RU", "노보시브르스크": "RU",
    "블라디보스톡": "RU", "블라디보스크": "RU",
    "크라스노다르": "RU", "민스크": "BY", "슬라브스카야": "RU",
    "카자흐스탄": "KZ", "에스토니아": "EE",
    "싱가폴": "SG", "싱가포르": "SG",
    "미얀마": "MM", "베트남": "VN",
    "말레이시아": "MY", "말레": "MY",
    "대만": "TW", "호주": "AU",
    "캄보디아": "KH", "미국": "US",
    "위해방정": "CN", "위해": "CN",
    "유럽": "EU", "폴란드": "PL",
    "라트비아": "LV", "슬로바키아": "SK",
    "우크라이나": "UA", "마케도니아": "MK", "북마케도니아": "MK",
}

# 직수출(X)에서 X 추출 → 국가 매핑
DIRECT_EXPORT_COUNTRY = {
    "러시아": "RU", "베트남": "VN", "베트남2 MYCO": "VN",
    "대만": "TW", "호주": "AU", "캄보디아": "KH",
    "라트비아": "LV", "슬로바키아": "SK",
    "말레이시아": "MY", "미얀마": "MM",
    "우크라이나": "UA", "우크라이나 ICOSMO": "UA", "우크라이나KBT": "UA",
    "위해방정": "CN", "유럽": "EU", "유럽 ICOSMO)": "EU",
    "마케도니아": "MK",
}

# 적요에서 하위 바이어 이름 추출 패턴
SUB_BUYER_PATTERNS = [
    r"(GERMES|EFIMOV|PFO|AFRODITA|DAREON|ICOSMO|KBT|MYCO)",  # 영문 바이어
    r"사이버고",
]

def parse_date_field(raw: str):
    """YYYYMMDD-N → (date, serial_no)"""
    raw = raw.strip()
    if not raw or raw.endswith("계"):
        return None, None
    
    m = re.match(r"^(\d{8})-(\d+)$", raw)
    if m:
        d = m.group(1)
        date_str = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
        return date_str, int(m.group(2))
    return None, None

def extract_destination(buyer: str, memo: str):
    """거래처+적요에서 출고지(destination), 하위바이어(sub_buyer), 국가코드 추출"""
    destination = ""
    sub_buyer = ""
    country_code = ""
    
    # 1) 직수출(X) 패턴에서 국가 추출
    dm = re.match(r"^직수출\((.+)\)$", buyer)
    if dm:
        region = dm.group(1).strip()
        country_code = DIRECT_EXPORT_COUNTRY.get(region, "")
    elif buyer == "직수출":
        # 적요에서 국가/지역 추출
        pass
    
    # 2) 적요에서 도시/지역 추출
    for city, cc in CITY_COUNTRY.items():
        if city in memo:
            destination = city
            if not country_code:
                country_code = cc
            break
    
    # 3) 적요에서 하위 바이어 추출
    for pattern in SUB_BUYER_PATTERNS:
        sm = re.search(pattern, memo, re.IGNORECASE)
        if sm:
            sub_buyer = sm.group(0)
            break
    
    # 4) 스티물 = 러시아 바이어, 도시명 = 하위 지사(ship_to)
    if "스티물" in buyer:
        if not country_code:
            country_code = "RU"
        if destination:
            sub_buyer = destination  # 도시명이 곧 지사명
    
    # 5) 유니코 → 적요에서 국가 추출
    if "유니코" in buyer:
        for city, cc in CITY_COUNTRY.items():
            if city in memo:
                destination = city
                country_code = cc
                break
    
    return destination, sub_buyer, country_code

def extract_shipping_info(memo: str):
    """적요에서 출고일, 선적일, USD, 환율 추출"""
    ship_out_date = ""
    ship_date = ""
    usd_amount = ""
    exchange_rate = ""
    
    # 출고일: X/Y 출고, X월Y일 출고
    m = re.search(r"(\d{1,2})[/월](\d{1,2})[일]?\s*출고", memo)
    if m:
        ship_out_date = f"{m.group(1)}/{m.group(2)}"
    
    # 선적일: X/Y 선적, X월Y일 선적
    m = re.search(r"(\d{1,2})[/월](\d{1,2})[일]?\s*선적", memo)
    if m:
        ship_date = f"{m.group(1)}/{m.group(2)}"
    
    # USD 금액
    m = re.search(r"(?:USD|usd)\s*([\d,]+\.?\d*)", memo)
    if m:
        usd_amount = m.group(1).replace(",", "")
    elif re.search(r"총\s*([\d,]+\.?\d*)\s*(?:USD|usd)", memo):
        m2 = re.search(r"총\s*([\d,]+\.?\d*)\s*(?:USD|usd)", memo)
        usd_amount = m2.group(1).replace(",", "")
    
    # 환율
    m = re.search(r"환율[^\d]*([\d,]+\.?\d*)\s*(?:원|적용)?", memo)
    if m:
        exchange_rate = m.group(1).replace(",", "")
    
    return ship_out_date, ship_date, usd_amount, exchange_rate

def classify_buyer_type(buyer: str):
    """거래처 유형 분류"""
    if buyer.startswith("직수출"):
        return "direct_export"
    elif "스티물" in buyer:
        return "direct_export"  # 스티물 = 러시아 바이어 (지역 지사 운영)
    else:
        return "agent_domestic"

def main():
    rows_in = 0
    rows_out = 0
    skipped = 0
    
    with open(INPUT, "r", encoding="utf-8") as fin, \
         open(OUTPUT, "w", encoding="utf-8", newline="") as fout:
        
        reader = csv.reader(fin)
        header = next(reader)
        
        writer = csv.writer(fout)
        writer.writerow([
            "order_date",         # YYYY-MM-DD
            "packing_no",         # 패킹리스트 일련번호
            "product_code",       # 제품코드
            "product_name",       # 품목명
            "qty",                # EA
            "unit_price",         # 단가
            "supply_amount",      # 공급가액
            "vat",                # 부가세
            "total_amount",       # 합계
            "buyer_name",         # 거래처명 (원본)
            "buyer_type",         # direct_export / agent_stimul / agent_domestic
            "country_code",       # 국가코드
            "destination",        # 출고지/도시
            "sub_buyer",          # 하위 바이어
            "ship_out_date",      # 출고일
            "ship_date",          # 선적일
            "usd_amount",         # USD 금액
            "exchange_rate",      # 환율
            "memo_raw",           # 원본 적요
        ])
        
        for row in reader:
            rows_in += 1
            if len(row) < 9:
                skipped += 1
                continue
            
            date_str, serial_no = parse_date_field(row[0])
            if date_str is None:
                skipped += 1
                continue
            
            buyer = row[8].strip()
            if not buyer or buyer.replace(".", "").replace("-", "").isdigit():
                skipped += 1
                continue
            
            memo = row[9].strip() if len(row) > 9 else ""
            
            destination, sub_buyer, country_code = extract_destination(buyer, memo)
            ship_out, ship_date, usd, rate = extract_shipping_info(memo)
            buyer_type = classify_buyer_type(buyer)
            
            writer.writerow([
                date_str,
                serial_no,
                row[1].strip(),   # product_code
                row[2].strip(),   # product_name
                row[3].strip(),   # qty
                row[4].strip(),   # unit_price
                row[5].strip(),   # supply_amount
                row[6].strip(),   # vat
                row[7].strip(),   # total_amount
                buyer,
                buyer_type,
                country_code,
                destination,
                sub_buyer,
                ship_out,
                ship_date,
                usd,
                rate,
                memo,
            ])
            rows_out += 1
    
    print(f"입력: {rows_in}행")
    print(f"출력: {rows_out}행")
    print(f"제외: {skipped}행 (월계/빈행/숫자거래처)")
    print(f"저장: {OUTPUT}")

if __name__ == "__main__":
    main()
