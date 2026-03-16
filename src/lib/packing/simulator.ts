import { ShipmentPallet } from "@/lib/queries/shipments";
import {
  DEFAULT_PACKING_POLICY,
  PackingGroupedAllocation,
  PackingInventoryLot,
  PackingItemProgress,
  PackingPalletDraft,
  PackingPalletSummary,
  PackingPartialEntry,
  PackingPlacement,
  PackingShipmentContext,
  PackingSimulationDocument,
  PackingSimulationPolicy,
  PackingSourceItem,
} from "@/lib/packing/types";

const DEFAULT_CASE_WIDTH_MM = 300;
const DEFAULT_CASE_DEPTH_MM = 300;
const DEFAULT_CASE_HEIGHT_MM = 250;

function cmToMm(value: number | null) {
  return value === null ? null : Math.max(Math.round(value * 10), 1);
}

function roundTo(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clampNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function isSimulationDocument(value: unknown): value is PackingSimulationDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const document = value as Record<string, unknown>;
  return (
    document.version === 1 &&
    Array.isArray(document.placements) &&
    Array.isArray(document.partials) &&
    !!document.policy &&
    typeof document.policy === "object"
  );
}

export function readPackingPolicyFromPallets(pallets: ShipmentPallet[]) {
  for (const pallet of pallets) {
    if (isSimulationDocument(pallet.simulation_json)) {
      return pallet.simulation_json.policy;
    }
  }

  return null;
}

export function generateLocalId(prefix = "pack") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function getUnitsPerCase(item: PackingSourceItem) {
  return item.product.unitsPerCase ?? null;
}

export function getCaseFootprintMm(item: PackingSourceItem, rotated = false) {
  const widthMm = cmToMm(item.product.caseLengthCm) ?? DEFAULT_CASE_WIDTH_MM;
  const depthMm = cmToMm(item.product.caseWidthCm) ?? DEFAULT_CASE_DEPTH_MM;

  return rotated
    ? { widthMm: depthMm, depthMm: widthMm }
    : { widthMm, depthMm };
}

export function getCaseHeightMm(item: PackingSourceItem) {
  return cmToMm(item.product.caseHeightCm) ?? DEFAULT_CASE_HEIGHT_MM;
}

export function getCaseCbmM3(item: PackingSourceItem) {
  if (item.product.caseCbmM3 !== null) {
    return clampNonNegative(item.product.caseCbmM3);
  }

  const { widthMm, depthMm } = getCaseFootprintMm(item);
  const heightMm = getCaseHeightMm(item);
  return roundTo((widthMm * depthMm * heightMm) / 1_000_000_000, 6);
}

export function getUnitCbmM3(item: PackingSourceItem) {
  const unitsPerCase = getUnitsPerCase(item);
  if (!unitsPerCase || unitsPerCase <= 0) {
    return getCaseCbmM3(item);
  }

  return roundTo(getCaseCbmM3(item) / unitsPerCase, 6);
}

export function getRecommendedCellSizeMm(sourceItems: PackingSourceItem[]) {
  const footprintDimsMm = sourceItems.flatMap((item) => {
    const dims = [
      cmToMm(item.product.caseLengthCm),
      cmToMm(item.product.caseWidthCm),
    ].filter((value): value is number => value !== null);

    return dims;
  });

  const minFootprintDimMm = footprintDimsMm.reduce(
    (minValue, value) => Math.min(minValue, value),
    Number.POSITIVE_INFINITY,
  );

  if (!Number.isFinite(minFootprintDimMm)) {
    return DEFAULT_PACKING_POLICY.cellSizeMm;
  }

  if (minFootprintDimMm <= 200) {
    return 20;
  }

  if (minFootprintDimMm <= 500) {
    return 50;
  }

  return 100;
}

export function getTargetBoxCbmM3(sourceItems: PackingSourceItem[]) {
  return roundTo(
    sourceItems.reduce((sum, item) => {
      const caseCbm = getCaseCbmM3(item) * Math.max(item.packableCaseQty, 0);
      const unitsPerCase = getUnitsPerCase(item);

      if (!unitsPerCase || unitsPerCase <= 0) {
        return sum + caseCbm;
      }

      const looseUnitQty = Math.max(item.packableUnitQty - item.packableCaseQty * unitsPerCase, 0);
      return sum + caseCbm + getUnitCbmM3(item) * looseUnitQty;
    }, 0),
    6,
  );
}

export function getEstimatedPalletCapacityCbmM3(policy: PackingSimulationPolicy) {
  const widthM = Math.max(policy.defaultPalletWidthMm, 0) / 1000;
  const depthM = Math.max(policy.defaultPalletDepthMm, 0) / 1000;
  const heightM = Math.max(policy.recommendedMaxHeightMm, 0) / 1000;
  return roundTo(widthM * depthM * heightM, 6);
}

export function estimatePalletCountByCbm(
  sourceItems: PackingSourceItem[],
  policy: PackingSimulationPolicy,
) {
  const targetBoxCbmM3 = getTargetBoxCbmM3(sourceItems);
  const palletCapacityCbmM3 = getEstimatedPalletCapacityCbmM3(policy);

  if (targetBoxCbmM3 <= 0 || palletCapacityCbmM3 <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(targetBoxCbmM3 / palletCapacityCbmM3));
}

export function getCaseGrossWeightKg(item: PackingSourceItem) {
  return clampNonNegative(item.product.caseGrossWeightKg ?? 0);
}

export function getCaseNetWeightKg(item: PackingSourceItem) {
  return clampNonNegative(item.product.caseNetWeightKg ?? 0);
}

