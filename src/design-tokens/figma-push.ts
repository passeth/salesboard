#!/usr/bin/env npx tsx
/**
 * tokens.json → Figma 컬러 가이드 자동 생성
 *
 * Figma Plugin API 없이 REST API로 가능한 범위:
 * - 파일 읽기 ✅
 * - 노드 수정 ❌ (읽기 전용)
 *
 * 이 스크립트는 Figma에 만들어야 할 컬러 스와치 목록을 출력.
 * passeth가 Figma에서 만들면 figma-sync.ts가 읽어옴.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";

const TOKENS_PATH = resolve(dirname(import.meta.url.replace("file://", "")), "tokens.json");
const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));

console.log(`
╔══════════════════════════════════════════════════════════╗
║  📋 Figma에 만들 컬러 스와치 가이드                      ║
║  Figma "🎨 Colors" 페이지에 아래 프레임 생성             ║
╚══════════════════════════════════════════════════════════╝

🔷 Core Colors (프레임 이름 → fill 색상)
──────────────────────────────────────────`);

// Core
const coreKeys = ["primary", "secondary", "destructive", "accent", "muted"];
for (const key of coreKeys) {
  const val = tokens.color[key];
  if (typeof val === "object") {
    console.log(`  ${key}/DEFAULT         → ${val.DEFAULT}`);
    console.log(`  ${key}/foreground      → ${val.foreground}`);
  }
}

console.log(`
  background              → ${tokens.color.background}`);
console.log(`  foreground              → ${tokens.color.foreground}`);
console.log(`  border                  → ${tokens.color.border}`);
console.log(`  input                   → ${tokens.color.input}`);
console.log(`  ring                    → ${tokens.color.ring}`);

const cardVal = tokens.color.card;
console.log(`  card/DEFAULT            → ${cardVal.DEFAULT}`);
console.log(`  card/foreground         → ${cardVal.foreground}`);

console.log(`
🟢 Semantic Colors
──────────────────────────────────────────`);
for (const [name, val] of Object.entries(tokens.color.semantic) as [string, any][]) {
  console.log(`  semantic/${name}          → ${val.DEFAULT}`);
  console.log(`  semantic/${name}-fg       → ${val.foreground}`);
  if (val.bg) console.log(`  semantic/${name}-bg       → ${val.bg}`);
}

console.log(`
🌙 Sidebar Colors
──────────────────────────────────────────`);
for (const [name, val] of Object.entries(tokens.color.sidebar)) {
  console.log(`  sidebar/${name}           → ${val}`);
}

console.log(`
🚦 Status Colors (12종)
──────────────────────────────────────────`);
for (const [name, val] of Object.entries(tokens.color.status)) {
  console.log(`  status/${name.padEnd(20)} → ${val}`);
}

console.log(`
📏 Radius (프레임에 cornerRadius 적용)
──────────────────────────────────────────`);
for (const [name, val] of Object.entries(tokens.radius)) {
  console.log(`  radius/${name.padEnd(6)} → ${val}px`);
}

console.log(`
🔤 Typography (텍스트 레이어 fontSize)
──────────────────────────────────────────`);
for (const [name, val] of Object.entries(tokens.fontSize)) {
  console.log(`  ${name.padEnd(6)} → ${val}px`);
}

console.log(`
──────────────────────────────────────────
💡 Tip: 프레임 이름이 토큰 키와 매칭됨.
   Figma에서 수정 → npm run figma:sync → 자동 반영
`);
