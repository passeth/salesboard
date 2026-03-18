import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAIN = "usvjbuudnofwhmclwhfl.supabase.co";

export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("id");
  if (!docId) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("file_url, file_name, is_buyer_visible")
    .eq("id", docId)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (user.role === "buyer" && !doc.is_buyer_visible) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const url = new URL(doc.file_url);
    if (url.hostname !== ALLOWED_DOMAIN) {
      return NextResponse.json({ error: "Invalid source" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 500 });
  }

  try {
    const pdfResponse = await fetch(doc.file_url);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `Source returned ${pdfResponse.status}` },
        { status: pdfResponse.status },
      );
    }

    const blob = await pdfResponse.arrayBuffer();
    const contentType = pdfResponse.headers.get("content-type") || "application/pdf";

    const download = request.nextUrl.searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": blob.byteLength.toString(),
      "Cache-Control": "private, max-age=3600",
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${doc.file_name}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${doc.file_name}"`;
    }

    return new NextResponse(blob, { headers });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch PDF from storage" },
      { status: 502 },
    );
  }
}