export function getUnitGrossWeightKg(item: PackingSourceItem) {
  const unitsPerCase = getUnitsPerCase(item);
  if (!unitsPerCase || unitsPerCase <= 0) {
    return getCaseGrossWeightKg(item);
  }

  return roundTo(getCaseGrossWeightKg(item) / unitsPerCase, 4);
}

export function getUnitNetWeightKg(item: PackingSourceItem) {
  const unitsPerCase = getUnitsPerCase(item);
  if (!unitsPerCase || unitsPerCase <= 0) {
    return getCaseNetWeightKg(item);
  }

  return roundTo(getCaseNetWeightKg(item) / unitsPerCase, 4);
}

export function getItemProgress(item: PackingSourceItem, pallets: PackingPalletDraft[]): PackingItemProgress {
  const unitsPerCase = getUnitsPerCase(item) ?? 1;
  let assignedCaseQty = 0;
  let assignedLooseUnitQty = 0;

  pallets.forEach((pallet) => {
    pallet.placements.forEach((placement) => {
      if (placement.orderItemId === item.orderItemId) {
        assignedCaseQty += 1;
      }
    });

    pallet.partials.forEach((partial) => {
      if (partial.orderItemId === item.orderItemId) {
        assignedLooseUnitQty += partial.units;
      }
    });
  });

  const assignedUnitQty = assignedCaseQty * unitsPerCase + assignedLooseUnitQty;
  const remainingUnitQty = item.packableUnitQty - assignedUnitQty;
  const safeRemainingUnitQty = Math.max(remainingUnitQty, 0);

  return {
    orderItemId: item.orderItemId,
    assignedCaseQty,
    assignedLooseUnitQty,
    assignedUnitQty,
    remainingUnitQty: safeRemainingUnitQty,
    remainingCaseQty: getUnitsPerCase(item)
      ? Math.floor(safeRemainingUnitQty / unitsPerCase)
      : Math.max(item.packableCaseQty - assignedCaseQty, 0),
    remainingLooseUnitQty: getUnitsPerCase(item)
      ? safeRemainingUnitQty % unitsPerCase
      : 0,
    overpackedUnits: Math.max(-remainingUnitQty, 0),
  };
}

export function getNextPalletNo(pallets: PackingPalletDraft[]) {
  const maxIndex = pallets.reduce((current, pallet) => {
    const match = pallet.palletNo.match(/(\d+)$/);
    if (!match) {
      return current;
    }

    return Math.max(current, Number.parseInt(match[1], 10));
  }, 0);

  return `PLT-${String(maxIndex + 1).padStart(2, "0")}`;
}

export function createEmptyPalletDraft(
  pallets: PackingPalletDraft[],
  overrides?: Partial<Pick<PackingPalletDraft, "palletNo" | "widthMm" | "depthMm" | "heightMm" | "notes" | "persistedId">>,
): PackingPalletDraft {
  return {
    localId: generateLocalId("pallet"),
    persistedId: overrides?.persistedId,
    palletNo: overrides?.palletNo ?? getNextPalletNo(pallets),
    widthMm: overrides?.widthMm ?? DEFAULT_PACKING_POLICY.defaultPalletWidthMm,
    depthMm: overrides?.depthMm ?? DEFAULT_PACKING_POLICY.defaultPalletDepthMm,
    heightMm: overrides?.heightMm ?? null,
    notes: overrides?.notes ?? "",
    placements: [],
    partials: [],
  };
}

function getGridSizeForPallet(pallet: Pick<PackingPalletDraft, "widthMm" | "depthMm">, policy: PackingSimulationPolicy) {
  return {
    cols: Math.max(1, Math.floor(pallet.widthMm / policy.cellSizeMm)),
    rows: Math.max(1, Math.floor(pallet.depthMm / policy.cellSizeMm)),
  };
}

function getPlacementLayerIndices(pallet: PackingPalletDraft) {
  const layers = new Set<number>();
  pallet.placements.forEach((placement) => layers.add(placement.layer));
  return Array.from(layers).sort((a, b) => a - b);
}

function getLayerHeightMm(pallet: PackingPalletDraft, layer: number) {
  return pallet.placements.reduce((maxHeight, placement) => {
    if (placement.layer !== layer) {
      return maxHeight;
    }

    return Math.max(maxHeight, placement.heightMm);
  }, 0);
}

export function estimatePalletHeightMm(pallet: PackingPalletDraft) {
  const layers = getPlacementLayerIndices(pallet);
  if (layers.length === 0) {
    return 0;
  }

  return layers.reduce((totalHeight, layer) => totalHeight + getLayerHeightMm(pallet, layer), 0);
}

function estimateHeightAfterPlacement(
  pallet: PackingPalletDraft,
  placement: Omit<PackingPlacement, "id" | "layer" | "x" | "y">,
  layer: number,
) {
  const layers = new Set([...getPlacementLayerIndices(pallet), layer]);
  let totalHeight = 0;

  layers.forEach((currentLayer) => {
    if (currentLayer === layer) {
      totalHeight += Math.max(getLayerHeightMm(pallet, currentLayer), placement.heightMm);
      return;
    }

    totalHeight += getLayerHeightMm(pallet, currentLayer);
  });

  return totalHeight;
}

function buildLayerOccupancy(
  pallet: PackingPalletDraft,
  layer: number,
  cols: number,
  rows: number,
  ignorePlacementId?: string,
) {
  const occupancy = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  pallet.placements.forEach((placement) => {
    if (placement.layer !== layer || placement.id === ignorePlacementId) {
      return;
    }

    for (let row = placement.y; row < placement.y + placement.depthCells; row += 1) {
      for (let col = placement.x; col < placement.x + placement.widthCells; col += 1) {
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          occupancy[row][col] = true;
        }
      }
    }
  });

  return occupancy;
}

