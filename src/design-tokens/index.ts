/**
 * Design Tokens — TypeScript에서 직접 사용
 *
 * Usage:
 *   import { tokens, colors, radius, fonts } from "@/design-tokens"
 *
 *   <div style={{ color: colors.primary.DEFAULT }}>
 *   <div className={`rounded-[${radius.m}px]`}>
 */

import rawTokens from "./tokens.json";
import rawTableSchemas from "./table-schemas.json";

export const tokens = rawTokens;
export const colors = rawTokens.color;
export const radius = rawTokens.radius;
export const fonts = rawTokens.font;
export const fontSize = rawTokens.fontSize;
export const fontWeight = rawTokens.fontWeight;
export const spacing = rawTokens.spacing;
export const component = rawTokens.component;

/** Status color map — 컴포넌트에서 동적으로 사용 */
export const statusColorMap = rawTokens.color.status;

/** Semantic color map */
export const semanticColorMap = rawTokens.color.semantic;

export type StatusKey = keyof typeof rawTokens.color.status;
export type SemanticKey = keyof typeof rawTokens.color.semantic;

/** Table schemas — 페이지별 테이블 컬럼 정의 */
export const tableSchemas = rawTableSchemas;
export const columnTypes = rawTableSchemas._columnTypes;

export type TableSchemaKey = Exclude<keyof typeof rawTableSchemas, "_columnTypes" | "$schema" | "_meta">;
export type ColumnType = keyof typeof rawTableSchemas._columnTypes;

/** 특정 테이블 스키마의 컬럼 배열 가져오기 */
export function getTableSchema(key: TableSchemaKey) {
  return rawTableSchemas[key] as {
    label: string;
    page: string;
    defaultSort: { key: string; direction: string };
    pageSize: number;
    columns: Array<{
      key: string;
      header: string;
      width: number | string;
      align: string;
      type: string;
      sortable: boolean;
      colorMap?: string;
      format?: string;
      precision?: number;
    }>;
  };
}

export default tokens;
