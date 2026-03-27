import { getCurrentUser } from "@/lib/auth";
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2/client";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const BARCODE_FILENAME_RE = /^[A-Z0-9]+_\d{13}\.(png|jpg)$/i;
const BARCODE_MAX_SIZE = 25_000;

function isBarcodeImage(filename: string, size: number): boolean {
  return BARCODE_FILENAME_RE.test(filename) && size < BARCODE_MAX_SIZE;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r2 = getR2Client();

    const imagesBySku = new Map<string, string[]>();
    let continuationToken: string | undefined;

    do {
      const cmd = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: "products/",
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });
      const result = await r2.send(cmd);

      for (const obj of result.Contents ?? []) {
        const key = obj.Key;
        if (!key || key.endsWith("/")) continue;

        const parts = key.split("/");
        if (parts.length < 3) continue;

        const filename = parts[parts.length - 1];
        if (isBarcodeImage(filename, obj.Size ?? 0)) continue;

        const sku = parts[1];
        const url = `${R2_PUBLIC_URL}/${key}`;

        const existing = imagesBySku.get(sku) ?? [];
        existing.push(url);
        imagesBySku.set(sku, existing);
      }

      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);

    for (const [sku, urls] of imagesBySku) {
      imagesBySku.set(sku, urls.sort());
    }

    const supabase = await createClient();
    const { data: nullImageProducts, error: queryError } = await supabase
      .from("products")
      .select("id, sku")
      .is("image_url", null);

    if (queryError) {
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 },
      );
    }

    let updated = 0;
    let skipped = 0;
    const updates: { sku: string; imageUrl: string }[] = [];

    for (const product of nullImageProducts ?? []) {
      const r2Images = imagesBySku.get(product.sku);
      if (!r2Images || r2Images.length === 0) {
        skipped++;
        continue;
      }

      const primaryUrl = r2Images[0];
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: primaryUrl })
        .eq("id", product.id);

      if (updateError) {
        skipped++;
        continue;
      }

      updated++;
      updates.push({ sku: product.sku, imageUrl: primaryUrl });
    }

    return NextResponse.json({
      success: true,
      r2SkuCount: imagesBySku.size,
      nullImageProducts: (nullImageProducts ?? []).length,
      updated,
      skipped,
      updates,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
