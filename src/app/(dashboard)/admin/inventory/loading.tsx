import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="space-y-1 p-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
