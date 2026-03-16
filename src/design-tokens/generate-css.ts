#!/usr/bin/env npx tsx
/**
 * Design Token → CSS Variables 자동 생성
 *
 * Usage:
 *   npx tsx src/design-tokens/generate-css.ts
 *
 * Figma Variables export 반영 → tokens.json 갱신 → 이 스크립트 실행 → globals.css 자동 반영
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

const TOKENS_PATH = resolve(dirname(import.meta.url.replace("file://", "")), "tokens.json");
const GLOBALS_PATH = resolve(dirname(import.meta.url.replace("file://", "")), "../app/globals.css");

interface Tokens {
  color: Record<string, any>;
  radius: Record<string, number>;
  font: Record<string, string>;
  fontSize: Record<string, number>;
  fontWeight: Record<string, string>;
  spacing: Record<string, number>;
  component: Record<string, any>;
}

// --- HEX → HSL 변환 (shadcn 호환) ---
function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function addDimensionVar(vars: string[], name: string, value: number) {
  vars.push(`    --${name}: ${value}px;`);
}

function flattenComponentTokenVars(vars: string[], prefix: string, value: unknown) {
  if (typeof value === "number") {
    addDimensionVar(vars, prefix, value);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 2) {
      addDimensionVar(vars, `${prefix}-y`, value[0] as number);
      addDimensionVar(vars, `${prefix}-x`, value[1] as number);
      return;
    }

    if (value.length === 4) {
      addDimensionVar(vars, `${prefix}-top`, value[0] as number);
      addDimensionVar(vars, `${prefix}-right`, value[1] as number);
      addDimensionVar(vars, `${prefix}-bottom`, value[2] as number);
      addDimensionVar(vars, `${prefix}-left`, value[3] as number);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nextValue] of Object.entries(value)) {
      flattenComponentTokenVars(vars, `${prefix}-${toKebabCase(key)}`, nextValue);
    }
  }
}

// --- 토큰 → CSS 변수 변환 ---
function generateCSSVariables(tokens: Tokens): string {
  const vars: string[] = [];

  // Colors
  function processColor(prefix: string, obj: any) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && value.startsWith("#")) {
        const varName = key === "DEFAULT" ? prefix : `${prefix}-${key}`;
        vars.push(`    ${varName}: ${hexToHSL(value)};`);
      } else if (typeof value === "object" && value !== null) {
        const nextPrefix = key === "DEFAULT" ? prefix : `${prefix}-${key}`;
        processColor(nextPrefix, value);
      }
    }
  }

  // Core colors
  const { semantic, sidebar, status, ...coreColors } = tokens.color;
  processColor("-", coreColors);

  // Semantic colors
  if (semantic) {
    for (const [name, values] of Object.entries(semantic) as [string, any][]) {
      vars.push(`    --color-${name}: ${hexToHSL(values.DEFAULT)};`);
      vars.push(`    --color-${name}-foreground: ${hexToHSL(values.foreground)};`);
      if (values.bg) vars.push(`    --color-${name}-bg: ${values.bg};`);
    }
  }

  // Sidebar
  if (sidebar) {
    for (const [key, value] of Object.entries(sidebar)) {
      if (typeof value === "string" && value.startsWith("#")) {
        vars.push(`    --sidebar-${key === "bg" ? "background" : key}: ${hexToHSL(value as string)};`);
      }
    }
  }

  // Status colors
  if (status) {
    for (const [name, hex] of Object.entries(status)) {
      vars.push(`    --status-${name}: ${hexToHSL(hex as string)};`);
    }
  }

  // Radius
  vars.push("");
  vars.push("    /* Radius */");
  for (const [name, value] of Object.entries(tokens.radius)) {
    vars.push(`    --radius-${name}: ${value}px;`);
  }
  vars.push(`    --radius: ${tokens.radius.m}px;`);

  // Font
  vars.push("");
  vars.push("    /* Typography */");
  for (const [name, value] of Object.entries(tokens.font)) {
    vars.push(`    --font-${name}: "${value}", system-ui, sans-serif;`);
  }
  for (const [name, value] of Object.entries(tokens.fontWeight)) {
    vars.push(`    --font-weight-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.fontSize)) {
    addDimensionVar(vars, `font-size-${name}`, value);
  }

  vars.push("");
  vars.push("    /* Spacing */");
  for (const [name, value] of Object.entries(tokens.spacing)) {
    addDimensionVar(vars, `spacing-${name}`, value);
  }

  // Component sizes
  vars.push("");
  vars.push("    /* Button sizes */");
  if (tokens.component?.button) {
    for (const [size, spec] of Object.entries(tokens.component.button)) {
      if (typeof spec === "object" && spec !== null && "height" in spec) {
        vars.push(`    --btn-${size}-h: ${(spec as any).height}px;`);
        vars.push(`    --btn-${size}-px: ${(spec as any).padding?.[1] ?? 0}px;`);
        vars.push(`    --btn-${size}-py: ${(spec as any).padding?.[0] ?? 0}px;`);
        if ((spec as any).fontSize) vars.push(`    --btn-${size}-font: ${(spec as any).fontSize}px;`);
      }
    }
  }

  vars.push("");
  vars.push("    /* Toggle sizes */");
  if (tokens.component?.toggle) {
    for (const [size, spec] of Object.entries(tokens.component.toggle)) {
      if (typeof spec === "object" && spec !== null) {
        vars.push(`    --toggle-${size}-w: ${(spec as any).width}px;`);
        vars.push(`    --toggle-${size}-h: ${(spec as any).height}px;`);
        vars.push(`    --toggle-${size}-thumb: ${(spec as any).thumbSize}px;`);
      }
    }
  }

  vars.push("");
  vars.push("    /* Input sizes */");
  if (tokens.component?.input) {
    for (const [size, spec] of Object.entries(tokens.component.input)) {
      if (typeof spec === "object" && spec !== null && "height" in spec) {
        vars.push(`    --input-${size}-h: ${(spec as any).height}px;`);
        vars.push(`    --input-${size}-px: ${(spec as any).padding?.[1] ?? 0}px;`);
        if ((spec as any).fontSize) vars.push(`    --input-${size}-font: ${(spec as any).fontSize}px;`);
      }
    }
  }

  // Chart colors (derived from semantic)
  vars.push("");
  vars.push("    /* Chart */");
  vars.push(`    --chart-1: ${hexToHSL(tokens.color.primary.DEFAULT)};`);
  vars.push(`    --chart-2: ${hexToHSL(tokens.color.semantic.success.DEFAULT)};`);
  vars.push(`    --chart-3: ${hexToHSL(tokens.color.semantic.warning.DEFAULT)};`);
  vars.push(`    --chart-4: ${hexToHSL(tokens.color.semantic.info.DEFAULT)};`);
  vars.push(`    --chart-5: ${hexToHSL(tokens.color.semantic.error.DEFAULT)};`);

  vars.push("");
  vars.push("    /* Component tokens */");
  flattenComponentTokenVars(vars, "component", tokens.component);

  return vars.join("\n");
}

// --- globals.css 생성 ---
function generateGlobalsCSS(tokens: Tokens): string {
  const cssVars = generateCSSVariables(tokens);

  return `/* ============================================================
 * 🚨 AUTO-GENERATED — DO NOT EDIT MANUALLY
 * Source: src/design-tokens/tokens.json (synced from Figma Variables)
 * Regenerate: npx tsx src/design-tokens/generate-css.ts
 * ============================================================ */

@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-primary);
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));

  --color-status-draft: hsl(var(--status-draft));
  --color-status-submitted: hsl(var(--status-submitted));
  --color-status-vendor-review: hsl(var(--status-vendor-review));
  --color-status-sales-review: hsl(var(--status-sales-review));
  --color-status-needs-decision: hsl(var(--status-needs-decision));
  --color-status-confirmed: hsl(var(--status-confirmed));
  --color-status-rejected: hsl(var(--status-rejected));
  --color-status-invoiced: hsl(var(--status-invoiced));
  --color-status-partially-shipped: hsl(var(--status-partially-shipped));
  --color-status-shipped: hsl(var(--status-shipped));
  --color-status-completed: hsl(var(--status-completed));
  --color-status-cancelled: hsl(var(--status-cancelled));

  --color-success: hsl(var(--color-success));
  --color-success-foreground: hsl(var(--color-success-foreground));
  --color-warning: hsl(var(--color-warning));
  --color-warning-foreground: hsl(var(--color-warning-foreground));
  --color-error: hsl(var(--color-error));
  --color-error-foreground: hsl(var(--color-error-foreground));
  --color-info: hsl(var(--color-info));
  --color-info-foreground: hsl(var(--color-info-foreground));

  --color-sidebar-background: hsl(var(--sidebar-background));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-accent));
  --color-sidebar-primary-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-border: hsl(var(--sidebar-muted));
  --color-sidebar-ring: hsl(var(--sidebar-accent));

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
  --radius-xl: calc(var(--radius) + 6px);
}