function findSlotInLayer(
  pallet: PackingPalletDraft,
  widthCells: number,
  depthCells: number,
  layer: number,
  policy: PackingSimulationPolicy,
  ignorePlacementId?: string,
) {
  const { cols, rows } = getGridSizeForPallet(pallet, policy);
  if (widthCells > cols || depthCells > rows) {
    return null;
  }

  const occupancy = buildLayerOccupancy(pallet, layer, cols, rows, ignorePlacementId);

  for (let y = 0; y <= rows - depthCells; y += 1) {
    for (let x = 0; x <= cols - widthCells; x += 1) {
      let available = true;

      for (let row = y; row < y + depthCells && available; row += 1) {
        for (let col = x; col < x + widthCells; col += 1) {
          if (occupancy[row][col]) {
            available = false;
            break;
          }
        }
      }

      if (available) {
        return { x, y };
      }
    }
  }

  return null;
}

function isHeavyPlacement(placement: PackingPlacement, policy: PackingSimulationPolicy) {
  return placement.grossWeightKg >= policy.heavyBoxWeightThresholdKg;
}

function buildPlacementPrototype(item: PackingSourceItem, policy: PackingSimulationPolicy, rotated = false) {
  const { widthMm, depthMm } = getCaseFootprintMm(item, rotated);
  const widthCells = Math.max(1, Math.ceil(widthMm / policy.cellSizeMm));
  const depthCells = Math.max(1, Math.ceil(depthMm / policy.cellSizeMm));

  return {
    orderItemId: item.orderItemId,
    productId: item.product.productId,
    sku: item.product.sku,
    label: item.product.name,
    unitsPerCase: getUnitsPerCase(item),
    widthCells,
    depthCells,
    widthMm,
    depthMm,
    heightMm: getCaseHeightMm(item),
    grossWeightKg: getCaseGrossWeightKg(item),
    netWeightKg: getCaseNetWeightKg(item),
    caseCbmM3: getCaseCbmM3(item),
    rotated,
  };
}

type PlacementCandidate = {
  layer: number;
  x: number;
  y: number;
  prototype: Omit<PackingPlacement, "id" | "layer" | "x" | "y">;
};

function findPlacementCandidate(
  pallet: PackingPalletDraft,
  item: PackingSourceItem,
  policy: PackingSimulationPolicy,
  options?: { preferredLayer?: number; preferredRotation?: boolean; ignorePlacementId?: string },
) {
  const rotationOrder =
    options?.preferredRotation === undefined
      ? [false, true]
      : [options.preferredRotation, !options.preferredRotation];

  const existingLayers = getPlacementLayerIndices(pallet);
  const layerCandidates = new Set<number>();

  if (typeof options?.preferredLayer === "number") {
    layerCandidates.add(options.preferredLayer);
  }

  existingLayers.forEach((layer) => layerCandidates.add(layer));
  layerCandidates.add(existingLayers.length > 0 ? existingLayers[existingLayers.length - 1] + 1 : 0);

  const orderedLayers = Array.from(layerCandidates).sort((a, b) => a - b);
  const currentGrossWeight = getPalletGrossWeightKg(pallet);
  const currentHeavyBoxes = getHeavyPlacementCount(pallet, policy);

  for (const rotated of rotationOrder) {
    const prototype = buildPlacementPrototype(item, policy, rotated);
    const projectedHeavyBoxes =
      currentHeavyBoxes + (prototype.grossWeightKg >= policy.heavyBoxWeightThresholdKg ? 1 : 0);
    if (projectedHeavyBoxes > policy.maxHeavyBoxesPerPallet) {
      continue;
    }

    if (currentGrossWeight + prototype.grossWeightKg > policy.maxPalletGrossWeightKg) {
      continue;
    }

    for (const layer of orderedLayers) {
      const projectedHeight = estimateHeightAfterPlacement(pallet, prototype, layer);
      if (projectedHeight > policy.recommendedMaxHeightMm) {
        continue;
      }

      const slot = findSlotInLayer(
        pallet,
        prototype.widthCells,
        prototype.depthCells,
        layer,
        policy,
        options?.ignorePlacementId,
      );

      if (slot) {
        return {
          layer,
          x: slot.x,
          y: slot.y,
          prototype,
        } satisfies PlacementCandidate;
      }
    }
  }

  return null;
}

export function placeCaseOnPallet(
  pallet: PackingPalletDraft,
  item: PackingSourceItem,
  policy: PackingSimulationPolicy,
  options?: { preferredLayer?: number; preferredRotation?: boolean },
) {
  const candidate = findPlacementCandidate(pallet, item, policy, options);
  if (!candidate) {
    return null;
  }

  const placement: PackingPlacement = {
    id: generateLocalId("placement"),
    layer: candidate.layer,
    x: candidate.x,
    y: candidate.y,
    ...candidate.prototype,
  };

  return {
    ...pallet,
    placements: [...pallet.placements, placement],
  };
}

