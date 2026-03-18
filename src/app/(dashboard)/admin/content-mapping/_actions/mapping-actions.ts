"use server";

import { createClient } from "@/lib/supabase/server";
import {
  listContentSlugs,
  listContentFiles,
  uploadContentFile,
  copyContentFile,
  deleteContentFile,
  deleteAllContentFiles,
} from "@/lib/r2/actions";
import { buildRenamePlan } from "@/lib/r2/rename-utils";
import type { R2ContentFile } from "@/lib/r2/types";

export type SlugOverview = {
  slug: string;
  mappedCount: number;
};

export type MappedProduct = {
  id: string;
  product_code: string;
  product_name: string;
  brand: string;
  content_slug: string | null;
};

export type SerializedR2ContentFile = {
  key: string;
  fileName: string;
  size: number;
  lastModified: string;
  publicUrl: string;
};

export type MappingStats = {
  total: number;
  mapped: number;
  unmapped: number;
  percentage: number;
};

/**
 * R2 slug 목록 + DB 매핑 현황 결합
 */
export async function getContentMappingOverview(): Promise<{
  slugs: SlugOverview[];
  orphanedSlugs: string[];
}> {
  const supabase = await createClient();

  // 1. R2에서 slug 목록
  const r2Result = await listContentSlugs();
  const r2Slugs = r2Result.slugs || [];

  // 2. DB에서 slug별 매핑 수
  const { data: mappings } = await supabase
    .from("product_master")
    .select("content_slug")
    .not("content_slug", "is", null)
    .neq("content_slug", "");

  const countBySlug = (mappings || []).reduce<Record<string, number>>(
    (acc, row) => {
      if (row.content_slug) {
        acc[row.content_slug] = (acc[row.content_slug] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  // 3. R2 기준으로 결합
  const slugs = r2Slugs.map((slug) => ({
    slug,
    mappedCount: countBySlug[slug] || 0,
  }));

  // 4. DB에만 있고 R2에 없는 slug (orphaned)
  const r2Set = new Set(r2Slugs);
  const orphanedSlugs = Object.keys(countBySlug).filter((s) => !r2Set.has(s));

  return { slugs, orphanedSlugs };
}

/**
 * 특정 slug에 매핑된 품목 목록
 */
export async function getMappedProducts(
  contentSlug: string
): Promise<MappedProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_master")
    .select("id, product_code, product_name, brand, content_slug")
    .eq("content_slug", contentSlug)
    .order("product_code");

  if (error) {
    console.error("getMappedProducts error:", error);
    return [];
  }

  return (data || []) as MappedProduct[];
}

/**
 * 특정 slug 폴더의 파일 목록 (Date 객체를 ISO string으로 변환)
 */
export async function getSlugFiles(contentSlug: string): Promise<{
  success: boolean;
  files?: SerializedR2ContentFile[];
  error?: string;
}> {
  const result = await listContentFiles(contentSlug);

  if (!result.success || !result.files) {
    return { success: false, error: result.error };
  }

  // Date 객체를 ISO string으로 변환하여 직렬화
  const serializedFiles: SerializedR2ContentFile[] = result.files.map((f) => ({
    ...f,
    lastModified:
      f.lastModified instanceof Date
        ? f.lastModified.toISOString()
        : f.lastModified,
  }));

  return { success: true, files: serializedFiles };
}

/**
 * 품목 slug 매핑 업데이트
 */
export async function updateProductContentSlug(
  productCode: string,
  contentSlug: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("product_master")
    .update({
      content_slug: contentSlug,
      updated_at: new Date().toISOString(),
    })
    .eq("product_code", productCode);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 매핑 현황 통계
 */
export async function getMappingStats(): Promise<MappingStats> {
  const supabase = await createClient();

  const { count: total } = await supabase
    .from("product_master")
    .select("*", { count: "exact", head: true });

  const { count: mapped } = await supabase
    .from("product_master")
    .select("*", { count: "exact", head: true })
    .not("content_slug", "is", null)
    .neq("content_slug", "");

  const totalNum = total || 0;
  const mappedNum = mapped || 0;

  return {
    total: totalNum,
    mapped: mappedNum,
    unmapped: totalNum - mappedNum,
    percentage: totalNum ? Math.round((mappedNum / totalNum) * 100) : 0,
  };
}

/**
 * 품목 검색 (product_code 또는 product_name으로)
 */
export async function searchProducts(query: string): Promise<MappedProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_master")
    .select("id, product_code, product_name, brand, content_slug")
    .or(`product_code.ilike.%${query}%,product_name.ilike.%${query}%`)
    .order("product_code")
    .limit(20);

  if (error) {
    console.error("searchProducts error:", error);
    return [];
  }

  return (data || []) as MappedProduct[];
}

export async function uploadContentFiles(
  formData: FormData
): Promise<{ success: boolean; uploadedCount: number; error?: string }> {
  const slug = formData.get("slug") as string;
  const subfolder = (formData.get("subfolder") as string) || "";
  const files = formData.getAll("files") as File[];

  if (!slug || files.length === 0) {
    return { success: false, uploadedCount: 0, error: "Missing slug or files" };
  }

  let uploadedCount = 0;
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = subfolder
      ? `${subfolder}/${file.name}`
      : file.name;
    const result = await uploadContentFile(slug, filePath, buffer, file.type);
    if (result.success) uploadedCount++;
  }

  return { success: true, uploadedCount };
}

export async function deleteContentFileAction(
  key: string
): Promise<{ success: boolean; error?: string }> {
  return deleteContentFile(key);
}

export async function deleteSlugContents(
  contentSlug: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const supabase = await createClient();

  const result = await deleteAllContentFiles(contentSlug);

  if (result.success) {
    await supabase
      .from("product_master")
      .update({ content_slug: null, updated_at: new Date().toISOString() })
      .eq("content_slug", contentSlug);
  }

  return result;
}

export type RenameResult = {
  success: boolean;
  contentSlug: string;
  renamed: number;
  skipped: number;
  failed: number;
  errors: string[];
  total: number;
};

const RENAME_BATCH_SIZE = 5;
const RENAME_BATCH_DELAY_MS = 200;

export async function renameSlugFiles(
  contentSlug: string,
): Promise<RenameResult> {
  const result: RenameResult = {
    success: true,
    contentSlug,
    renamed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    total: 0,
  };

  const listResult = await listContentFiles(contentSlug);
  if (!listResult.success || !listResult.files) {
    return { ...result, success: false, errors: [listResult.error ?? "Failed to list files"] };
  }

  const plan = buildRenamePlan(contentSlug, listResult.files);
  result.total = plan.total;
  result.skipped = plan.toSkip;

  const toProcess = plan.entries.filter((e) => !e.skipped);

  for (let i = 0; i < toProcess.length; i += RENAME_BATCH_SIZE) {
    const batch = toProcess.slice(i, i + RENAME_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (entry) => {
        const copyResult = await copyContentFile(entry.oldKey, entry.newKey);
        if (!copyResult.success) {
          throw new Error(`Copy failed [${entry.oldFileName}]: ${copyResult.error}`);
        }
        const delResult = await deleteContentFile(entry.oldKey);
        if (!delResult.success) {
          throw new Error(`Delete failed [${entry.oldFileName}]: ${delResult.error}`);
        }
      }),
    );

    for (const br of batchResults) {
      if (br.status === "fulfilled") {
        result.renamed++;
      } else {
        result.failed++;
        result.errors.push(br.reason?.message ?? "Unknown error");
      }
    }

    if (i + RENAME_BATCH_SIZE < toProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, RENAME_BATCH_DELAY_MS));
    }
  }

  if (result.failed > 0) result.success = false;
  return result;
}
