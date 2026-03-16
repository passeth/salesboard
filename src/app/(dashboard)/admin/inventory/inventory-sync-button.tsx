"use client";

import { syncEcountInventory, SyncResult } from "@/app/(dashboard)/admin/_actions/inventory-actions";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function InventorySyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = () => {
    setResult(null);
    startTransition(async () => {
      const res = await syncEcountInventory();
      setResult(res);
      if (res.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-sm ${result.success ? "text-emerald-600" : "text-destructive"}`}>
          {result.success
            ? `Synced ${result.count?.toLocaleString() ?? 0} items`
            : `Error: ${result.error}`}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isPending}
      >
        <RefreshCw className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Syncing..." : "Sync eCount"}
      </Button>
    </div>
  );
}
