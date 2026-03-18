import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createMesClient } from "@/lib/supabase/mes-server";
import { UserRole } from "@/types";
import { NextResponse } from "next/server";

type LabdocPdfColumn = "ingredients_en_pdf_url" | "formula_breakdown_pdf_url" | "inci_summary_pdf_url";

type DocColumnMapping = {
  column: LabdocPdfColumn;
  documentType: "ingredients_en" | "formula_breakdown" | "inci_summary";
  label: string;
};

const PDF_COLUMNS: DocColumnMapping[] = [
  { column: "ingredients_en_pdf_url", documentType: "ingredients_en", label: "Ingredients (EN)" },
  { column: "formula_breakdown_pdf_url", documentType: "formula_breakdown", label: "Formula Breakdown" },
  { column: "inci_summary_pdf_url", documentType: "inci_summary", label: "INCI Summary" },
];

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.Admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const mes = createMesClient();
    const supabase = await createClient();

    const { data: labdocRows, error: mesError } = await mes
      .from("labdoc_products")
      .select("product_code, ingredients_en_pdf_url, formula_breakdown_pdf_url, inci_summary_pdf_url");

    if (mesError) {
      return NextResponse.json({ error: `MES query failed: ${mesError.message}` }, { status: 502 });
    }

    if (!labdocRows || labdocRows.length === 0) {
      return NextResponse.json({ success: true, synced: 0, skipped: 0, message: "No labdoc rows found" });
    }

    const skuList = labdocRows.map((r: Record<string, unknown>) => r.product_code as string).filter(Boolean);

    const allProducts: Array<{ id: string; sku: string }> = [];
    const QUERY_BATCH = 200;
    for (let i = 0; i < skuList.length; i += QUERY_BATCH) {
      const batch = skuList.slice(i, i + QUERY_BATCH);
      const { data, error } = await supabase.from("products").select("id, sku").in("sku", batch);
      if (error) {
        return NextResponse.json({ error: `Products query failed: ${error.message}` }, { status: 500 });
      }
      allProducts.push(...(data ?? []));
    }

    const skuToProductId = new Map<string, string>();
    for (const p of allProducts) skuToProductId.set(p.sku, p.id);

    const { data: existingDocs } = await supabase
      .from("documents")
      .select("id, owner_id, document_type, file_url")
      .eq("owner_type", "product")
      .in("document_type", ["ingredients_en", "formula_breakdown", "inci_summary"]);

    const existingMap = new Map<string, { id: string; file_url: string }>();
    for (const doc of existingDocs ?? []) {
      existingMap.set(`${doc.owner_id}:${doc.document_type}`, { id: doc.id, file_url: doc.file_url });
    }

    type DocInsert = {
      owner_type: string;
      owner_id: string;
      document_type: string;
      file_name: string;
      file_url: string;
      version_no: number;
      is_buyer_visible: boolean;
      metadata_json: Record<string, string>;
    };

    const inserts: DocInsert[] = [];
    const updates: Array<{ id: string; file_url: string; file_name: string }> = [];
    let skipped = 0;

    for (const row of labdocRows) {
      const productCode = row.product_code as string;
      const productId = skuToProductId.get(productCode);
      if (!productId) { skipped++; continue; }

      for (const mapping of PDF_COLUMNS) {
        const pdfUrl = row[mapping.column] as string | null;
        if (!pdfUrl) continue;

        const fileName = pdfUrl.split("/").pop() ?? `${mapping.documentType}.pdf`;
        const key = `${productId}:${mapping.documentType}`;
        const existing = existingMap.get(key);

        if (existing) {
          if (existing.file_url !== pdfUrl) {
            updates.push({ id: existing.id, file_url: pdfUrl, file_name: fileName });
          }
        } else {
          inserts.push({
            owner_type: "product",
            owner_id: productId,
            document_type: mapping.documentType,
            file_name: fileName,
            file_url: pdfUrl,
            version_no: 1,
            is_buyer_visible: true,
            metadata_json: { source: "labdoc_sync", label: mapping.label },
          });
        }
      }
    }

    let inserted = 0;
    const INSERT_BATCH = 100;
    for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
      const batch = inserts.slice(i, i + INSERT_BATCH);
      const { error } = await supabase.from("documents").insert(batch);
      if (!error) inserted += batch.length;
    }

    let updated = 0;
    const now = new Date().toISOString();
    for (const u of updates) {
      const { error } = await supabase
        .from("documents")
        .update({ file_url: u.file_url, file_name: u.file_name, updated_at: now })
        .eq("id", u.id);
      if (!error) updated++;
    }

    return NextResponse.json({
      success: true,
      labdocCount: labdocRows.length,
      matchedProducts: skuToProductId.size,
      inserted,
      updated,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
