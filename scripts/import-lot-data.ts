import * as fs from "node:fs";
import * as path from "node:path";

const INPUT = path.resolve(__dirname, "../supabase/data/lot_data_cleaned.csv");
const OUTPUT = path.resolve(__dirname, "../supabase/data/lot_data_import.sql");

const content = fs.readFileSync(INPUT, "utf-8");
const lines = content.trim().split("\n");

const BATCH_SIZE = 500;
const sqlParts: string[] = [];

sqlParts.push(`-- Auto-generated from lot_data_cleaned.csv (${lines.length - 1} rows)`);
sqlParts.push(`-- First backfill product_id from products.sku after insert\n`);

for (let i = 1; i < lines.length; i += BATCH_SIZE) {
  const batch = lines.slice(i, Math.min(i + BATCH_SIZE, lines.length));
  const values = batch.map((line) => {
    const [sku, lotNo, receiptDate, qty, mfgDate] = line.split(",");
    return `('${sku}','${lotNo}','${receiptDate}',${qty},'${mfgDate}')`;
  });

  sqlParts.push(
    `INSERT INTO mes_lot_receipts (sku, lot_no, receipt_date, quantity, manufacturing_date) VALUES`
  );
  sqlParts.push(values.join(",\n") + ";\n");
}

sqlParts.push(`-- Backfill product_id from products.sku`);
sqlParts.push(`UPDATE mes_lot_receipts m SET product_id = p.id FROM products p WHERE p.sku = m.sku AND m.product_id IS NULL;\n`);

fs.writeFileSync(OUTPUT, sqlParts.join("\n"), "utf-8");

console.log(`Generated SQL: ${OUTPUT}`);
console.log(`Total rows: ${lines.length - 1}`);
console.log(`Batches: ${Math.ceil((lines.length - 1) / BATCH_SIZE)}`);