export function fillRowOnPallet(
  pallet: PackingPalletDraft,
  item: PackingSourceItem,
  layer: number,
  policy: PackingSimulationPolicy,
  maxCaseQty = Number.POSITIVE_INFINITY,
  options?: { rotated?: boolean },
) {
  const { cols, rows } = getGridSizeForPallet(pallet, policy);
  const candidateLimit = Number.isFinite(maxCaseQty) ? Math.max(Math.floor(maxCaseQty), 0) : Number.POSITIVE_INFINITY;
  const rotationOrder =
    typeof options?.rotated === "boolean" ? [options.rotated] : [false, true];
  let bestMatch:
    | {
        pallet: PackingPalletDraft;
        placementIds: string[];
        count: number;
        x: number;
        y: number;
      }
    | null = null;

  for (const rotated of rotationOrder) {
    const prototype = buildPlacementPrototype(item, policy, rotated);
    const maxX = cols - prototype.widthCells;
    const maxY = rows - prototype.depthCells;

    if (maxX < 0 || maxY < 0) {
      continue;
    }

    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= maxX; x += 1) {
        let nextPallet: PackingPalletDraft = {
          ...pallet,
          placements: [...pallet.placements],
        };
        const nextPlacementIds: string[] = [];
        let nextX = x;

        while (nextPlacementIds.length < candidateLimit && nextX <= maxX) {
          const nextPlacement: PackingPlacement = {
            id: generateLocalId("placement"),
            layer,
            x: nextX,
            y,
            ...prototype,
          };
          const placedPallet = placeExistingPlacementAt(
            nextPallet,
            nextPlacement,
            { layer, x: nextX, y },
            policy,
          );

          if (!placedPallet) {
            break;
          }

          nextPallet = placedPallet;
          nextPlacementIds.push(nextPlacement.id);
          nextX += prototype.widthCells;
        }

        if (nextPlacementIds.length === 0) {
          continue;
        }

        if (
          !bestMatch ||
          nextPlacementIds.length > bestMatch.count ||
          (nextPlacementIds.length === bestMatch.count && y < bestMatch.y) ||
          (nextPlacementIds.length === bestMatch.count && y === bestMatch.y && x < bestMatch.x)
        ) {
          bestMatch = {
            pallet: nextPallet,
            placementIds: nextPlacementIds,
            count: nextPlacementIds.length,
            x,
            y,
          };
        }
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    pallet: bestMatch.pallet,
    placementIds: bestMatch.placementIds,
  };
}

type PlacementTarget = {
  layer: number;
  x: number;
  y: number;
};

function canPlacePlacementAt(
  pallet: PackingPalletDraft,
  placement: PackingPlacement,
  target: PlacementTarget,
  policy: PackingSimulationPolicy,
) {
  const { cols, rows } = getGridSizeForPallet(pallet, policy);

  if (
    target.x < 0 ||
    target.y < 0 ||
    target.x + placement.widthCells > cols ||
    target.y + placement.depthCells > rows
  ) {
    return false;
  }

  const occupancy = buildLayerOccupancy(pallet, target.layer, cols, rows);
  for (let row = target.y; row < target.y + placement.depthCells; row += 1) {
    for (let col = target.x; col < target.x + placement.widthCells; col += 1) {
      if (occupancy[row]?.[col]) {
        return false;
      }
    }
  }

  if (getPalletGrossWeightKg(pallet) + placement.grossWeightKg > policy.maxPalletGrossWeightKg) {
    return false;
  }

  const projectedHeavyBoxes =
    getHeavyPlacementCount(pallet, policy) + (isHeavyPlacement(placement, policy) ? 1 : 0);
  if (projectedHeavyBoxes > policy.maxHeavyBoxesPerPallet) {
    return false;
  }

  if (estimateHeightAfterPlacement(pallet, placement, target.layer) > policy.recommendedMaxHeightMm) {
    return false;
  }

  return true;
}

function placeExistingPlacementAt(
  pallet: PackingPalletDraft,
  placement: PackingPlacement,
  target: PlacementTarget,
  policy: PackingSimulationPolicy,
) {
  if (!canPlacePlacementAt(pallet, placement, target, policy)) {
    return null;
  }

  return {
    ...pallet,
    placements: [
      ...pallet.placements,
      {
        ...placement,
        layer: target.layer,
        x: target.x,
        y: target.y,
      },
    ],
  };
}

function findNearestPlacementTargetInLayer(
  pallet: PackingPalletDraft,
  placement: PackingPlacement,
  layer: number,
  policy: PackingSimulationPolicy,
) {
  const { cols, rows } = getGridSizeForPallet(pallet, policy);
  const maxX = cols - placement.widthCells;
  const maxY = rows - placement.depthCells;

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  const originX = placement.x + placement.widthCells / 2;
  const originY = placement.y + placement.depthCells / 2;
  const candidates: Array<{ target: PlacementTarget; distance: number }> = [];

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      if (x === placement.x && y === placement.y && layer === placement.layer) {
        continue;
      }

      const target = { layer, x, y };
      if (!canPlacePlacementAt(pallet, placement, target, policy)) {
        continue;
      }

      const distance = Math.abs(x + placement.widthCells / 2 - originX) + Math.abs(y + placement.depthCells / 2 - originY);
      candidates.push({ target, distance });
    }
  }

  candidates.sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    if (left.target.y !== right.target.y) {
      return left.target.y - right.target.y;
    }

    return left.target.x - right.target.x;
  });

  return candidates[0]?.target ?? null;
}

export function duplicatePlacementOnPallet(
  pallet: PackingPalletDraft,
  placementId: string,
  policy: PackingSimulationPolicy,
) {
  const placement = pallet.placements.find((entry) => entry.id === placementId);
  if (!placement) {
    return null;
  }

  const target = findNearestPlacementTargetInLayer(pallet, placement, placement.layer, policy);
  if (!target) {
    return null;
  }

  return placeExistingPlacementAt(
    pallet,
    {
      ...placement,
      id: generateLocalId("placement"),
    },
    target,
    policy,
  );
}

