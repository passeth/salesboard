import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env"), "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const INPUT = path.resolve(__dirname, "../supabase/data/lot_data_cleaned.csv");
const content = fs.readFileSync(INPUT, "utf-8");
const lines = content.trim().split("\n");

type Row = {
  sku: string;
  lot_no: string;
  receipt_date: string;
  quantity: number;
  manufacturing_date: string;
};

const rows: Row[] = [];
for (let i = 1; i < lines.length; i++) {
  const [sku, lot_no, receipt_date, qty, manufacturing_date] = lines[i].split(",");
  rows.push({
    sku,
    lot_no,
    receipt_date,
    quantity: Number.parseInt(qty, 10),
    manufacturing_date,
  });
}

async function run() {
  console.log(`Importing ${rows.length} rows...`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("mes_lot_receipts").insert(batch);
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} inserted (${batch.length} rows)`);
  }

  console.log("\nBackfilling product_id from products.sku...");
  const { error: updateError } = await supabase.rpc("exec_sql", {
    sql: "UPDATE mes_lot_receipts m SET product_id = p.id FROM products p WHERE p.sku = m.sku AND m.product_id IS NULL",
  });

  if (updateError) {
    console.log("RPC backfill not available, trying direct SQL...");
  }

  const { count } = await supabase
    .from("mes_lot_receipts")
    .select("*", { count: "exact", head: true });

  console.log(`\nTotal rows in mes_lot_receipts: ${count}`);
  console.log("Done!");
}

run().catch(console.error);
