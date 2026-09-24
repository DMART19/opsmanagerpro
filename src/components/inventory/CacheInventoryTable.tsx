import { useState, useMemo, useEffect } from "react";
import { useBoxes } from "@/hooks/use-boxes";
import { Upload, Download, ArrowUpDown, FileDown, Plus, Trash2, Loader2, AlertTriangle, Settings2, Package, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCacheInventory, CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { AssetsImportWizard } from "./AssetsImportWizard";
import { CacheInventoryEditModal } from "./CacheInventoryEditModal";
import { InventoryFilterBar } from "./InventoryFilterBar";
import { InlineEditableCell } from "./InlineEditableCell";
import { InventoryRowActions } from "./InventoryRowActions";
import { AddCacheItemModal } from "./AddCacheItemModal";
import { MoveCacheItemModal } from "./MoveCacheItemModal";
import { DuplicateCacheItemModal } from "./DuplicateCacheItemModal";
import { BulkActionsBar } from "./BulkActionsBar";
import { ColumnVisibilityControl, ColumnConfig } from "./ColumnVisibilityControl";
import { EnhancedPagination } from "./EnhancedPagination";
import { StatusIndicator } from "./StatusIndicator";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { createPreActionSnapshot } from "@/lib/snapshot-utils";
import { toast } from "@/hooks/use-toast";
import { DataFreshness } from "@/components/ui/data-freshness";
import { ASSETS_TOOLTIPS, GENERAL_TOOLTIPS } from "@/lib/tooltip-content";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";
import { QuickAdjustModal, QuickAdjustMode } from "./QuickAdjustModal";
const COLUMN_CONFIG: ColumnConfig[] = [
  { id: "id_cache_fema", label: "Item ID", defaultVisible: true, priority: "high" },
  { id: "barcode", label: "Barcode", defaultVisible: true, priority: "high" },
  { id: "section", label: "Location", defaultVisible: true, priority: "high" },
  { id: "description", label: "Description", defaultVisible: true, priority: "high" },
  { id: "status_item", label: "Status", defaultVisible: true, priority: "high" },
  { id: "quantity_available", label: "Qty Available", defaultVisible: true, priority: "high" },
  { id: "id_cache_tf", label: "Reference ID", defaultVisible: false, priority: "low" },
  { id: "subcategory", label: "Category", defaultVisible: true, priority: "medium" },
  { id: "manufacturer", label: "Manufacturer", defaultVisible: true, priority: "medium" },
  { id: "model_part_num", label: "Model / Part #", defaultVisible: false, priority: "low" },
  { id: "serial_number", label: "Serial #", defaultVisible: false, priority: "low" },
  { id: "date_expire", label: "Expiration", defaultVisible: true, priority: "medium" },
  { id: "quantity_out", label: "Qty Out", defaultVisible: false, priority: "low" },
  { id: "group_abbv", label: "Group", defaultVisible: false, priority: "low" },
  { id: "is_internal", label: "Internal", defaultVisible: false, priority: "low" },
  { id: "group_year", label: "Year", defaultVisible: false, priority: "low" },
];

const DEFAULT_ITEMS_PER_PAGE = 50;
const COLUMN_VISIBILITY_KEY = "cache_inventory_visible_columns";
const ITEMS_PER_PAGE_KEY = "cache_inventory_items_per_page";

export const CacheInventoryTable = () => {
  const { items, loading, error, refetch } = useCacheInventory();
  const isMobile = useIsMobile();
  const [selectedItem, setSelectedItem] = useState<CacheInventoryItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<CacheInventoryItem>>({});
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedForMove, setSelectedForMove] = useState<CacheInventoryItem | null>(null);
  const [selectedForDuplicate, setSelectedForDuplicate] = useState<CacheInventoryItem | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mobile-specific state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanQuickAdjustItem, setScanQuickAdjustItem] = useState<CacheInventoryItem | null>(null);
  const [scanQuickAdjustMode, setScanQuickAdjustMode] = useState<QuickAdjustMode | null>(null);
  const [scanToMoveItem, setScanToMoveItem] = useState<CacheInventoryItem | null>(null);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set(COLUMN_CONFIG.filter(c => c.defaultVisible).map(c => c.id));
      }
    }
    return new Set(COLUMN_CONFIG.filter(c => c.defaultVisible).map(c => c.id));
  });

  // Items per page state with localStorage persistence
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem(ITEMS_PER_PAGE_KEY);
    return saved ? Number(saved) : DEFAULT_ITEMS_PER_PAGE;
  });

  // Persist column visibility
  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

  // Persist items per page
  useEffect(() => {
    localStorage.setItem(ITEMS_PER_PAGE_KEY, String(itemsPerPage));
  }, [itemsPerPage]);

  useEffect(() => {
    if (!loading && items) {
      setLastUpdated(new Date());
    }
  }, [loading, items]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch?.();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  const handleShowAllColumns = () => {
    setVisibleColumns(new Set(COLUMN_CONFIG.map(c => c.id)));
  };

  const handleShowDefaultColumns = () => {
    setVisibleColumns(new Set(COLUMN_CONFIG.filter(c => c.defaultVisible).map(c => c.id)));
  };

  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const { boxes } = useBoxes();
  const [filters, setFilters] = useState({
    search: "",
    section: [] as string[],
    subcategory: [] as string[],
    manufacturer: [] as string[],
    status: [] as string[],
    groupAbbv: [] as string[],
    groupYear: [] as string[],
    isInternal: null as string | null,
    container: [] as string[],
    expiringDays: null as number | null,
    assetType: "all" as "all" | "item" | "container",
    customFields: {} as Record<string, string[]>,
  });
  const [isFilteringAlerts, setIsFilteringAlerts] = useState(false);

  const uniqueValues = useMemo(() => {
    const buildTaxonomyOptions = (idKey: string, nameKey: string) => {
      const map = new Map<string, string>();
      items.forEach(i => {
        const id = (i as any)[idKey];
        const name = (i as any)[nameKey];
        if (id && name) map.set(id, name);
      });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    };

    return {
      sections: [...new Set(items.map(i => i.section).filter(Boolean))].sort() as string[],
      subcategories: buildTaxonomyOptions('category_id', 'subcategory'),
      manufacturers: buildTaxonomyOptions('manufacturer_id', 'manufacturer'),
      statuses: buildTaxonomyOptions('asset_status_id', 'status_item'),
      groupAbbvs: buildTaxonomyOptions('asset_group_id', 'group_abbv'),
      groupYears: [...new Set(items.map(i => i.group_year).filter(Boolean))].sort() as number[],
      containers: (boxes || []).map(b => ({ id: b.id, label: b.box_number })),
      customFields: [] as { attributeId: string; attributeName: string; values: string[] }[],
    };
  }, [items, boxes]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getExpirationStatus = (dateExpire: string | null) => {
    if (!dateExpire) return null;
    const expDate = new Date(dateExpire);
    const today = new Date();
    const daysUntilExpire = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpire < 0) return "expired";
    if (daysUntilExpire < 90) return "expiring-soon";
    return "valid";
  };

  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.barcode?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.manufacturer?.toLowerCase().includes(query) ||
        item.model_part_num?.toLowerCase().includes(query) ||
        item.serial_number?.toLowerCase().includes(query) ||
        item.group_abbv?.toLowerCase().includes(query)
      );
    }

    // Multi-select filters
    if (filters.section.length > 0) {
      filtered = filtered.filter(item => item.section && filters.section.includes(item.section));
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

    if (sortBy) {
      filtered.sort((a, b) => {
        let aVal = a[sortBy as keyof CacheInventoryItem];
        let bVal = b[sortBy as keyof CacheInventoryItem];
        
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
  }, [items, filters, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    // Use human-readable column headers for exports
    const exportData = filteredItems.map(item => ({
      "Item ID": item.id_cache_fema || "",
      "Reference ID": item.id_cache_tf || "",
      "Barcode": item.barcode || "",
      "Location": item.section || "",
      "Category": item.subcategory || "",
      "Description": item.description || "",
      "Manufacturer": item.manufacturer || "",
      "Model / Part #": item.model_part_num || "",
      "Serial #": item.serial_number || "",
      "Expiration": item.date_expire || "",
      "Qty Out": item.quantity_out,
      "Qty Available": item.quantity_available,
      "Status": item.status_item || "",
      "Group": item.group_abbv || "",
      "Internal": item.is_internal ? "Yes" : "No",
      "Year": item.group_year || "",
    }));

    if (format === "excel" || format === "csv") {
      const { createExcelFile, createCsvFile } = await import("@/lib/excel-utils");
      const filename = `cache-inventory-${new Date().toISOString().split('T')[0]}`;
      
      if (format === "excel") {
        await createExcelFile(exportData, `${filename}.xlsx`, "Cache Inventory");
      } else {
        createCsvFile(exportData, `${filename}.csv`);
      }
    } else if (format === "pdf") {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      
      doc.setFontSize(16);
      doc.text("Inventory Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
      
      let y = 30;
      const pageHeight = doc.internal.pageSize.height;
      
      exportData.slice(0, 50).forEach((item, i) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${item["Item ID"]} | ${item["Description"]?.substring(0, 40)} | ${item["Manufacturer"]}`, 14, y);
        y += 7;
      });
      
      doc.save(`cache-inventory-${new Date().toISOString().split('T')[0]}.pdf`);
    }
    
    toast({
      title: "Export successful",
      description: `Exported ${exportData.length} items as ${format.toUpperCase()}`,
    });
  };

  const handleUpdateField = async (itemId: string, field: keyof CacheInventoryItem, value: any) => {
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .update({ [field]: value })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Field updated successfully",
      });
      
      // Highlight the updated row
      setHighlightedRowId(itemId);
      setTimeout(() => setHighlightedRowId(null), 2000);
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartRowEdit = (item: CacheInventoryItem) => {
    setEditingRowId(item.id);
    setEditingData({ ...item });
  };

  const handleCancelRowEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  const handleSaveRowEdit = async () => {
    if (!editingRowId) return;

    try {
      // Only send real DB columns — virtual joined fields (manufacturer, subcategory,
      // status_item, group_abbv) are display aliases; use their FK column names instead.
      const { error } = await supabase
        .from("cache_inventory")
        .update({
          id_cache_fema: editingData.id_cache_fema || null,
          id_cache_tf: editingData.id_cache_tf || null,
          barcode: editingData.barcode || null,
          section: editingData.section || null,
          description: editingData.description || null,
          model_part_num: editingData.model_part_num || null,
          serial_number: editingData.serial_number || null,
          date_expire: editingData.date_expire || null,
          quantity_out: editingData.quantity_out || 0,
          quantity_available: editingData.quantity_available || 0,
          is_internal: editingData.is_internal || false,
          group_year: editingData.group_year || null,
          // Relational FK columns (set from row data which carries the IDs)
          manufacturer_id: editingData.manufacturer_id || null,
          category_id: editingData.category_id || null,
          asset_status_id: editingData.asset_status_id || null,
          asset_group_id: editingData.asset_group_id || null,
        })
        .eq("id", editingRowId);

      if (error) throw error;

      toast({
        title: "Item updated",
        description: "Changes saved successfully",
      });

      // Highlight the saved row
      setHighlightedRowId(editingRowId);
      setTimeout(() => setHighlightedRowId(null), 2000);

      setEditingRowId(null);
      setEditingData({});
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditFieldChange = (field: keyof CacheInventoryItem, value: any) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Item deleted successfully",
      });
      
      // Remove from selection if it was selected
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) return;

    setIsBatchDeleting(true);
    try {
      // Create pre-action snapshot before bulk deletion
      await createPreActionSnapshot(`Bulk delete ${selectedRows.size} asset(s)`);

      const { error } = await supabase
        .from("cache_inventory")
        .delete()
        .in("id", Array.from(selectedRows));

      if (error) throw error;

      toast({
        title: "✅ Batch delete successful",
        description: `Deleted ${selectedRows.size} items`,
      });
      
      setSelectedRows(new Set());
      setBatchDeleteDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Batch delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;

      toast({
        title: "✅ All items deleted",
        description: "Successfully deleted all items from the cache inventory.",
      });
      
      setSelectedRows(new Set());
      setDeleteAllDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Delete all failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const toggleRowSelection = (itemId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === paginatedItems.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedItems.map(item => item.id)));
    }
  };

  const handleOpenMove = (item: CacheInventoryItem) => {
    setSelectedForMove(item);
    setMoveModalOpen(true);
  };

  const handleOpenDuplicate = (item: CacheInventoryItem) => {
    setSelectedForDuplicate(item);
    setDuplicateModalOpen(true);
  };

  // Mobile-specific handlers
  const handleViewItem = (item: CacheInventoryItem) => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };

  const handleMobileQuickAction = (item: CacheInventoryItem, action: 'assign' | 'service') => {
    // For now, open the edit modal - could be expanded to quick status change
    setSelectedItem(item);
    setEditModalOpen(true);
    toast({
      title: action === 'assign' ? "Assign Asset" : "Mark for Service",
      description: `Opening ${item.description || item.id_cache_fema || 'asset'} for editing`,
    });
  };

  const handleRemoveFilter = (key: keyof typeof filters, value?: string) => {
    if (key === 'isInternal') {
      setFilters(prev => ({ ...prev, isInternal: null }));
    } else if (value && Array.isArray(filters[key])) {
      setFilters(prev => ({
        ...prev,
        [key]: (prev[key] as string[]).filter(v => v !== value),
      }));
    }
  };

  const handleClearAllFilters = () => {
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
  };

  const activeFilterCount = 
    filters.section.length +
    filters.subcategory.length +
    filters.manufacturer.length +
    filters.status.length +
    filters.groupAbbv.length +
    filters.groupYear.length +
    (filters.isInternal !== null ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || filters.search.trim().length > 0;
  // Error state with retry option
  if (error && items.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Failed to load assets</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We couldn't load the asset data. This might be a temporary issue.
            </p>
          </div>
          <Button onClick={() => refetch?.()} className="gap-2">
            <Loader2 className="h-4 w-4" />
            Retry Loading
          </Button>
        </div>
      </Card>
    );
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Empty state with guidance
  if (items.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-2">
              Start tracking equipment, supplies, or resources by adding your first asset.
            </p>
            <p className="text-xs text-muted-foreground/70">
              💡 Tip: You can also import items from a spreadsheet for bulk uploads.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Asset
            </Button>
            <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Import from Spreadsheet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/60 pt-2">
            You can edit or delete items anytime
          </p>
        </div>
        <AddCacheItemModal 
          open={addModalOpen} 
          onOpenChange={setAddModalOpen} 
          onAdded={() => refetch?.()}
        />
        <AssetsImportWizard 
          open={uploadModalOpen} 
          onOpenChange={setUploadModalOpen} 
          onImported={() => refetch?.()}
        />
      </Card>
    );
  }

  return (
    <>
      {/* Mobile View */}
      {isMobile ? (
        <div className="min-h-screen bg-background -mx-4 sm:-mx-6 lg:mx-0">
          {/* Mobile Search Header - Sticky */}
          <MobileSearchHeader
            searchValue={filters.search}
            onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
            onFilterClick={() => setMobileFilterOpen(true)}
            onMoreClick={() => setMobileActionsOpen(true)}
            filterCount={activeFilterCount}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onScanClick={() => setScannerOpen(true)}
          />

          {/* Active Filter Chips */}
          <ActiveFilterChips 
            filters={filters} 
            onRemoveFilter={handleRemoveFilter}
            uniqueValues={uniqueValues}
          />

          <MobileAlertsBanner
            items={items}
            isFilteringAlerts={isFilteringAlerts}
            onToggleAlertFilter={() => setIsFilteringAlerts(prev => !prev)}
          />

          {/* Mobile Asset List with Pull-to-Refresh */}
          <MobileAssetList
            items={isFilteringAlerts ? filterAlertItems(filteredItems) : filteredItems}
            loading={loading}
            onViewItem={handleViewItem}
            onQuickAction={handleMobileQuickAction}
            onRefresh={handleRefresh}
            hasFilters={hasActiveFilters || isFilteringAlerts}
            onClearFilters={() => { setIsFilteringAlerts(false); handleClearAllFilters(); }}
          />

          {/* Mobile FAB */}
          <MobileAssetFAB 
            onAddItem={() => setAddModalOpen(true)} 
            onAddContainer={() => {}} 
          />

          {/* Mobile Filter Sheet */}
          <MobileFilterSheet
            open={mobileFilterOpen}
            onOpenChange={setMobileFilterOpen}
            filters={filters}
            onFiltersChange={setFilters}
            uniqueValues={uniqueValues}
          />

          {/* Mobile Actions Sheet */}
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
        <Card className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap gap-3 justify-between">
              {/* Left side - Data freshness */}
              <div className="flex items-center gap-4">
                <DataFreshness 
                  lastUpdated={lastUpdated} 
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />
              </div>
              
              {/* Right side - Actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
                
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <span>
                      <ColumnVisibilityControl
                        columns={COLUMN_CONFIG}
                        visibleColumns={visibleColumns}
                        onColumnToggle={handleColumnToggle}
                        onShowAll={handleShowAllColumns}
                        onShowDefaults={handleShowDefaultColumns}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    {ASSETS_TOOLTIPS.columnVisibility}
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    Import assets from CSV or Excel file
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            <FileDown className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport("csv")}>
                            Export as CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("excel")}>
                            Export as Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("pdf")}>
                            Export as PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    {ASSETS_TOOLTIPS.export}
                  </TooltipContent>
                </Tooltip>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      Actions
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setDeleteAllDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Delete All Items
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          <InventoryFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            uniqueValues={uniqueValues}
          />
        </div>

        <div className="rounded-xl border overflow-hidden">
          <ScrollArea className="h-[600px] w-full" orientation="both">
            <div className="min-w-max">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === paginatedItems.length && paginatedItems.length > 0}
                      onCheckedChange={toggleAllRows}
                    />
                  </TableHead>
                  {visibleColumns.has("id_cache_fema") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("id_cache_fema")}>
                      <div className="flex items-center gap-1">
                        Item ID <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("id_cache_tf") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("id_cache_tf")}>
                      <div className="flex items-center gap-1">
                        Reference ID <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("barcode") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("barcode")}>
                      <div className="flex items-center gap-1">
                        Barcode <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("section") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("section")}>
                      <div className="flex items-center gap-1">
                        Section <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("subcategory") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("subcategory")}>
                      <div className="flex items-center gap-1">
                        Category <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("description") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("description")}>
                      <div className="flex items-center gap-1">
                        Description <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("manufacturer") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("manufacturer")}>
                      <div className="flex items-center gap-1">
                        Manufacturer <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("model_part_num") && <TableHead>Model/Part #</TableHead>}
                  {visibleColumns.has("serial_number") && <TableHead>Serial #</TableHead>}
                  {visibleColumns.has("date_expire") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("date_expire")}>
                      <div className="flex items-center gap-1">
                        Expiration <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("quantity_out") && <TableHead>Qty Out</TableHead>}
                  {visibleColumns.has("quantity_available") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("quantity_available")}>
                      <div className="flex items-center gap-1">
                        Qty Available <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("status_item") && (
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort("status_item")}>
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.has("group_abbv") && <TableHead>Group</TableHead>}
                  {visibleColumns.has("is_internal") && <TableHead>Internal</TableHead>}
                  {visibleColumns.has("group_year") && <TableHead>Year</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item, index) => {
                  const expStatus = getExpirationStatus(item.date_expire);
                  const isEditing = editingRowId === item.id;
                  const isHighlighted = highlightedRowId === item.id;
                  
                  return (
                    <TableRow
                      key={item.id}
                      className={`
                        ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        ${isHighlighted ? "animate-pulse bg-yellow-100 dark:bg-yellow-900/20" : ""}
                        ${isEditing ? "ring-2 ring-primary" : ""}
                        ${selectedRows.has(item.id) ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                      `}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(item.id)}
                          onCheckedChange={() => toggleRowSelection(item.id)}
                        />
                      </TableCell>
                      {visibleColumns.has("id_cache_fema") && (
                        <TableCell className="font-mono text-xs">
                          {isEditing ? (
                            <Input
                              value={editingData.id_cache_fema || ""}
                              onChange={(e) => handleEditFieldChange("id_cache_fema", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.id_cache_fema}
                              onSave={(v) => handleUpdateField(item.id, "id_cache_fema", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("id_cache_tf") && (
                        <TableCell className="font-mono text-xs">
                          {isEditing ? (
                            <Input
                              value={editingData.id_cache_tf || ""}
                              onChange={(e) => handleEditFieldChange("id_cache_tf", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.id_cache_tf}
                              onSave={(v) => handleUpdateField(item.id, "id_cache_tf", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("barcode") && (
                        <TableCell className="font-mono text-xs">
                          {isEditing ? (
                            <Input
                              value={editingData.barcode || ""}
                              onChange={(e) => handleEditFieldChange("barcode", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.barcode}
                              onSave={(v) => handleUpdateField(item.id, "barcode", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("section") && (
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingData.section || ""}
                              onChange={(e) => handleEditFieldChange("section", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.section}
                              onSave={(v) => handleUpdateField(item.id, "section", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("subcategory") && (
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingData.subcategory || ""}
                              onChange={(e) => handleEditFieldChange("subcategory", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.subcategory}
                              onSave={(v) => handleUpdateField(item.id, "subcategory", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("description") && (
                        <TableCell className="max-w-xs">
                          {isEditing ? (
                            <Input
                              value={editingData.description || ""}
                              onChange={(e) => handleEditFieldChange("description", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.description}
                              onSave={(v) => handleUpdateField(item.id, "description", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("manufacturer") && (
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingData.manufacturer || ""}
                              onChange={(e) => handleEditFieldChange("manufacturer", e.target.value)}
                              className="h-8"
                              disabled
                              placeholder="Use Edit modal"
                              title="Manufacturer must be changed via the Edit modal"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {item.manufacturer || "—"}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("model_part_num") && (
                        <TableCell className="font-mono text-xs">
                          {isEditing ? (
                            <Input
                              value={editingData.model_part_num || ""}
                              onChange={(e) => handleEditFieldChange("model_part_num", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.model_part_num}
                              onSave={(v) => handleUpdateField(item.id, "model_part_num", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("serial_number") && (
                        <TableCell className="font-mono text-xs">
                          {isEditing ? (
                            <Input
                              value={editingData.serial_number || ""}
                              onChange={(e) => handleEditFieldChange("serial_number", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.serial_number}
                              onSave={(v) => handleUpdateField(item.id, "serial_number", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("date_expire") && (
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingData.date_expire || ""}
                              onChange={(e) => handleEditFieldChange("date_expire", e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.date_expire}
                              onSave={(v) => handleUpdateField(item.id, "date_expire", v)}
                              type="date"
                              className={
                                expStatus === "expired" ? "text-destructive font-medium" :
                                expStatus === "expiring-soon" ? "text-warning font-medium" :
                                "text-success"
                              }
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("quantity_out") && (
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingData.quantity_out || 0}
                              onChange={(e) => handleEditFieldChange("quantity_out", parseInt(e.target.value))}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.quantity_out}
                              onSave={(v) => handleUpdateField(item.id, "quantity_out", v)}
                              type="number"
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("quantity_available") && (
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingData.quantity_available || 0}
                              onChange={(e) => handleEditFieldChange("quantity_available", parseInt(e.target.value))}
                              className="h-8"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <InlineEditableCell
                                value={item.quantity_available}
                                onSave={(v) => handleUpdateField(item.id, "quantity_available", v)}
                                type="number"
                              />
                              {(item.quantity_available !== null && item.quantity_available <= 2 && item.quantity_available > 0) && (
                                <Badge variant="outline" className="h-5 px-1.5 text-xs bg-warning/10 text-warning border-warning/30">
                                  Low
                                </Badge>
                              )}
                              {item.quantity_available === 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                  Out
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("status_item") && (
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editingData.status_item || ""}
                              onValueChange={(v) => handleEditFieldChange("status_item", v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IN">IN</SelectItem>
                                <SelectItem value="OUT">OUT</SelectItem>
                                <SelectItem value="MAINT">MAINT</SelectItem>
                                <SelectItem value="RETIRED">RETIRED</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusIndicator
                              status={item.status_item}
                              quantityAvailable={item.quantity_available}
                              quantityOut={item.quantity_out}
                              dateExpire={item.date_expire}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("group_abbv") && (
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingData.group_abbv || ""}
                              onChange={(e) => handleEditFieldChange("group_abbv", e.target.value.toUpperCase())}
                              className="h-8 uppercase"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.group_abbv}
                              onSave={(v) => handleUpdateField(item.id, "group_abbv", v)}
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("is_internal") && (
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Select
                              value={String(editingData.is_internal)}
                              onValueChange={(v) => handleEditFieldChange("is_internal", v === "true")}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <InlineEditableCell
                              value={item.is_internal}
                              onSave={(v) => handleUpdateField(item.id, "is_internal", v)}
                              type="boolean"
                            />
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("group_year") && (
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingData.group_year || ""}
                              onChange={(e) => handleEditFieldChange("group_year", parseInt(e.target.value))}
                              className="h-8"
                            />
                          ) : (
                            <InlineEditableCell
                              value={item.group_year}
                              onSave={(v) => handleUpdateField(item.id, "group_year", v)}
                              type="number"
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleSaveRowEdit}
                              className="h-8 px-2"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelRowEdit}
                              className="h-8 px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <InventoryRowActions
                            itemId={item.id}
                            onView={() => {
                              setSelectedItem(item);
                              setEditModalOpen(true);
                            }}
                            onEdit={() => handleStartRowEdit(item)}
                            onDuplicate={() => handleOpenDuplicate(item)}
                            onDelete={() => handleDelete(item.id)}
                            onMove={() => handleOpenMove(item)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        <EnhancedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
        </Card>
      )}

      {/* Shared Modals - Used by both mobile and desktop */}
      <AddCacheItemModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdded={refetch}
      />

      <CacheInventoryEditModal
        item={selectedItem}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSaved={(itemId) => {
          setHighlightedRowId(itemId);
          setTimeout(() => setHighlightedRowId(null), 2000);
          refetch();
        }}
      />

      <MoveCacheItemModal
        item={selectedForMove}
        open={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        onMoved={refetch}
      />

      <DuplicateCacheItemModal
        item={selectedForDuplicate}
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        onDuplicated={refetch}
      />

      <AssetsImportWizard
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onImported={refetch}
      />

      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selectedRows.size} Items
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete {selectedRows.size} selected items?</p>
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>This action cannot be undone.</span>
              </div>
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
                "Delete All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete All Items from Cache Inventory
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete ALL {items.length} items from the cache inventory database?</p>
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>This action is permanent and cannot be undone.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Items"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedRows.size}
        onDelete={() => setBatchDeleteDialogOpen(true)}
        onClearSelection={() => setSelectedRows(new Set())}
        isDeleting={isBatchDeleting}
      />

      {/* Barcode Scanner Drawer */}
      <BarcodeScannerDrawer
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open);
          if (!open) setScanToMoveItem(null);
        }}
        onItemFound={(item) => {
          setSelectedItem(item);
          setEditModalOpen(true);
        }}
        onAddStock={(item) => {
          setScanQuickAdjustItem(item);
          setScanQuickAdjustMode("add");
        }}
        onRemoveStock={(item) => {
          setScanQuickAdjustItem(item);
          setScanQuickAdjustMode("remove");
        }}
        onMoveToContainer={(item) => {
          // Start scan-to-move: close scanner, set item, reopen for container scan
          setScannerOpen(false);
          setScanToMoveItem(item);
          setTimeout(() => setScannerOpen(true), 300);
        }}
        onEditItem={(item) => {
          setSelectedItem(item);
          setEditModalOpen(true);
        }}
        onCreateNewItem={(code) => {
          setAddModalOpen(true);
          // The AddCacheItemModal handles barcode pre-fill via its own scanner
        }}
        onSearchInventory={(code) => {
          setFilters(prev => ({ ...prev, search: code }));
        }}
        onAssignContainer={(item) => {
          setSelectedForMove(item);
          setMoveModalOpen(true);
        }}
        scanToMoveItem={scanToMoveItem}
        onScanToMoveComplete={async (item, container) => {
          try {
            const { error } = await supabase
              .from("cache_inventory")
              .update({ container_id: container.id })
              .eq("id", item.id);
            if (error) throw error;
            refetch();
            toast({
              title: "Item moved",
              description: `Moved to ${container.description || container.box_number || "container"}`,
            });
          } catch (err: any) {
            toast({ title: "Move failed", description: err.message, variant: "destructive" });
          }
          setScanToMoveItem(null);
        }}
      />

      {/* Scan Quick Adjust Modal */}
      <QuickAdjustModal
        open={scanQuickAdjustMode !== null}
        onOpenChange={(open) => { if (!open) { setScanQuickAdjustMode(null); setScanQuickAdjustItem(null); } }}
        mode={scanQuickAdjustMode ?? "add"}
        currentQuantity={scanQuickAdjustItem?.quantity_available ?? 0}
        onConfirm={async (newQty) => {
          if (!scanQuickAdjustItem) return;
          const { error } = await supabase
            .from("cache_inventory")
            .update({ quantity_available: newQty })
            .eq("id", scanQuickAdjustItem.id);
          if (error) throw error;
          refetch();
          toast({ title: scanQuickAdjustMode === "add" ? "Stock added" : "Stock removed" });
        }}
      />
    </>
  );
};
