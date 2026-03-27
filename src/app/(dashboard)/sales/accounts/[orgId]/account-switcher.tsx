"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AccountSwitcherProps = {
  currentName: string;
  currentId: string;
  accounts: { id: string; name: string }[];
};

export function AccountSwitcher({ currentName, currentId, accounts }: AccountSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  function handleSelect(id: string) {
    setOpen(false);
    setSearch("");
    if (id !== currentId) {
      router.push(`/sales/accounts/${id}`);
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button className="group flex items-center gap-1.5 text-left">
          <h1 className="text-[length:var(--font-size-2xl)] font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {currentName}
          </h1>
          <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b px-3 py-2">
          <input
            autoFocus
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No accounts found.</p>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelect(a.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                  a.id === currentId ? "font-medium text-primary" : ""
                }`}
              >
                {a.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
