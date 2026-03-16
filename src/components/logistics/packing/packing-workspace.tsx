"use client";

import {
  saveOrderPackingDraft,
  saveShipmentPackingPlan,
} from "@/app/(dashboard)/logistics/_actions/logistics-actions";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyPalletDraft,
  duplicatePlacementOnPallet,
  duplicatePlacementsNearbyOnLayer,
  duplicatePlacementsToLayer,
  estimatePalletCountByCbm,
  fillRowOnPallet,
  generateLocalId,
  getEstimatedPalletCapacityCbmM3,
  getItemProgress,
  getRecommendedCellSizeMm,
  getTargetBoxCbmM3,
  getUnitCbmM3,
  getUnitGrossWeightKg,
  getUnitNetWeightKg,
  hydratePalletDraftsFromExisting,
  movePlacementBetweenPallets,
  movePlacementsToLayer,
  placeCaseOnPallet,
  readPackingPolicyFromPallets,
  rotatePlacementOnPallet,
  summarizePallet,
} from "@/lib/packing/simulator";
import {
  DEFAULT_PACKING_POLICY,
  PackingInventoryLot,
  PackingPalletDraft,
  PackingPlannerDraftDocument,
  PackingShipmentContext,
  PackingSimulationPolicy,
  PackingSourceItem,
} from "@/lib/packing/types";
import { ShipmentPallet } from "@/lib/queries/shipments";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Boxes,
  LayoutPanelTop,
  PackageCheck,
  Plus,
  RotateCw,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DragEvent, useEffect, useMemo, useState, useTransition } from "react";

type ShipmentPackingWorkspaceProps = {
  orderId: string;
  orderNo: string;
  shipmentId?: string | null;
  shipmentNo?: string | null;
  buyerName?: string | null;
  saveMode: "order_draft" | "shipment_final";
  initialDraftDocument?: PackingPlannerDraftDocument | null;
  draftSavedAt?: string | null;
  shipmentContext: PackingShipmentContext;
  orderItems: PackingSourceItem[];
  lots: PackingInventoryLot[];
  initialPallets: ShipmentPallet[];
};

type PartialDialogState = {
  open: boolean;
  itemId: string | null;
  palletId: string;
  units: string;
  reason: string;
};

type PackingDragPayload =
  | { kind: "queue_case"; orderItemId: string }
  | {
      kind: "placement";
      sourcePalletId: string;
      placementId: string;
      widthCells: number;
      depthCells: number;
    };

type SelectionBox = {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
};

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Open";
  }

  return new Date(value).toLocaleDateString("en-CA");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCbm(value: number) {
  return value.toFixed(3);
}

function formatWeightLabel(value: number, isUnknown: boolean) {
  return isUnknown ? "Unknown" : `${formatNumber(value, 1)} kg`;
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(value, minValue), maxValue);
}

function createDefaultPalletDrafts(count: number, policy: PackingSimulationPolicy) {
  const drafts: PackingPalletDraft[] = [];

  for (let index = 0; index < count; index += 1) {
    drafts.push(
      createEmptyPalletDraft(drafts, {
        widthMm: policy.defaultPalletWidthMm,
        depthMm: policy.defaultPalletDepthMm,
      }),
    );
  }

  return drafts;
}

function getProductTone(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }

  return {
    borderColor: `hsl(${hash} 48% 42%)`,
    backgroundColor: `hsl(${hash} 72% 86%)`,
    color: `hsl(${hash} 45% 20%)`,
  };
}

const MIN_VISIBLE_LAYER_COUNT = 5;
const INITIAL_SEEDED_PALLET_COUNT = 1;

function getLayerChoices(pallet: PackingPalletDraft, currentLayer: number, visibleLayerCount = MIN_VISIBLE_LAYER_COUNT) {
  const maxLayer = pallet.placements.reduce((maxValue, placement) => Math.max(maxValue, placement.layer), 0);
  const layers = Array.from(
    { length: Math.max(maxLayer + 2, currentLayer + 1, visibleLayerCount) },
    (_, index) => index,
  );
  return layers;
}

function getLayerUsageStats(
  pallet: PackingPalletDraft,
  currentLayer: number,
  policy: PackingSimulationPolicy,
) {
  const cols = Math.max(1, Math.floor(pallet.widthMm / policy.cellSizeMm));
  const rows = Math.max(1, Math.floor(pallet.depthMm / policy.cellSizeMm));
  const totalCells = cols * rows;
  const placements = pallet.placements.filter((placement) => placement.layer === currentLayer);
  const occupiedCells = placements.reduce((sum, placement) => {
    const availableWidth = Math.max(cols - placement.x, 0);
    const availableDepth = Math.max(rows - placement.y, 0);
    const widthCells = Math.min(placement.widthCells, availableWidth);
    const depthCells = Math.min(placement.depthCells, availableDepth);
    return sum + widthCells * depthCells;
  }, 0);
  const safeOccupiedCells = Math.min(occupiedCells, totalCells);
  const usageRatio = totalCells > 0 ? safeOccupiedCells / totalCells : 0;

  return {
    totalCells,
    occupiedCells: safeOccupiedCells,
    freeCells: Math.max(totalCells - safeOccupiedCells, 0),
    usageRatio,
    usagePercent: usageRatio * 100,
    freePercent: (1 - usageRatio) * 100,
    caseCount: placements.length,
    grossWeightKg: placements.reduce((sum, placement) => sum + placement.grossWeightKg, 0),
    boxCbmM3: placements.reduce((sum, placement) => sum + placement.caseCbmM3, 0),
    estimatedHeightMm: placements.reduce((maxHeight, placement) => Math.max(maxHeight, placement.heightMm), 0),
  };
}

function getPalletLayerOverview(
  pallet: PackingPalletDraft,
  currentLayer: number,
  policy: PackingSimulationPolicy,
) {
  const maxUsedLayer = pallet.placements.reduce((maxValue, placement) => Math.max(maxValue, placement.layer), -1);
  const layerIndices =
    maxUsedLayer >= 0
      ? Array.from({ length: maxUsedLayer + 1 }, (_, index) => index)
      : [0];

  if (currentLayer > maxUsedLayer && !layerIndices.includes(currentLayer)) {
    layerIndices.push(currentLayer);
  }

  const layers = layerIndices.map((layer) => ({
    layer,
    isCurrent: layer === currentLayer,
    ...getLayerUsageStats(pallet, layer, policy),
  }));
  const totalCells = layers.reduce((sum, layer) => sum + layer.totalCells, 0);
  const occupiedCells = layers.reduce((sum, layer) => sum + layer.occupiedCells, 0);
  const usageRatio = totalCells > 0 ? occupiedCells / totalCells : 0;
  const partialGrossWeightKg = pallet.partials.reduce(
    (sum, partial) => sum + partial.unitGrossWeightKg * partial.units,
    0,
  );
  const partialCbmM3 = pallet.partials.reduce((sum, partial) => sum + partial.unitCbmM3 * partial.units, 0);

  return {
    layers,
    totalCells,
    occupiedCells,
    usagePercent: usageRatio * 100,
    partialGrossWeightKg,
    partialCbmM3,
  };
}

