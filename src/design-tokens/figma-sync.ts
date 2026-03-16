#!/usr/bin/env npx tsx
/**
 * Manual sync: Figma Variables export JSON -> tokens.json -> globals.css
 *
 * Usage:
 *   npm run figma:sync -- ./tmp/figma-foundations.json
 *   cat ./tmp/figma-foundations.json | npm run figma:sync
 */

import { readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, resolve } from "path";

type FoundationPayload = {
  _meta?: {
    source?: string;
    exportedAt?: string;
    description?: string;
  };
  color: Record<string, unknown>;
  radius: Record<string, number>;
  spacing: Record<string, number>;
  fontSize: Record<string, number>;
  font?: Record<string, string>;
  fontWeight?: Record<string, string>;
  component?: Record<string, unknown>;
};

const TOKENS_DIR = dirname(import.meta.url.replace("file://", ""));
const PROJECT_ROOT = resolve(TOKENS_DIR, "../..");
const TOKENS_PATH = resolve(TOKENS_DIR, "tokens.json");
const GENERATE_CSS_PATH = resolve(TOKENS_DIR, "generate-css.ts");

function readInputPayload(): string {
  const inputPath = process.argv[2];

  if (inputPath) {
    const resolvedPath = resolve(process.cwd(), inputPath);
    return readFileSync(resolvedPath, "utf-8");
  }

  try {
    const stdin = readFileSync(0, "utf-8");
    if (stdin.trim()) {
      return stdin;
    }
  } catch {
    // Ignore stdin read errors and fall through to usage help.
  }

  throw new Error(
    [
      "Figma export JSON 입력이 없습니다.",
      "예시:",
      "  npm run figma:sync -- ./tmp/figma-foundations.json",
      "  cat ./tmp/figma-foundations.json | npm run figma:sync",
    ].join("\n"),
  );
}

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }
  return value as Record<string, unknown>;
}

function validatePayload(payload: unknown): FoundationPayload {
  const root = assertObject(payload, "export payload");
  const color = assertObject(root.color, "color");
  const radius = assertObject(root.radius, "radius");
  const spacing = assertObject(root.spacing, "spacing");
  const fontSize = assertObject(root.fontSize, "fontSize");
  const font = root.font ? assertObject(root.font, "font") : undefined;
  const fontWeight = root.fontWeight ? assertObject(root.fontWeight, "fontWeight") : undefined;
  const component = root.component ? assertObject(root.component, "component") : undefined;

  return {
    _meta: root._meta as FoundationPayload["_meta"],
    color,
    radius: radius as Record<string, number>,
    spacing: spacing as Record<string, number>,
    fontSize: fontSize as Record<string, number>,
    font: font as FoundationPayload["font"],
    fontWeight: fontWeight as FoundationPayload["fontWeight"],
    component: component as FoundationPayload["component"],
  };
}

function countNestedColorTokens(color: Record<string, unknown>): number {
  let count = 0;

  const visit = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("#")) {
      count += 1;
      return;
    }

    if (value && typeof value === "object") {
      for (const child of Object.values(value)) {
        visit(child);
      }
    }
  };

  visit(color);
  return count;
}

function syncTokens(payload: FoundationPayload) {
  const existing = JSON.parse(readFileSync(TOKENS_PATH, "utf-8")) as Record<string, unknown>;
  const today = new Date().toISOString().split("T")[0];

  const nextTokens: Record<string, unknown> = {
    ...existing,
    color: payload.color,
    radius: payload.radius,
    spacing: payload.spacing,
    fontSize: payload.fontSize,
    _meta: {
      ...(existing._meta as Record<string, unknown> | undefined),
      lastSync: today,
      source: payload._meta?.source ?? "Figma Variables (manual export)",
      description:
        payload._meta?.description ??
        "Trade Intel 디자인 토큰 — Figma Variables에서 수동 export 후 동기화",
    },
  };

  if (payload.font) {
    nextTokens.font = payload.font;
  }
  if (payload.fontWeight) {
    nextTokens.fontWeight = payload.fontWeight;
  }
  if (payload.component) {
    nextTokens.component = payload.component;
  }

  writeFileSync(TOKENS_PATH, `${JSON.stringify(nextTokens, null, 2)}\n`, "utf-8");
}

function regenerateGlobalsCss() {
  const result = spawnSync("npx", ["tsx", GENERATE_CSS_PATH], {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("globals.css 재생성에 실패했습니다.");
  }
}

function main() {
  const rawPayload = readInputPayload();
  const payload = validatePayload(JSON.parse(rawPayload));

  syncTokens(payload);
  regenerateGlobalsCss();

  const colorCount = countNestedColorTokens(payload.color);
  const radiusCount = Object.keys(payload.radius).length;
  const spacingCount = Object.keys(payload.spacing).length;
  const fontSizeCount = Object.keys(payload.fontSize).length;
  const fontCount = payload.font ? Object.keys(payload.font).length : 0;
  const fontWeightCount = payload.fontWeight ? Object.keys(payload.fontWeight).length : 0;
  const componentCount = payload.component ? Object.keys(payload.component).length : 0;

  console.log("");
  console.log("✅ Figma foundation tokens 동기화 완료");
  console.log(`   color: ${colorCount}`);
  console.log(`   radius: ${radiusCount}`);
  console.log(`   spacing: ${spacingCount}`);
  console.log(`   fontSize: ${fontSizeCount}`);
  if (payload.font) console.log(`   font: ${fontCount}`);
  if (payload.fontWeight) console.log(`   fontWeight: ${fontWeightCount}`);
  if (payload.component) console.log(`   component groups: ${componentCount}`);
  console.log(`   source: ${payload._meta?.source ?? "Figma Variables (manual export)"}`);
  console.log(`   tokens: ${TOKENS_PATH}`);
}

main();