export function duplicatePlacementsNearbyOnLayer(
  pallet: PackingPalletDraft,
  placementIds: string[],
  policy: PackingSimulationPolicy,
) {
  const selectedPlacementIds = new Set(placementIds);
  const selectedPlacements = sortPlacementsForBatch(
    pallet.placements.filter((placement) => selectedPlacementIds.has(placement.id)),
  );

  if (selectedPlacements.length === 0) {
    return null;
  }

  const sourceLayer = selectedPlacements[0].layer;
  if (selectedPlacements.some((placement) => placement.layer !== sourceLayer)) {
    return null;
  }

  const bounds = selectedPlacements.reduce(
    (current, placement) => ({
      left: Math.min(current.left, placement.x),
      top: Math.min(current.top, placement.y),
      right: Math.max(current.right, placement.x + placement.widthCells),
      bottom: Math.max(current.bottom, placement.y + placement.depthCells),
    }),
    {
      left: Number.POSITIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    },
  );

  const groupWidth = bounds.right - bounds.left;
  const groupHeight = bounds.bottom - bounds.top;
  const { cols, rows } = getGridSizeForPallet(pallet, policy);
  const maxX = cols - groupWidth;
  const maxY = rows - groupHeight;

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  const originCenterX = bounds.left + groupWidth / 2;
  const originCenterY = bounds.top + groupHeight / 2;
  const candidates: Array<{ x: number; y: number; distance: number }> = [];

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      if (x === bounds.left && y === bounds.top) {
        continue;
      }

      const distance = Math.abs(x + groupWidth / 2 - originCenterX) + Math.abs(y + groupHeight / 2 - originCenterY);
      candidates.push({ x, y, distance });
    }
  }

  candidates.sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    if (left.y !== right.y) {
      return left.y - right.y;
    }

    return left.x - right.x;
  });

  for (const candidate of candidates) {
    let nextPallet: PackingPalletDraft = {
      ...pallet,
      placements: [...pallet.placements],
    };
    const nextPlacementIds: string[] = [];
    let failed = false;

    for (const placement of selectedPlacements) {
      const nextPlacement = {
        ...placement,
        id: generateLocalId("placement"),
      };
      const placedPallet = placeExistingPlacementAt(
        nextPallet,
        nextPlacement,
        {
          layer: sourceLayer,
          x: candidate.x + (placement.x - bounds.left),
          y: candidate.y + (placement.y - bounds.top),
        },
        policy,
      );

      if (!placedPallet) {
        failed = true;
        break;
      }

      nextPallet = placedPallet;
      nextPlacementIds.push(nextPlacement.id);
    }

    if (!failed) {
      return {
        pallet: nextPallet,
        placementIds: nextPlacementIds,
      };
    }
  }

  return null;
}

function sortPlacementsForBatch(placements: PackingPlacement[]) {
  return [...placements].sort((left, right) => {
    if (left.y !== right.y) {
      return left.y - right.y;
    }

    if (left.x !== right.x) {
      return left.x - right.x;
    }

    return left.id.localeCompare(right.id);
  });
}

function applyPlacementBatchToLayer(
  pallet: PackingPalletDraft,
  placementIds: string[],
  targetLayer: number,
  policy: PackingSimulationPolicy,
  mode: "move" | "duplicate",
) {
  const selectedPlacementIds = new Set(placementIds);
  const selectedPlacements = sortPlacementsForBatch(
    pallet.placements.filter((placement) => selectedPlacementIds.has(placement.id)),
  );

  if (selectedPlacements.length === 0) {
    return null;
  }

  let nextPallet =
    mode === "move"
      ? {
          ...pallet,
          placements: pallet.placements.filter((placement) => !selectedPlacementIds.has(placement.id)),
        }
      : {
          ...pallet,
          placements: [...pallet.placements],
        };
  const nextPlacementIds: string[] = [];

  for (const placement of selectedPlacements) {
    const nextPlacement =
      mode === "move"
        ? {
            ...placement,
            layer: targetLayer,
          }
        : {
            ...placement,
            id: generateLocalId("placement"),
            layer: targetLayer,
          };

    const placedPallet = placeExistingPlacementAt(
      nextPallet,
      nextPlacement,
      {
        layer: targetLayer,
        x: placement.x,
        y: placement.y,
      },
      policy,
    );

    if (!placedPallet) {
      return null;
    }

    nextPallet = placedPallet;
    nextPlacementIds.push(nextPlacement.id);
  }

  return {
    pallet: nextPallet,
    placementIds: nextPlacementIds,
  };
}

export function movePlacementsToLayer(
  pallet: PackingPalletDraft,
  placementIds: string[],
  targetLayer: number,
  policy: PackingSimulationPolicy,
) {
  return applyPlacementBatchToLayer(pallet, placementIds, targetLayer, policy, "move");
}

export function duplicatePlacementsToLayer(
  pallet: PackingPalletDraft,
  placementIds: string[],
  targetLayer: number,
  policy: PackingSimulationPolicy,
) {
  return applyPlacementBatchToLayer(pallet, placementIds, targetLayer, policy, "duplicate");
}

export function movePlacementBetweenPallets(
  pallets: PackingPalletDraft[],
  sourcePalletId: string,
  placementId: string,
  targetPalletId: string,
  target: PlacementTarget,
  policy: PackingSimulationPolicy,
) {
  const sourcePallet = pallets.find((pallet) => pallet.localId === sourcePalletId);
  const targetPallet = pallets.find((pallet) => pallet.localId === targetPalletId);

  if (!sourcePallet || !targetPallet) {
    return null;
  }

  const placement = sourcePallet.placements.find((entry) => entry.id === placementId);
  if (!placement) {
    return null;
  }

  const baseSourcePallet = {
    ...sourcePallet,
    placements: sourcePallet.placements.filter((entry) => entry.id !== placementId),
  };
  const baseTargetPallet = sourcePalletId === targetPalletId ? baseSourcePallet : targetPallet;
  const nextTargetPallet = placeExistingPlacementAt(baseTargetPallet, placement, target, policy);

  if (!nextTargetPallet) {
    return null;
  }

  return pallets.map((pallet) => {
    if (pallet.localId === sourcePalletId && pallet.localId === targetPalletId) {
      return nextTargetPallet;
    }

    if (pallet.localId === sourcePalletId) {
      return baseSourcePallet;
    }

    if (pallet.localId === targetPalletId) {
      return nextTargetPallet;
    }

    return pallet;
  });
}

