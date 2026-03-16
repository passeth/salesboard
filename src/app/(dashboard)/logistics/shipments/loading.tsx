import { Skeleton } from "@/components/ui/skeleton";

export default function ShipmentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-36" />
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
