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

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.Admin) {
    throw new Error("Unauthorized");
  }
  return user;
}

function extractR2Key(imageUrl: string): string | null {
  const prefix = R2_PUBLIC_URL + "/";
  if (imageUrl.startsWith(prefix)) {
    return imageUrl.slice(prefix.length);
  }
  return null;
}

export async function uploadProductImage(
  productId: string,
  sku: string,
  formData: FormData,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return { success: false, error: "Invalid image file" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size must be under 5MB" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const supabase = await createClient();
    const client = getR2Client();
    const listCmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: `products/${sku}/`,
    });
    const listResult = await client.send(listCmd);
    const existingFiles = (listResult.Contents || [])
      .filter((obj) => obj.Key && !obj.Key.endsWith("/"))
      .map((obj) => obj.Key!);

    let maxSeq = 0;
    for (const key of existingFiles) {
      const match = key.match(/_(\d+)\.\w+$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    const nextSeq = maxSeq + 1;
    const fileName = `${sku}_${nextSeq}.${ext}`;
    const r2Key = `products/${sku}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    });
    await client.send(putCmd);

    const imageUrl = `${R2_PUBLIC_URL}/${r2Key}`;

    const { data: product } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", productId)
      .single();

    if (!product?.image_url) {
      const { error: dbError } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", productId);

      if (dbError) {
        return { success: false, error: dbError.message };
      }
    }

    revalidatePath(`/catalog/${productId}`);
    return { success: true, imageUrl };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload image";
    return { success: false, error: message };
  }
}

export async function deleteProductImage(
  productId: string,
  imageUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const r2Key = extractR2Key(imageUrl);
    if (!r2Key) {
      return { success: false, error: "Invalid image URL" };
    }

    const client = getR2Client();
    const deleteCmd = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
    });
    await client.send(deleteCmd);

    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", productId)
      .single();

    if (product?.image_url === imageUrl) {
      const sku = r2Key.split("/")[1];
      const listCmd = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: `products/${sku}/`,
      });
      const listResult = await client.send(listCmd);
      const remaining = (listResult.Contents || [])
        .filter((obj) => obj.Key && !obj.Key.endsWith("/"))
        .map((obj) => `${R2_PUBLIC_URL}/${obj.Key}`);

      const newPrimary = remaining.length > 0 ? remaining[0] : null;
      const { error: dbError } = await supabase
        .from("products")
        .update({ image_url: newPrimary })
        .eq("id", productId);

      if (dbError) {
        return { success: false, error: dbError.message };
      }
    }

    revalidatePath(`/catalog/${productId}`);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete image";
    return { success: false, error: message };
  }
}

export async function setPrimaryProductImage(
  productId: string,
  imageUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("products")
      .update({ image_url: imageUrl })
      .eq("id", productId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    revalidatePath(`/catalog/${productId}`);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set primary image";
    return { success: false, error: message };
  }
}

export async function listProductImages(
  sku: string,
): Promise<{
  success: boolean;
  images?: { url: string; key: string; fileName: string }[];
  error?: string;
}> {
  try {
    const client = getR2Client();
    const prefix = `products/${sku}/`;

    const listCmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
    });
    const response = await client.send(listCmd);

    const images = (response.Contents || [])
      .filter((obj) => obj.Key && !obj.Key.endsWith("/"))
      .map((obj) => ({
        key: obj.Key!,
        fileName: obj.Key!.split("/").pop()!,
        url: `${R2_PUBLIC_URL}/${obj.Key}`,
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));

    return { success: true, images };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list images";
    return { success: false, error: message };
  }
}
