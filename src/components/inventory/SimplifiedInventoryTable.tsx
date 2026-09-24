import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { normalizeFieldValue } from "@/lib/normalize";
import { useSearchParams } from "react-router-dom";
import { useMobileSearch } from "@/contexts/MobileSearchContext";
import { 
  ArrowUpDown, 
  AlertTriangle, 
  Package,
  Plus,
  Upload,
  Loader2,
  MoveHorizontal
} from "lucide-react";
import { InventorySummaryCards, SummaryFilter } from "./InventorySummaryCards";
import { QuickFilterChips, QuickFilterType } from "./QuickFilterChips";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { useInventoryData } from "@/hooks/use-inventory-data";
import { useInventoryGrouping, sortGroupedItems, GroupedInventoryItem } from "@/hooks/use-inventory-grouping";
import { useSettings } from "@/contexts/SettingsContext";
import { useAssetAttributes } from "@/hooks/use-asset-attributes";
import { useBulkAttributeValues } from "@/hooks/use-bulk-attribute-values";
import { AssetsImportWizard } from "./AssetsImportWizard";
import { CacheInventoryEditModal } from "./CacheInventoryEditModal";
import { AddCacheItemModal } from "./AddCacheItemModal";
import { AddBoxModal } from "./AddBoxModal";
import { MoveCacheItemModal } from "./MoveCacheItemModal";
import { DuplicateCacheItemModal } from "./DuplicateCacheItemModal";
import { EnhancedPagination } from "./EnhancedPagination";
import { GroupedTableRow } from "./GroupedTableRow";
import { ItemDetailsDrawer } from "./ItemDetailsDrawer";
import { BoxDetailsDrawer } from "./BoxDetailsDrawer";
import { ItemCheckoutDialog } from "./ItemCheckoutDialog";
import { InventoryToolbar } from "./InventoryToolbar";
import { QuickFilterBar, InventoryFilters, CustomFieldFilterOption } from "./QuickFilterBar";
import { FloatingBulkActions } from "./FloatingBulkActions";
import { InventoryPrintView } from "./InventoryPrintView";
import { TableEmptyState } from "./TableEmptyState";
import { TableLoadingSkeleton } from "./TableLoadingSkeleton";
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";
import { DeleteAllConfirmationDialog } from "./DeleteAllConfirmationDialog";
import { ContainerDeleteDialog } from "./ContainerDeleteDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCacheInventory } from "@/hooks/use-cache-inventory";
import { supabase } from "@/integrations/supabase/client";
import { createPreActionSnapshot } from "@/lib/snapshot-utils";
import {
  MobileSearchHeader,
  MobileAssetList,
  MobileAssetFAB,
  MobileFilterSheet,
  MobileActionsSheet,
  ActiveFilterChips,
  MobileAlertsBanner,
  filterAlertItems,
} from "./mobile";
import { DataHealthPanel } from "@/components/settings/DataHealthPanel";
import { MobilePagination } from "@/components/ui/mobile-pagination";
import { ExportFieldsModal, ExportField } from "@/components/export/ExportFieldsModal";

// Column configuration
type ColumnKey = "manufacturer" | "expiration";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  accessor: (item: CacheInventoryItem) => any;
}

const OPTIONAL_COLUMNS: ColumnConfig[] = [
  { key: "expiration", label: "Expiration Date", defaultVisible: true, accessor: (item) => item.date_expire },
  { key: "manufacturer", label: "Manufacturer", defaultVisible: false, accessor: (item) => item.manufacturer },
];

const DEFAULT_ITEMS_PER_PAGE = 50;
const COLUMN_VISIBILITY_KEY = "simplified_inventory_columns_v2";
const ITEMS_PER_PAGE_KEY = "cache_inventory_items_per_page";

// Map URL status params to actual status values
const STATUS_URL_MAP: Record<string, string> = {
  'available': 'Available',
  'in-use': 'In Use',
  'under-service': 'Under Service',
  'retired': 'Retired',
  // Also support legacy codes
  'in': 'Available',
  'out': 'In Use',
  'maint': 'Under Service',
};

