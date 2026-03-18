import type { R2ContentFile } from "./types";

export interface RenameEntry {
  oldKey: string;
  newKey: string;
  oldFileName: string;
  newFileName: string;
  category: string;
  skipped: boolean;
  reason?: string;
}

export interface RenamePlan {
  contentSlug: string;
  entries: RenameEntry[];
  toRename: number;
  toSkip: number;
  total: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1) : "";
}

export function isValidConventionName(
  fileName: string,
  contentSlug: string,
  category: string,
): boolean {
  const pattern = new RegExp(
    `^${escapeRegex(contentSlug)}_${escapeRegex(category)}_\\d{3}\\.\\w+$`,
  );
  return pattern.test(fileName);
}

export function generateNewFileName(
  contentSlug: string,
  category: string,
  sequenceNum: number,
  extension: string,
): string {
  const seq = String(sequenceNum).padStart(3, "0");
  return `${contentSlug}_${category}_${seq}.${extension}`;
}

export function buildRenamePlan(
  contentSlug: string,
  files: R2ContentFile[],
): RenamePlan {
  const byCategory = new Map<string, R2ContentFile[]>();

  for (const file of files) {
    const cat = file.category || "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(file);
  }

  const entries: RenameEntry[] = [];

  for (const [category, catFiles] of byCategory) {
    const sorted = [...catFiles].sort((a, b) =>
      a.fileName.localeCompare(b.fileName),
    );

    sorted.forEach((file, idx) => {
      const seq = idx + 1;
      const ext = getExt(file.fileName);
      const newFileName = generateNewFileName(contentSlug, category, seq, ext);
      const newKey = `contents/${contentSlug}/${category}/${newFileName}`;

      const alreadyCorrect =
        file.fileName === newFileName && file.key === newKey;

      entries.push({
        oldKey: file.key,
        newKey,
        oldFileName: file.fileName,
        newFileName,
        category,
        skipped: alreadyCorrect,
        reason: alreadyCorrect ? "Already matches convention" : undefined,
      });
    });
  }

  const toSkip = entries.filter((e) => e.skipped).length;

  return {
    contentSlug,
    entries,
    toRename: entries.length - toSkip,
    toSkip,
    total: entries.length,
  };
}
