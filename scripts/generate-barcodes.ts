import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import bwipjs from "bwip-js";
import sharp from "sharp";

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
    console.error(`Missing env: ${key}`);
    process.exit(1);
  }
}

const isDryRun = process.argv.includes("--dry-run");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT!,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

async function generateBarcodePng(barcode: string): Promise<Buffer> {
  const raw = await bwipjs.toBuffer({
    bcid: "ean13",
    text: barcode,
    scale: 4,
    height: 30,
    includetext: true,
    textxalign: "center",
    textsize: 12,
    paddingwidth: 10,
    paddingheight: 5,
    backgroundcolor: "FFFFFF",
  });

  const resized = await sharp(raw)
    .resize(600, 400, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  return resized as Buffer;
}

async function r2KeyExists(key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, barcode")
    .not("barcode", "is", null)
    .neq("barcode", "")
    .order("sku");

  if (error || !products) {
    console.error("Failed to fetch products:", error?.message);
    process.exit(1);
  }

  const validProducts = products.filter(
    (p) => p.barcode && p.barcode.length === 13,
  );

  console.log(`\n=== Barcode Image Generation ===`);
  if (isDryRun) console.log("  [DRY RUN — no changes will be made]");
  console.log(`  Total with barcode: ${products.length}`);
  console.log(`  Valid EAN-13: ${validProducts.length}`);
  console.log(`  Skipped (not EAN-13): ${products.length - validProducts.length}\n`);

  if (validProducts.length === 0) {
    console.log("Nothing to generate. Done.");
    return;
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const BATCH = 5;

  for (let i = 0; i < validProducts.length; i += BATCH) {
    const batch = validProducts.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (product) => {
        const fileName = `${product.sku}_${product.barcode}.png`;
        const r2Key = `products/${product.sku}/${fileName}`;

        if (!isDryRun) {
          const exists = await r2KeyExists(r2Key);
          if (exists) {
            skipped++;
            return;
          }
        }

        if (isDryRun) {
          console.log(`  [${i + batch.indexOf(product) + 1}/${validProducts.length}] ${product.sku} → ${r2Key}`);
          generated++;
          return;
        }

        const png = await generateBarcodePng(product.barcode!);

        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: new Uint8Array(png),
            ContentType: "image/png",
          }),
        );

        console.log(`  [${i + batch.indexOf(product) + 1}/${validProducts.length}] ${product.sku} — generated`);
        generated++;
      }),
    );

    for (const r of results) {
      if (r.status === "rejected") {
        console.error(`  FAILED:`, r.reason);
        failed++;
      }
    }

    if (!isDryRun && i + BATCH < validProducts.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n=== Generation Complete ===`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
