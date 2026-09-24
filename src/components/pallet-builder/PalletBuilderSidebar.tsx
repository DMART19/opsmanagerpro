import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Package,
  Boxes,
  Ruler,
  Weight,
  ChevronDown,
  ChevronUp,
  Check,
  Box,
  Plus,
  Minus,
  Save,
  Trash2,
  LayoutGrid,
  FileDown,
  Circle,
  GripVertical,
} from "lucide-react";
import { CustomPallet } from "@/hooks/use-custom-pallets";
import { PalletConfig } from "@/pages/PalletBuilder";
import { PalletLibraryItem } from "@/types/pallet-builder";
import { cn } from "@/lib/utils";
import { usePalletSidebarCollapse } from "@/pages/PalletBuilder";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreateCustomPalletModal } from "./CreateCustomPalletModal";
import { ReviewSaveBlock } from "./ReviewSaveBlock";

interface PalletBuilderSidebarProps {
  palletTypes: CustomPallet[];
  selectedPallet: PalletConfig | null;
  onSelectPallet: (pallet: PalletConfig) => void;
  libraryItems: PalletLibraryItem[];
  loadingPallets: boolean;
  loadingItems: boolean;
  /** Map of libraryItem.id -> number of times placed on current pallet */
  assignmentCounts?: Record<string, number>;
  onCreatePallet: (pallet: {
    name: string;
    width: number;
    length: number;
    height?: number;
    max_weight: number;
    pallet_type: string;
  }) => Promise<any>;
  savedBuildsSlot?: React.ReactNode;
  onClickPlace?: (item: PalletLibraryItem) => void;
  /** Remove a single placed instance of an item (last-in wins). */
  onRemoveOneOfItem?: (item: PalletLibraryItem) => void;
  clickPlaceActive?: boolean;
  hasItems: boolean;
  isSaved: boolean;
  onSaveClick?: () => void;
  onExport?: () => void;
  onClearAll?: () => void;
  onSmartLayout?: () => void;
  canSave?: boolean;
  activeBuildName?: string | null;
  isDirty?: boolean;
  onOverwrite?: () => void;
  /**
   * When set, the sidebar renders ONLY that section in a mobile-optimized
   * presentation (no outer h-full wrapper, no surrounding chrome).
   * Used by the < lg mobile branch of `<PalletBuilder>` to compose the
   * page in a custom order. Leave undefined on desktop.
   */
  mobileSection?: "pallet" | "items" | "review";
  /**
   * Optional validation rows to surface in the review block (mobile only).
   */
  reviewValidation?: { label: string; pass: boolean }[];
  /**
   * Signal counter from the parent to force-open the mobile pallet picker
   * (e.g. when the user tries to add an item before choosing a pallet).
   * Any change to this number re-opens the picker.
   */
  forcePalletPickerSignal?: number;
}

// --- helpers ---
const hasValidDimensions = (item: PalletLibraryItem): boolean =>
  Number(item.length) > 0 && Number(item.width) > 0 && Number(item.height) > 0;

const hasValidWeight = (item: PalletLibraryItem): boolean =>
  Number(item.weight) > 0;

const isPalletReady = (item: PalletLibraryItem): boolean =>
  hasValidDimensions(item) && hasValidWeight(item);

