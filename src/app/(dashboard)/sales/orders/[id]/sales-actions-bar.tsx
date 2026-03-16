"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SalesActionsBarProps = {
  isPending: boolean;
  decisionNote: string;
  onDecisionNoteChange: (value: string) => void;
  onFullConfirm: () => void;
  onRequestBuyerDecision: () => void;
};

export function SalesActionsBar({
  isPending,
  decisionNote,
  onDecisionNoteChange,
  onFullConfirm,
  onRequestBuyerDecision,
}: SalesActionsBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[calc(100%-2rem)] flex-col gap-3 px-4 py-3 md:max-w-screen-2xl md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-xl">
          <p className="mb-1 text-sm font-medium">Decision Note</p>
          <Input
            value={decisionNote}
            onChange={(event) => onDecisionNoteChange(event.target.value)}
            placeholder="Optional note for buyer"
            disabled={isPending}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={onRequestBuyerDecision}>
            Request Buyer Decision
          </Button>
          <Button type="button" disabled={isPending} onClick={onFullConfirm}>
            Full Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