export function rotatePlacementOnPallet(
  pallet: PackingPalletDraft,
  placementId: string,
  sourceItems: PackingSourceItem[],
  policy: PackingSimulationPolicy,
) {
  const currentPlacement = pallet.placements.find((placement) => placement.id === placementId);
  if (!currentPlacement) {
    return pallet;
  }

  const sourceItem = sourceItems.find((item) => item.orderItemId === currentPlacement.orderItemId);
  if (!sourceItem) {
    return pallet;
  }

  const candidate = findPlacementCandidate(pallet, sourceItem, policy, {
    preferredLayer: currentPlacement.layer,
    preferredRotation: !currentPlacement.rotated,
    ignorePlacementId: placementId,
  });

  if (!candidate) {
    return pallet;
  }

  return {
    ...pallet,
    placements: pallet.placements.map((placement) =>
      placement.id === placementId
        ? {
            id: placement.id,
            layer: candidate.layer,
            x: candidate.x,
            y: candidate.y,
            ...candidate.prototype,
          }
        : placement,
    ),
  };
}

function getPalletGrossWeightKg(pallet: PackingPalletDraft) {
  const placementWeight = pallet.placements.reduce((sum, placement) => sum + placement.grossWeightKg, 0);
  const partialWeight = pallet.partials.reduce((sum, partial) => sum + partial.unitGrossWeightKg * partial.units, 0);
  return roundTo(placementWeight + partialWeight, 3);
}

function getPalletNetWeightKg(pallet: PackingPalletDraft) {
  const placementWeight = pallet.placements.reduce((sum, placement) => sum + placement.netWeightKg, 0);
  const partialWeight = pallet.partials.reduce((sum, partial) => sum + partial.unitNetWeightKg * partial.units, 0);
  return roundTo(placementWeight + partialWeight, 3);
}

function getPalletBoxCbmM3(pallet: PackingPalletDraft) {
  const placementCbm = pallet.placements.reduce((sum, placement) => sum + placement.caseCbmM3, 0);
  const partialCbm = pallet.partials.reduce((sum, partial) => sum + partial.unitCbmM3 * partial.units, 0);
  return roundTo(placementCbm + partialCbm, 6);
}

function getHeavyPlacementCount(pallet: PackingPalletDraft, policy: PackingSimulationPolicy) {
  return pallet.placements.filter((placement) => isHeavyPlacement(placement, policy)).length;
}

function getOverflowCount(pallet: PackingPalletDraft, policy: PackingSimulationPolicy) {
  const { cols, rows } = getGridSizeForPallet(pallet, policy);
  return pallet.placements.filter(
    (placement) =>
      placement.x + placement.widthCells > cols || placement.y + placement.depthCells > rows,
  ).length;
}

function sortLotsForAllocation(lots: PackingInventoryLot[]) {
  return [...lots].sort((left, right) => {
    if (left.expiryDate && right.expiryDate && left.expiryDate !== right.expiryDate) {
      return left.expiryDate.localeCompare(right.expiryDate);
    }

    if (left.expiryDate && !right.expiryDate) {
      return -1;
    }

    if (!left.expiryDate && right.expiryDate) {
      return 1;
    }

    if (left.productionDate && right.productionDate && left.productionDate !== right.productionDate) {
      return left.productionDate.localeCompare(right.productionDate);
    }

    return left.lotNo.localeCompare(right.lotNo);
  });
}

function getDefaultOverrideReason(shortage = false) {
  return shortage
    ? "Inventory lots are insufficient for the current packing plan."
    : "Inventory confidence is low. Manual review is required.";
}

type GroupAccumulator = {
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  unitsPerCase: number | null;
  packedCaseQty: number;
  partialUnitQty: number;
  partialReasons: string[];
};

function buildGroupedAccumulation(pallet: PackingPalletDraft) {
  const groups = new Map<string, GroupAccumulator>();

  const getOrCreateGroup = (
    orderItemId: string,
    productId: string,
    sku: string,
    label: string,
    unitsPerCase: number | null,
  ) => {
    const existing = groups.get(orderItemId);
    if (existing) {
      return existing;
    }

    const next: GroupAccumulator = {
      orderItemId,
      productId,
      productName: label,
      sku,
      unitsPerCase,
      packedCaseQty: 0,
      partialUnitQty: 0,
      partialReasons: [],
    };
    groups.set(orderItemId, next);
    return next;
  };

  pallet.placements.forEach((placement) => {
    const group = getOrCreateGroup(
      placement.orderItemId,
      placement.productId,
      placement.sku,
      placement.label,
      placement.unitsPerCase,
    );
    group.packedCaseQty += 1;
  });

  pallet.partials.forEach((partial) => {
    const group = getOrCreateGroup(
      partial.orderItemId,
      partial.productId,
      partial.sku,
      partial.label,
      partial.unitsPerCase,
    );
    group.partialUnitQty += partial.units;
    group.partialReasons.push(partial.reason);
  });

  return Array.from(groups.values());
}

