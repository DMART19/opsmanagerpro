import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Archive, Loader2, Link2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  palletId?: string;
  palletName?: string;
  caseId?: string;
  caseName?: string;
  onItemAdded: () => void;
}

export const AddItemModal = ({ 
  open, 
  onClose, 
  sectionId,
  palletId,
  palletName,
  caseId,
  caseName,
  onItemAdded 
}: AddItemModalProps) => {
  const isMobile = useIsMobile();

  // Mode state
  const [mode, setMode] = useState<"create" | "link">("create");
  
  // Create mode states
  const [itemId, setItemId] = useState("");
  const [useAutoId, setUseAutoId] = useState(true);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitWeight, setUnitWeight] = useState("0");
  const [condition, setCondition] = useState("good");
  const [custodian, setCustodian] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextAutoId, setNextAutoId] = useState("");
  
  // Link mode states
  const [searchQuery, setSearchQuery] = useState("");
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    if (open && useAutoId && mode === "create") {
      generateNextItemId();
    }
  }, [open, useAutoId, sectionId, mode]);

  useEffect(() => {
    if (open && mode === "link") {
      searchExistingItems();
    }
  }, [open, mode, searchQuery]);

  const generateNextItemId = async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("item_id")
        .eq("section_id", sectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const existingIds = data?.map(i => {
        const match = i.item_id.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      }) || [];

      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = `I${maxId + 1}`;
      setNextAutoId(newId);
    } catch (error) {
      console.error("Error generating item ID:", error);
      setNextAutoId("I1");
    }
  };

  const searchExistingItems = async () => {
    setLoadingSearch(true);
    try {
      let query = supabase
        .from("items")
        .select("*");

      if (caseId) {
        query = query.or(`case_id.is.null,case_id.neq.${caseId}`);
      } else if (palletId) {
        query = query.or(`pallet_id.is.null,pallet_id.neq.${palletId}`);
      }

      if (searchQuery.trim()) {
        query = query.or(`item_id.ilike.%${searchQuery}%,item_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

      if (error) throw error;

      setExistingItems(data || []);
    } catch (error) {
      console.error("Error searching items:", error);
      toast({
        title: "Error loading items",
        description: "Failed to load existing items",
        variant: "destructive"
      });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleLinkItems = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to link",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: any = { 
        section_id: sectionId,
        pallet_id: palletId || null,
        case_id: caseId || null
      };

      const { error } = await supabase
        .from("items")
        .update(updateData)
        .in("id", selectedItems);

      if (error) throw error;

      const location = caseName ? caseName : palletName ? palletName : "section";
      
      toast({
        title: "✅ Items linked successfully",
        description: `${selectedItems.length} item(s) added to ${location}`
      });

      setSelectedItems([]);
      setSearchQuery("");
      onItemAdded();
      onClose();
    } catch (error: any) {
      console.error("Error linking items:", error);
      toast({
        title: "Error linking items",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const quantityNum = parseInt(quantity, 10) || 0;
  const unitWeightNum = parseFloat(unitWeight) || 0;

  const validateForm = () => {
    const finalItemId = useAutoId ? nextAutoId : itemId;
    
    if (!finalItemId.trim()) {
      toast({ 
        title: "Item ID required", 
        description: "Please provide an item ID",
        variant: "destructive" 
      });
      return false;
    }

    if (!itemName.trim()) {
      toast({ 
        title: "Item name required", 
        description: "Please provide an item name",
        variant: "destructive" 
      });
      return false;
    }

    if (quantityNum <= 0) {
      toast({ 
        title: "Invalid quantity", 
        description: "Quantity must be greater than 0",
        variant: "destructive" 
      });
      return false;
    }

    if (unitWeightNum < 0) {
      toast({ 
        title: "Invalid weight", 
        description: "Weight cannot be negative",
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const finalItemId = useAutoId ? nextAutoId : itemId;
    const totalWeight = unitWeightNum * quantityNum;

    try {
      const { data: existing } = await supabase
        .from("items")
        .select("id")
        .eq("section_id", sectionId)
        .eq("item_id", finalItemId)
        .maybeSingle();

      if (existing) {
        toast({ 
          title: "Duplicate item ID", 
          description: `Item ${finalItemId} already exists in this section`,
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("items")
        .insert({
          section_id: sectionId,
          pallet_id: palletId || null,
          case_id: caseId || null,
          item_id: finalItemId,
          item_name: itemName,
          quantity: quantityNum,
          unit_weight: unitWeightNum,
          total_weight: totalWeight,
          condition,
          custodian: custodian.trim() || null,
          notes: notes.trim() || null,
          created_by: user?.id
        });

      if (insertError) throw insertError;

      const location = caseName ? caseName : palletName ? palletName : "section";
      
      toast({ 
        title: "✅ Item added successfully", 
        description: `${itemName} has been added to ${location}` 
      });

      setItemId("");
      setItemName("");
      setQuantity("1");
      setUnitWeight("0");
      setCondition("good");
      setCustodian("");
      setNotes("");
      setUseAutoId(true);

      onItemAdded();
      onClose();
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast({ 
        title: "Error adding item", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationText = () => {
    if (caseName) return `Case ${caseName}`;
    if (palletName) return `Pallet ${palletName}`;
    return "Section";
  };

  const isFormValid = itemName.trim().length > 0 && quantityNum > 0;

  // ── Shared action footer ──────────────────────────────────────────────────
  const ActionFooter = ({ sticky = false }: { sticky?: boolean }) => (
    <div
      className={
        sticky
          ? "sticky bottom-0 left-0 right-0 z-10 bg-background border-t border-border/60 px-4 py-3 flex flex-col gap-2 shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.08)]"
          : "flex justify-end gap-3 pt-4 border-t mt-auto"
      }
      style={sticky ? { paddingBottom: "max(12px, env(safe-area-inset-bottom))" } : {}}
    >
      {sticky ? (
        // Mobile: full-width primary, secondary ghost
        <>
          {mode === "create" ? (
            <Button
              onClick={handleSubmit}
              className="w-full h-12 text-base font-semibold bg-[#2F5FFF] hover:bg-[#1e4acc] shadow-md"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : "Create Item"}
            </Button>
          ) : (
            <Button
              onClick={handleLinkItems}
              className="w-full h-12 text-base font-semibold bg-[#2F5FFF] hover:bg-[#1e4acc] shadow-md"
              disabled={loading || selectedItems.length === 0}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Linking…</>
              ) : `Link ${selectedItems.length > 0 ? selectedItems.length : ""} Item${selectedItems.length !== 1 ? "s" : ""}`}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="w-full h-10 text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </>
      ) : (
        // Desktop: right-aligned row
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {mode === "create" ? (
            <Button
              onClick={handleSubmit}
              className="bg-[#2F5FFF] hover:bg-[#1e4acc]"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : "Create Item"}
            </Button>
          ) : (
            <Button
              onClick={handleLinkItems}
              className="bg-[#2F5FFF] hover:bg-[#1e4acc]"
              disabled={loading || selectedItems.length === 0}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Linking…</>
              ) : `Link ${selectedItems.length > 0 ? selectedItems.length : ""} Item${selectedItems.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </>
      )}
    </div>
  );

  // ── Shared form body ──────────────────────────────────────────────────────
  const FormBody = () => (
    <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "link")} className="flex flex-col flex-1 min-h-0">
      <TabsList className="grid w-full grid-cols-2 shrink-0">
        <TabsTrigger value="create" className="gap-2">
          <Archive className="h-4 w-4" />
          Create New
        </TabsTrigger>
        <TabsTrigger value="link" className="gap-2">
          <Link2 className="h-4 w-4" />
          Link Existing
        </TabsTrigger>
      </TabsList>

      {/* ── Create Tab ── */}
      <TabsContent value="create" className="flex-1 mt-4 pb-2">
        <div className="space-y-5 px-0.5">
          {/* Auto ID */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="checkbox"
                id="autoId"
                checked={useAutoId}
                onChange={(e) => setUseAutoId(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="autoId" className="cursor-pointer text-sm font-medium">
                Auto-generate Item ID
              </Label>
            </div>
            {!useAutoId && (
              <Input
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="Enter item ID (e.g., I1, ITEM-A)"
              className="mt-1 h-11"
                autoCapitalize="none"
              />
            )}
            {useAutoId && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/60">
                Next available ID: <span className="font-mono font-bold text-foreground">{nextAutoId}</span>
              </div>
            )}
          </div>

          {/* Item Name */}
          <div>
            <Label className="text-sm font-medium">Item Name <span className="text-destructive">*</span></Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter item name"
              className="mt-1.5 h-11"
              autoComplete="off"
              autoCorrect="off"
            />
          </div>

          {/* Location (read-only) */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Location</Label>
            <Input
              value={getLocationText()}
              disabled
              className="mt-1.5 h-11 bg-muted/30 text-muted-foreground"
            />
          </div>

          {/* Quantity + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Quantity <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Unit Weight (lbs)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={unitWeight}
                onChange={(e) => setUnitWeight(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          {/* Total weight display */}
          <div className="bg-muted/40 px-4 py-2.5 rounded-lg border border-border/40 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Weight</span>
            <span className="font-semibold text-foreground text-sm">
              {(unitWeightNum * quantityNum).toFixed(2)} lbs
            </span>
          </div>

          {/* Condition + Custodian */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Custodian</Label>
              <Input
                value={custodian}
                onChange={(e) => setCustodian(e.target.value)}
                placeholder="Optional"
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details or instructions…"
              rows={3}
              className="mt-1.5 resize-none"
            />
          </div>
        </div>
      </TabsContent>

      {/* ── Link Tab ── */}
      <TabsContent value="link" className="flex-1 flex flex-col min-h-0 mt-4 gap-3">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Item ID or Name…"
            className="pl-10 h-11"
          />
        </div>

        {loadingSearch ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : existingItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex-1">
            <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No existing records found</p>
            <p className="text-sm mt-1">Create a new item instead</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-xl min-h-0">
            <div className="p-3 space-y-2">
              {existingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors active:scale-[0.99]"
                  onClick={() => {
                    setSelectedItems(prev =>
                      prev.includes(item.id)
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id]
                    );
                  }}
                >
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={(checked) => {
                      setSelectedItems(prev =>
                        checked
                          ? [...prev, item.id]
                          : prev.filter(id => id !== item.id)
                      );
                    }}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-foreground text-sm">{item.item_id}</span>
                      <span className="text-sm font-medium truncate">• {item.item_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                      {item.total_weight > 0 && ` • ${item.total_weight} lbs`}
                      {" • "}<span className="capitalize">{item.condition}</span>
                    </div>
                    {item.custodian && (
                      <p className="text-xs text-muted-foreground mt-0.5">Custodian: {item.custodian}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedItems.length > 0 && (
          <div className="bg-primary/8 px-4 py-2.5 rounded-lg border border-primary/20 shrink-0">
            <p className="text-sm font-medium text-primary">
              {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  // ── Mobile: Drawer (bottom-sheet) ─────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="flex flex-col h-[92dvh] max-h-[92dvh]">
          {/* Header */}
          <DrawerHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white px-5 py-4 rounded-t-[10px] shrink-0">
            <DrawerTitle className="text-xl flex items-center gap-2 text-white">
              <div className="bg-white/10 p-1.5 rounded-lg">
                <Archive className="h-5 w-5" />
              </div>
              Add Item to {getLocationText()}
            </DrawerTitle>
            <DrawerDescription className="text-primary-foreground/70 text-sm">
              Create a new item or link existing ones
            </DrawerDescription>
          </DrawerHeader>

          {/* Scrollable body */}
          <ScrollArea className="flex-1 min-h-0 px-4 pt-4">
            <div className="pb-2">
              <FormBody />
            </div>
          </ScrollArea>

          {/* Sticky footer — always above keyboard */}
          <ActionFooter sticky />
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop: Dialog ───────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white px-6 py-4 -mt-6 -mx-6 rounded-t-lg shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="bg-[#2F5FFF] p-2 rounded">
              <Archive className="h-6 w-6" />
            </div>
            Add Item to {getLocationText()}
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            Create a new item or link existing ones
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-0.5 mt-4 min-h-0">
          <FormBody />
        </div>

        <ActionFooter />
      </DialogContent>
    </Dialog>
  );
};
