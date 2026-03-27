"use client";

import { useState, useTransition } from "react";
import { Pencil, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateBarcodeAndRegenerate,
  regenerateBarcodeImage,
} from "../_actions/barcode-actions";

type Props = {
  productId: string;
  currentBarcode: string | null;
  hasBarcodeImage: boolean;
};

export function BarcodeEditor({ productId, currentBarcode, hasBarcodeImage }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentBarcode ?? "");
  const [isPending, startTransition] = useTransition();
  const [regenerating, setRegenerating] = useState(false);

  const handleSave = () => {
    if (!value.trim()) return;

    startTransition(async () => {
      const result = await updateBarcodeAndRegenerate(productId, value.trim());
      if (result.success) {
        setEditing(false);
        alert("바코드가 수정되고 이미지가 재생성되었습니다.");
      } else {
        alert(result.error ?? "Failed to update barcode");
      }
    });
  };

  const handleRegenerate = () => {
    if (!currentBarcode) {
      alert("등록된 바코드가 없습니다.");
      return;
    }

    setRegenerating(true);
    startTransition(async () => {
      const result = await regenerateBarcodeImage(productId);
      setRegenerating(false);
      if (result.success) {
        alert("바코드 이미지가 재생성되었습니다.");
      } else {
        alert(result.error ?? "Failed to regenerate barcode image");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setValue(currentBarcode ?? "");
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-40 font-mono text-sm"
          placeholder="EAN-13 (13 digits)"
          maxLength={13}
          autoFocus
          disabled={isPending}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleSave}
          disabled={isPending || !value.trim()}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-green-600" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => { setEditing(false); setValue(currentBarcode ?? ""); }}
          disabled={isPending}
        >
          <X className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{currentBarcode || "—"}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={() => { setValue(currentBarcode ?? ""); setEditing(true); }}
        title="바코드 수정"
      >
        <Pencil className="size-3" />
      </Button>
      {currentBarcode && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleRegenerate}
          disabled={regenerating || isPending}
          title="바코드 이미지 재생성"
        >
          {regenerating ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        </Button>
      )}
    </div>
  );
}
