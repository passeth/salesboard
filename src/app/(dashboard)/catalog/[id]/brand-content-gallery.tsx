"use client";

import { useCallback, useEffect, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";

export interface BrandContentFile {
  key: string;
  fileName: string;
  category: string;
  size: number;
  lastModified: string;
  publicUrl: string;
}

interface BrandContentGalleryProps {
  contentSlug: string | null;
  productCode: string;
  files: BrandContentFile[];
}

const CATEGORY_LABELS: Record<string, string> = {
  banner: "Banner",
  concepts: "Concept Photos",
  "page-en": "Detail Page (EN)",
  "page-kr": "Detail Page (KR)",
  "page-cn": "Detail Page (CN)",
  "page-jp": "Detail Page (JP)",
  "page-vn": "Detail Page (VN)",
  other: "Other",
};

const CATEGORY_ORDER = [
  "banner",
  "concepts",
  "page-en",
  "page-kr",
  "page-cn",
  "page-jp",
  "page-vn",
];

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  return ext ? ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) : false;
}

function groupByCategory(
  files: BrandContentFile[]
): { category: string; files: BrandContentFile[]; totalSize: number }[] {
  const grouped = new Map<string, BrandContentFile[]>();

  for (const file of files) {
    const cat = file.category || "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(file);
  }

  const entries = Array.from(grouped.entries());
  entries.sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a[0]);
    const idxB = CATEGORY_ORDER.indexOf(b[0]);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  return entries.map(([category, catFiles]) => ({
    category,
    files: catFiles,
    totalSize: catFiles.reduce((sum, f) => sum + f.size, 0),
  }));
}

function proxyUrl(publicUrl: string): string {
  return `/api/r2-download?url=${encodeURIComponent(publicUrl)}`;
}

function getExt(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot) : "";
}

function buildDownloadName(
  productCode: string,
  category: string,
  index: number,
  fileName: string,
): string {
  const seq = String(index + 1).padStart(3, "0");
  return `${productCode}_${category}_${seq}${getExt(fileName)}`;
}

async function downloadSingleFile(file: BrandContentFile, downloadName?: string) {
  const res = await fetch(proxyUrl(file.publicUrl));
  const blob = await res.blob();
  saveAs(blob, downloadName ?? file.fileName);
}

async function downloadAsZip(
  files: BrandContentFile[],
  zipName: string,
  productCode?: string,
  category?: string,
) {
  const zip = new JSZip();
  const results = await Promise.allSettled(
    files.map(async (f, i) => {
      const res = await fetch(proxyUrl(f.publicUrl));
      const blob = await res.blob();
      const name =
        productCode && category
          ? buildDownloadName(productCode, category, i, f.fileName)
          : f.fileName;
      zip.file(name, blob);
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) alert(`${failed} file(s) failed to download.`);

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipName);
}

function Lightbox({
  images,
  currentIndex,
  productCode,
  onClose,
  onNavigate,
}: {
  images: BrandContentFile[];
  currentIndex: number;
  productCode: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const file = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    },
    [onClose, onNavigate, currentIndex, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {hasPrev && (
        <button
          type="button"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
        >
          <ChevronLeft className="size-6" />
        </button>
      )}

      <div
        className="flex max-h-[90vh] w-full max-w-[600px] flex-col items-center gap-3 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={file.publicUrl}
          alt={file.fileName}
          className="w-full shrink-0 rounded-lg object-contain"
        />
        <div className="flex items-center gap-3 text-white/80">
          <span className="text-sm">{file.fileName}</span>
          <span className="text-xs text-white/50">
            {formatFileSize(file.size)}
          </span>
          <span className="text-xs text-white/50">
            {currentIndex + 1} / {images.length}
          </span>
          <button
            type="button"
            className="rounded-md p-1.5 transition-colors hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              const name = buildDownloadName(productCode, file.category, currentIndex, file.fileName);
              downloadSingleFile(file, name);
            }}
          >
            <Download className="size-4" />
          </button>
        </div>
      </div>

      {hasNext && (
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
        >
          <ChevronRight className="size-6" />
        </button>
      )}
    </div>
  );
}

function CategorySection({
  category,
  files,
  totalSize,
  productCode,
  onImageClick,
}: {
  category: string;
  files: BrandContentFile[];
  totalSize: number;
  productCode: string;
  onImageClick: (file: BrandContentFile) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleBulkDownload = async () => {
    setDownloading(true);
    try {
      if (files.length === 1) {
        const name = buildDownloadName(productCode, category, 0, files[0].fileName);
        await downloadSingleFile(files[0], name);
      } else {
        await downloadAsZip(files, `${productCode}_${category}.zip`, productCode, category);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <FolderOpen className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {getCategoryLabel(category)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {files.length}
          </span>
          <span className="text-xs text-muted-foreground">
            ({formatFileSize(totalSize)})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={downloading}
          onClick={(e) => {
            e.stopPropagation();
            handleBulkDownload();
          }}
          className="h-7 gap-1.5 text-xs"
        >
          {downloading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Download className="size-3" />
          )}
          Download All
        </Button>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {files.map((file) => (
              <div
                key={file.key}
                className="group flex flex-col overflow-hidden rounded-lg border bg-muted/30"
              >
                <div className="relative aspect-square">
                  {isImageFile(file.fileName) ? (
                    <img
                      src={file.publicUrl}
                      alt={file.fileName}
                      className="h-full w-full cursor-pointer object-cover"
                      loading="lazy"
                      onClick={() => onImageClick(file)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <FileText className="size-12 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = files.indexOf(file);
                      const name = buildDownloadName(productCode, category, idx, file.fileName);
                      downloadSingleFile(file, name);
                    }}
                    className="absolute right-2 top-2 rounded-md bg-background/80 p-1.5 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                    title="Download"
                  >
                    <Download className="size-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 p-2">
                  <p
                    className="truncate text-xs font-medium"
                    title={file.fileName}
                  >
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BrandContentGallery({
  contentSlug,
  productCode,
  files,
}: BrandContentGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imageFiles = files.filter((f) => isImageFile(f.fileName));

  const handleImageClick = (file: BrandContentFile) => {
    const idx = imageFiles.findIndex((f) => f.key === file.key);
    if (idx !== -1) setLightboxIndex(idx);
  };

  if (!contentSlug || files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No brand content available for this product
          </p>
        </CardContent>
      </Card>
    );
  }

  const categories = groupByCategory(files);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Brand Content</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {files.length} files · {formatFileSize(totalSize)} ·{" "}
              {categories.length} categories
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((group) => (
            <CategorySection
              key={group.category}
              category={group.category}
              files={group.files}
              totalSize={group.totalSize}
              productCode={productCode}
              onImageClick={handleImageClick}
            />
          ))}
        </CardContent>
      </Card>

      {lightboxIndex !== null && (
        <Lightbox
          images={imageFiles}
          currentIndex={lightboxIndex}
          productCode={productCode}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
