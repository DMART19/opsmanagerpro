import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Edit, Trash2, Grid3X3, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useWarehouseSections } from "@/hooks/use-warehouse-sections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/use-user-role";

interface WarehouseFormData {
  name: string;
  code: string;
  location: string;
  address: string;
  city: string;
  state: string;
}

export const WarehousesTab = () => {
  const { toast } = useToast();
  const { warehouses, loading, refetch } = useWarehouses();
  const { sections } = useWarehouseSections();
  const { isAdmin, loading: roleLoading } = useUserRole();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: "",
    code: "",
    location: "",
    address: "",
    city: "",
    state: "",
  });

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast({
        title: "Validation error",
        description: "Name and code are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("warehouses").insert({
        name: formData.name,
        code: formData.code.toUpperCase(),
        location: formData.location || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        active: true,
      });

      if (error) throw error;

      toast({
        title: "Warehouse created",
        description: "New warehouse has been added successfully.",
      });
      setModalOpen(false);
      setFormData({ name: "", code: "", location: "", address: "", city: "", state: "" });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error creating warehouse",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSectionCount = (warehouseId: string) => {
    return sections.filter(s => s.warehouse_id === warehouseId).length;
  };

  if (!isAdmin && !roleLoading) {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <MapPin className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          You need administrator or manager privileges to manage warehouses.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Warehouse Locations</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {warehouses.length} warehouses configured
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No warehouses configured yet
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{warehouse.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {warehouse.location || "Not specified"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSectionCount(warehouse.id)} sections</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={warehouse.active 
                            ? "bg-success/10 text-success border-success/20" 
                            : "bg-muted text-muted-foreground"
                          }
                        >
                          {warehouse.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {warehouses.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-xl font-semibold text-foreground">Section Overview</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {sections.length} total sections across all warehouses
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {warehouses.slice(0, 6).map((warehouse) => {
                const warehouseSections = sections.filter(s => s.warehouse_id === warehouse.id);
                return (
                  <Card key={warehouse.id} className="p-4 bg-muted/30">
                    <h4 className="font-semibold text-foreground mb-3">{warehouse.name}</h4>
                    {warehouseSections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sections configured</p>
                    ) : (
                      <div className="space-y-2">
                        {warehouseSections.slice(0, 4).map((section) => (
                          <div
                            key={section.id}
                            className="flex items-center justify-between p-2 rounded border bg-background"
                          >
                            <span className="text-sm font-medium">{section.section_code}</span>
                            <Badge variant="outline" className="text-xs">
                              {section.current_capacity}/{section.max_capacity}
                            </Badge>
                          </div>
                        ))}
                        {warehouseSections.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{warehouseSections.length - 4} more sections
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Warehouse</DialogTitle>
            <DialogDescription>
              Create a new warehouse location with initial configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse-name">Warehouse Name *</Label>
                <Input 
                  id="warehouse-name" 
                  placeholder="e.g., Main Warehouse"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-code">Code *</Label>
                <Input 
                  id="warehouse-code" 
                  placeholder="e.g., WH-A"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location Description</Label>
              <Input 
                id="location" 
                placeholder="e.g., Building A, East Wing"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input 
                  id="city" 
                  placeholder="e.g., Atlanta"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input 
                  id="state" 
                  placeholder="e.g., GA"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Warehouse"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
