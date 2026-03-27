import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LOCALES = ["zh", "ru", "ja", "vi"] as const;
const LOCALE_COL: Record<string, string> = {
  zh: "name_zh",
  ru: "name_ru",
  ja: "name_ja",
  vi: "name_vi",
};

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

async function main() {
  const csvPath = resolve(__dirname, "../supabase/data/product_master_BRAND.csv");
  const content = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  console.log(`Parsed ${rows.length} CSV rows`);

  const skus = rows.map((r) => r.product_code).filter(Boolean);
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku")
    .in("sku", skus);

  if (error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  const skuToId = new Map<string, string>();
  for (const p of products ?? []) {
    skuToId.set(p.sku, p.id);
  }

  console.log(`Matched ${skuToId.size} of ${skus.length} SKUs`);

  const translations: { product_id: string; locale: string; name: string }[] = [];

  for (const row of rows) {
    const productId = skuToId.get(row.product_code);
    if (!productId) continue;

    for (const locale of LOCALES) {
      const colName = LOCALE_COL[locale];
      const name = row[colName];
      if (name && name.length > 0) {
        translations.push({ product_id: productId, locale, name });
      }
    }
  }

  console.log(`Inserting ${translations.length} translations...`);

  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < translations.length; i += BATCH_SIZE) {
    const batch = translations.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("product_translations")
      .upsert(batch, { onConflict: "product_id,locale" });

    if (insertError) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, insertError);
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows`);
    }
  }

  console.log(`Done. ${inserted} translations inserted.`);
}

main();