@layer base {
  :root {
${cssVars}

    /* Popover (= Card) */
    --popover: var(--card);
    --popover-foreground: var(--card-foreground);
  }

  .dark {
    --background: 240 87% 6%;
    --foreground: 0 0% 98%;
    --card: 240 60% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 240 60% 10%;
    --popover-foreground: 0 0% 98%;
    --primary: 242 100% 68%;
    --primary-foreground: 0 0% 100%;
    --secondary: 243 30% 20%;
    --secondary-foreground: 242 100% 68%;
    --muted: 240 30% 15%;
    --muted-foreground: 240 10% 60%;
    --accent: 243 30% 20%;
    --accent-foreground: 242 100% 68%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 20% 20%;
    --input: 240 20% 20%;
    --ring: 242 100% 68%;

    --sidebar-background: 240 87% 4%;
    --sidebar-foreground: 0 0% 90%;
    --sidebar-accent: 242 100% 68%;
    --sidebar-muted: 240 40% 12%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-primary);
  }
}
`;
}

// --- Main ---
const raw = readFileSync(TOKENS_PATH, "utf-8");
const tokens: Tokens = JSON.parse(raw);
const css = generateGlobalsCSS(tokens);
writeFileSync(GLOBALS_PATH, css, "utf-8");

console.log("✅ globals.css generated from tokens.json");
console.log(`   Source: ${TOKENS_PATH}`);
console.log(`   Output: ${GLOBALS_PATH}`);
