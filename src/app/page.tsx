import { OrderStatus, ORDER_STATUS_CONFIG } from "@/types";

const CORE_COLORS = [
  { token: "primary", label: "Primary" },
  { token: "secondary", label: "Secondary" },
  { token: "accent", label: "Accent" },
  { token: "muted", label: "Muted" },
  { token: "destructive", label: "Destructive" },
  { token: "border", label: "Border" },
] as const;

const CHART_COLORS = [
  { token: "chart-1", label: "Blue" },
  { token: "chart-2", label: "Purple" },
  { token: "chart-3", label: "Gold" },
  { token: "chart-4", label: "Coral" },
  { token: "chart-5", label: "Teal" },
] as const;

const SIDEBAR_COLORS = [
  { token: "sidebar-background", label: "Background" },
  { token: "sidebar-foreground", label: "Foreground" },
  { token: "sidebar-primary", label: "Primary" },
  { token: "sidebar-accent", label: "Accent" },
  { token: "sidebar-border", label: "Border" },
] as const;

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-md border border-border"
        style={{ background: `hsl(var(--${token}))` }}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">--{token}</p>
      </div>
    </div>
  );
}

export default function DesignTokensPage() {
  return (
    <section className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Design System Tokens
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Figma reference: SAAS Dashboard (Community) — #605BFF primary, Inter
          font, 10px radius
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Core Colors</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Swatch token="background" label="Background" />
          <Swatch token="foreground" label="Foreground" />
          {CORE_COLORS.map((c) => (
            <Swatch key={c.token} token={c.token} label={c.label} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Order Status Colors</h3>
        <div className="flex flex-wrap gap-2">
          {Object.values(OrderStatus).map((status) => {
            const cfg = ORDER_STATUS_CONFIG[status];
            return (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    background: `hsl(var(--${cfg.colorToken}))`,
                  }}
                />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Chart Colors</h3>
        <div className="grid grid-cols-5 gap-4">
          {CHART_COLORS.map((c) => (
            <Swatch key={c.token} token={c.token} label={c.label} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Sidebar Colors</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SIDEBAR_COLORS.map((c) => (
            <Swatch key={c.token} token={c.token} label={c.label} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Typography Scale</h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <p className="text-3xl font-extrabold">Display — 30px / 800</p>
          <p className="text-2xl font-bold">Heading 1 — 24px / 700</p>
          <p className="text-xl font-extrabold">Heading 2 — 22px / 800</p>
          <p className="text-lg font-bold">Heading 3 — 18px / 700</p>
          <p className="text-base font-semibold">Body Large — 16px / 600</p>
          <p className="text-sm">Body — 14px / 400</p>
          <p className="text-xs text-muted-foreground">
            Small — 12px / 400
          </p>
          <p className="text-[10px] text-muted-foreground">
            Caption — 10px / 400
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Radius &amp; Elevation</h3>
        <div className="flex flex-wrap gap-4">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <div
              key={size}
              className="flex size-20 items-center justify-center border border-border bg-card text-xs font-medium"
              style={{ borderRadius: `var(--radius-${size})` }}
            >
              {size}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex h-20 w-40 items-center justify-center rounded-lg bg-card text-xs shadow-sm">
            shadow-sm
          </div>
          <div className="flex h-20 w-40 items-center justify-center rounded-lg bg-card text-xs shadow-md">
            shadow-md
          </div>
          <div className="flex h-20 w-40 items-center justify-center rounded-lg bg-card text-xs shadow-lg">
            shadow-lg
          </div>
        </div>
      </div>
    </section>
  );
}
