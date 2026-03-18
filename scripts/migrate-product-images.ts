import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env"), "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_KEY;
const R2_ENDPOINT = envVars.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = envVars.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = envVars.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = envVars.R2_BUCKET_NAME || "fraijour";
const R2_PUBLIC_URL =
  envVars.NEXT_PUBLIC_R2_PUBLIC_URL ||
  "https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev";

const required = {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
};

for (const [key, val] of Object.entries(required)) {
  if (!val) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
}

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 5;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT!,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

function parseSupabaseUrl(url: string): { folder: string; fileName: string } | null {
  const match = url.match(/product-images\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { folder: match[1], fileName: match[2] };
}

type Product = { id: string; sku: string; image_url: string };

async function migrateOne(product: Product, index: number, total: number): Promise<boolean> {
  const parsed = parseSupabaseUrl(product.image_url);
  if (!parsed) {
    console.error(`  [${index}/${total}] ${product.sku} — failed: cannot parse URL`);
    return false;
  }

  const r2Key = `products/${product.sku}/${parsed.fileName}`;
  const newUrl = `${R2_PUBLIC_URL}/${r2Key}`;

  if (DRY_RUN) {
    console.log(`  [${index}/${total}] ${product.sku} — would migrate`);
    console.log(`    FROM: ${product.image_url}`);
    console.log(`    TO:   ${newUrl}`);
    return true;
  }

  const res = await fetch(product.image_url);
  if (!res.ok) {
    console.error(`  [${index}/${total}] ${product.sku} — fetch failed (${res.status})`);
    return false;
  }

  const buffer = new Uint8Array(await res.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: getContentType(parsed.fileName),
    }),
  );

  const { error } = await supabase
    .from("products")
    .update({ image_url: newUrl })
    .eq("id", product.id);

  if (error) {
    console.error(`  [${index}/${total}] ${product.sku} — DB update failed: ${error.message}`);
    return false;
  }

  console.log(`  [${index}/${total}] ${product.sku} — migrated`);
  return true;
}

async function main() {
  console.log(`\n=== Product Image Migration: Supabase Storage → R2 ===`);
  if (DRY_RUN) console.log("  [DRY RUN — no changes will be made]\n");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, image_url")
    .not("image_url", "is", null);

  if (error) {
    console.error("Failed to query products:", error.message);
    process.exit(1);
  }

  const all = (products || []) as Product[];
  const toMigrate = all.filter((p) => !p.image_url.includes("r2.dev"));
  const skipped = all.length - toMigrate.length;

  console.log(`  Total with image: ${all.length}`);
  console.log(`  Already on R2 (skip): ${skipped}`);
  console.log(`  To migrate: ${toMigrate.length}\n`);

  if (toMigrate.length === 0) {
    console.log("Nothing to migrate. Done.");
    process.exit(0);
  }

  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((p, j) => migrateOne(p, i + j + 1, toMigrate.length)),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) migrated++;
      else failed++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Skipped:  ${skipped}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
