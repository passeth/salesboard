import { NextRequest, NextResponse } from "next/server";

type KoreanNetResult = {
  barcode: string;
  productName: string | null;
  imageUrl: string | null;
  category: string | null;
  categoryCode: string | null;
  country: string | null;
  manufacturer: string | null;
  seller: string | null;
  address: string | null;
};

function parseKoreanNetHtml(
  html: string,
  barcode: string,
): KoreanNetResult {
  const result: KoreanNetResult = {
    barcode,
    productName: null,
    imageUrl: null,
    category: null,
    categoryCode: null,
    country: null,
    manufacturer: null,
    seller: null,
    address: null,
  };

  const nameMatch = html.match(/<div class="nm">([^<]+)<\/div>/);
  if (nameMatch) {
    result.productName = nameMatch[1].trim();
  }

  const imgMatch = html.match(
    /<div class="img"><img src="([^"]+)"/,
  );
  if (imgMatch) {
    let imgUrl = imgMatch[1];
    if (imgUrl.startsWith("http://")) {
      imgUrl = imgUrl.replace("http://", "https://");
    }
    result.imageUrl = imgUrl;
  }

  const fieldMatches = html.matchAll(
    /<div class="th">([\s\S]*?)<\/div>\s*<div class="td">([\s\S]*?)<\/div>/g,
  );

  const stripHtml = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

  const fieldMap: Record<string, string> = {};
  for (const m of fieldMatches) {
    const label = stripHtml(m[1]);
    const value = stripHtml(m[2]);
    if (value) fieldMap[label] = value;
  }

  result.categoryCode = fieldMap["KAN 상품분류코드"] ?? null;
  result.category = fieldMap["KAN 상품분류"] ?? null;
  result.country = fieldMap["제조국가"] ?? null;
  result.manufacturer = fieldMap["제조사/생산자"] ?? null;
  result.seller = fieldMap["판매자"] ?? null;
  result.address = fieldMap["업체주소 (도로명주소)"] ?? null;

  return result;
}

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");

  if (!barcode || !/^\d{8,14}$/.test(barcode)) {
    return NextResponse.json(
      { error: "Invalid barcode. Must be 8-14 digits." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      "https://www.koreannet.or.kr/front/koreannet/gtinSrch.do",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        body: `gtin=${barcode}`,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `KoreanNet returned ${response.status}` },
        { status: 502 },
      );
    }

    const html = await response.text();

    const hasResult = html.includes("good_detail");
    if (!hasResult) {
      return NextResponse.json(
        { error: "Product not found on KoreanNet", barcode },
        { status: 404 },
      );
    }

    const result = parseKoreanNetHtml(html, barcode);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from KoreanNet" },
      { status: 502 },
    );
  }
}
