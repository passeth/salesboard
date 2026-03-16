import { Bell, Search } from "lucide-react";

type HeaderBarProps = {
  title: string;
  userEmail?: string | null;
};

export function HeaderBar({ title, userEmail }: HeaderBarProps) {
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "TI";

  return (
    <header className="sticky top-0 z-20 flex h-[var(--component-header-bar-height)] items-center border-b border-border bg-background/95 px-[var(--component-header-bar-padding-x)] py-[var(--component-header-bar-padding-y)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-[length:var(--font-size-lg)] font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
          >
            <Search className="size-4" />
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
          >
            <Bell className="size-4" />
          </button>

          <div className="ml-1 inline-flex h-[var(--component-header-bar-avatar-size)] w-[var(--component-header-bar-avatar-size)] items-center justify-center rounded-full bg-primary/15 text-[length:var(--font-size-xs)] font-semibold text-primary">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