// --- Library item card ---
const LibraryItemCard = ({
  item,
  onClickPlace,
  onRemoveOne,
  assigned = 0,
}: {
  item: PalletLibraryItem;
  onClickPlace?: (item: PalletLibraryItem) => void;
  onRemoveOne?: (item: PalletLibraryItem) => void;
  clickPlaceActive?: boolean;
  assigned?: number;
}) => {
  const qty = item.quantityAvailable ?? null;
  const remaining = qty !== null ? Math.max(0, qty - assigned) : null;
  const allAssigned = qty !== null && remaining === 0 && qty > 0;
  const canAddMore = qty === null || remaining! > 0;

  return (
    <div
      className={cn(
        "group relative rounded-md border cursor-grab",
        "transition-colors hover:border-primary/40",
        "active:cursor-grabbing",
        assigned > 0
          ? // Stronger selected state — left accent + tinted background
            "bg-primary/[0.06] border-primary/30 border-l-4 border-l-primary hover:bg-primary/[0.09]"
          : "bg-card hover:bg-accent/30"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(item));
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <div className="flex items-center gap-2 px-2 py-2.5 lg:py-1.5 min-w-0">
        <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 hidden lg:block" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-sm lg:text-[12.5px] leading-tight line-clamp-2 lg:line-clamp-1 lg:truncate">
              {item.name}
            </span>
            {item.fragile && (
              <Badge variant="destructive" className="text-[9px] h-3.5 px-1 shrink-0">
                Fragile
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground tabular-nums truncate">
            {qty !== null && (
              <span>
                Available <span className="text-foreground font-medium">{qty}</span>
              </span>
            )}
            {hasValidWeight(item) && (
              <>
                {qty !== null && <span className="opacity-40">•</span>}
                <span>{item.weight} lbs</span>
              </>
            )}
            {item.category && (
              <>
                {(qty !== null || hasValidWeight(item)) && <span className="opacity-40">•</span>}
                <span className="truncate">{item.category}</span>
              </>
            )}
          </div>
          {assigned > 0 && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
              <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                Assigned {assigned}
              </Badge>
              {remaining !== null && (
                <span
                  className={cn(
                    "text-[10px]",
                    allAssigned ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  Remaining {remaining}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Quantity stepper — easier for warehouse users than a single Add button */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 lg:h-7 lg:w-7 p-0 text-muted-foreground hover:text-foreground touch-manipulation active:scale-95 transition-transform"
            disabled={assigned <= 0}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveOne?.(item);
            }}
            aria-label="Remove one"
          >
            <Minus className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
          </Button>
          <span className="text-base lg:text-xs font-semibold tabular-nums w-8 lg:w-5 text-center">
            {assigned}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 lg:h-7 lg:w-7 p-0 text-primary hover:bg-primary/10 touch-manipulation active:scale-95 transition-transform"
            disabled={!canAddMore}
            onClick={(e) => {
              e.stopPropagation();
              onClickPlace?.(item);
            }}
            aria-label="Add one"
          >
            <Plus className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Step Section Header ---
const StepHeader = ({
  step,
  title,
  completed,
  active,
  open,
  disabled,
  collapsible = true,
}: {
  step: number;
  title: string;
  completed: boolean;
  active: boolean;
  open: boolean;
  disabled?: boolean;
  collapsible?: boolean;
}) => (
  <div className="flex items-center justify-between w-full">
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200",
          completed
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : active
            ? "bg-primary/15 text-primary ring-1.5 ring-primary/30"
            : "bg-muted text-muted-foreground/40"
        )}
      >
        {completed ? <Check className="h-3 w-3" /> : step}
      </div>
      <span
        className={cn(
          "text-[13px] font-semibold leading-tight transition-colors",
          disabled ? "text-muted-foreground/40" : "text-foreground"
        )}
      >
        {title}
      </span>
    </div>
    {collapsible && (
      open ? (
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      )
    )}
  </div>
);

// --- Build Progress ---
const BuildProgress = ({
  palletSelected,
  itemsAdded,
  saved,
}: {
  palletSelected: boolean;
  itemsAdded: boolean;
  saved: boolean;
}) => {
  const steps = [
    { label: "Pallet", done: palletSelected },
    { label: "Items", done: itemsAdded },
    { label: "Saved", done: saved },
  ];

  return (
    <div className="px-4 py-2.5 border-b border-border/40 bg-background/60 shrink-0">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {s.done ? (
              <Check className="h-3 w-3 text-primary" />
            ) : (
              <Circle className="h-3 w-3 text-muted-foreground/25" />
            )}
            <span
              className={cn(
                "text-[11px] transition-colors",
                s.done
                  ? "text-foreground font-medium"
                  : "text-muted-foreground/40"
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-4 h-px bg-border/40 ml-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PalletBuilderSidebar = ({
  palletTypes,
  selectedPallet,
  onSelectPallet,
  libraryItems,
  loadingPallets,
  loadingItems,
  assignmentCounts = {},
  onCreatePallet,
  savedBuildsSlot,
  onClickPlace,
  onRemoveOneOfItem,
  clickPlaceActive,
  hasItems,
  isSaved,
  onSaveClick,
  onExport,
  onClearAll,
  onSmartLayout,
  canSave,
  activeBuildName,
  isDirty,
  onOverwrite,
  mobileSection,
  reviewValidation,
  forcePalletPickerSignal,
}: PalletBuilderSidebarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  // Pallet picker collapses to a compact summary once a pallet is chosen.
  const [palletPickerOpen, setPalletPickerOpen] = useState<boolean>(!selectedPallet);
  const [itemsSectionOpen, setItemsSectionOpen] = useState(true);
  const [reviewSectionOpen, setReviewSectionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search when a pallet is first selected.
  useEffect(() => {
    if (selectedPallet && !hasItems) {
      setTimeout(() => searchInputRef.current?.focus(), 220);
    }
    // Auto-collapse picker when a pallet is selected (frees vertical space).
    if (selectedPallet) setPalletPickerOpen(false);
  }, [selectedPallet?.id]);

  // Parent can request the picker to pop open (mobile flow: tapping + before
  // a pallet is chosen should surface the picker, not throw a toast).
  useEffect(() => {
    if (forcePalletPickerSignal && forcePalletPickerSignal > 0) {
      setPalletPickerOpen(true);
    }
  }, [forcePalletPickerSignal]);

  // Filter library items
  const filteredItems = useMemo(() => {
    let items = libraryItems;
    if (activeTab === "containers") {
      items = items.filter((i) => i.source === "container");
    } else if (activeTab !== "all") {
      items = items.filter(
        (i) => i.source === "item" && (i.category || "Uncategorized") === activeTab
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.subtitle?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [libraryItems, activeTab, searchTerm]);

  const handlePalletSelect = (pallet: CustomPallet) => {
    onSelectPallet({
      id: pallet.id,
      name: pallet.name,
      width: pallet.width,
      length: pallet.length,
      maxWeight: pallet.max_weight,
    });
  };

  const itemCount = libraryItems.filter((i) => i.source === "item").length;
  const containerCount = libraryItems.filter(
    (i) => i.source === "container"
  ).length;

  // Category counts (items only), sorted desc, top 4
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of libraryItems) {
      if (it.source !== "item") continue;
      const key = it.category || "Uncategorized";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [libraryItems]);

  const step1Complete = !!selectedPallet;
  const step2Complete = hasItems;
  const step3Complete = isSaved;

  // ──────────────────────────────────────────────────────────────────
  // MOBILE EARLY-RETURNS
  // The < lg page composes the workflow as separate cards (Pallet →
  // Add Items → Review). Each call renders ONE focused section.
  // No outer h-full, no BuildProgress, no SavedBuilds slot here.
  // ──────────────────────────────────────────────────────────────────
  if (mobileSection === "pallet") {
    return (
      <>
        <div className="rounded-2xl border bg-card border-border overflow-hidden">
          {selectedPallet && !palletPickerOpen ? (
            <div className="px-3.5 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-sm shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium leading-none">
                    Selected Pallet
                  </div>
                  <div className="text-sm font-semibold truncate leading-tight mt-0.5">
                    {selectedPallet.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums truncate">
                    {selectedPallet.width}" × {selectedPallet.length}" · {selectedPallet.maxWeight.toLocaleString()} lbs
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs shrink-0"
                onClick={() => setPalletPickerOpen(true)}
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              <div className="px-3.5 pt-3 pb-1 flex items-center justify-between">
                <span className="text-sm font-semibold">Choose Pallet Size</span>
                {selectedPallet && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setPalletPickerOpen(false)}
                  >
                    Done
                  </Button>
                )}
              </div>
              <div className="px-3.5 pb-3 pt-1 max-h-[55vh] overflow-y-auto scrollbar-thin space-y-2">
                {loadingPallets ? (
                  [0, 1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
                  ))
                ) : (
                  <>
                    {palletTypes.filter((p) => p.id.startsWith("builtin-")).length > 0 && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-0.5">
                          Standard
                        </p>
                        {palletTypes
                          .filter((p) => p.id.startsWith("builtin-"))
                          .map((pallet) => {
                            const isSelected = selectedPallet?.id === pallet.id;
                            return (
                              <button
                                key={pallet.id}
                                onClick={() => {
                                  handlePalletSelect(pallet);
                                  setPalletPickerOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg border transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{pallet.name}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums truncate">
                                      {pallet.width}" × {pallet.length}" · {pallet.max_weight.toLocaleString()} lbs
                                    </div>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                              </button>
                            );
                          })}
                      </>
                    )}
                    {palletTypes.filter((p) => !p.id.startsWith("builtin-")).length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-0.5">
                          Custom
                        </p>
                        {palletTypes
                          .filter((p) => !p.id.startsWith("builtin-"))
                          .map((pallet) => {
                            const isSelected = selectedPallet?.id === pallet.id;
                            return (
                              <button
                                key={pallet.id}
                                onClick={() => {
                                  handlePalletSelect(pallet);
                                  setPalletPickerOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg border transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{pallet.name}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums truncate">
                                      {pallet.width}" × {pallet.length}" · {pallet.max_weight.toLocaleString()} lbs
                                    </div>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                              </button>
                            );
                          })}
                      </>
                    )}
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="w-full text-left p-3 rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-all group"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">Create Custom Size</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <CreateCustomPalletModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSave={onCreatePallet}
        />
      </>
    );
  }

  if (mobileSection === "items") {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-card rounded-2xl border border-border/60",
          // Internal scrolling so the outer page doesn't grow with inventory size
          "max-h-[480px] sm:max-h-[55vh] md:max-h-[60vh]",
          !step1Complete && "opacity-50 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-3.5 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Boxes className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">Add Items & Containers</span>
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
            {libraryItems.length} avail
          </span>
        </div>
        {/* Fixed search + chips */}
        <div className="shrink-0 px-3.5 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search items & containers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { value: "all", label: "All", count: libraryItems.length },
              ...categoryCounts.map(([name, count]) => ({ value: name, label: name, count })),
              { value: "containers", label: "Containers", count: containerCount },
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => setActiveTab(chip.value)}
                className={cn(
                  "h-7 px-2.5 rounded-full border text-[11px] font-medium transition-colors tabular-nums touch-manipulation",
                  activeTab === chip.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted border-transparent"
                )}
              >
                {chip.label} <span className="opacity-70">({chip.count})</span>
              </button>
            ))}
          </div>
          <Separator />
        </div>
        {/* Independently scrollable list */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-3 space-y-2 scrollbar-thin overscroll-contain"
          style={{ scrollbarGutter: "stable" }}
        >
          {loadingItems ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[72px] rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Boxes className="h-9 w-9 text-muted-foreground mx-auto opacity-40" />
              <p className="text-xs text-muted-foreground">
                {searchTerm
                  ? "No items match your search"
                  : activeTab === "containers"
                  ? "No containers available"
                  : "No items available"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <LibraryItemCard
                key={item.id}
                item={item}
                onClickPlace={onClickPlace}
                onRemoveOne={onRemoveOneOfItem}
                clickPlaceActive={clickPlaceActive}
                assigned={assignmentCounts[item.id] || 0}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  if (mobileSection === "review") {
    return (
      <ReviewSaveBlock
        hasItems={hasItems}
        canSave={!!canSave}
        isDirty={!!isDirty}
        activeBuildName={activeBuildName ?? null}
        onSaveClick={() => onSaveClick?.()}
        onOverwrite={onOverwrite}
        onSmartLayout={onSmartLayout}
        onExport={onExport}
        onClearAll={onClearAll}
        variant="mobile"
        step3Complete={step3Complete}
        validation={reviewValidation}
      />
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* ── Top: Build Progress ── */}
      <BuildProgress
        palletSelected={step1Complete}
        itemsAdded={step2Complete}
        saved={step3Complete}
      />

      {/* ── STEP 1: Choose Pallet Size (always visible — no extra click to start) ── */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="rounded-xl border bg-card border-border">
          {selectedPallet && !palletPickerOpen ? (
            // Compact summary — frees vertical space for inventory.
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-sm shadow-primary/20 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium leading-none">
                    Selected Pallet
                  </div>
                  <div className="text-[13px] font-semibold truncate leading-tight mt-0.5">
                    {selectedPallet.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums truncate">
                    {selectedPallet.width}" × {selectedPallet.length}" • {selectedPallet.maxWeight.toLocaleString()} lbs
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={() => setPalletPickerOpen(true)}
              >
                Change
              </Button>
            </div>
          ) : (
          <>
          <div className="px-3.5 py-2.5">
            <StepHeader
              step={1}
              title="Choose Pallet Size"
              completed={step1Complete}
              active={!step1Complete}
              open
              collapsible={false}
            />
          </div>
          <div className="px-3.5 pb-4 pt-1">
            {(() => null)()}
            {/* original content begins */}
            <div>
                {loadingPallets ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 rounded-lg bg-muted/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Standard Pallets */}
                    {palletTypes.filter((p) => p.id.startsWith("builtin-"))
                      .length > 0 && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-0.5">
                          Standard
                        </p>
                        {palletTypes
                          .filter((p) => p.id.startsWith("builtin-"))
                          .map((pallet) => {
                            const isSelected =
                              selectedPallet?.id === pallet.id;
                            return (
                              <button
                                key={pallet.id}
                                onClick={() => handlePalletSelect(pallet)}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg border transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-sm">
                                      {pallet.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {pallet.width}" × {pallet.length}" •{" "}
                                      {pallet.max_weight.toLocaleString()} lbs
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </>
                    )}

                    {/* Custom Pallets */}
                    {palletTypes.filter((p) => !p.id.startsWith("builtin-"))
                      .length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium px-0.5">
                          Custom
                        </p>
                        {palletTypes
                          .filter((p) => !p.id.startsWith("builtin-"))
                          .map((pallet) => {
                            const isSelected =
                              selectedPallet?.id === pallet.id;
                            return (
                              <button
                                key={pallet.id}
                                onClick={() => handlePalletSelect(pallet)}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg border transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-sm">
                                      {pallet.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {pallet.width}" × {pallet.length}" •{" "}
                                      {pallet.max_weight.toLocaleString()} lbs
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </>
                    )}

                    <button
                      onClick={() => setCreateModalOpen(true)}
                      className="w-full text-left p-3 rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-all group"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Create Custom Size
                        </span>
                      </div>
                    </button>
                  </div>
                )}
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* ── STEP 2: Add Items & Containers ── */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col overflow-hidden px-4 pt-2 pb-2",
          !step1Complete && "opacity-40 pointer-events-none"
        )}
      >
        <Collapsible
          open={itemsSectionOpen}
          onOpenChange={setItemsSectionOpen}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div
            className={cn(
              "rounded-xl border transition-all duration-300 flex-1 min-h-0 flex flex-col overflow-hidden",
              itemsSectionOpen
                ? "bg-card border-border"
                : step2Complete
                ? "bg-primary/[0.03] border-primary/15"
                : "bg-card border-border"
            )}
          >
            <CollapsibleTrigger asChild>
              <button
                disabled={!step1Complete}
                className="w-full text-left px-3.5 py-2.5 hover:bg-muted/30 transition-colors rounded-t-xl shrink-0"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <StepHeader
                    step={2}
                    title="Add Items & Containers"
                    completed={step2Complete}
                    active={step1Complete && !step2Complete}
                    open={itemsSectionOpen}
                  />
                  {!itemsSectionOpen && (
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0 mr-1">
                      {libraryItems.length} available
                    </span>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent
              forceMount
              className={cn(
                "flex flex-col overflow-hidden",
                // Mobile/tablet: bounded heights so the inner list scrolls inside a flowing page
                "max-h-[420px] sm:max-h-[50vh] md:max-h-[55vh]",
                // Desktop: fill its grid cell as before
                "lg:flex-1 lg:min-h-0 lg:max-h-none",
                !itemsSectionOpen && "hidden"
              )}
            >
              {/* Search + Tabs (pinned) */}
              <div className="shrink-0 px-3.5 pt-1 pb-2 space-y-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search items & containers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Inventory summary */}
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span>
              <span className="text-foreground font-semibold tabular-nums">
                {libraryItems.length}
              </span>{" "}
              available
            </span>
            <span className="tabular-nums">
              {itemCount} items • {containerCount} containers
            </span>
          </div>

          {/* Category chip filters */}
          <div className="flex flex-wrap gap-1">
            {[
              { value: "all", label: "All", count: libraryItems.length },
              ...categoryCounts.map(([name, count]) => ({
                value: name,
                label: name,
                count,
              })),
              { value: "containers", label: "Containers", count: containerCount },
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => setActiveTab(chip.value)}
                className={cn(
                  "h-6 px-2 rounded-full border text-[10.5px] font-medium transition-colors tabular-nums",
                  activeTab === chip.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted border-transparent"
                )}
              >
                {chip.label} <span className="opacity-70">({chip.count})</span>
              </button>
            ))}
          </div>

          <Separator />
              </div>

              {/* Scrollable item list */}
              <div
                className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-3 space-y-2 scrollbar-thin relative"
                style={{ scrollbarGutter: "stable" }}
              >
            {loadingItems ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[72px] rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Boxes className="h-9 w-9 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xs text-muted-foreground">
                  {searchTerm
                    ? "No items match your search"
                    : activeTab === "containers"
                    ? "No containers available"
                    : "No items available"}
                </p>
                <p className="text-[11px] text-muted-foreground/60">
                  {searchTerm
                    ? "Try a different search term"
                    : "Add items in Assets, then drag them here"}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <LibraryItemCard
                  key={item.id}
                  item={item}
                  onClickPlace={onClickPlace}
                  onRemoveOne={onRemoveOneOfItem}
                  clickPlaceActive={clickPlaceActive}
                  assigned={assignmentCounts[item.id] || 0}
                />
              ))
            )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* ── STEP 3: Review & Save (pinned to bottom) ── */}
      <div className="shrink-0 border-t border-border/40 bg-background">
        <div className="px-4 py-3">
          <ReviewSaveBlock
            hasItems={hasItems}
            canSave={!!canSave}
            isDirty={!!isDirty}
            activeBuildName={activeBuildName ?? null}
            onSaveClick={() => onSaveClick?.()}
            onOverwrite={onOverwrite}
            onSmartLayout={onSmartLayout}
            onExport={onExport}
            onClearAll={onClearAll}
            variant="compact"
            step3Complete={step3Complete}
          />
        </div>
      </div>

      {/* Saved Builds Panel */}
      {savedBuildsSlot}

      {/* Create Custom Pallet Modal */}
      <CreateCustomPalletModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={onCreatePallet}
      />
    </div>
  );
};
