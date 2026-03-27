"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type KoreanNetData = {
  barcode: string;
  productName: string | null;
  imageUrl: string | null;
  category: string | null;
  categoryCode: string | null;
  country: string | null;
  manufacturer: string | null;
  seller: string | null;
  address: string | null;
};

type Props = {
  barcodeImageUrl: string;
  barcode: string;
  sku: string;
  productName: string;
};

export function BarcodeDetailModal({
  barcodeImageUrl,
  barcode,
  sku,
  productName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [koreanNetData, setKoreanNetData] = useState<KoreanNetData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const downloadUrl = `/api/r2-download?url=${encodeURIComponent(barcodeImageUrl)}&filename=${encodeURIComponent(`${sku}_${barcode}.png`)}`;

  const handleOpen = async () => {
    setOpen(true);

    if (fetched) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}`,
      );

      if (res.ok) {
        const data: KoreanNetData = await res.json();
        setKoreanNetData(data);
      } else if (res.status === 404) {
        setError("코리안넷에 등록되지 않은 바코드입니다.");
      } else {
        setError("코리안넷 조회에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const handleRetry = async () => {
    setFetched(false);
    setKoreanNetData(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}`,
      );

      if (res.ok) {
        const data: KoreanNetData = await res.json();
        setKoreanNetData(data);
      } else if (res.status === 404) {
        setError("코리안넷에 등록되지 않은 바코드입니다.");
      } else {
        setError("코리안넷 조회에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  return (
    <>
      <div className="flex items-end gap-3">
        <button
          type="button"
          onClick={handleOpen}
          className="group flex items-end gap-3"
        >
          <img
            src={barcodeImageUrl}
            alt={`Barcode ${barcode}`}
            className="h-auto max-w-[300px] rounded border bg-white p-2 transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary/30"
          />
          <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Click to verify
          </span>
        </button>
        <Button variant="outline" size="sm" asChild>
          <a href={downloadUrl} download>
            <Download className="mr-1.5 size-3.5" />
            Download
          </a>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Barcode Verification
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {barcode}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="koreannet">
            <TabsList className="w-full">
              <TabsTrigger value="koreannet" className="flex-1">
                KoreanNet (온라인 등록정보)
              </TabsTrigger>
              <TabsTrigger value="internal" className="flex-1">
                Internal (내부 등록정보)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="koreannet" className="space-y-4">
              {loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin" />
                  <span className="text-sm">코리안넷 조회 중...</span>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <AlertCircle className="size-8 text-amber-500" />
                  <span className="text-sm">{error}</span>
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    Retry
                  </Button>
                </div>
              )}

              {koreanNetData && !loading && (
                <div className="space-y-4">
                  {koreanNetData.imageUrl && (
                    <div className="flex justify-center rounded-lg border bg-white p-4">
                      <img
                        src={koreanNetData.imageUrl}
                        alt={koreanNetData.productName ?? barcode}
                        className="max-h-[300px] max-w-full object-contain"
                      />
                    </div>
                  )}

                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="col-span-full flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground">
                        제품명 (KoreanNet)
                      </dt>
                      <dd className="text-base font-semibold">
                        {koreanNetData.productName ?? "—"}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground">
                        바코드 (GTIN)
                      </dt>
                      <dd className="font-mono">{koreanNetData.barcode}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground">
                        제조국가
                      </dt>
                      <dd>{koreanNetData.country ?? "—"}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground">
                        제조사/생산자
                      </dt>
                      <dd>{koreanNetData.manufacturer ?? "—"}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground">
                        판매자
                      </dt>
                      <dd>{koreanNetData.seller ?? "—"}</dd>
                    </div>
                    <div className="col-span-full flex flex-col gap-0.5">
                      <dt className="font-medium text-muted-foreground">
                        상품분류
                      </dt>
                      <dd>{koreanNetData.category ?? "—"}</dd>
                    </div>
                    {koreanNetData.address && (
                      <div className="col-span-full flex flex-col gap-0.5">
                        <dt className="font-medium text-muted-foreground">
                          업체주소
                        </dt>
                        <dd className="text-xs text-muted-foreground">
                          {koreanNetData.address}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>Source: 코리안넷 (GS1 Korea)</span>
                    <a
                      href="https://www.koreannet.or.kr/front/koreannet/gtinSrch.do"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      코리안넷 바로가기
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="internal" className="space-y-4">
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img
                  src={barcodeImageUrl}
                  alt={`Barcode ${barcode}`}
                  className="h-auto max-w-full"
                />
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="font-medium text-muted-foreground">
                    Barcode
                  </dt>
                  <dd className="font-mono text-base">{barcode}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="font-medium text-muted-foreground">SKU</dt>
                  <dd>{sku}</dd>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <dt className="font-medium text-muted-foreground">
                    Product
                  </dt>
                  <dd>{productName}</dd>
                </div>
              </dl>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <a href={downloadUrl} download>
                    <Download className="mr-1.5 size-3.5" />
                    Download Barcode
                  </a>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