function allocateLotsForGroup(group: GroupAccumulator, lots: PackingInventoryLot[]): PackingGroupedAllocation {
  const sortedLots = sortLotsForAllocation(lots).map((lot) => ({
    ...lot,
    remainingQty: lot.availableQty,
  }));
  const allocations: PackingGroupedAllocation["allocations"] = [];
  const unitsPerCase = group.unitsPerCase ?? 1;
  let remainingCases = group.packedCaseQty;
  let remainingPartialUnits = group.partialUnitQty;

  sortedLots.forEach((lot) => {
    if (remainingCases <= 0) {
      return;
    }

    const caseCapacity = Math.floor(lot.remainingQty / unitsPerCase);
    const packedCaseQty = Math.min(remainingCases, caseCapacity);

    if (packedCaseQty <= 0) {
      return;
    }

    const packedUnitQty = packedCaseQty * unitsPerCase;
    lot.remainingQty -= packedUnitQty;
    remainingCases -= packedCaseQty;

    allocations.push({
      lotId: lot.id,
      lotNo: lot.lotNo,
      warehouseCode: lot.warehouseCode,
      expiryDate: lot.expiryDate,
      packedCaseQty,
      packedUnitQty,
      isPartialCase: false,
      partialReason: null,
      manualOverride: lot.confidenceStatus === "low",
      overrideReason: lot.confidenceStatus === "low" ? getDefaultOverrideReason(false) : null,
      confidenceStatus: lot.confidenceStatus,
    });
  });

  if (remainingCases > 0) {
    allocations.push({
      lotId: null,
      lotNo: null,
      warehouseCode: null,
      expiryDate: null,
      packedCaseQty: remainingCases,
      packedUnitQty: remainingCases * unitsPerCase,
      isPartialCase: false,
      partialReason: null,
      manualOverride: true,
      overrideReason: getDefaultOverrideReason(true),
      confidenceStatus: null,
    });
  }

  sortedLots.forEach((lot) => {
    if (remainingPartialUnits <= 0) {
      return;
    }

    const packedUnitQty = Math.min(remainingPartialUnits, lot.remainingQty);
    if (packedUnitQty <= 0) {
      return;
    }

    lot.remainingQty -= packedUnitQty;
    remainingPartialUnits -= packedUnitQty;

    allocations.push({
      lotId: lot.id,
      lotNo: lot.lotNo,
      warehouseCode: lot.warehouseCode,
      expiryDate: lot.expiryDate,
      packedCaseQty: 0,
      packedUnitQty,
      isPartialCase: true,
      partialReason: group.partialReasons[0] ?? "Partial case",
      manualOverride: lot.confidenceStatus === "low",
      overrideReason: lot.confidenceStatus === "low" ? getDefaultOverrideReason(false) : null,
      confidenceStatus: lot.confidenceStatus,
    });
  });

  if (remainingPartialUnits > 0) {
    allocations.push({
      lotId: null,
      lotNo: null,
      warehouseCode: null,
      expiryDate: null,
      packedCaseQty: 0,
      packedUnitQty: remainingPartialUnits,
      isPartialCase: true,
      partialReason: group.partialReasons[0] ?? "Partial case",
      manualOverride: true,
      overrideReason: getDefaultOverrideReason(true),
      confidenceStatus: null,
    });
  }

  return {
    orderItemId: group.orderItemId,
    productId: group.productId,
    productName: group.productName,
    sku: group.sku,
    unitsPerCase: group.unitsPerCase,
    packedCaseQty: group.packedCaseQty,
    packedUnitQty: group.packedCaseQty * unitsPerCase + group.partialUnitQty,
    partialUnitQty: group.partialUnitQty,
    allocations,
  };
}

function buildShippingMark(
  shipmentContext: PackingShipmentContext,
  palletNo: string,
  earliestExpiryDate: string | null,
  latestExpiryDate: string | null,
) {
  const buyerLabel = shipmentContext.buyerCode ?? shipmentContext.buyerName ?? "Buyer";
  const destinationLabel = shipmentContext.destinationCode ?? shipmentContext.destinationName ?? "Destination";
  const expiryLabel =
    earliestExpiryDate && latestExpiryDate
      ? earliestExpiryDate === latestExpiryDate
        ? earliestExpiryDate
        : `${earliestExpiryDate} ~ ${latestExpiryDate}`
      : "Open";

  return `${shipmentContext.shipmentNo} / ${palletNo} / ${buyerLabel} / ${destinationLabel} / EXP ${expiryLabel}`;
}

