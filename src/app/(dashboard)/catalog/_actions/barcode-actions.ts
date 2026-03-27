"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2/client";
import bwipjs from "bwip-js";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    throw new Error("Unauthorized");
  }
  return user;
}

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
  return Buffer.from(raw);
}

async function deleteOldBarcodeImages(sku: string, keepFileName?: string) {
  const client = getR2Client();
  const prefix = `products/${sku}/`;

  const listResult = await client.send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix }),
  );

  const barcodePattern = /^[A-Z0-9]+_\d{13,}\.(png|jpg)$/i;

  for (const obj of listResult.Contents ?? []) {
    if (!obj.Key) continue;
    const fileName = obj.Key.split("/").pop() ?? "";
    if (!barcodePattern.test(fileName)) continue;
    if (keepFileName && fileName === keepFileName) continue;

    await client.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: obj.Key }),
    );
  }
}

export async function updateBarcodeAndRegenerate(
  productId: string,
  newBarcode: string,
): Promise<{ success: boolean; error?: string; imageUrl?: string }> {
  await requireAdmin();

  if (!/^\d{13}$/.test(newBarcode)) {
    return { success: false, error: "Barcode must be exactly 13 digits (EAN-13)" };
  }

  const supabase = await createClient();

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("id, sku, barcode")
    .eq("id", productId)
    .single();

  if (fetchError || !product) {
    return { success: false, error: "Product not found" };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ barcode: newBarcode })
    .eq("id", productId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  try {
    const png = await generateBarcodePng(newBarcode);
    const fileName = `${product.sku}_${newBarcode}.png`;
    const r2Key = `products/${product.sku}/${fileName}`;

    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: new Uint8Array(png),
        ContentType: "image/png",
      }),
    );

    await deleteOldBarcodeImages(product.sku, fileName);

    const imageUrl = `${R2_PUBLIC_URL}/${r2Key}`;

    revalidatePath(`/catalog/${productId}`);
    revalidatePath("/catalog");
    revalidatePath("/admin/products");

    return { success: true, imageUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate barcode image";
    return { success: false, error: message };
  }
}

export async function regenerateBarcodeImage(
  productId: string,
): Promise<{ success: boolean; error?: string; imageUrl?: string }> {
  await requireAdmin();

  const supabase = await createClient();

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("id, sku, barcode")
    .eq("id", productId)
    .single();

  if (fetchError || !product) {
    return { success: false, error: "Product not found" };
  }

  if (!product.barcode || !/^\d{13}$/.test(product.barcode)) {
    return { success: false, error: "No valid EAN-13 barcode registered" };
  }

  try {
    const png = await generateBarcodePng(product.barcode);
    const fileName = `${product.sku}_${product.barcode}.png`;
    const r2Key = `products/${product.sku}/${fileName}`;

    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: new Uint8Array(png),
        ContentType: "image/png",
      }),
    );

    await deleteOldBarcodeImages(product.sku, fileName);

    const imageUrl = `${R2_PUBLIC_URL}/${r2Key}`;

    revalidatePath(`/catalog/${productId}`);
    revalidatePath("/catalog");

    return { success: true, imageUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate barcode image";
    return { success: false, error: message };
  }
}
