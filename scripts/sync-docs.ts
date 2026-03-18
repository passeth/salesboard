import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

const mesUrl = process.env.MES_SUPABASE_URL!;
const mesKey = process.env.MES_SUPABASE_ANON_KEY!;
const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const appServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const mes = createClient(mesUrl, mesKey);
const app = createClient(appUrl, appServiceKey);

const PDF_COLUMNS = [
  { column: "ingredients_en_pdf_url" as const, documentType: "ingredients_en", label: "Ingredients (EN)" },
  { column: "formula_breakdown_pdf_url" as const, documentType: "formula_breakdown", label: "Formula Breakdown" },
  { column: "inci_summary_pdf_url" as const, documentType: "inci_summary", label: "INCI Summary" },
];

async function main() {
  console.log("Fetching labdoc_products from MES...");
  const { data: labdocRows, error: mesError } = await mes
    .from("labdoc_products")
    .select("product_code, ingredients_en_pdf_url, formula_breakdown_pdf_url, inci_summary_pdf_url");

  if (mesError) throw new Error(`MES query failed: ${mesError.message}`);
  console.log(`Found ${labdocRows?.length ?? 0} labdoc rows`);

  const skuList = (labdocRows ?? []).map((r) => r.product_code).filter(Boolean);

  const allProducts: Array<{ id: string; sku: string }> = [];
  const BATCH_SIZE = 200;
  for (let i = 0; i < skuList.length; i += BATCH_SIZE) {
    const batch = skuList.slice(i, i + BATCH_SIZE);
    const { data, error } = await app.from("products").select("id, sku").in("sku", batch);
    if (error) throw new Error(`Products query failed: ${error.message}`);
    allProducts.push(...(data ?? []));
  }
  console.log(`Matched ${allProducts.length} products`);

  const skuToProductId = new Map<string, string>();
  for (const p of allProducts) skuToProductId.set(p.sku, p.id);

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
  let skipped = 0;

  for (const row of labdocRows ?? []) {
    const productCode = row.product_code as string;
    const productId = skuToProductId.get(productCode);
    if (!productId) { skipped++; continue; }

    for (const mapping of PDF_COLUMNS) {
      const pdfUrl = row[mapping.column] as string | null;
      if (!pdfUrl) continue;

      const fileName = pdfUrl.split("/").pop() ?? `${mapping.documentType}.pdf`;
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

  console.log(`Prepared ${inserts.length} documents to insert, ${skipped} products not found`);

  let inserted = 0;
  const INSERT_BATCH = 100;
  for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
    const batch = inserts.slice(i, i + INSERT_BATCH);
    const { error } = await app.from("documents").insert(batch);
    if (error) {
      console.error(`Batch insert error at ${i}: ${error.message}`);
      continue;
    }
    inserted += batch.length;
    if ((i / INSERT_BATCH) % 5 === 0) {
      console.log(`  Inserted ${inserted}/${inserts.length}...`);
    }
  }

  console.log(`Sync complete: ${inserted} inserted, ${skipped} skipped`);
}

main().catch(console.error);