function getDropGridPosition(
  event: DragEvent<HTMLDivElement>,
  pallet: PackingPalletDraft,
  policy: PackingSimulationPolicy,
  footprint?: { widthCells: number; depthCells: number },
) {
  const cols = Math.max(1, Math.floor(pallet.widthMm / policy.cellSizeMm));
  const rows = Math.max(1, Math.floor(pallet.depthMm / policy.cellSizeMm));
  const rect = event.currentTarget.getBoundingClientRect();
  const rawCol = ((event.clientX - rect.left) / rect.width) * cols;
  const rawRow = ((event.clientY - rect.top) / rect.height) * rows;
  const widthCells = footprint?.widthCells ?? 1;
  const depthCells = footprint?.depthCells ?? 1;

  return {
    x: clamp(Math.floor(rawCol - widthCells / 2), 0, Math.max(cols - widthCells, 0)),
    y: clamp(Math.floor(rawRow - depthCells / 2), 0, Math.max(rows - depthCells, 0)),
  };
}

function getGridPointerPosition(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  cols: number,
  rows: number,
) {
  return {
    col: clamp(((clientX - rect.left) / rect.width) * cols, 0, cols),
    row: clamp(((clientY - rect.top) / rect.height) * rows, 0, rows),
  };
}

function normalizeSelectionBox(box: SelectionBox) {
  return {
    left: Math.min(box.startCol, box.endCol),
    right: Math.max(box.startCol, box.endCol),
    top: Math.min(box.startRow, box.endRow),
    bottom: Math.max(box.startRow, box.endRow),
  };
}

function intersectsSelectionBox(
  placement: Pick<PackingPalletDraft["placements"][number], "x" | "y" | "widthCells" | "depthCells">,
  box: SelectionBox,
) {
  const bounds = normalizeSelectionBox(box);

  return (
    placement.x < bounds.right &&
    placement.x + placement.widthCells > bounds.left &&
    placement.y < bounds.bottom &&
    placement.y + placement.depthCells > bounds.top
  );
}

function PolicyField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="pr-14"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function PalletBoard({
  pallet,
  currentLayer,
  policy,
  visibleLayerCount,
  selectedPlacementIds,
  onLayerChange,
  onAddLayer,
  onSelectionChange,
  onDropCase,
  onDuplicatePlacement,
  onRotatePlacement,
  onRemovePlacement,
}: {
  pallet: PackingPalletDraft;
  currentLayer: number;
  policy: PackingSimulationPolicy;
  visibleLayerCount: number;
  selectedPlacementIds: string[];
  onLayerChange: (layer: number) => void;
  onAddLayer: () => void;
  onSelectionChange: (placementIds: string[]) => void;
  onDropCase: (event: DragEvent<HTMLDivElement>) => void;
  onDuplicatePlacement: (placementId: string) => void;
  onRotatePlacement: (placementId: string) => void;
  onRemovePlacement: (placementId: string) => void;
}) {
  const layers = getLayerChoices(pallet, currentLayer, visibleLayerCount);
  const cols = Math.max(1, Math.floor(pallet.widthMm / policy.cellSizeMm));
  const rows = Math.max(1, Math.floor(pallet.depthMm / policy.cellSizeMm));
  const placements = pallet.placements.filter((placement) => placement.layer === currentLayer);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  return (
    <div className="mx-auto w-full max-w-[660px] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={String(currentLayer)} onValueChange={(value) => onLayerChange(Number(value))}>
          <TabsList variant="line">
            {layers.map((layer) => (
              <TabsTrigger key={layer} value={String(layer)} className="px-3">
                Layer {layer + 1}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button type="button" size="sm" variant="outline" onClick={onAddLayer}>
          <Plus className="size-4" />
          Add layer
        </Button>
      </div>

      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:calc(100%/11)_calc(100%/11)]"
        onPointerDown={(event) => {
          if (event.button !== 0 || event.target !== event.currentTarget) {
            return;
          }

          const rect = event.currentTarget.getBoundingClientRect();
          const start = getGridPointerPosition(event.clientX, event.clientY, rect, cols, rows);
          const nextSelectionBox = {
            startCol: start.col,
            startRow: start.row,
            endCol: start.col,
            endRow: start.row,
          } satisfies SelectionBox;

          setSelectionBox(nextSelectionBox);
          onSelectionChange([]);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!selectionBox) {
            return;
          }

          const rect = event.currentTarget.getBoundingClientRect();
          const next = getGridPointerPosition(event.clientX, event.clientY, rect, cols, rows);
          const nextSelectionBox = {
            ...selectionBox,
            endCol: next.col,
            endRow: next.row,
          } satisfies SelectionBox;

          setSelectionBox(nextSelectionBox);
          onSelectionChange(
            placements
              .filter((placement) => intersectsSelectionBox(placement, nextSelectionBox))
              .map((placement) => placement.id),
          );
        }}
        onPointerUp={(event) => {
          if (!selectionBox) {
            return;
          }

          event.currentTarget.releasePointerCapture(event.pointerId);
          setSelectionBox(null);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={onDropCase}
        style={{
          backgroundSize: `${100 / cols}% ${100 / rows}%`,
        }}
      >
        <div className="pointer-events-none absolute inset-3 rounded-lg border border-dashed border-muted-foreground/30" />
        {placements.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Drag a case here, or move a placed box onto this layer.
          </div>
        ) : null}
        {selectionBox ? (
          <div
            className="pointer-events-none absolute z-20 border border-primary bg-primary/10"
            style={{
              left: `${(normalizeSelectionBox(selectionBox).left / cols) * 100}%`,
              top: `${(normalizeSelectionBox(selectionBox).top / rows) * 100}%`,
              width: `${((normalizeSelectionBox(selectionBox).right - normalizeSelectionBox(selectionBox).left) / cols) * 100}%`,
              height: `${((normalizeSelectionBox(selectionBox).bottom - normalizeSelectionBox(selectionBox).top) / rows) * 100}%`,
            }}
          />
        ) : null}

        {placements.map((placement) => {
          const tone = getProductTone(placement.productId);
          const overflow =
            placement.x + placement.widthCells > cols || placement.y + placement.depthCells > rows;
          const isSelected = selectedPlacementIds.includes(placement.id);

          return (
            <div
              key={placement.id}
              draggable
              onDragStart={(event) => {
                const payload: PackingDragPayload = {
                  kind: "placement",
                  sourcePalletId: pallet.localId,
                  placementId: placement.id,
                  widthCells: placement.widthCells,
                  depthCells: placement.depthCells,
                };
                event.dataTransfer.setData("application/json", JSON.stringify(payload));
                event.dataTransfer.effectAllowed = "move";
              }}
              className={cn(
                "absolute z-10 flex cursor-grab flex-col justify-between overflow-hidden rounded-lg border p-1 text-left shadow-sm transition hover:scale-[1.02] active:cursor-grabbing",
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                overflow && "border-red-500 bg-red-100 text-red-950",
              )}
              style={{
                left: `${(placement.x / cols) * 100}%`,
                top: `${(placement.y / rows) * 100}%`,
                width: `${(placement.widthCells / cols) * 100}%`,
                height: `${(placement.depthCells / rows) * 100}%`,
                borderColor: overflow ? undefined : tone.borderColor,
                backgroundColor: overflow ? undefined : tone.backgroundColor,
                color: overflow ? undefined : tone.color,
              }}
            >
              <div className="space-y-0.5">
                <p className="truncate text-[10px] font-semibold leading-none">{placement.sku}</p>
                <p className="line-clamp-2 text-[10px] opacity-80">{placement.label}</p>
              </div>
              <div className="flex items-end justify-between gap-1">
                <span className="text-[10px] font-medium">{placement.rotated ? "R" : "N"}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDuplicatePlacement(placement.id);
                    }}
                    className="rounded bg-black/10 p-0.5 hover:bg-black/20"
                    title="Duplicate to nearest open slot"
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRotatePlacement(placement.id);
                    }}
                    className="rounded bg-black/10 p-0.5 hover:bg-black/20"
                  >
                    <RotateCw className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemovePlacement(placement.id);
                    }}
                    className="rounded bg-black/10 p-0.5 hover:bg-black/20"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {cols} x {rows} cells
        </span>
        <span>Drag on empty board space to multi-select placements</span>
        <span>1 cell = {policy.cellSizeMm} mm</span>
      </div>
    </div>
  );
}

