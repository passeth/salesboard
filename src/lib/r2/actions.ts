"use server";

import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from "./client";
import type { R2ContentFile } from "./types";

export async function listContentFiles(
  contentSlug: string,
): Promise<{ success: boolean; files?: R2ContentFile[]; error?: string }> {
  try {
    const client = getR2Client();
    const prefix = `contents/${contentSlug}/`;

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
    });

    const response = await client.send(command);

    const files: R2ContentFile[] = (response.Contents || [])
      .filter((obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith("/"))
      .map((obj) => {
        const relativePath = obj.Key!.replace(prefix, "");
        const parts = relativePath.split("/");
        const fileName = parts.length > 1 ? parts.pop()! : relativePath;
        const category = parts.length > 0 ? parts[0] : "other";
        return {
          key: obj.Key!,
          fileName,
          category,
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          publicUrl: `${R2_PUBLIC_URL}/${obj.Key}`,
        };
      });

    return { success: true, files };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list files";
    return { success: false, error: message };
  }
}

export async function listContentSlugs(): Promise<{
  success: boolean;
  slugs?: string[];
  error?: string;
}> {
  try {
    const client = getR2Client();

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: "contents/",
      Delimiter: "/",
    });

    const response = await client.send(command);

    const slugs = (response.CommonPrefixes || [])
      .map((p) => p.Prefix?.replace("contents/", "").replace("/", "") || "")
      .filter(Boolean)
      .sort();

    return { success: true, slugs };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list slugs";
    return { success: false, error: message };
  }
}

export async function uploadContentFile(
  contentSlug: string,
  fileName: string,
  fileContent: Buffer | ArrayBuffer,
  contentType?: string,
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const client = getR2Client();
    const key = `contents/${contentSlug}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: new Uint8Array(
        fileContent instanceof Buffer ? fileContent : fileContent,
      ),
      ContentType: contentType || "application/octet-stream",
    });

    await client.send(command);

    return {
      success: true,
      publicUrl: `${R2_PUBLIC_URL}/${key}`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return { success: false, error: message };
  }
}

export async function copyContentFile(
  sourceKey: string,
  destinationKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client();

    const command = new CopyObjectCommand({
      Bucket: R2_BUCKET,
      Key: destinationKey,
      CopySource: `${R2_BUCKET}/${encodeURIComponent(sourceKey)}`,
    });

    await client.send(command);
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to copy file";
    return { success: false, error: message };
  }
}

export async function deleteContentFile(
  key: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    await client.send(command);
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete file";
    return { success: false, error: message };
  }
}

/**
 * Delete all files under a content slug folder
 */
export async function deleteAllContentFiles(
  contentSlug: string,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const listResult = await listContentFiles(contentSlug);
    if (!listResult.success || !listResult.files) {
      return { success: false, deletedCount: 0, error: listResult.error };
    }

    let deletedCount = 0;
    for (const file of listResult.files) {
      const result = await deleteContentFile(file.key);
      if (result.success) deletedCount++;
    }

    return { success: true, deletedCount };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete all files";
    return { success: false, deletedCount: 0, error: message };
  }
}
