import { NextRequest, NextResponse } from "next/server";

const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  "https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate the URL is from our R2 bucket (prevent SSRF)
  if (!url.startsWith(R2_PUBLIC_URL)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 403 });
  }

  try {
    const r2Response = await fetch(url);

    if (!r2Response.ok) {
      return NextResponse.json(
        { error: `R2 returned ${r2Response.status}` },
        { status: r2Response.status },
      );
    }

    const contentType =
      r2Response.headers.get("content-type") || "application/octet-stream";
    const blob = await r2Response.arrayBuffer();

    const filename = request.nextUrl.searchParams.get("filename");
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": blob.byteLength.toString(),
      "Cache-Control": "public, max-age=3600",
    };

    if (filename) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(blob, { headers });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch file from storage" },
      { status: 502 },
    );
  }
}
