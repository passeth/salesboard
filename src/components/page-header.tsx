import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[length:var(--font-size-2xl)] font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="text-[length:var(--font-size-sm)] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
      <Separator />
    </div>
  );
}
