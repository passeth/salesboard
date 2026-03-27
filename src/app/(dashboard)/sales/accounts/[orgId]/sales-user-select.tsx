"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAccountSalesUser } from "@/app/(dashboard)/sales/_actions/accounts-actions";
import { useTransition } from "react";

type SalesUserSelectProps = {
  buyerOrgId: string;
  currentSalesUserId: string | null;
  salesUsers: { id: string; name: string; email: string }[];
};

export function SalesUserSelect({
  buyerOrgId,
  currentSalesUserId,
  salesUsers,
}: SalesUserSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(userId: string) {
    startTransition(async () => {
      try {
        await updateAccountSalesUser({
          buyerOrgId,
          salesUserId: userId,
        });
      } catch {
        alert("Failed to update sales owner.");
      }
    });
  }

  return (
    <Select
      value={currentSalesUserId ?? ""}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <SelectValue placeholder="담당자 선택" />
      </SelectTrigger>
      <SelectContent>
        {salesUsers.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