export function ShipmentPackingWorkspace({
  orderId,
  orderNo,
  shipmentId,
  shipmentNo,
  buyerName,
  saveMode,
  initialDraftDocument,
  draftSavedAt,
  shipmentContext,
  orderItems,
  lots,
  initialPallets,
}: ShipmentPackingWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canSave = saveMode === "shipment_final" ? Boolean(shipmentId) : Boolean(orderId);
  const recommendedCellSizeMm = useMemo(() => getRecommendedCellSizeMm(orderItems), [orderItems]);
  const initialPolicy = useMemo(
    () => {
      const draftHasPlacements = Boolean(
        initialDraftDocument?.pallets?.some((pallet) => pallet.placements.length > 0 || pallet.partials.length > 0),
      );
      const savedPolicy = initialDraftDocument?.policy ?? readPackingPolicyFromPallets(initialPallets);

      if (!savedPolicy) {
        return { ...DEFAULT_PACKING_POLICY, cellSizeMm: recommendedCellSizeMm };
      }

      if (!draftHasPlacements && initialPallets.length === 0) {
        return {
          ...savedPolicy,
          cellSizeMm: Math.min(savedPolicy.cellSizeMm, recommendedCellSizeMm),
        };
      }

      return savedPolicy;
    },
    [initialDraftDocument?.pallets, initialDraftDocument?.policy, initialPallets, recommendedCellSizeMm],
  );
  const seededInitialPalletCount = useMemo(
    () => estimatePalletCountByCbm(orderItems, initialPolicy),
    [initialPolicy, orderItems],
  );
  const initialDrafts = useMemo(() => {
    if (initialDraftDocument?.pallets) {
      return initialDraftDocument.pallets;
    }

    if (initialPallets.length > 0) {
      return hydratePalletDraftsFromExisting(initialPallets, orderItems, initialPolicy);
    }

    return createDefaultPalletDrafts(
      Math.min(seededInitialPalletCount, INITIAL_SEEDED_PALLET_COUNT),
      initialPolicy,
    );
  }, [initialDraftDocument?.pallets, initialPallets, initialPolicy, orderItems, seededInitialPalletCount]);

  const [policy, setPolicy] = useState<PackingSimulationPolicy>(initialPolicy);
  const [pallets, setPallets] = useState<PackingPalletDraft[]>(initialDrafts);
  const [selectedPalletId, setSelectedPalletId] = useState<string>(initialDrafts[0]?.localId ?? "");
  const [activeLayers, setActiveLayers] = useState<Record<string, number>>({});
  const [visibleLayerCounts, setVisibleLayerCounts] = useState<Record<string, number>>({});
  const [selectedPlacementsByPallet, setSelectedPlacementsByPallet] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [partialDialog, setPartialDialog] = useState<PartialDialogState>({
    open: false,
    itemId: null,
    palletId: initialDrafts[0]?.localId ?? "",
    units: "",
    reason: "",
  });

  useEffect(() => {
    if (!selectedPalletId && pallets[0]) {
      setSelectedPalletId(pallets[0].localId);
    }
  }, [pallets, selectedPalletId]);

  const progressByItem = useMemo(
    () =>
      new Map(orderItems.map((item) => [item.orderItemId, getItemProgress(item, pallets)])),
    [orderItems, pallets],
  );
  const summaries = useMemo(
    () => pallets.map((pallet) => summarizePallet(pallet, shipmentContext, lots, policy, orderItems)),
    [lots, orderItems, pallets, policy, shipmentContext],
  );

  const totalTargetCases = orderItems.reduce((sum, item) => sum + item.packableCaseQty, 0);
  const totalAssignedCases = Array.from(progressByItem.values()).reduce(
    (sum, progress) => sum + progress.assignedCaseQty,
    0,
  );
  const totalAssignedUnits = Array.from(progressByItem.values()).reduce(
    (sum, progress) => sum + progress.assignedUnitQty,
    0,
  );
  const totalTargetUnits = orderItems.reduce((sum, item) => sum + item.packableUnitQty, 0);
  const totalWarnings = summaries.reduce((sum, summary) => sum + summary.warnings.length, 0);
  const hasDuplicatePalletNo =
    new Set(pallets.map((pallet) => pallet.palletNo.trim().toUpperCase())).size !== pallets.length;
  const hasOverpackedItems = Array.from(progressByItem.values()).some((progress) => progress.overpackedUnits > 0);
  const totalGrossWeight = summaries.reduce((sum, summary) => sum + summary.grossWeightKg, 0);
  const hasUnknownGrossWeightData = summaries.some((summary) => summary.hasUnknownGrossWeightData);
  const totalBoxCbm = summaries.reduce((sum, summary) => sum + summary.boxCbmM3, 0);
  const targetBoxCbm = useMemo(() => getTargetBoxCbmM3(orderItems), [orderItems]);
  const estimatedPalletCapacityCbm = useMemo(() => getEstimatedPalletCapacityCbmM3(policy), [policy]);
  const estimatedPalletCount = useMemo(() => estimatePalletCountByCbm(orderItems, policy), [orderItems, policy]);
  const remainingEstimatedPallets = Math.max(estimatedPalletCount - pallets.length, 0);
  const isCbmSeededDraft = !initialDraftDocument && initialPallets.length === 0 && initialDrafts.length > 0;
  const missingGrossWeightLineCount = orderItems.filter((item) => item.product.caseGrossWeightKg === null).length;

  const openPartialDialog = (itemId: string) => {
    setPartialDialog({
      open: true,
      itemId,
      palletId: selectedPalletId || pallets[0]?.localId || "",
      units: "",
      reason: "",
    });
  };

  const addPalletBatch = (count: number) => {
    if (count <= 0) {
      return;
    }

    setMessage(null);
    setErrorMessage(null);
    setPallets((current) => {
      const nextPallets = [...current];
      const nextLayerCounts: Record<string, number> = {};
      const nextSelections: Record<string, string[]> = {};
      let lastAddedId = "";

      for (let index = 0; index < count; index += 1) {
        const next = createEmptyPalletDraft(nextPallets, {
          widthMm: policy.defaultPalletWidthMm,
          depthMm: policy.defaultPalletDepthMm,
        });
        nextPallets.push(next);
        nextLayerCounts[next.localId] = MIN_VISIBLE_LAYER_COUNT;
        nextSelections[next.localId] = [];
        lastAddedId = next.localId;
      }

      if (lastAddedId) {
        setSelectedPalletId(lastAddedId);
      }
      setVisibleLayerCounts((layerCounts) => ({
        ...layerCounts,
        ...nextLayerCounts,
      }));
      setSelectedPlacementsByPallet((existing) => ({
        ...existing,
        ...nextSelections,
      }));
      return nextPallets;
    });
  };

  const addPallet = () => {
    addPalletBatch(1);
  };

  const removePallet = (palletId: string) => {
    setMessage(null);
    setErrorMessage(null);
    setPallets((current) => current.filter((pallet) => pallet.localId !== palletId));
    setActiveLayers((current) => {
      const next = { ...current };
      delete next[palletId];
      return next;
    });
    setVisibleLayerCounts((current) => {
      const next = { ...current };
      delete next[palletId];
      return next;
    });
    setSelectedPlacementsByPallet((current) => {
      const next = { ...current };
      delete next[palletId];
      return next;
    });
    if (selectedPalletId === palletId) {
      const nextSelection = pallets.find((pallet) => pallet.localId !== palletId)?.localId ?? "";
      setSelectedPalletId(nextSelection);
    }
  };

  const updatePallet = (palletId: string, updater: (pallet: PackingPalletDraft) => PackingPalletDraft) => {
    setPallets((current) =>
      current.map((pallet) => (pallet.localId === palletId ? updater(pallet) : pallet)),
    );
  };

  const clearPlacementSelection = (palletId: string) => {
    setSelectedPlacementsByPallet((current) => ({
      ...current,
      [palletId]: [],
    }));
  };

  const handleQuickAddCase = (itemId: string, palletId: string) => {
    const item = orderItems.find((candidate) => candidate.orderItemId === itemId);
    if (!item) {
      return;
    }

    const progress = progressByItem.get(itemId);
    if (!progress || progress.remainingCaseQty <= 0) {
      setErrorMessage("No remaining full cases are available for this line.");
      return;
    }

    let placed = false;
    updatePallet(palletId, (pallet) => {
      const nextPallet = placeCaseOnPallet(pallet, item, policy, {
        preferredLayer: activeLayers[palletId] ?? 0,
      });
      if (!nextPallet) {
        return pallet;
      }
      placed = true;
      return nextPallet;
    });

    setMessage(null);
    setErrorMessage(placed ? null : "No free slot matched the current pallet policy. Create another pallet or adjust limits.");
  };

  const handleFillRowCases = (itemId: string, palletId: string, rotated = false) => {
    const item = orderItems.find((candidate) => candidate.orderItemId === itemId);
    if (!item) {
      return;
    }

    const progress = progressByItem.get(itemId);
    if (!progress || progress.remainingCaseQty <= 0) {
      setErrorMessage("No remaining full cases are available for this line.");
      return;
    }

    const targetLayer = activeLayers[palletId] ?? 0;
    const sourcePallet = pallets.find((pallet) => pallet.localId === palletId);
    const filled = sourcePallet
      ? fillRowOnPallet(sourcePallet, item, targetLayer, policy, progress.remainingCaseQty, {
          rotated,
        })
      : null;

    if (!filled) {
      setErrorMessage(
        rotated
          ? "No horizontal run is available with 90-degree rotation on the current layer."
          : "No horizontal run is available on the current layer for this SKU.",
      );
      return;
    }

    setPallets((current) =>
      current.map((pallet) => (pallet.localId === palletId ? filled.pallet : pallet)),
    );
    setSelectedPlacementsByPallet((current) => ({
      ...current,
      [palletId]: filled.placementIds,
    }));
    setSelectedPalletId(palletId);
    setMessage(
      rotated
        ? `Added ${formatNumber(filled.placementIds.length)} rotated case(s) across Layer ${targetLayer + 1}.`
        : `Added ${formatNumber(filled.placementIds.length)} case(s) across Layer ${targetLayer + 1}.`,
    );
    setErrorMessage(null);
  };

  const handleDropCase = (event: DragEvent<HTMLDivElement>, palletId: string) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/json");

    try {
      const parsed = JSON.parse(payload) as PackingDragPayload | { orderItemId?: string };
      const targetPallet = pallets.find((pallet) => pallet.localId === palletId);
      if (!targetPallet) {
        setErrorMessage("The selected pallet is no longer available.");
        return;
      }

      const targetLayer = activeLayers[palletId] ?? 0;

      if (parsed && "kind" in parsed && parsed.kind === "placement") {
        const targetPosition = getDropGridPosition(event, targetPallet, policy, {
          widthCells: parsed.widthCells,
          depthCells: parsed.depthCells,
        });
        let moved = false;

        setPallets((current) => {
          const next = movePlacementBetweenPallets(
            current,
            parsed.sourcePalletId,
            parsed.placementId,
            palletId,
            {
              layer: targetLayer,
              x: targetPosition.x,
              y: targetPosition.y,
            },
            policy,
          );

          if (!next) {
            return current;
          }

          moved = true;
          return next;
        });

        setSelectedPalletId(palletId);
        setMessage(null);
        setErrorMessage(moved ? null : "This box cannot be moved to that position on the target layer.");
        return;
      }

      const orderItemId = "kind" in parsed ? parsed.orderItemId : parsed.orderItemId;
      if (!orderItemId) {
        throw new Error("missing order item");
      }

      handleQuickAddCase(orderItemId, palletId);
      setSelectedPalletId(palletId);
    } catch {
      setErrorMessage("Could not read the dragged case.");
    }
  };

  const handleDuplicatePlacedCase = (palletId: string, placementId: string) => {
    const pallet = pallets.find((entry) => entry.localId === palletId);
    const placement = pallet?.placements.find((entry) => entry.id === placementId);
    if (!pallet || !placement) {
      setErrorMessage("The selected case is no longer available.");
      return;
    }

    const progress = progressByItem.get(placement.orderItemId);
    if (!progress || progress.remainingCaseQty <= 0) {
      setErrorMessage("No remaining full cases are available for this line.");
      return;
    }

    let duplicated = false;
    updatePallet(palletId, (current) => {
      const nextPallet = duplicatePlacementOnPallet(current, placementId, policy);
      if (!nextPallet) {
        return current;
      }

      duplicated = true;
      return nextPallet;
    });

    setMessage(null);
    setErrorMessage(
      duplicated ? null : "No nearby slot is available for this duplicate on the current layer.",
    );
  };

  const handleDuplicateSelectedPlacementsNearby = (palletId: string) => {
    const placementIds = selectedPlacementsByPallet[palletId] ?? [];
    if (placementIds.length === 0) {
      return;
    }

    const sourcePallet = pallets.find((pallet) => pallet.localId === palletId);
    const duplicated = sourcePallet
      ? duplicatePlacementsNearbyOnLayer(sourcePallet, placementIds, policy)
      : null;

    if (!duplicated) {
      setErrorMessage("The selected layout cannot be copied beside the current selection on this layer.");
      return;
    }

    setPallets((current) =>
      current.map((pallet) => (pallet.localId === palletId ? duplicated.pallet : pallet)),
    );
    setSelectedPlacementsByPallet((current) => ({
      ...current,
      [palletId]: duplicated.placementIds,
    }));
    setMessage(`Copied ${formatNumber(placementIds.length)} selected case(s) beside the current selection.`);
    setErrorMessage(null);
  };

  const handleDeleteSelectedPlacements = (palletId: string) => {
    const placementIds = selectedPlacementsByPallet[palletId] ?? [];
    if (placementIds.length === 0) {
      return;
    }

    const selectedIdSet = new Set(placementIds);
    setPallets((current) =>
      current.map((pallet) =>
        pallet.localId === palletId
          ? {
              ...pallet,
              placements: pallet.placements.filter((placement) => !selectedIdSet.has(placement.id)),
            }
          : pallet,
      ),
    );
    clearPlacementSelection(palletId);
    setMessage(`Removed ${formatNumber(placementIds.length)} selected case(s).`);
    setErrorMessage(null);
  };

  const handleMoveSelectedPlacementsToNextLayer = (
    palletId: string,
    currentLayer: number,
    visibleLayerCount: number,
  ) => {
    const placementIds = selectedPlacementsByPallet[palletId] ?? [];
    if (placementIds.length === 0) {
      return;
    }

    const targetLayer = currentLayer + 1;
    const sourcePallet = pallets.find((pallet) => pallet.localId === palletId);
    const moved = sourcePallet ? movePlacementsToLayer(sourcePallet, placementIds, targetLayer, policy) : null;

    if (!moved) {
      setErrorMessage("The selected layout cannot be moved to the next layer with the current pallet limits.");
      return;
    }

    setPallets((current) =>
      current.map((pallet) => (pallet.localId === palletId ? moved.pallet : pallet)),
    );

    setVisibleLayerCounts((current) => ({
      ...current,
      [palletId]: Math.max(current[palletId] ?? MIN_VISIBLE_LAYER_COUNT, targetLayer + 1, visibleLayerCount),
    }));
    setActiveLayers((current) => ({ ...current, [palletId]: targetLayer }));
    setSelectedPlacementsByPallet((current) => ({
      ...current,
      [palletId]: moved.placementIds,
    }));
    setMessage(`Moved ${formatNumber(placementIds.length)} selected case(s) to Layer ${targetLayer + 1}.`);
    setErrorMessage(null);
  };

  const handleDuplicateSelectedPlacementsToNextLayer = (
    palletId: string,
    currentLayer: number,
    visibleLayerCount: number,
  ) => {
    const placementIds = selectedPlacementsByPallet[palletId] ?? [];
    if (placementIds.length === 0) {
      return;
    }

    const targetLayer = currentLayer + 1;
    const sourcePallet = pallets.find((pallet) => pallet.localId === palletId);
    const duplicated = sourcePallet
      ? duplicatePlacementsToLayer(sourcePallet, placementIds, targetLayer, policy)
      : null;

    if (!duplicated) {
      setErrorMessage("The selected layout cannot be copied to the next layer with the current pallet limits.");
      return;
    }

    setPallets((current) =>
      current.map((pallet) => (pallet.localId === palletId ? duplicated.pallet : pallet)),
    );

    setVisibleLayerCounts((current) => ({
      ...current,
      [palletId]: Math.max(current[palletId] ?? MIN_VISIBLE_LAYER_COUNT, targetLayer + 1, visibleLayerCount),
    }));
    setActiveLayers((current) => ({ ...current, [palletId]: targetLayer }));
    setSelectedPlacementsByPallet((current) => ({
      ...current,
      [palletId]: duplicated.placementIds,
    }));
    setMessage(`Copied ${formatNumber(placementIds.length)} selected case(s) to Layer ${targetLayer + 1}.`);
    setErrorMessage(null);
  };

  const handleReset = () => {
    setPolicy(initialPolicy);
    setPallets(initialDrafts);
    setSelectedPalletId(initialDrafts[0]?.localId ?? "");
    setActiveLayers({});
    setVisibleLayerCounts({});
    setSelectedPlacementsByPallet({});
    setMessage(saveMode === "shipment_final" ? "Reset to the final packing baseline." : "Reset to the saved draft baseline.");
    setErrorMessage(null);
  };

  const handleSave = () => {
    if (!canSave) {
      setErrorMessage("This planner cannot be saved yet.");
      return;
    }

    if (hasDuplicatePalletNo) {
      setErrorMessage("Pallet numbers must be unique before saving.");
      return;
    }

    if (hasOverpackedItems) {
      setErrorMessage("One or more lines exceed the confirmed shipment quantity.");
      return;
    }

    setMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (saveMode === "shipment_final") {
          await saveShipmentPackingPlan({
            shipmentId: shipmentId!,
            policy,
            pallets,
          });
          setMessage("Final packing plan saved.");
        } else {
          await saveOrderPackingDraft({
            orderId,
            policy,
            pallets,
          });
          setMessage("Packing draft saved.");
        }
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save packing workspace.");
      }
    });
  };

  const handleSubmitPartial = () => {
    if (!partialDialog.itemId || !partialDialog.palletId) {
      setErrorMessage("Select a pallet before adding loose units.");
      return;
    }

    const item = orderItems.find((candidate) => candidate.orderItemId === partialDialog.itemId);
    const progress = partialDialog.itemId ? progressByItem.get(partialDialog.itemId) : null;
    const units = Number(partialDialog.units);
    const reason = partialDialog.reason.trim();

    if (!item || !progress) {
      setErrorMessage("The selected line is not available anymore.");
      return;
    }

    if (!Number.isFinite(units) || units <= 0) {
      setErrorMessage("Loose units must be greater than zero.");
      return;
    }

    if (units > progress.remainingUnitQty) {
      setErrorMessage("Loose units exceed the remaining confirmed quantity.");
      return;
    }

    if (!reason) {
      setErrorMessage("A reason is required for partial-case shipments.");
      return;
    }

    updatePallet(partialDialog.palletId, (pallet) => ({
      ...pallet,
      partials: [
        ...pallet.partials,
        {
          id: generateLocalId("partial"),
          orderItemId: item.orderItemId,
          productId: item.product.productId,
          sku: item.product.sku,
          label: item.product.name,
          units,
          unitsPerCase: item.product.unitsPerCase,
          unitGrossWeightKg: getUnitGrossWeightKg(item),
          unitNetWeightKg: getUnitNetWeightKg(item),
          unitCbmM3: getUnitCbmM3(item),
          reason,
        },
      ],
    }));

    setPartialDialog({
      open: false,
      itemId: null,
      palletId: "",
      units: "",
      reason: "",
    });
    setMessage("Loose units were added to the pallet.");
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cases planned</CardDescription>
            <CardTitle>{formatNumber(totalAssignedCases)} / {formatNumber(totalTargetCases)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Units planned</CardDescription>
            <CardTitle>{formatNumber(totalAssignedUnits)} / {formatNumber(totalTargetUnits)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total gross weight</CardDescription>
            <CardTitle>{formatWeightLabel(totalGrossWeight, hasUnknownGrossWeightData)}</CardTitle>
            {hasUnknownGrossWeightData ? (
              <CardDescription>One or more packed lines are missing gross-weight data.</CardDescription>
            ) : null}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>CBM (planned / target)</CardDescription>
            <CardTitle>
              {formatCbm(totalBoxCbm)} / {formatCbm(targetBoxCbm)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pallets (planned / estimated)</CardDescription>
            <CardTitle>
              {formatNumber(pallets.length)} / {formatNumber(estimatedPalletCount)}
            </CardTitle>
            <CardDescription>Based on {formatCbm(estimatedPalletCapacityCbm)} CBM per pallet</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Packing Simulation Policy</CardTitle>
            <CardDescription>
              Tune safety rules for heavy boxes, pallet gross weight, and stack height before finalizing the layout.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleReset} disabled={isPending}>
              Reset
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending || !canSave}>
              <Save className="size-4" />
              {isPending ? "Saving..." : saveMode === "shipment_final" ? "Save final plan" : "Save draft"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <PolicyField
            label="Cell size"
            value={policy.cellSizeMm}
            suffix="mm"
            onChange={(value) => setPolicy((current) => ({ ...current, cellSizeMm: value }))}
          />
          <PolicyField
            label="Default width"
            value={policy.defaultPalletWidthMm}
            suffix="mm"
            onChange={(value) => setPolicy((current) => ({ ...current, defaultPalletWidthMm: value }))}
          />
          <PolicyField
            label="Default depth"
            value={policy.defaultPalletDepthMm}
            suffix="mm"
            onChange={(value) => setPolicy((current) => ({ ...current, defaultPalletDepthMm: value }))}
          />
          <PolicyField
            label="Gross weight cap"
            value={policy.maxPalletGrossWeightKg}
            suffix="kg"
            onChange={(value) => setPolicy((current) => ({ ...current, maxPalletGrossWeightKg: value }))}
          />
          <PolicyField
            label="Heavy case threshold"
            value={policy.heavyBoxWeightThresholdKg}
            suffix="kg"
            onChange={(value) => setPolicy((current) => ({ ...current, heavyBoxWeightThresholdKg: value }))}
          />
          <PolicyField
            label="Recommended height"
            value={policy.recommendedMaxHeightMm}
            suffix="mm"
            onChange={(value) => setPolicy((current) => ({ ...current, recommendedMaxHeightMm: value }))}
          />
        </CardContent>
      </Card>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {errorMessage}
        </div>
      ) : null}
      {totalWarnings > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {formatNumber(totalWarnings)} warning(s) detected across the current pallet plan. Review highlighted pallets before confirming packing.
        </div>
      ) : null}
      {missingGrossWeightLineCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Gross-weight data is missing on {formatNumber(missingGrossWeightLineCount)} line(s). Weight-based pallet warnings and totals stay incomplete until product logistics is updated.
        </div>
      ) : null}
      {saveMode === "shipment_final" && initialDraftDocument && initialPallets.length === 0 ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Final shipment packing was seeded from the saved order draft.
          {formatDateTime(draftSavedAt ?? null) ? ` Draft last saved ${formatDateTime(draftSavedAt ?? null)}.` : ""}
        </div>
      ) : null}
      {saveMode === "order_draft" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This is the pre-shipment draft stage. Plan pallet count and layout now, then promote it into final shipment packing after a shipment is created.
          {formatDateTime(draftSavedAt ?? null) ? ` Last saved ${formatDateTime(draftSavedAt ?? null)}.` : ""}
        </div>
      ) : null}
      {isCbmSeededDraft ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p>
                Estimated {formatNumber(estimatedPalletCount)} pallets from {formatCbm(targetBoxCbm)} target CBM.
              </p>
              <p className="text-sky-900/80">
                Started with {formatNumber(initialDrafts.length)} empty pallet to reduce initial clutter.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {remainingEstimatedPallets > 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={() => addPalletBatch(1)}>
                  Add 1 pallet
                </Button>
              ) : null}
              {remainingEstimatedPallets > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addPalletBatch(Math.min(5, remainingEstimatedPallets))}
                >
                  Add {formatNumber(Math.min(5, remainingEstimatedPallets))} pallets
                </Button>
              ) : null}
              {remainingEstimatedPallets > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addPalletBatch(remainingEstimatedPallets)}
                >
                  Add remaining {formatNumber(remainingEstimatedPallets)}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-6 xl:h-[calc(100vh-9rem)]">
          <CardHeader>
            <CardTitle>Packable Queue</CardTitle>
            <CardDescription>
              {shipmentNo ? `Shipment ${shipmentNo}` : `Order ${orderNo}`} for {buyerName ?? shipmentContext.buyerName ?? "-"}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 pb-0">
            <ScrollArea className="h-[calc(100vh-17rem)] pr-4">
              <div className="space-y-3 pb-6">
                {orderItems.map((item) => {
                  const progress = progressByItem.get(item.orderItemId)!;
                  const logisticsMissing =
                    item.product.caseLengthCm === null ||
                    item.product.caseWidthCm === null ||
                    item.product.caseHeightCm === null;
                  const weightMissing = item.product.caseGrossWeightKg === null;

                  return (
                    <div key={item.orderItemId} className="rounded-xl border p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Line {item.lineNo}</p>
                            <p className="text-sm font-semibold">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {progress.overpackedUnits > 0 ? (
                              <Badge variant="destructive">Overpacked</Badge>
                            ) : logisticsMissing ? (
                              <Badge variant="outline">Need dimensions</Badge>
                            ) : weightMissing ? (
                              <Badge variant="outline">Need weight</Badge>
                            ) : (
                              <Badge variant="outline">Ready</Badge>
                            )}
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              onClick={() => handleQuickAddCase(item.orderItemId, selectedPalletId)}
                              disabled={!selectedPalletId || progress.remainingCaseQty <= 0}
                              aria-label={`Add 1 case of ${item.product.sku || item.product.name} to selected pallet`}
                              title="Add 1 case to selected pallet"
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">Target {formatNumber(item.packableCaseQty)} cases</Badge>
                          <Badge variant="outline">Remaining {formatNumber(progress.remainingCaseQty)} cases</Badge>
                          {progress.remainingLooseUnitQty > 0 ? (
                            <Badge variant="outline">{formatNumber(progress.remainingLooseUnitQty)} loose pcs</Badge>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <p>
                            Size (W × D × H):{" "}
                            {item.product.caseLengthCm && item.product.caseWidthCm && item.product.caseHeightCm
                              ? `${item.product.caseLengthCm} × ${item.product.caseWidthCm} × ${item.product.caseHeightCm} cm`
                              : "TBD"}
                          </p>
                          <p>Gross: {weightMissing ? "Unknown" : `${item.product.caseGrossWeightKg} kg/case`}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            draggable={progress.remainingCaseQty > 0}
                            onDragStart={(event) => {
                              const payload: PackingDragPayload = {
                                kind: "queue_case",
                                orderItemId: item.orderItemId,
                              };
                              event.dataTransfer.setData(
                                "application/json",
                                JSON.stringify(payload),
                              );
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            disabled={progress.remainingCaseQty <= 0}
                          >
                            <LayoutPanelTop className="size-4" />
                            Drag case
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleQuickAddCase(item.orderItemId, selectedPalletId)}
                            disabled={!selectedPalletId || progress.remainingCaseQty <= 0}
                          >
                            <PackageCheck className="size-4" />
                            Add to selected
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleFillRowCases(item.orderItemId, selectedPalletId)}
                            disabled={!selectedPalletId || progress.remainingCaseQty <= 0}
                          >
                            Fill row
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleFillRowCases(item.orderItemId, selectedPalletId, true)}
                            disabled={!selectedPalletId || progress.remainingCaseQty <= 0}
                          >
                            <RotateCw className="size-4" />
                            Fill row 90°
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openPartialDialog(item.orderItemId)}
                            disabled={!selectedPalletId || progress.remainingUnitQty <= 0}
                          >
                            Loose units
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Pallet Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Destination {shipmentContext.destinationCode ?? shipmentContext.destinationName ?? "TBD"}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addPallet}>
              <Boxes className="size-4" />
              Add pallet
            </Button>
          </div>

          {pallets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Boxes}
                  title="No pallets planned yet"
                  description="Create the first pallet manually to start planning the load."
                />
                <div className="mt-4 flex justify-center">
                  <Button type="button" variant="outline" onClick={addPallet}>
                    Add pallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            pallets.map((pallet, index) => {
              const summary = summaries[index];
              const currentLayer = activeLayers[pallet.localId] ?? 0;
              const visibleLayerCount = visibleLayerCounts[pallet.localId] ?? MIN_VISIBLE_LAYER_COUNT;
              const placementIdSet = new Set(pallet.placements.map((placement) => placement.id));
              const selectedPlacementIds = (selectedPlacementsByPallet[pallet.localId] ?? []).filter((placementId) =>
                placementIdSet.has(placementId),
              );
              const layerOverview = getPalletLayerOverview(pallet, currentLayer, policy);
              const cbmFillPercent =
                summary.palletCbmM3 > 0 ? (summary.boxCbmM3 / summary.palletCbmM3) * 100 : 0;

              return (
                <Card
                  key={pallet.localId}
                  className={cn(
                    "border-2 transition",
                    selectedPalletId === pallet.localId ? "border-primary" : "border-transparent",
                  )}
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{pallet.palletNo}</CardTitle>
                        <CardDescription>{summary.shippingMark}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {summary.hasUnknownGrossWeightData ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                            <AlertTriangle className="size-3" />
                            Weight data missing
                          </Badge>
                        ) : summary.warnings.length > 0 ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                            <AlertTriangle className="size-3" />
                            {summary.warnings.length} warning(s)
                          </Badge>
                        ) : (
                          <Badge variant="outline">Stable</Badge>
                        )}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removePallet(pallet.localId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="grid gap-2">
                        <Label>Pallet no.</Label>
                        <Input
                          value={pallet.palletNo}
                          onFocus={() => setSelectedPalletId(pallet.localId)}
                          onChange={(event) =>
                            updatePallet(pallet.localId, (current) => ({
                              ...current,
                              palletNo: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Width (mm)</Label>
                        <Input
                          type="number"
                          value={pallet.widthMm}
                          onFocus={() => setSelectedPalletId(pallet.localId)}
                          onChange={(event) =>
                            updatePallet(pallet.localId, (current) => ({
                              ...current,
                              widthMm: Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Depth (mm)</Label>
                        <Input
                          type="number"
                          value={pallet.depthMm}
                          onFocus={() => setSelectedPalletId(pallet.localId)}
                          onChange={(event) =>
                            updatePallet(pallet.localId, (current) => ({
                              ...current,
                              depthMm: Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Actual height (mm)</Label>
                        <Input
                          type="number"
                          value={pallet.heightMm ?? summary.estimatedHeightMm}
                          onFocus={() => setSelectedPalletId(pallet.localId)}
                          onChange={(event) =>
                            updatePallet(pallet.localId, (current) => ({
                              ...current,
                              heightMm: Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div
                      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
                      onClick={() => setSelectedPalletId(pallet.localId)}
                    >
                      <PalletBoard
                        pallet={pallet}
                        currentLayer={currentLayer}
                        policy={policy}
                        visibleLayerCount={visibleLayerCount}
                        selectedPlacementIds={selectedPlacementIds}
                        onLayerChange={(layer) => {
                          setActiveLayers((current) => ({ ...current, [pallet.localId]: layer }));
                          clearPlacementSelection(pallet.localId);
                        }}
                        onAddLayer={() => {
                          const nextLayer = visibleLayerCount;
                          setVisibleLayerCounts((current) => ({
                            ...current,
                            [pallet.localId]: visibleLayerCount + 1,
                          }));
                          setActiveLayers((current) => ({ ...current, [pallet.localId]: nextLayer }));
                          clearPlacementSelection(pallet.localId);
                        }}
                        onSelectionChange={(placementIds) =>
                          setSelectedPlacementsByPallet((current) => ({
                            ...current,
                            [pallet.localId]: placementIds,
                          }))
                        }
                        onDropCase={(event) => handleDropCase(event, pallet.localId)}
                        onDuplicatePlacement={(placementId) =>
                          handleDuplicatePlacedCase(pallet.localId, placementId)
                        }
                        onRotatePlacement={(placementId) =>
                          updatePallet(pallet.localId, (current) =>
                            rotatePlacementOnPallet(current, placementId, orderItems, policy),
                          )
                        }
                        onRemovePlacement={(placementId) =>
                          updatePallet(pallet.localId, (current) => ({
                            ...current,
                            placements: current.placements.filter((placement) => placement.id !== placementId),
                          }))
                        }
                      />

                      <div className="space-y-3">
                        {selectedPlacementIds.length > 0 ? (
                          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">Selection actions</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(selectedPlacementIds.length)} case(s) selected on Layer {currentLayer + 1}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => clearPlacementSelection(pallet.localId)}
                              >
                                Clear
                              </Button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDuplicateSelectedPlacementsNearby(pallet.localId)}
                              >
                                Copy beside
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleMoveSelectedPlacementsToNextLayer(
                                    pallet.localId,
                                    currentLayer,
                                    visibleLayerCount,
                                  )
                                }
                              >
                                Move to Layer {currentLayer + 2}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDuplicateSelectedPlacementsToNextLayer(
                                    pallet.localId,
                                    currentLayer,
                                    visibleLayerCount,
                                  )
                                }
                              >
                                Copy to Layer {currentLayer + 2}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSelectedPlacements(pallet.localId)}
                              >
                                Delete selected
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-xl border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">Layer load overview</p>
                              <p className="text-xs text-muted-foreground">
                                All active layers, predicted weight, and current pallet fill status
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-semibold">{formatNumber(layerOverview.usagePercent, 1)}%</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(layerOverview.occupiedCells)} / {formatNumber(layerOverview.totalCells)} cells
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-[width]"
                              style={{ width: `${Math.min(layerOverview.usagePercent, 100)}%` }}
                            />
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">Total gross weight</p>
                              <p className="font-medium">
                                {formatWeightLabel(summary.grossWeightKg, summary.hasUnknownGrossWeightData)}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">Total box CBM</p>
                              <p className="font-medium">{formatCbm(summary.boxCbmM3)}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">CBM fill</p>
                              <p className="font-medium">{formatNumber(cbmFillPercent, 1)}%</p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">Layers in use</p>
                              <p className="font-medium">{formatNumber(layerOverview.layers.length)}</p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            {layerOverview.layers.map((layer) => (
                              <div
                                key={`${pallet.localId}-layer-${layer.layer}`}
                                className={cn(
                                  "rounded-lg border px-3 py-3",
                                  layer.isCurrent ? "border-primary/40 bg-primary/5" : "bg-muted/20",
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={layer.isCurrent ? "default" : "outline"}>
                                      Layer {layer.layer + 1}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatNumber(layer.caseCount)} cases
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">{formatNumber(layer.usagePercent, 1)}%</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {formatNumber(layer.occupiedCells)} / {formatNumber(layer.totalCells)} cells
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-[width]",
                                      layer.isCurrent ? "bg-primary" : "bg-slate-400",
                                    )}
                                    style={{ width: `${Math.min(layer.usagePercent, 100)}%` }}
                                  />
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                  <div className="rounded-md border bg-background px-2 py-2">
                                    <p className="text-muted-foreground">Weight</p>
                                    <p className="font-medium">
                                      {formatWeightLabel(layer.grossWeightKg, summary.hasUnknownGrossWeightData)}
                                    </p>
                                  </div>
                                  <div className="rounded-md border bg-background px-2 py-2">
                                    <p className="text-muted-foreground">CBM</p>
                                    <p className="font-medium">{formatCbm(layer.boxCbmM3)}</p>
                                  </div>
                                  <div className="rounded-md border bg-background px-2 py-2">
                                    <p className="text-muted-foreground">Height</p>
                                    <p className="font-medium">{formatNumber(layer.estimatedHeightMm)} mm</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {layerOverview.partialGrossWeightKg > 0 || layerOverview.partialCbmM3 > 0 ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                              Loose-unit entries add {formatNumber(layerOverview.partialGrossWeightKg, 1)} kg and{" "}
                              {formatCbm(layerOverview.partialCbmM3)} CBM outside the per-layer bars.
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-2 rounded-xl border bg-muted/30 p-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Cases</span>
                            <span className="font-medium">{formatNumber(summary.caseCount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Gross / Net</span>
                            <span className="font-medium">
                              {summary.hasUnknownGrossWeightData
                                ? "Unknown"
                                : `${formatNumber(summary.grossWeightKg, 1)} / ${formatNumber(summary.netWeightKg, 1)} kg`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Pallet / Box CBM</span>
                            <span className="font-medium">
                              {formatCbm(summary.palletCbmM3)} / {formatCbm(summary.boxCbmM3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Expiry span</span>
                            <span className="font-medium">
                              {formatDate(summary.earliestExpiryDate)} - {formatDate(summary.latestExpiryDate)}
                            </span>
                          </div>
                        </div>

                        {pallet.partials.length > 0 ? (
                          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-950">Loose-unit entries</p>
                            <div className="space-y-2">
                              {pallet.partials.map((partial) => (
                                <div
                                  key={partial.id}
                                  className="flex items-start justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">{partial.sku}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatNumber(partial.units)} pcs · {partial.reason}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() =>
                                      updatePallet(pallet.localId, (current) => ({
                                        ...current,
                                        partials: current.partials.filter((entry) => entry.id !== partial.id),
                                      }))
                                    }
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {summary.warnings.length > 0 ? (
                          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                            {summary.warnings.map((warning) => (
                              <div key={warning} className="flex gap-2">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                <span>{warning}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={pallet.notes}
                        onFocus={() => setSelectedPalletId(pallet.localId)}
                        onChange={(event) =>
                          updatePallet(pallet.localId, (current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Inspection notes, stack guidance, or packing exceptions"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {summaries.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Lot Allocation Preview</CardTitle>
                <CardDescription>
                  FIFO allocation is derived from current inventory lots and stored into shipment pallet items on save.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summaries.map((summary) => (
                  <div key={summary.palletNo} className="rounded-xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{summary.palletNo}</p>
                        <p className="text-xs text-muted-foreground">{summary.shippingMark}</p>
                      </div>
                      <div className="flex gap-2">
                        {summary.partialCaseCount > 0 ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                            Partial included
                          </Badge>
                        ) : null}
                        {summary.manualOverrideCount > 0 ? (
                          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-900">
                            Manual override
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {summary.groupedAllocations.map((group) => (
                        <div key={group.orderItemId} className="rounded-lg border bg-muted/20 p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{group.productName}</p>
                              <p className="text-xs text-muted-foreground">{group.sku}</p>
                            </div>
                            <Badge variant="outline">
                              {formatNumber(group.packedCaseQty)} cases / {formatNumber(group.packedUnitQty)} pcs
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {group.allocations.map((allocation, allocationIndex) => (
                              <div
                                key={`${group.orderItemId}-${allocationIndex}`}
                                className="grid gap-2 rounded-lg bg-white px-3 py-2 text-sm md:grid-cols-[1.2fr_repeat(4,0.8fr)]"
                              >
                                <div>
                                  <p className="font-medium">{allocation.lotNo ?? "Manual override"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {allocation.warehouseCode ?? "No lot"} · {formatDate(allocation.expiryDate)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Cases</p>
                                  <p>{formatNumber(allocation.packedCaseQty)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Units</p>
                                  <p>{formatNumber(allocation.packedUnitQty)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Type</p>
                                  <p>{allocation.isPartialCase ? "Partial" : "Full case"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  <p>{allocation.manualOverride ? "Review" : "OK"}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog
        open={partialDialog.open}
        onOpenChange={(open) =>
          setPartialDialog((current) => ({
            ...current,
            open,
          }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add loose units</DialogTitle>
            <DialogDescription>
              Use this when a line is packed as an opened case. The units still count against the confirmed shipment quantity.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Pallet</Label>
              <Select
                value={partialDialog.palletId}
                onValueChange={(value) =>
                  setPartialDialog((current) => ({
                    ...current,
                    palletId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pallet" />
                </SelectTrigger>
                <SelectContent>
                  {pallets.map((pallet) => (
                    <SelectItem key={pallet.localId} value={pallet.localId}>
                      {pallet.palletNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Loose units</Label>
              <Input
                type="number"
                value={partialDialog.units}
                onChange={(event) =>
                  setPartialDialog((current) => ({
                    ...current,
                    units: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Reason</Label>
              <Textarea
                value={partialDialog.reason}
                onChange={(event) =>
                  setPartialDialog((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="Example: broken master carton, mixed shelf-life consolidation"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPartialDialog((current) => ({ ...current, open: false }))}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitPartial}>
              Add loose units
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
