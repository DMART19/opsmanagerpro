import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Package, Filter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCustomCategories } from "@/hooks/use-custom-categories";
import { CreateCustomCategoryModal } from "./CreateCustomCategoryModal";

interface CaseSelectorProps {
  onAddCase: (caseData: any) => void;
}

export const CaseSelector = ({ onAddCase }: CaseSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fragileFilter, setFragileFilter] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { categories: customCategories } = useCustomCategories();
  const queryClient = useQueryClient();
  const [newCase, setNewCase] = useState({
    case_id: "",
    width: "12",
    length: "12",
    height: "12",
    weight: "50",
    condition: "good",
    category: "General",
    fragile: false,
  });

  const { data: cases } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for new cases
  useEffect(() => {
    const channel = supabase
      .channel('case-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases'
        },
        (payload) => {
          console.log('Case change detected:', payload);
          // Invalidate and refetch cases when any change occurs
          queryClient.invalidateQueries({ queryKey: ["cases"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredCases = cases?.filter((c) => {
    const matchesSearch = c.case_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || c.case_type === categoryFilter;
    const matchesFragile = !fragileFilter || c.condition === "fragile";
    return matchesSearch && matchesCategory && matchesFragile;
  }) || [];

  const handleCreateCase = () => {
    if (!newCase.case_id) {
      toast.error("Case ID is required");
      return;
    }
    
    onAddCase({
      ...newCase,
      width: parseFloat(newCase.width) || 0,
      length: parseFloat(newCase.length) || 0,
      height: parseFloat(newCase.height) || 0,
      weight: parseFloat(newCase.weight) || 0,
      id: `temp-${Date.now()}`,
      case_type: "Custom",
    });
    
    setIsCreating(false);
    setNewCase({
      case_id: "",
      width: "12",
      length: "12",
      height: "12",
      weight: "50",
      condition: "good",
      category: "General",
      fragile: false,
    });
    toast.success(`Case ${newCase.case_id} created`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Item Library
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Category</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryModal(true)}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {/* Standard Categories */}
                <SelectItem value="Medical">Medical</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Water">Water</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="General">General</SelectItem>
                {/* Custom Categories */}
                {customCategories.length > 0 && (
                  <>
                    <SelectItem value="divider" disabled>
                      ─── Custom Categories ───
                    </SelectItem>
                    {customCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="fragile" 
              checked={fragileFilter}
              onCheckedChange={(checked) => setFragileFilter(checked as boolean)}
            />
            <label htmlFor="fragile" className="text-xs cursor-pointer">
              Show fragile only
            </label>
          </div>

          {/* Create Item Button */}
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Create New Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Item ID</Label>
                  <Input
                    value={newCase.case_id}
                    onChange={(e) => setNewCase({ ...newCase, case_id: e.target.value })}
                    placeholder="ITEM-001"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Width (in)</Label>
                    <Input
                      type="number"
                      value={newCase.width}
                      onChange={(e) => setNewCase({ ...newCase, width: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Length (in)</Label>
                    <Input
                      type="number"
                      value={newCase.length}
                      onChange={(e) => setNewCase({ ...newCase, length: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Height (in)</Label>
                    <Input
                      type="number"
                      value={newCase.height}
                      onChange={(e) => setNewCase({ ...newCase, height: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Weight (lbs)</Label>
                  <Input
                    type="number"
                    value={newCase.weight}
                    onChange={(e) => setNewCase({ ...newCase, weight: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newCase.category} onValueChange={(val) => setNewCase({ ...newCase, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medical">Medical</SelectItem>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Water">Water</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                      {customCategories.length > 0 && (
                        <>
                          <SelectItem value="divider" disabled>
                            ─── Custom Categories ───
                          </SelectItem>
                          {customCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="new-fragile"
                    checked={newCase.fragile}
                    onCheckedChange={(checked) => setNewCase({ ...newCase, fragile: checked as boolean })}
                  />
                  <label htmlFor="new-fragile" className="text-sm cursor-pointer">
                    Mark as fragile
                  </label>
                </div>
                <Button onClick={handleCreateCase} className="w-full">
                  Create Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Case List */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {!cases ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading items...</p>
              ) : filteredCases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No items found</p>
              ) : (
                filteredCases.map((c) => (
                  <div
                    key={c.id}
                    className="bg-card border border-border p-3 hover:bg-accent/50 transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{c.case_id}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddCase(c)}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Type: {c.case_type || "Standard"}</div>
                      <div>Weight: {c.weight || 0} lbs</div>
                      <div>
                        Condition:{" "}
                        <span
                          className={
                            c.condition === "excellent"
                              ? "text-success"
                              : c.condition === "good"
                              ? "text-primary"
                              : c.condition === "fair"
                              ? "text-warning"
                              : "text-destructive"
                          }
                        >
                          {c.condition || "good"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      {/* Create Custom Category Modal */}
      <CreateCustomCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
      />
    </Card>
  );
};