export function summarizePallet(
  pallet: PackingPalletDraft,
  shipmentContext: PackingShipmentContext,
  lots: PackingInventoryLot[],
  policy: PackingSimulationPolicy,
  sourceItems: PackingSourceItem[],
) {
  const sourceItemsById = new Map(sourceItems.map((item) => [item.orderItemId, item]));
  const groupedAllocations = buildGroupedAccumulation(pallet).map((group) =>
    allocateLotsForGroup(
      group,
      lots.filter((lot) => lot.productId === group.productId),
    ),
  );

  const heightMm = pallet.heightMm ?? estimatePalletHeightMm(pallet);
  const estimatedHeightMm = estimatePalletHeightMm(pallet);
  const palletCbmM3 = roundTo((pallet.widthMm / 1000) * (pallet.depthMm / 1000) * (heightMm / 1000), 6);
  const boxCbmM3 = getPalletBoxCbmM3(pallet);
  const cbmDiffRatio = boxCbmM3 > 0 ? Math.abs(palletCbmM3 - boxCbmM3) / boxCbmM3 : null;
  const earliestExpiryDate = groupedAllocations
    .flatMap((group) => group.allocations)
    .map((allocation) => allocation.expiryDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const latestExpiryDate = groupedAllocations
    .flatMap((group) => group.allocations)
    .map((allocation) => allocation.expiryDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const shippingMark = buildShippingMark(
    shipmentContext,
    pallet.palletNo,
    earliestExpiryDate,
    latestExpiryDate,
  );
  const partialCaseCount = groupedAllocations.reduce(
    (sum, group) => sum + group.allocations.filter((allocation) => allocation.isPartialCase).length,
    0,
  );
  const manualOverrideCount = groupedAllocations.reduce(
    (sum, group) => sum + group.allocations.filter((allocation) => allocation.manualOverride).length,
    0,
  );
  const overflowCount = getOverflowCount(pallet, policy);
  const hasUnknownGrossWeightData =
    pallet.placements.some(
      (placement) => sourceItemsById.get(placement.orderItemId)?.product.caseGrossWeightKg === null,
    ) ||
    pallet.partials.some(
      (partial) => sourceItemsById.get(partial.orderItemId)?.product.caseGrossWeightKg === null,
    );
  const warnings: string[] = [];

  if (heightMm > policy.recommendedMaxHeightMm) {
    warnings.push(`Estimated stack height ${heightMm} mm exceeds the recommended ${policy.recommendedMaxHeightMm} mm.`);
  }

  if (hasUnknownGrossWeightData) {
    warnings.push("Gross-weight data is missing on one or more packed lines. Weight-based safety checks are incomplete.");
  }

  const grossWeightKg = getPalletGrossWeightKg(pallet);
  if (grossWeightKg > policy.maxPalletGrossWeightKg) {
    warnings.push(`Gross weight ${grossWeightKg} kg exceeds the pallet limit of ${policy.maxPalletGrossWeightKg} kg.`);
  }

  const heavyBoxCount = getHeavyPlacementCount(pallet, policy);
  if (heavyBoxCount > policy.maxHeavyBoxesPerPallet) {
    warnings.push(
      `Heavy cases ${heavyBoxCount} exceed the policy limit of ${policy.maxHeavyBoxesPerPallet}.`,
    );
  }

  if (cbmDiffRatio !== null && cbmDiffRatio >= 0.1) {
    warnings.push("Pallet CBM and case-based CBM differ by more than 10%.");
  }

  if (manualOverrideCount > 0) {
    warnings.push("Lot allocation requires manual override on one or more lines.");
  }

  if (partialCaseCount > 0) {
    warnings.push("Partial-case shipment is included on this pallet.");
  }

  if (overflowCount > 0) {
    warnings.push("One or more case placements overflow the selected pallet size.");
  }

  return {
    palletNo: pallet.palletNo,
    heightMm,
    estimatedHeightMm,
    palletCbmM3,
    boxCbmM3,
    cbmDiffRatio,
    grossWeightKg,
    netWeightKg: getPalletNetWeightKg(pallet),
    hasUnknownGrossWeightData,
    heavyBoxCount,
    caseCount: pallet.placements.length,
    unitsCount: groupedAllocations.reduce((sum, group) => sum + group.packedUnitQty, 0),
    earliestExpiryDate,
    latestExpiryDate,
    partialCaseCount,
    manualOverrideCount,
    overflowCount,
    warnings,
    groupedAllocations,
    shippingMark,
  } satisfies PackingPalletSummary;
}

export function serializeSimulationDocument(
  pallet: PackingPalletDraft,
  policy: PackingSimulationPolicy,
): PackingSimulationDocument {
  return {
    version: 1,
    policy,
    placements: pallet.placements,
    partials: pallet.partials,
    savedAt: new Date().toISOString(),
  };
}

export function hydratePalletDraftsFromExisting(
  pallets: ShipmentPallet[],
  sourceItems: PackingSourceItem[],
  policy: PackingSimulationPolicy,
) {
  const nextDrafts: PackingPalletDraft[] = [];

  pallets.forEach((pallet) => {
    const nextDraft = createEmptyPalletDraft(nextDrafts, {
      persistedId: pallet.id,
      palletNo: pallet.pallet_no,
      widthMm: pallet.pallet_width_mm ?? policy.defaultPalletWidthMm,
      depthMm: pallet.pallet_depth_mm ?? policy.defaultPalletDepthMm,
      heightMm: pallet.pallet_height_mm,
      notes: pallet.notes ?? "",
    });

    const simulation = isSimulationDocument(pallet.simulation_json) ? pallet.simulation_json : null;

    if (simulation) {
      nextDrafts.push({
        ...nextDraft,
        placements: simulation.placements,
        partials: simulation.partials,
      });
      return;
    }

    let reconstructed = nextDraft;

    pallet.items.forEach((item) => {
      const sourceItem = sourceItems.find((candidate) => candidate.orderItemId === item.order_item_id);
      if (!sourceItem) {
        return;
      }

      for (let index = 0; index < item.packed_case_qty; index += 1) {
        const placed = placeCaseOnPallet(reconstructed, sourceItem, policy);
        if (!placed) {
          break;
        }
        reconstructed = placed;
      }

      const looseUnits =
        item.packed_unit_qty - item.packed_case_qty * (sourceItem.product.unitsPerCase ?? 1);
      if (looseUnits > 0 || item.is_partial_case) {
        reconstructed = {
          ...reconstructed,
          partials: [
            ...reconstructed.partials,
            {
              id: generateLocalId("partial"),
              orderItemId: sourceItem.orderItemId,
              productId: sourceItem.product.productId,
              sku: sourceItem.product.sku,
              label: sourceItem.product.name,
              units: Math.max(looseUnits, item.packed_unit_qty),
              unitsPerCase: sourceItem.product.unitsPerCase,
              unitGrossWeightKg: getUnitGrossWeightKg(sourceItem),
              unitNetWeightKg: getUnitNetWeightKg(sourceItem),
              unitCbmM3: getUnitCbmM3(sourceItem),
              reason: item.partial_reason ?? "Partial case",
            },
          ],
        };
      }
    });

    nextDrafts.push(reconstructed);
  });

  return nextDrafts;
}
