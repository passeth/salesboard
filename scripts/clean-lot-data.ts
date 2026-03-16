import * as fs from "node:fs";
import * as path from "node:path";

const INPUT = path.resolve(__dirname, "../supabase/data/lot_data.csv");
const OUTPUT = path.resolve(__dirname, "../supabase/data/lot_data_cleaned.csv");

function parseDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parts = raw.split("/");
  if (parts.length !== 3) throw new Error(`Cannot parse date: "${raw}"`);

  const [yy, m, d] = parts;
  const year = Number.parseInt(yy, 10);
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  const month = m.padStart(2, "0");
  const day = d.padStart(2, "0");

  return `${fullYear}-${month}-${day}`;
}

function parseQty(raw: string): number {
  const cleaned = raw.replace(/"/g, "").replace(/,/g, "");
  const n = Number.parseInt(cleaned, 10);
  if (Number.isNaN(n)) throw new Error(`Cannot parse quantity: "${raw}"`);
  return n;
}

const content = fs.readFileSync(INPUT, "utf-8");
const lines = content.trim().split("\n");

const outputLines: string[] = [
  "sku,lot_no,receipt_date,quantity,manufacturing_date",
];
const errors: string[] = [];
const skus = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);

  if (fields.length < 5) {
    errors.push(`Line ${i + 1}: Expected 5 fields, got ${fields.length}: "${line}"`);
    continue;
  }

  const [rawSku, rawLot, rawReceiptDate, rawQty, rawMfgDate] = fields;

  try {
    const sku = rawSku.trim();
    const lotNo = rawLot.trim();
    const receiptDate = parseDate(rawReceiptDate.trim());
    const qty = parseQty(rawQty.trim());
    const mfgDate = parseDate(rawMfgDate.trim());

    skus.add(sku);
    outputLines.push(`${sku},${lotNo},${receiptDate},${qty},${mfgDate}`);
  } catch (err) {
    errors.push(`Line ${i + 1}: ${(err as Error).message}`);
  }
}

fs.writeFileSync(OUTPUT, outputLines.join("\n") + "\n", "utf-8");

console.log("=== Lot Data Cleaning Report ===");
console.log(`Input rows:  ${lines.length - 1}`);
console.log(`Output rows: ${outputLines.length - 1}`);
console.log(`Unique SKUs: ${skus.size}`);
console.log(`Errors:      ${errors.length}`);
if (errors.length > 0) {
  console.log("\nErrors:");
  for (const e of errors) console.log(`  ${e}`);
}
console.log(`\nOutput: ${OUTPUT}`);

  const skuList = Array.from(skus).sort();
fs.writeFileSync(
  path.resolve(__dirname, "../supabase/data/lot_skus.txt"),
  skuList.join("\n") + "\n",
  "utf-8"
);
console.log(`\nSKU list saved to: supabase/data/lot_skus.txt`);
console.log("Sample SKUs:", skuList.slice(0, 10).join(", "));
