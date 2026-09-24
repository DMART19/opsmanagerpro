import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Calendar,
  Package,
  MapPin,
  Barcode as BarcodeIcon,
  Edit,
  Check,
  Loader2,
  Plus,
  X,
  Box,
  Search,
  MoveHorizontal,
  Printer,
} from "lucide-react";
import { useBoxFiles, useContainerItems } from "@/hooks/use-boxes";
import { useCacheInventory } from "@/hooks/use-cache-inventory";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddItemToContainerModal } from "./AddItemToContainerModal";
import { AddCacheItemModal } from "./AddCacheItemModal";
import { ItemDetailsDrawer } from "./ItemDetailsDrawer";
import { MoveCacheItemModal } from "./MoveCacheItemModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";

interface BoxDetailsDrawerProps {
  box: any;
  isOpen: boolean;
  onClose: () => void;
}

interface AvailableItem {
  id: string;
  description: string | null;
  subcategory: string | null;
  quantity_available: number | null;
  status_item: string | null;
  container_id: string | null;
}

export const BoxDetailsDrawer = ({ box, isOpen, onClose }: BoxDetailsDrawerProps) => {
  const queryClient = useQueryClient();
  const { files, uploadFile, deleteFile, downloadFile } = useBoxFiles(box?.id);
  const { items, isLoading: itemsLoading, removeItemFromContainer, addItemToContainer } = useContainerItems(box?.id);
  const totalQty = items.reduce((sum, item) => sum + (item.quantity_available || 0), 0);
  const { items: allInventoryItems } = useCacheInventory();
  // updateBox now goes directly to cache_inventory
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("items");
  const [showAddItems, setShowAddItems] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [containerItemSearch, setContainerItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAddNewItem, setShowAddNewItem] = useState(false);
  
  // Cross-link: view item detail from container
  const [viewingItem, setViewingItem] = useState<CacheInventoryItem | null>(null);
  const [viewingItemOpen, setViewingItemOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<CacheInventoryItem | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  
  // Inline edit state for container name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (box) {
      setEditName(box.box_number || "");
      setEditDescription(box.box_description || "");
    }
  }, [box]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    if (!box || !editName.trim()) return;
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .update({
          box_number: editName.trim(),
          description: editDescription.trim() || null,
        })
        .eq("id", box.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      setIsEditingName(false);
    } catch {
      // error handled
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelNameEdit = () => {
    setEditName(box?.box_number || "");
    setEditDescription(box?.box_description || "");
    setIsEditingName(false);
  };

  // Track if user has pending unsaved state
  const hasUnsavedState = showAddItems && itemSearch.length > 0;

  const handleSafeExit = useCallback(() => {
    if (hasUnsavedState) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedState, onClose]);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setShowAddItems(false);
    setItemSearch("");
    setContainerItemSearch("");
    onClose();
  };

  // Keyboard support: Escape to exit
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSafeExit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile, handleSafeExit]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddItems(false);
      setItemSearch("");
      setContainerItemSearch("");
      setActiveTab("items");
      setShowAddNewItem(false);
    }
  }, [isOpen]);

  if (!box) return null;

  // Get items that aren't in any container
  const availableItems = allInventoryItems.filter(
    (item) => !item.container_id && 
    (item.description?.toLowerCase().includes(itemSearch.toLowerCase()) ||
     item.subcategory?.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  // Filter container items by search
  const filteredContainerItems = containerItemSearch
    ? items.filter(item => 
        item.description?.toLowerCase().includes(containerItemSearch.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(containerItemSearch.toLowerCase())
      )
    : items;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      await uploadFile.mutateAsync({ file, boxId: box.id });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      await deleteFile.mutateAsync({ fileId, filePath });
    }
  };

  const handleSelectItemToAdd = (item: AvailableItem) => {
    setSelectedItem(item);
    setShowQuantityModal(true);
  };

  const handleAddItemWithQuantity = async (itemId: string, quantity: number) => {
    await addItemToContainer.mutateAsync({ itemId, containerId: box.id, quantity });
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItemFromContainer.mutateAsync(itemId);
  };

  // Cross-link: open item detail overlay from container
  const handleViewContainerItem = (containerItem: any) => {
    // Find the full CacheInventoryItem from the inventory cache
    const fullItem = allInventoryItems.find(i => i.id === containerItem.id);
    if (fullItem) {
      setViewingItem(fullItem);
      setViewingItemOpen(true);
    }
  };

  const handleMoveItemFromDetail = () => {
    if (viewingItem) {
      setMoveItem(viewingItem);
      setMoveModalOpen(true);
      setViewingItemOpen(false);
    }
  };

  const handlePrintContents = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const itemRows = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(item.description || "Unnamed")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(item.subcategory || "—")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${esc(item.quantity_available ?? 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(item.status_item || "—")}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head><title>${esc(box.box_number)} — Contents</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 24px;">
          <h1 style="margin-bottom: 4px;">${esc(box.box_number)}</h1>
          <p style="color: #666; margin-top: 0;">${esc(box.cache_box_type)} • ${items.length} items • Printed ${esc(new Date().toLocaleDateString())}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: left;">Category</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "checked out":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "in transit":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "maintenance":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "internal":
      case "reserved":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getItemStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-green-500/10 text-green-600";
      case "in use":
        return "bg-blue-500/10 text-blue-600";
      case "under service":
        return "bg-orange-500/10 text-orange-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={handleSafeExit}>
        <DrawerContent className="flex flex-col h-[92vh] max-h-[92vh]">
          <DrawerHeader className="border-b flex-shrink-0 px-4 py-3">
            <div className="flex items-center justify-between w-full gap-2">
              <DrawerTitle className="flex items-center gap-2 min-w-0">
                <Package className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="truncate">{box.box_number}</span>
                <Badge variant="secondary" className="text-xs font-normal flex-shrink-0">
                  {totalQty} {totalQty === 1 ? "item" : "items"}
                </Badge>
              </DrawerTitle>
              
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSafeExit}
                  className="gap-2 text-muted-foreground hover:text-foreground flex-shrink-0"
                  aria-label="Close container details"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              )}
            </div>
          </DrawerHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 max-w-4xl mx-auto px-4 py-4 pb-8">
            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => setShowAddNewItem(true)}
                className="gap-1.5 text-xs sm:text-sm"
              >
                <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">Add Item</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddItems(!showAddItems);
                  setActiveTab("items");
                }}
                className="gap-1.5 text-xs sm:text-sm"
              >
                <MoveHorizontal className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{showAddItems ? "Cancel Move" : "Move Items Here"}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintContents}
                disabled={items.length === 0}
                className="gap-1.5 text-xs sm:text-sm col-span-2 sm:col-span-1"
              >
                <Printer className="h-3.5 w-3.5 flex-shrink-0" />
                Print Contents
              </Button>
            </div>

            {/* Header Section */}
            <Card className="p-4">
              <div className="flex items-start justify-between mb-3 gap-2">
                {isEditingName ? (
                  <div className="flex-1 space-y-2 min-w-0">
                    <Input
                      ref={nameInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Container name"
                      className="text-base font-bold h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelNameEdit();
                      }}
                      disabled={isSavingName}
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="text-sm"
                      disabled={isSavingName}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={isSavingName || !editName.trim()}
                        className="gap-1"
                      >
                        {isSavingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelNameEdit}
                        disabled={isSavingName}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group cursor-pointer min-w-0 flex-1" onClick={() => setIsEditingName(true)}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold truncate">{box.box_number}</h3>
                      <Edit className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    {box.box_number_alt && (
                      <p className="text-muted-foreground text-sm">Alt: {box.box_number_alt}</p>
                    )}
                  </div>
                )}
                <Badge variant="outline" className={`flex-shrink-0 ${getStatusColor(box.status_cache_box)}`}>
                  {box.status_cache_box}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2.5 mt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium truncate">{box.cache_box_type || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-medium">{totalQty}</span>
                </div>

                {box.barcode && (
                  <div className="flex items-center gap-2 text-sm">
                    <BarcodeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Barcode:</span>
                    <span className="font-mono font-medium truncate">{box.barcode}</span>
                  </div>
                )}

                {box.x_group_display && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Group:</span>
                    <span className="font-medium truncate">{box.x_group_display}</span>
                  </div>
                )}

                {box.warehouse_sections && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground flex-shrink-0">Section:</span>
                    <span className="font-medium truncate">
                      {box.warehouse_sections.section_code} - {box.warehouse_sections.section_name}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {format(new Date(box.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {!isEditingName && box.box_description && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <h4 className="font-semibold mb-1.5 text-sm">Description</h4>
                    <p className="text-sm text-muted-foreground">{box.box_description}</p>
                  </div>
                </>
              )}
            </Card>

            {/* Move existing items panel - above tabs for visibility */}
            {showAddItems && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold text-sm mb-2">Move Existing Items Here</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search available items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-[40vh] overflow-y-auto space-y-2">
                  {availableItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {itemSearch ? "No matching items found" : "No unassigned items available"}
                    </p>
                  ) : (
                    availableItems.slice(0, 20).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-md bg-background border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.description || "Unnamed item"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.subcategory || "No category"} • Qty: {item.quantity_available || 0}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectItemToAdd(item)}
                          disabled={addItemToContainer.isPending}
                          className="ml-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                  {availableItems.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing first 20 results. Search to narrow down.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tabs for Items and Files */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="items" className="gap-2">
                  <Package className="h-4 w-4" />
                  Items ({totalQty})
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Files ({files.length})
                </TabsTrigger>
              </TabsList>

              {/* Items Tab */}
              <TabsContent value="items" className="mt-4">
                <Card className="p-4">

                  {/* Container items search (scoped) */}
                  {items.length > 3 && (
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items in this container..."
                        value={containerItemSearch}
                        onChange={(e) => setContainerItemSearch(e.target.value)}
                        className="pl-10"
                      />
                      {containerItemSearch && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setContainerItemSearch("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Current Items List */}
                  {itemsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-14 w-14 mx-auto mb-3 opacity-40" />
                      <p className="font-semibold text-foreground mb-1">This container is empty.</p>
                      <p className="text-sm mb-4">Add items here to organize your inventory.</p>
                      <Button
                        onClick={() => setShowAddNewItem(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                      <p className="text-[11px] text-muted-foreground/60 mt-3">
                        You can also move existing items into this container from the asset list.
                      </p>
                    </div>
                  ) : filteredContainerItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No items match "{containerItemSearch}"</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setContainerItemSearch("")}
                        className="mt-1"
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredContainerItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleViewContainerItem(item)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-primary underline-offset-2 hover:underline">{item.description || "Unnamed item"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {item.subcategory || "No category"}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                Qty: {item.quantity_available || 0}
                              </span>
                              {item.status_item && (
                                <Badge variant="secondary" className={`text-xs ${getItemStatusColor(item.status_item)}`}>
                                  {item.status_item}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                            disabled={removeItemFromContainer.isPending}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Remove from container"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="mt-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">Documentation</h4>
                      <p className="text-sm text-muted-foreground">
                        PDF files for this container
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      size="sm"
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload PDF"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded yet</p>
                      <p className="text-sm">Upload PDF files (max 10MB)</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{file.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(file.uploaded_at), "MMM d, yyyy h:mm a")}
                                {file.file_size && ` • ${(file.file_size / 1024).toFixed(0)} KB`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file.file_path, file.file_name)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFile(file.id, file.file_path)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Quantity Selection Modal */}
        <AddItemToContainerModal
          item={selectedItem}
          open={showQuantityModal}
          onOpenChange={setShowQuantityModal}
          onConfirm={handleAddItemWithQuantity}
          isPending={addItemToContainer.isPending}
        />
        </DrawerContent>
      </Drawer>

      {/* Add New Item Modal (pre-assigned to this container) */}
      <AddCacheItemModal
        open={showAddNewItem}
        onOpenChange={setShowAddNewItem}
        onAdded={() => {
          // Stay inside container view after adding
        }}
        defaultContainerId={box?.id}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Your search and selections will be lost if you leave now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cross-link: Item detail overlay from container */}
      <ItemDetailsDrawer
        item={viewingItem}
        open={viewingItemOpen}
        onOpenChange={(open) => {
          setViewingItemOpen(open);
          if (!open) {
            // Refetch container items when item detail closes to sync qty changes
            queryClient.invalidateQueries({ queryKey: ["container-items", box?.id] });
            queryClient.invalidateQueries({ queryKey: ["cache-inventory"] });
          }
        }}
        onEdit={() => {
          setViewingItemOpen(false);
        }}
        onDuplicate={() => setViewingItemOpen(false)}
        onMove={handleMoveItemFromDetail}
        onDelete={async () => {
          setViewingItemOpen(false);
        }}
      />

      {/* Move modal for item viewed from container */}
      {moveItem && (
        <MoveCacheItemModal
          open={moveModalOpen}
          onOpenChange={setMoveModalOpen}
          item={moveItem}
          onMoved={() => {
            setMoveItem(null);
          }}
        />
      )}
    </>
  );
};