export const SimplifiedInventoryTable = () => {
  const { checkRestriction } = useTourMode();
  const { items, loading, error, refetch, deleteItem, deleteItems, isDemoMode } = useInventoryData();
  const { assetSettings } = useSettings();
  const isMobile = useIsMobile();
  const mobileSearch = useMobileSearch();
  const { items: allItems } = useCacheInventory();
  const { attributes: assetAttributes } = useAssetAttributes();
  const assetIds = useMemo(() => items.map(i => i.id), [items]);
  const { valuesByAsset } = useBulkAttributeValues(assetIds);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [selectedItem, setSelectedItem] = useState<CacheInventoryItem | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addContainerModalOpen, setAddContainerModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedForMove, setSelectedForMove] = useState<CacheInventoryItem | null>(null);
  const [selectedForDuplicate, setSelectedForDuplicate] = useState<CacheInventoryItem | null>(null);
  
  // Container drawer state for mobile
  const [containerDrawerOpen, setContainerDrawerOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<any>(null);
  
  // Checkout state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedForCheckout, setSelectedForCheckout] = useState<CacheInventoryItem | null>(null);
  
  // Table state
  const [sortBy, setSortBy] = useState<string | null>("description");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Dialog state
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CacheInventoryItem | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [bulkMoveDialogOpen, setBulkMoveDialogOpen] = useState(false);
  const [bulkMoveContainerId, setBulkMoveContainerId] = useState<string>("none");
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<"csv" | "excel" | "pdf" | null>(null);
  
  // Refresh state
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mobile state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>("all");
  const [chipCategory, setChipCategory] = useState<string | null>(null);
  const [chipLocation, setChipLocation] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanPrefillBarcode, setScanPrefillBarcode] = useState<string | null>(null);

  // Column visibility
  const [visibleOptionalColumns, setVisibleOptionalColumns] = useState<Set<ColumnKey>>(() => {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    if (saved) {
      try {
        return new Set(JSON.parse(saved) as ColumnKey[]);
      } catch {
        return new Set(OPTIONAL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
      }
    }
    return new Set(OPTIONAL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  });

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem(ITEMS_PER_PAGE_KEY);
    return saved ? Number(saved) : DEFAULT_ITEMS_PER_PAGE;
  });

  // Initialize filters from URL params
  const getInitialFilters = () => {
    const statusParam = searchParams.get('status');
    const initialStatus: string[] = [];
    
    if (statusParam) {
      const mappedStatus = STATUS_URL_MAP[statusParam.toLowerCase()];
      if (mappedStatus) {
        initialStatus.push(mappedStatus);
      }
    }
    
    return {
      search: searchParams.get('search') || "",
      section: [] as string[],
      subcategory: [] as string[],
      manufacturer: [] as string[],
      status: initialStatus,
      groupAbbv: [] as string[],
      groupYear: [] as string[],
      isInternal: null as string | null,
      container: [] as string[],
      expiringDays: null as number | null,
      assetType: "all" as "all" | "item" | "container",
      customFields: {} as Record<string, string[]>,
    };
  };

  // Filters
  const [filters, setFilters] = useState<InventoryFilters>(getInitialFilters);
  const [isFilteringAlerts, setIsFilteringAlerts] = useState(false);

  // Sync URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (filters.status.length > 0) {
      // Convert status back to URL-friendly format
      const statusValue = filters.status[0];
      const urlValue = statusValue.toLowerCase().replace(' ', '-');
      newParams.set('status', urlValue);
    }
    
    if (filters.search) {
      newParams.set('search', filters.search);
    }
    
    // Only update if params actually changed
    const currentParamsStr = searchParams.toString();
    const newParamsStr = newParams.toString();
    if (currentParamsStr !== newParamsStr) {
      setSearchParams(newParams, { replace: true });
    }
  }, [filters.status, filters.search]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify([...visibleOptionalColumns]));
  }, [visibleOptionalColumns]);

  useEffect(() => {
    localStorage.setItem(ITEMS_PER_PAGE_KEY, String(itemsPerPage));
  }, [itemsPerPage]);

  useEffect(() => {
    if (!loading && items) {
      setLastUpdated(new Date());
    }
  }, [loading, items]);

  // Auto-open item drawer when navigated via highlight param (from alerts)
  useEffect(() => {
    if (!loading && items.length > 0) {
      const highlightId = searchParams.get('highlight');
      if (highlightId) {
        const itemToOpen = items.find(item => item.id === highlightId);
        if (itemToOpen) {
          setSelectedItem(itemToOpen);
          setDetailsDrawerOpen(true);
          setHighlightedRowId(highlightId);
          // Clear highlight after 2 seconds
          setTimeout(() => setHighlightedRowId(null), 2000);
          // Clear the URL param after opening
          searchParams.delete('highlight');
          setSearchParams(searchParams, { replace: true });
        }
      }
    }
  }, [loading, items, searchParams, setSearchParams]);

  // Unique values for filters
  const uniqueValues = useMemo(() => {
    // Build {id, name} pairs for taxonomy fields, deduplicating by ID
    const buildTaxonomyOptions = (idKey: string, nameKey: string) => {
      const map = new Map<string, string>();
      items.forEach(i => {
        const id = (i as any)[idKey];
        const name = (i as any)[nameKey];
        if (id && name) map.set(id, name);
      });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    };

    // Containers are now items with asset_type='container'
    const containers = items
      .filter(i => i.asset_type === "container")
      .map(i => ({ id: i.id, label: i.box_number || i.description || "Container" }));

    // Build custom field filter options dynamically from attribute values
    const customFields: CustomFieldFilterOption[] = [];
    if (assetAttributes.length > 0 && valuesByAsset.size > 0) {
      for (const attr of assetAttributes) {
        const distinctValues = new Set<string>();
        valuesByAsset.forEach((vals) => {
          const v = vals[attr.id];
          if (v && v.trim()) distinctValues.add(v);
        });
        // Only include if >1 distinct values (matches dynamic filtering engine rule)
        if (distinctValues.size > 1) {
          customFields.push({
            attributeId: attr.id,
            attributeName: attr.name,
            values: Array.from(distinctValues).sort(),
          });
        }
      }
    }

    return {
      sections: [...new Set(items.map(i => i.section).filter(Boolean))].sort() as string[],
      subcategories: buildTaxonomyOptions('category_id', 'subcategory'),
      manufacturers: buildTaxonomyOptions('manufacturer_id', 'manufacturer'),
      statuses: buildTaxonomyOptions('asset_status_id', 'status_item'),
      groupAbbvs: buildTaxonomyOptions('asset_group_id', 'group_abbv'),
      groupYears: [...new Set(items.map(i => i.group_year).filter(Boolean))].sort() as number[],
      containers,
      customFields,
    };
  }, [items, assetAttributes, valuesByAsset]);

  // On mobile, sync global search → local filter
  useEffect(() => {
    if (isMobile) {
      setFilters(prev => prev.search !== mobileSearch.query ? { ...prev, search: mobileSearch.query } : prev);
    }
  }, [isMobile, mobileSearch.query]);

  // Handlers — wrapped in useCallback to prevent unnecessary child re-renders
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch?.();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [refetch]);

  const handleSort = useCallback((column: string) => {
    setSortBy(prev => {
      if (prev === column) {
        setSortOrder(o => o === "asc" ? "desc" : "asc");
        return prev;
      }
      setSortOrder("asc");
      return column;
    });
  }, []);

  const toggleColumnVisibility = useCallback((key: string) => {
    setVisibleOptionalColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key as ColumnKey)) {
        newSet.delete(key as ColumnKey);
      } else {
        newSet.add(key as ColumnKey);
      }
      return newSet;
    });
  }, []);

  // Build container ancestry map for breadcrumb trails (max 4 levels)
  const containerAncestryMap = useMemo(() => {
    const containerMap = new Map<string, { name: string; parentId: string | null }>();
    items.forEach(item => {
      if (item.asset_type === "container") {
        containerMap.set(item.id, {
          name: item.box_number || item.description || "Container",
          parentId: item.container_id,
        });
      }
    });

    const getAncestry = (containerId: string | null): string[] => {
      if (!containerId) return [];
      const path: string[] = [];
      let current = containerId;
      const visited = new Set<string>();
      while (current && path.length < 4) {
        if (visited.has(current)) break; // prevent circular
        visited.add(current);
        const container = containerMap.get(current);
        if (!container) break;
        path.unshift(container.name);
        current = container.parentId!;
      }
      return path;
    };

    const map = new Map<string, string[]>();
    items.forEach(item => {
      const ancestry = getAncestry(item.container_id);
      if (ancestry.length > 0) {
        map.set(item.id, ancestry);
      }
    });
    return map;
  }, [items]);

  // Items now come with _assetType set from the hook — containers have asset_type='container'
  const unifiedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      _assetType: item.asset_type as "item" | "container",
      _containerItemCount: item.asset_type === "container"
        ? items.filter(i => i.container_id === item.id).length
        : undefined,
      _containerBoxNumber: item.box_number ?? undefined,
    }));
  }, [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let filtered = [...unifiedItems];

    // Asset type filter
    if (filters.assetType === "item") {
      filtered = filtered.filter(item => item._assetType !== "container");
    } else if (filters.assetType === "container") {
      filtered = filtered.filter(item => item._assetType === "container");
    }

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      const queryNorm = normalizeFieldValue(filters.search);
      const matchField = (val: string | null | undefined) => {
        if (!val) return false;
        const lower = val.toLowerCase();
        if (lower.includes(query)) return true;
        if (queryNorm && normalizeFieldValue(val).includes(queryNorm)) return true;
        return false;
      };
      filtered = filtered.filter(item =>
        matchField(item.barcode) ||
        matchField(item.description) ||
        matchField(item.manufacturer) ||
        matchField(item.model_part_num) ||
        matchField(item.serial_number) ||
        matchField(item.id_cache_fema) ||
        matchField(item.group_abbv) ||
        matchField(item.subcategory) ||
        matchField(item._containerBoxNumber)
      );
    }

    if (filters.section.length > 0) {
      const normSections = filters.section.map(s => normalizeFieldValue(s));
      filtered = filtered.filter(item => {
        if (!item.section) return false;
        const itemNorm = normalizeFieldValue(item.section);
        return filters.section.includes(item.section) || normSections.includes(itemNorm);
      });
    }
    if (filters.subcategory.length > 0) {
      filtered = filtered.filter(item => item.category_id && filters.subcategory.includes(item.category_id));
    }
    if (filters.manufacturer.length > 0) {
      filtered = filtered.filter(item => item.manufacturer_id && filters.manufacturer.includes(item.manufacturer_id));
    }
    if (filters.status.length > 0) {
      filtered = filtered.filter(item => item.asset_status_id && filters.status.includes(item.asset_status_id));
    }
    if (filters.groupAbbv.length > 0) {
      filtered = filtered.filter(item => item.asset_group_id && filters.groupAbbv.includes(item.asset_group_id));
    }
    if (filters.groupYear.length > 0) {
      filtered = filtered.filter(item => item.group_year && filters.groupYear.includes(String(item.group_year)));
    }
    if (filters.isInternal !== null) {
      filtered = filtered.filter(item => 
        filters.isInternal === "yes" ? item.is_internal : !item.is_internal
      );
    }
    if (filters.container.length > 0) {
      if (filters.container.includes("__none__")) {
        filtered = filtered.filter(item => !item.container_id);
      } else {
        filtered = filtered.filter(item => item.container_id && filters.container.includes(item.container_id));
      }
    }
    if (filters.expiringDays !== null) {
      const now = new Date();
      const cutoff = new Date(now.getTime() + filters.expiringDays * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => {
        if (!item.date_expire) return false;
        const expDate = new Date(item.date_expire);
        return expDate >= now && expDate <= cutoff;
      });
    }

    // Custom field filters (normalized comparison)
    const activeCustomFilters = Object.entries(filters.customFields || {}).filter(([, vals]) => vals.length > 0);
    if (activeCustomFilters.length > 0) {
      filtered = filtered.filter(item => {
        const itemAttrVals = valuesByAsset.get(item.id);
        return activeCustomFilters.every(([attrId, selectedValues]) => {
          const val = itemAttrVals?.[attrId];
          if (!val) return false;
          // Exact match first, then normalized match
          if (selectedValues.includes(val)) return true;
          const valNorm = normalizeFieldValue(val);
          return selectedValues.some(sv => normalizeFieldValue(sv) === valNorm);
        });
      });
    }

    // Summary card filter (desktop)
    if (summaryFilter) {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      if (summaryFilter === "low_stock") {
        filtered = filtered.filter(item => {
          if (item.asset_type === "container") return false;
          const qty = item.quantity_available ?? 0;
          if (qty === 0) return false;
          return (
            (item.low_stock_threshold && item.low_stock_threshold > 0 && qty <= item.low_stock_threshold) ||
            (item.critical_stock_threshold && item.critical_stock_threshold > 0 && qty <= item.critical_stock_threshold)
          );
        });
      } else if (summaryFilter === "out_of_stock") {
        filtered = filtered.filter(item => {
          if (item.asset_type === "container") return false;
          return (item.quantity_available ?? 0) === 0;
        });
      } else if (summaryFilter === "expiring_soon") {
        filtered = filtered.filter(item => {
          if (!item.date_expire) return false;
          const expDate = new Date(item.date_expire);
          return expDate >= now && expDate <= soon;
        });
      } else if (summaryFilter === "containers") {
        filtered = filtered.filter(item => item.asset_type === "container");
      }
      // "all" = no additional filter
    }

    // Quick filter chips (state-based — used on mobile and also desktop)
    if (quickFilter !== "all") {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      if (quickFilter === "low_stock") {
        filtered = filtered.filter(item => {
          if (item.asset_type === "container") return false;
          const qty = item.quantity_available ?? 0;
          if (qty === 0) return false;
          return (
            (item.low_stock_threshold && item.low_stock_threshold > 0 && qty <= item.low_stock_threshold) ||
            (item.critical_stock_threshold && item.critical_stock_threshold > 0 && qty <= item.critical_stock_threshold)
          );
        });
      } else if (quickFilter === "out_of_stock") {
        filtered = filtered.filter(item => {
          if (item.asset_type === "container") return false;
          return (item.quantity_available ?? 0) === 0;
        });
      } else if (quickFilter === "expiring_soon") {
        filtered = filtered.filter(item => {
          if (!item.date_expire) return false;
          const expDate = new Date(item.date_expire);
          return expDate >= now && expDate <= soon;
        });
      }
    }

    // Quick filter category chip
    if (chipCategory) {
      filtered = filtered.filter(item => item.category_id === chipCategory);
    }

    // Quick filter location chip
    if (chipLocation) {
      filtered = filtered.filter(item => item.section === chipLocation);
    }

    // Sorting — supports both native fields and custom attribute fields
    if (sortBy) {
      const isCustomSort = sortBy.startsWith("custom:");
      const customAttrId = isCustomSort ? sortBy.slice(7) : null;

      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (customAttrId) {
          aVal = valuesByAsset.get(a.id)?.[customAttrId] ?? null;
          bVal = valuesByAsset.get(b.id)?.[customAttrId] ?? null;
        } else {
          aVal = a[sortBy as keyof CacheInventoryItem];
          bVal = b[sortBy as keyof CacheInventoryItem];
        }
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [unifiedItems, filters, sortBy, sortOrder, summaryFilter, quickFilter, chipCategory, chipLocation, valuesByAsset]);

  // Detect which optional columns have any data (for auto-hide empty columns)
  const columnsWithData = useMemo(() => {
    const dataMap = new Map<ColumnKey, boolean>();
    
    OPTIONAL_COLUMNS.forEach(col => {
      const hasData = filteredItems.some(item => {
        const value = col.accessor(item);
        return value !== null && value !== undefined && value !== "";
      });
      dataMap.set(col.key, hasData);
    });
    
    return dataMap;
  }, [filteredItems]);

  // Effective visible columns = user selection + has data
  const effectiveVisibleColumns = useMemo(() => {
    const effective = new Set<ColumnKey>();
    
    visibleOptionalColumns.forEach(key => {
      // Only show if user selected AND column has data
      if (columnsWithData.get(key)) {
        effective.add(key);
      }
    });
    
    return effective;
  }, [visibleOptionalColumns, columnsWithData]);

  // Get list of columns that are available (have data)
  const availableOptionalColumns = useMemo(() => {
    return OPTIONAL_COLUMNS.filter(col => columnsWithData.get(col.key));
  }, [columnsWithData]);
  const rawGroupedItems = useInventoryGrouping(filteredItems);
  
  // Apply grouping based on settings - if disabled, treat each item as its own group
  const groupedItems = useMemo(() => {
    if (assetSettings.group_duplicates) {
      return rawGroupedItems;
    }
    // If grouping is disabled, create individual "groups" for each item
    return filteredItems.map((item): GroupedInventoryItem => ({
      groupKey: item.id,
      description: item.description,
      subcategory: item.subcategory,
      section: item.section,
      status_item: item.status_item,
      manufacturer: item.manufacturer,
      totalQuantityAvailable: item.quantity_available ?? 0,
      totalQuantityOut: item.quantity_out ?? 0,
      itemCount: 1,
      items: [item],
      isSingleItem: true,
      primaryItem: item,
      earliestExpiration: item.date_expire,
    }));
  }, [rawGroupedItems, filteredItems, assetSettings.group_duplicates]);
  
  // Sort grouped items
  const sortedGroupedItems = useMemo(() => {
    return sortGroupedItems(groupedItems, sortBy, sortOrder);
  }, [groupedItems, sortBy, sortOrder]);

  // Pagination for groups (not individual items)
  const totalPages = Math.ceil(sortedGroupedItems.length / itemsPerPage);
  const paginatedGroups = sortedGroupedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedGroups(new Set());
  }, [filters, quickFilter, chipCategory, chipLocation]);

  // Build export fields list (dynamic: default + custom)
  const exportFields = useMemo((): ExportField[] => {
    const fields: ExportField[] = [
      { key: "name", label: "Item Name", defaultSelected: true },
      { key: "category", label: "Category", defaultSelected: true },
      { key: "section", label: "Storage Area", defaultSelected: true },
      { key: "available", label: "Qty Available", defaultSelected: true },
      { key: "out", label: "Qty In Use", defaultSelected: true },
      { key: "status", label: "Status", defaultSelected: true },
      { key: "barcode", label: "Barcode" },
      { key: "serial", label: "Serial Number" },
      { key: "model", label: "Model / Part #" },
      { key: "expiration", label: "Expiration Date" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "group", label: "Group" },
      { key: "container", label: "Container" },
    ];
    // Add custom attribute fields
    assetAttributes.forEach(attr => {
      fields.push({ key: `custom:${attr.id}`, label: attr.name });
    });
    return fields;
  }, [assetAttributes]);

  // Build active filter summary string
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.search) parts.push(`Search: "${filters.search}"`);
    if (filters.status.length > 0) parts.push(`Status: ${filters.status.join(", ")}`);
    if (filters.manufacturer.length > 0) parts.push(`Manufacturer: ${filters.manufacturer.join(", ")}`);
    if (filters.subcategory.length > 0) parts.push(`Category: ${filters.subcategory.join(", ")}`);
    if (filters.section.length > 0) parts.push(`Location: ${filters.section.join(", ")}`);
    if (filters.container.length > 0) parts.push(`Container filter active`);
    if (filters.assetType !== "all") parts.push(`Type: ${filters.assetType}`);
    if (selectedRows.size > 0) parts.push(`${selectedRows.size} items selected`);
    return parts.length > 0 ? `Filtered by: ${parts.join(" · ")}` : undefined;
  }, [filters, selectedRows]);

  // Open export modal (triggered by toolbar/menu)
  const handleExport = useCallback((format: "csv" | "excel" | "pdf") => {
    if (checkRestriction('export')) return;
    setPendingExportFormat(format);
    setExportModalOpen(true);
  }, [checkRestriction]);

  // Actual export execution after field selection
  const executeExport = useCallback(async (selectedFieldKeys: string[], format: "csv" | "excel" | "pdf") => {
    const sourceItems = selectedRows.size > 0
      ? filteredItems.filter(item => selectedRows.has(item.id))
      : filteredItems;

    const fieldMap: Record<string, (item: CacheInventoryItem) => any> = {
      name: i => i.description || "",
      category: i => i.subcategory || "",
      section: i => i.section || "",
      available: i => i.quantity_available,
      out: i => i.quantity_out,
      status: i => i.status_item || "",
      barcode: i => i.barcode || "",
      serial: i => i.serial_number || "",
      model: i => i.model_part_num || "",
      expiration: i => i.date_expire || "",
      manufacturer: i => i.manufacturer || "",
      group: i => i.group_abbv || "",
      container: i => i._containerBoxNumber || "",
    };

    const selectedExportFields = exportFields.filter(f => selectedFieldKeys.includes(f.key));

    const exportData = sourceItems.map(item => {
      const row: Record<string, any> = {};
      for (const field of selectedExportFields) {
        if (field.key.startsWith("custom:")) {
          const attrId = field.key.replace("custom:", "");
          const vals = valuesByAsset.get(item.id);
          row[field.label] = vals?.[attrId] || "";
        } else {
          row[field.label] = fieldMap[field.key]?.(item) ?? "";
        }
      }
      return row;
    });

    if (format === "excel" || format === "csv") {
      const { createExcelFile, createCsvFile } = await import("@/lib/excel-utils");
      const filename = `inventory-${new Date().toISOString().split('T')[0]}`;
      if (format === "excel") {
        await createExcelFile(exportData, `${filename}.xlsx`, "Inventory");
      } else {
        createCsvFile(exportData, `${filename}.csv`);
      }
    } else if (format === "pdf") {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Title
      doc.setFontSize(18);
      doc.text("Inventory Report", 14, 18);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);

      // Filter summary
      let y = 30;
      if (filterSummary) {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(filterSummary, 14, y);
        y += 7;
      }

      doc.setTextColor(0);
      y += 3;

      // Table header
      const cols = selectedExportFields.map(f => f.label);
      const colWidth = Math.min((pageWidth - 28) / cols.length, 60);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      cols.forEach((col, i) => {
        doc.text(col.substring(0, 12), 14 + i * colWidth, y);
      });
      doc.setFont("helvetica", "normal");
      y += 6;

      // Table rows
      doc.setFontSize(7);
      exportData.forEach((row) => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
        cols.forEach((col, i) => {
          const val = String(row[col] ?? "").substring(0, 18);
          doc.text(val, 14 + i * colWidth, y);
        });
        y += 5;
      });

      doc.save(`inventory-${new Date().toISOString().split('T')[0]}.pdf`);
    }

    toast({
      title: "Export successful",
      description: `Exported ${exportData.length} items as ${format.toUpperCase()}`,
    });
  }, [filteredItems, selectedRows, exportFields, valuesByAsset, filterSummary]);

  // CRUD handlers
  const handleViewItem = useCallback((item: CacheInventoryItem) => {
    if (item._assetType === "container" || item.asset_type === "container") {
      const containerAsBox = {
        id: item.id,
        box_number: item.box_number || item.description || "Container",
        box_number_alt: item.box_number_alt,
        box_description: item.description,
        barcode: item.barcode,
        cache_box_type: item.container_type_name || "",
        status_cache_box: item.container_status_name || item.status_item || "",
        x_group_display: item.container_group_name || item.group_abbv,
        container_type_id: item.container_type_id,
        container_status_id: item.container_status_id,
        container_group_id: item.container_group_id,
        image_url: item.image_url,
        custom_data: item.custom_data,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
      setSelectedContainer(containerAsBox);
      setContainerDrawerOpen(true);
      return;
    }
    setSelectedItem(item);
    setDetailsDrawerOpen(true);
  }, []);

  const handleEditItem = useCallback((item: CacheInventoryItem) => {
    setSelectedItem(item);
    setEditModalOpen(true);
    setDetailsDrawerOpen(false);
  }, []);

  const handleDuplicateItem = useCallback((item: CacheInventoryItem) => {
    setSelectedForDuplicate(item);
    setDuplicateModalOpen(true);
    setDetailsDrawerOpen(false);
  }, []);

  const handleMoveItem = useCallback((item: CacheInventoryItem) => {
    setSelectedForMove(item);
    setMoveModalOpen(true);
    setDetailsDrawerOpen(false);
  }, []);

  const handleCheckoutItem = useCallback((item: CacheInventoryItem) => {
    setSelectedForCheckout(item);
    setCheckoutModalOpen(true);
    setDetailsDrawerOpen(false);
  }, []);

  const handleDeleteItem = useCallback(async (item: CacheInventoryItem) => {
    setItemToDelete(item);
    if (item.asset_type === "container") {
      setContainerDeleteDialogOpen(true);
    } else {
      setDeleteItemDialogOpen(true);
    }
    setDetailsDrawerOpen(false);
  }, []);

  const [containerDeleteDialogOpen, setContainerDeleteDialogOpen] = useState(false);

  const handleContainerDeleteConfirm = async (action: "move" | "delete-all", moveTargetId?: string) => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      if (action === "move") {
        // Move all direct children to target container (or null)
        const targetId = moveTargetId || null;
        const { error: moveError } = await supabase
          .from("cache_inventory")
          .update({ container_id: targetId })
          .eq("container_id", itemToDelete.id);
        if (moveError) throw moveError;
      } else {
        // Delete all descendants recursively (children first)
        const collectDescendantIds = (parentId: string): string[] => {
          const children = items.filter(i => i.container_id === parentId);
          const ids: string[] = [];
          for (const child of children) {
            if (child.asset_type === "container") {
              ids.push(...collectDescendantIds(child.id));
            }
            ids.push(child.id);
          }
          return ids;
        };
        const descendantIds = collectDescendantIds(itemToDelete.id);
        if (descendantIds.length > 0) {
          await deleteItems(descendantIds);
        }
      }
      // Now delete the container itself
      const success = await deleteItem(itemToDelete.id);
      if (!success) throw new Error("Failed to delete container");

      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemToDelete.id);
        return newSet;
      });
      setContainerDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingItem(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setIsDeletingItem(true);
    try {
      const success = await deleteItem(itemToDelete.id);
      if (!success) throw new Error("Failed to delete item");
      
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemToDelete.id);
        return newSet;
      });
      
      setDeleteItemDialogOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      // Error already handled by hook
    } finally {
      setIsDeletingItem(false);
    }
  };

  const toggleRowSelection = useCallback((itemId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    const allItemIds = paginatedGroups.flatMap(group => group.items.map(item => item.id));
    setSelectedRows(prev => {
      if (prev.size === allItemIds.length) {
        return new Set();
      }
      return new Set(allItemIds);
    });
  }, [paginatedGroups]);

  const toggleGroupExpand = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  const handleSelectGroup = useCallback((group: GroupedInventoryItem, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      group.items.forEach(item => {
        if (checked) {
          newSet.add(item.id);
        } else {
          newSet.delete(item.id);
        }
      });
      return newSet;
    });
  }, []);

  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) return;

    setIsBatchDeleting(true);
    try {
      // Create pre-action snapshot before bulk deletion
      await createPreActionSnapshot(`Bulk delete ${selectedRows.size} asset(s)`);

      const success = await deleteItems(Array.from(selectedRows));
      if (!success) throw new Error("Failed to delete items");
      
      setSelectedRows(new Set());
      setBatchDeleteDialogOpen(false);
    } catch (error: any) {
      // Error already handled by hook
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleBulkMove = async () => {
    if (selectedRows.size === 0) return;
    setIsBulkMoving(true);
    try {
      const containerId = bulkMoveContainerId === "none" ? null : bulkMoveContainerId;
      const { error } = await supabase
        .from("cache_inventory")
        .update({ container_id: containerId })
        .in("id", Array.from(selectedRows));
      
      if (error) throw error;
      
      const containerName = containerId
        ? items.filter(i => i.asset_type === "container" && i.id === containerId).map(i => i.box_number || i.description).join("") || "container"
        : "no container";
      
      toast({
        title: `${selectedRows.size} items moved to ${containerName}`,
      });
      
      setSelectedRows(new Set());
      setBulkMoveDialogOpen(false);
      setBulkMoveContainerId("none");
      await refetch();
    } catch (err: any) {
      toast({
        title: "Failed to move items",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsBulkMoving(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      // Delete all items using the unified hook
      const allItemIds = items.map(item => item.id);
      if (allItemIds.length === 0) {
        setDeleteAllDialogOpen(false);
        return;
      }
      
      const success = await deleteItems(allItemIds);
      if (!success) throw new Error("Failed to delete all items");
      
      setSelectedRows(new Set());
      setDeleteAllDialogOpen(false);
    } catch (error: any) {
      throw error; // Re-throw to let dialog know it failed
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Mobile handlers
  const handleMobileQuickAction = (item: CacheInventoryItem, action: 'assign' | 'service') => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };

  const handleMobileOpenContainer = (containerId: string) => {
    const containerItem = items.find(i => i.id === containerId && i.asset_type === "container");
    if (containerItem) {
      handleViewItem(containerItem);
    }
  };

  const handleRemoveFilter = useCallback((key: keyof typeof filters, value?: string) => {
    if (key === 'isInternal') {
      setFilters(prev => ({ ...prev, isInternal: null }));
    } else if (key === 'customFields' && value) {
      const sepIdx = value.indexOf(":");
      const attrId = value.slice(0, sepIdx);
      const attrVal = value.slice(sepIdx + 1);
      setFilters(prev => {
        const current = prev.customFields?.[attrId] || [];
        const updated = current.filter(v => v !== attrVal);
        const newCustomFields = { ...prev.customFields };
        if (updated.length === 0) {
          delete newCustomFields[attrId];
        } else {
          newCustomFields[attrId] = updated;
        }
        return { ...prev, customFields: newCustomFields };
      });
    } else if (value && Array.isArray(filters[key])) {
      setFilters(prev => ({
        ...prev,
        [key]: (prev[key] as string[]).filter(v => v !== value),
      }));
    }
  }, [filters]);

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      section: [],
      subcategory: [],
      manufacturer: [],
      status: [],
      groupAbbv: [],
      groupYear: [],
      isInternal: null,
      container: [],
      expiringDays: null,
      assetType: "all",
      customFields: {},
    });
    setQuickFilter("all");
    setChipCategory(null);
    setChipLocation(null);
    setSummaryFilter(null);
  }, []);

  const customFieldFilterCount = Object.values(filters.customFields || {}).reduce((sum, v) => sum + v.length, 0);

  const activeFilterCount = 
    filters.section.length +
    filters.subcategory.length +
    filters.manufacturer.length +
    filters.status.length +
    filters.groupAbbv.length +
    filters.groupYear.length +
    (filters.isInternal !== null ? 1 : 0) +
    customFieldFilterCount;

  const hasActiveFilters = activeFilterCount > 0 || filters.search.trim().length > 0 || quickFilter !== "all" || chipCategory !== null || chipLocation !== null;

  // Error state
  if (error && items.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Failed to load inventory</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We couldn't load the inventory data. This might be a temporary issue.
            </p>
          </div>
          <Button onClick={() => refetch?.()} className="gap-2">
            <Loader2 className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className="bg-card border-border/50" style={{ boxShadow: "var(--shadow-metric)" }}>
        <TableLoadingSkeleton rows={8} />
      </Card>
    );
  }

  // Empty state (no data at all)
  if (items.length === 0) {
    return (
      <>
        <Card className={isMobile ? "m-4 p-6" : "p-6"} style={{ boxShadow: "var(--shadow-metric)" }}>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Package className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Add your first item</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-2">
                Items track inventory, equipment, or supplies. Add your first item to get started.
              </p>
              <p className="text-xs text-muted-foreground/70">
                💡 You can also import items from a spreadsheet for bulk uploads.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
              <Button onClick={() => setAddModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import Spreadsheet
              </Button>
            </div>
          </div>
        </Card>

        {/* Mobile FAB - Item context */}
        <MobileAssetFAB 
          mode="item"
          onAddItem={() => setAddModalOpen(true)} 
          onAddContainer={() => setAddContainerModalOpen(true)} 
        />

        {/* Modals */}
        <AddCacheItemModal 
          open={addModalOpen} 
          onOpenChange={(v) => { setAddModalOpen(v); if (!v) setScanPrefillBarcode(null); }}
          onAdded={() => refetch?.()}
          prefillBarcode={scanPrefillBarcode}
        />
        <AssetsImportWizard 
          open={uploadModalOpen} 
          onOpenChange={setUploadModalOpen} 
          onImported={() => refetch?.()}
        />
        <AddBoxModal
          isOpen={addContainerModalOpen}
          onClose={() => setAddContainerModalOpen(false)}
          onCreateAnother={() => { setAddContainerModalOpen(false); setTimeout(() => setAddContainerModalOpen(true), 150); }}
        />
      </>
    );
  }

  return (
    <>
      {/* Mobile View */}
      {isMobile ? (
        <div className="min-h-screen bg-background -mx-4 sm:-mx-6 lg:mx-0">
          <MobileSearchHeader
            searchValue={filters.search}
            onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
            onFilterClick={() => setMobileFilterOpen(true)}
            onMoreClick={() => setMobileActionsOpen(true)}
            filterCount={activeFilterCount}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onScanClick={() => setScannerOpen(true)}
            hideFilterButton
          />

          {/* Quick Filter Chips — always visible */}
          <div className="px-4 pb-1">
            <QuickFilterChips
              items={items}
              activeFilter={quickFilter}
              onFilterChange={setQuickFilter}
              categories={uniqueValues.subcategories}
              activeCategory={chipCategory}
              onCategoryChange={setChipCategory}
              locations={uniqueValues.sections}
              activeLocation={chipLocation}
              onLocationChange={setChipLocation}
            />
          </div>

          <ActiveFilterChips 
            filters={filters} 
            onRemoveFilter={handleRemoveFilter}
            uniqueValues={uniqueValues}
          />

          {/* Filtered totals bar */}
          {sortedGroupedItems.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">{sortedGroupedItems.length}</span> assets</span>
              <span className="text-border">·</span>
              <span>Total Qty: <span className="font-medium text-foreground">{filteredItems.reduce((sum, i) => sum + (i.quantity_available || 0), 0).toLocaleString()}</span></span>
              {sortedGroupedItems.length < items.length && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground/70">of {items.length} total</span>
                </>
              )}
            </div>
          )}

          <MobileAlertsBanner
            items={items}
            isFilteringAlerts={isFilteringAlerts}
            onToggleAlertFilter={() => setIsFilteringAlerts(prev => !prev)}
          />

          {(() => {
            const mobileItems = isFilteringAlerts ? filterAlertItems(filteredItems) : filteredItems;
            const MOBILE_PAGE_SIZE = 25;
            const mobileTotalPages = Math.ceil(mobileItems.length / MOBILE_PAGE_SIZE);
            const mobilePaginatedItems = mobileItems.slice(
              (currentPage - 1) * MOBILE_PAGE_SIZE,
              currentPage * MOBILE_PAGE_SIZE
            );
            return (
              <>
                <MobileAssetList
                  items={mobilePaginatedItems}
                  loading={loading}
                  onViewItem={handleViewItem}
                  onQuickAction={handleMobileQuickAction}
                  onMoveItem={handleMoveItem}
                  onDeleteItem={handleDeleteItem}
                  onOpenContainer={handleMobileOpenContainer}
                  onRefresh={handleRefresh}
                  hasFilters={hasActiveFilters || isFilteringAlerts}
                  onClearFilters={() => { setIsFilteringAlerts(false); handleClearAllFilters(); }}
                  totalItemCount={items.length}
                />
                <MobilePagination
                  currentPage={currentPage}
                  totalPages={mobileTotalPages}
                  totalItems={mobileItems.length}
                  onPageChange={setCurrentPage}
                />
              </>
            );
          })()}

          <MobileAssetFAB 
            mode="item"
            onAddItem={() => setAddModalOpen(true)} 
            onAddContainer={() => setAddContainerModalOpen(true)} 
          />

          <AddBoxModal
            isOpen={addContainerModalOpen}
            onClose={() => setAddContainerModalOpen(false)}
            onCreateAnother={() => { setAddContainerModalOpen(false); setTimeout(() => setAddContainerModalOpen(true), 150); }}
          />

          <MobileFilterSheet
            open={mobileFilterOpen}
            onOpenChange={setMobileFilterOpen}
            filters={filters}
            onFiltersChange={setFilters}
            uniqueValues={uniqueValues}
          />

          <MobileActionsSheet
            open={mobileActionsOpen}
            onOpenChange={setMobileActionsOpen}
            onImport={() => setUploadModalOpen(true)}
            onExportCsv={() => handleExport("csv")}
            onExportExcel={() => handleExport("excel")}
            onExportPdf={() => handleExport("pdf")}
            onDeleteAll={() => setDeleteAllDialogOpen(true)}
            selectedCount={selectedRows.size}
            onBulkDelete={selectedRows.size > 0 ? () => setBatchDeleteDialogOpen(true) : undefined}
          />
        </div>
      ) : (
        /* Desktop View */
        <div className="space-y-4">
          {/* Summary Cards */}
          <InventorySummaryCards
            items={items}
            activeFilter={summaryFilter}
            onFilterChange={setSummaryFilter}
          />

          {/* Data Health Banner */}
          <DataHealthPanel compact />

          <Card className="p-4 bg-card border-border/50" style={{ boxShadow: "var(--shadow-metric)" }}>
          {/* Streamlined Toolbar */}
          <div className="space-y-3 mb-4">
            <InventoryToolbar
              itemCount={sortedGroupedItems.length}
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              onAddItem={() => setAddModalOpen(true)}
              onAddContainer={() => setAddContainerModalOpen(true)}
              onImport={() => setUploadModalOpen(true)}
              onExport={handleExport}
              onPrint={() => setShowPrintView(true)}
              optionalColumns={availableOptionalColumns}
              visibleColumns={visibleOptionalColumns}
              onToggleColumn={toggleColumnVisibility}
            />

            {showPrintView && (
              <InventoryPrintView
                items={filteredItems}
                visibleOptionalColumns={visibleOptionalColumns}
                onClose={() => setShowPrintView(false)}
              />
            )}

            {/* Quick Filter Bar */}
            <QuickFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              uniqueValues={uniqueValues}
              onScanClick={() => setScannerOpen(true)}
            />

            {/* Quick Filter Chips — always visible on desktop too */}
            <QuickFilterChips
              items={items}
              activeFilter={quickFilter}
              onFilterChange={(f) => {
                setQuickFilter(f);
                // Sync: clear summary card filter when using chips
                setSummaryFilter(null);
              }}
              categories={uniqueValues.subcategories}
              activeCategory={chipCategory}
              onCategoryChange={setChipCategory}
              locations={uniqueValues.sections}
              activeLocation={chipLocation}
              onLocationChange={setChipLocation}
            />
          </div>

          {/* Filtered totals */}
          {sortedGroupedItems.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pb-1">
              <span><span className="font-medium text-foreground">{sortedGroupedItems.length}</span> assets</span>
              <span className="text-border">·</span>
              <span>Total Qty: <span className="font-medium text-foreground">{filteredItems.reduce((sum, i) => sum + (i.quantity_available || 0), 0).toLocaleString()}</span></span>
              {sortedGroupedItems.length < items.length && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground/70">of {items.length} total</span>
                </>
              )}
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10 border-b border-border/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pr-0">
                      <Checkbox
                        checked={
                          selectedRows.size === paginatedGroups.flatMap(g => g.items).length && paginatedGroups.flatMap(g => g.items).length > 0
                        }
                        onCheckedChange={toggleAllRows}
                      />
                    </TableHead>
                    {/* Photo thumbnail column */}
                    <TableHead className="w-14 pr-0" />
                    <TableHead 
                      className="min-w-[280px] cursor-pointer hover:bg-muted/60 transition-colors text-foreground/80 font-semibold text-xs uppercase tracking-wider"
                      onClick={() => handleSort("description")}
                    >
                      <div className="flex items-center gap-2">
                        Item
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-20 text-right cursor-pointer hover:bg-muted/60 transition-colors text-foreground/80 font-semibold text-xs uppercase tracking-wider"
                      onClick={() => handleSort("quantity_available")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Qty
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    </TableHead>
                    <TableHead className="w-28 text-foreground/80 font-semibold text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    {effectiveVisibleColumns.has("expiration") && (
                      <TableHead 
                        className="w-28 cursor-pointer hover:bg-muted/60 transition-colors text-foreground/80 font-semibold text-xs uppercase tracking-wider"
                        onClick={() => handleSort("date_expire")}
                      >
                        <div className="flex items-center gap-2">
                          Expiration
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="w-28 text-foreground/80 font-semibold text-xs uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <td colSpan={7}>
                        <TableEmptyState 
                          hasFilters={hasActiveFilters}
                          onClearFilters={handleClearAllFilters}
                          onAddItem={() => setAddModalOpen(true)}
                          onAddContainer={() => setAddContainerModalOpen(true)}
                          searchQuery={filters.search}
                          totalItemCount={items.length}
                        />
                      </td>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group) => (
                      <GroupedTableRow
                        key={group.groupKey}
                        group={group}
                        isSelected={group.items.every(item => selectedRows.has(item.id))}
                        isHighlighted={group.items.some(item => highlightedRowId === item.id)}
                        expandedGroups={expandedGroups}
                        onToggleExpand={toggleGroupExpand}
                        onSelect={toggleRowSelection}
                        onSelectGroup={handleSelectGroup}
                        onView={handleViewItem}
                        onEdit={handleEditItem}
                        onDuplicate={handleDuplicateItem}
                        onMove={handleMoveItem}
                        onDelete={handleDeleteItem}
                        onCheckout={handleCheckoutItem}
                        onRefresh={refetch}
                        showManufacturer={effectiveVisibleColumns.has("manufacturer")}
                        showExpiration={effectiveVisibleColumns.has("expiration")}
                        selectedRows={selectedRows}
                        containerAncestryMap={containerAncestryMap}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <EnhancedPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={sortedGroupedItems.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(count) => {
                  setItemsPerPage(count);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </Card>
        </div>
      )}

      {/* Floating Bulk Actions */}
      <FloatingBulkActions
        selectedCount={selectedRows.size}
        onClearSelection={() => setSelectedRows(new Set())}
        onDelete={() => setBatchDeleteDialogOpen(true)}
        onMove={() => { setBulkMoveContainerId("none"); setBulkMoveDialogOpen(true); }}
        onExport={() => handleExport("csv")}
      />

      {/* Item Details Drawer */}
      <ItemDetailsDrawer
        item={selectedItem}
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        onEdit={() => selectedItem && handleEditItem(selectedItem)}
        onDuplicate={() => selectedItem && handleDuplicateItem(selectedItem)}
        onMove={() => selectedItem && handleMoveItem(selectedItem)}
        onDelete={async () => selectedItem && handleDeleteItem(selectedItem)}
      />

      {/* Modals */}
      <AddCacheItemModal 
        open={addModalOpen} 
        onOpenChange={(v) => { setAddModalOpen(v); if (!v) setScanPrefillBarcode(null); }}
        onAdded={() => refetch?.()}
        prefillBarcode={scanPrefillBarcode}
      />

      <AssetsImportWizard 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen} 
        onImported={() => refetch?.()}
      />

      {/* Export Fields Modal */}
      <ExportFieldsModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        fields={exportFields}
        formats={["csv", "excel", "pdf"]}
        onExport={(fields, format) => executeExport(fields, pendingExportFormat || format)}
        filterSummary={filterSummary}
        title="Export Inventory"
        itemCount={selectedRows.size > 0 ? selectedRows.size : filteredItems.length}
      />

      <AddBoxModal
        isOpen={addContainerModalOpen}
        onClose={() => setAddContainerModalOpen(false)}
        onCreateAnother={() => { setAddContainerModalOpen(false); setTimeout(() => setAddContainerModalOpen(true), 150); }}
      />

      {selectedItem && (
        <CacheInventoryEditModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          item={selectedItem}
          onSaved={() => {
            refetch?.();
            setHighlightedRowId(selectedItem.id);
            setTimeout(() => setHighlightedRowId(null), 2000);
          }}
        />
      )}

      {selectedForMove && (
        <MoveCacheItemModal
          open={moveModalOpen}
          onOpenChange={setMoveModalOpen}
          item={selectedForMove}
          onMoved={() => refetch?.()}
        />
      )}

      {selectedForDuplicate && (
        <DuplicateCacheItemModal
          open={duplicateModalOpen}
          onOpenChange={setDuplicateModalOpen}
          item={selectedForDuplicate}
          onDuplicated={() => refetch?.()}
        />
      )}

      {/* Delete Single Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Item
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete "{itemToDelete?.description || 'this item'}"?</p>
              <p className="text-destructive text-sm">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingItem}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
              disabled={isDeletingItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingItem ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Container Delete Dialog (with contents handling) */}
      <ContainerDeleteDialog
        open={containerDeleteDialogOpen}
        onOpenChange={setContainerDeleteDialogOpen}
        container={itemToDelete}
        allItems={items}
        onConfirmDelete={handleContainerDeleteConfirm}
        isDeleting={isDeletingItem}
      />

      {/* Batch Delete Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selectedRows.size} Items
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete {selectedRows.size} selected items?</p>
              <p className="text-destructive text-sm">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBatchDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Selected"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Dialog - Two-step confirmation */}
      <DeleteAllConfirmationDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        itemCount={items.length}
        onConfirm={handleDeleteAll}
        isDeleting={isDeletingAll}
      />

      {/* Checkout Modal */}
      {selectedForCheckout && (
        <ItemCheckoutDialog
          open={checkoutModalOpen}
          onOpenChange={setCheckoutModalOpen}
          item={selectedForCheckout}
          onSuccess={() => refetch?.()}
        />
      )}

      {/* Bulk Move to Container Dialog */}
      <AlertDialog open={bulkMoveDialogOpen} onOpenChange={setBulkMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MoveHorizontal className="h-5 w-5" />
              Move {selectedRows.size} Items to Container
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select a container to move the selected items into.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={bulkMoveContainerId}
              onChange={(e) => setBulkMoveContainerId(e.target.value)}
            >
              <option value="none">None (remove from container)</option>
              {items.filter(i => i.asset_type === "container").map(c => (
                <option key={c.id} value={c.id}>
                  {c.box_number || c.description}{c.description && c.box_number ? ` — ${c.description}` : ""}
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkMoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkMove}
              disabled={isBulkMoving}
            >
              {isBulkMoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move Items"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Container details drawer for mobile */}
      <BoxDetailsDrawer
        box={selectedContainer}
        isOpen={containerDrawerOpen}
        onClose={() => {
          setContainerDrawerOpen(false);
          setSelectedContainer(null);
        }}
      />

      {/* Barcode Scanner Drawer — scan to search */}
      <BarcodeScannerDrawer
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onItemFound={(item) => {
          console.log("[ScanToSearch] Item found:", item.description, item.barcode);
          handleViewItem(item);
          toast({
            title: "Item found",
            description: item.description || item.barcode || "Barcode matched",
          });
        }}
        onCodeNotFound={(code) => {
          console.log("[ScanToSearch] No match for barcode:", code);
          toast({
            title: "No item found",
            description: `No item with barcode "${code}". You can create one with this barcode prefilled.`,
            variant: "destructive",
          });
        }}
        onCreateNewItem={(code) => {
          setScannerOpen(false);
          setScanPrefillBarcode(code);
          setTimeout(() => setAddModalOpen(true), 200);
        }}
        onSearchInventory={(code) => {
          setScannerOpen(false);
          setFilters(prev => ({ ...prev, search: code }));
        }}
      />
    </>
  );
};
