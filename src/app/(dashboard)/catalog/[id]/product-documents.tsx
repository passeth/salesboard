"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Eye, Loader2 } from "lucide-react";
import type { DocumentRow } from "@/types";

type ProductDocument = Pick<
  DocumentRow,
  "id" | "document_type" | "file_name" | "updated_at" | "metadata_json"
>;

interface ProductDocumentsProps {
  documents: ProductDocument[];
  lastSyncedAt: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ingredients_en: "Ingredients (EN)",
  formula_breakdown: "Formula Breakdown",
  inci_summary: "INCI Summary",
  msds: "MSDS",
  coa: "Certificate of Analysis",
};

function getDocLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function proxyUrl(docId: string, download?: boolean): string {
  const base = `/api/pdf-proxy?id=${docId}`;
  return download ? `${base}&download=1` : base;
}

function PdfPreviewModal({
  doc,
  onClose,
}: {
  doc: ProductDocument;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
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
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 text-white/80">
            <FileText className="size-4" />
            <span className="text-sm font-medium">{getDocLabel(doc.document_type)}</span>
            <span className="text-xs text-white/50">{doc.file_name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => {
              window.open(proxyUrl(doc.id, true), "_blank");
            }}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-lg bg-white">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <iframe
            src={proxyUrl(doc.id)}
            className="h-full w-full"
            title={doc.file_name}
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}

export function ProductDocuments({ documents, lastSyncedAt }: ProductDocumentsProps) {
  const [previewDoc, setPreviewDoc] = useState<ProductDocument | null>(null);

  if (documents.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Documents</CardTitle>
            {lastSyncedAt && (
              <span className="text-xs text-muted-foreground">
                Last updated: {formatDate(lastSyncedAt)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-lg border">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">{getDocLabel(doc.document_type)}</p>
                    <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      window.open(proxyUrl(doc.id, true), "_blank");
                    }}
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {previewDoc && (
        <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </>
  );
}
