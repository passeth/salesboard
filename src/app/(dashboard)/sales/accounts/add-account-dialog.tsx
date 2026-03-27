"use client";

import { createBuyerAccount } from "@/app/(dashboard)/sales/_actions/accounts-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "KRW", "AUD", "CAD", "SGD",
  "HKD", "CNY", "THB", "MYR", "IDR", "VND", "INR",
];

type AddAccountDialogProps = {
  countries: string[];
};

export function AddAccountDialog({ countries }: AddAccountDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");

  function resetForm() {
    setName("");
    setCode("");
    setCountryCode("");
    setCurrencyCode("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      alert("Account name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const orgId = await createBuyerAccount({
          name: name.trim(),
          code: code.trim() || undefined,
          countryCode: countryCode || undefined,
          currencyCode: currencyCode || undefined,
        });
        setOpen(false);
        resetForm();
        router.push(`/sales/accounts/${orgId}`);
      } catch {
        alert("Failed to create account.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="acc-name">
              Account Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="acc-name"
              placeholder="e.g. ABC Trading Co."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-code">Code</Label>
            <Input
              id="acc-code"
              placeholder="e.g. ABC"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={countryCode || "none"}
                onValueChange={(v) => setCountryCode(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currencyCode || "none"}
                onValueChange={(v) => setCurrencyCode(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setOpen(false); resetForm(); }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
