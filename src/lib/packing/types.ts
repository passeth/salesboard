export type PackingProductSpec = {
  productId: string;
  sku: string;
  name: string;
  brand: string | null;
  unitsPerCase: number | null;
  caseLengthCm: number | null;
  caseWidthCm: number | null;
  caseHeightCm: number | null;
  caseGrossWeightKg: number | null;
  caseNetWeightKg: number | null;
  caseCbmM3: number | null;
};

export type PackingSourceItem = {
  orderItemId: string;
  lineNo: number;
  requestedCaseQty: number;
  packableCaseQty: number;
  packableUnitQty: number;
  unitPrice: number | null;
  minRemainingShelfLifeDays: number | null;
  product: PackingProductSpec;
};

export type PackingInventoryLot = {
  id: string;
  productId: string;
  lotNo: string;
  warehouseCode: string;
  expiryDate: string | null;
  productionDate: string | null;
  availableQty: number;
  confidenceStatus: "high" | "medium" | "low";
};

export type PackingPlacement = {
  id: string;
  orderItemId: string;
  productId: string;
  sku: string;
  label: string;
  unitsPerCase: number | null;
  layer: number;
  x: number;
  y: number;
  widthCells: number;
  depthCells: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  grossWeightKg: number;
  netWeightKg: number;
  caseCbmM3: number;
  rotated: boolean;
};

export type PackingPartialEntry = {
  id: string;
  orderItemId: string;
  productId: string;
  sku: string;
  label: string;
  units: number;
  unitsPerCase: number | null;
  unitGrossWeightKg: number;
  unitNetWeightKg: number;
  unitCbmM3: number;
  reason: string;
};

export type PackingPalletDraft = {
  localId: string;
  persistedId?: string;
  palletNo: string;
  widthMm: number;
  depthMm: number;
  heightMm: number | null;
  notes: string;
  placements: PackingPlacement[];
  partials: PackingPartialEntry[];
};

export type PackingSimulationPolicy = {
  cellSizeMm: number;
  defaultPalletWidthMm: number;
  defaultPalletDepthMm: number;
  maxPalletGrossWeightKg: number;
  heavyBoxWeightThresholdKg: number;
  maxHeavyBoxesPerPallet: number;
  recommendedMaxHeightMm: number;
};

export type PackingSimulationDocument = {
  version: 1;
  policy: PackingSimulationPolicy;
  placements: PackingPlacement[];
  partials: PackingPartialEntry[];
  savedAt: string;
};

export type PackingDraftStatus = "draft" | "promoted";

export type PackingPlannerDraftDocument = {
  version: 1;
  policy: PackingSimulationPolicy;
  pallets: PackingPalletDraft[];
  savedAt: string;
  linkedShipmentId: string | null;
};

export type PackingLotAllocation = {
  lotId: string | null;
  lotNo: string | null;
  warehouseCode: string | null;
  expiryDate: string | null;
  packedCaseQty: number;
  packedUnitQty: number;
  isPartialCase: boolean;
  partialReason: string | null;
  manualOverride: boolean;
  overrideReason: string | null;
  confidenceStatus: "high" | "medium" | "low" | null;
};

export type PackingGroupedAllocation = {
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  unitsPerCase: number | null;
  packedCaseQty: number;
  packedUnitQty: number;
  partialUnitQty: number;
  allocations: PackingLotAllocation[];
};

export type PackingPalletSummary = {
  palletNo: string;
  heightMm: number;
  estimatedHeightMm: number;
  palletCbmM3: number;
  boxCbmM3: number;
  cbmDiffRatio: number | null;
  grossWeightKg: number;
  netWeightKg: number;
  hasUnknownGrossWeightData: boolean;
  heavyBoxCount: number;
  caseCount: number;
  unitsCount: number;
  earliestExpiryDate: string | null;
  latestExpiryDate: string | null;
  partialCaseCount: number;
  manualOverrideCount: number;
  overflowCount: number;
  warnings: string[];
  groupedAllocations: PackingGroupedAllocation[];
  shippingMark: string;
};

export type PackingShipmentContext = {
  shipmentId: string;
  shipmentNo: string;
  buyerName: string | null;
  buyerCode: string | null;
  destinationName: string | null;
  destinationCode: string | null;
};

export type PackingItemProgress = {
  orderItemId: string;
  assignedCaseQty: number;
  assignedLooseUnitQty: number;
  assignedUnitQty: number;
  remainingUnitQty: number;
  remainingCaseQty: number;
  remainingLooseUnitQty: number;
  overpackedUnits: number;
};

export const DEFAULT_PACKING_POLICY: PackingSimulationPolicy = {
  cellSizeMm: 100,
  defaultPalletWidthMm: 1100,
  defaultPalletDepthMm: 1100,
  maxPalletGrossWeightKg: 680,
  heavyBoxWeightThresholdKg: 18,
  maxHeavyBoxesPerPallet: 4,
  recommendedMaxHeightMm: 1650,
};
