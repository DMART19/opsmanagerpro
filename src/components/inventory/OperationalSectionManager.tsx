import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Package,
  Plus,
  ChevronDown,
  ChevronRight,
  Box,
  Archive,
  TrendingUp,
  Activity,
  Weight,
  Calendar,
} from "lucide-react";
import { WarehouseSection } from "@/hooks/use-warehouse-sections";
import { useWarehouses } from "@/hooks/use-warehouses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddWarehousePalletModal } from "./AddWarehousePalletModal";
import { AddCaseModal } from "./AddCaseModal";
import { AddItemModal } from "./AddItemModal";

const sectionSchema = z.object({
  section_name: z.string().min(1, "Section name is required"),
  section_code: z.string().min(1, "Section code is required"),
  warehouse_id: z.string().optional(),
  section_type: z.string().optional(),
  max_capacity: z.number().min(1, "Max capacity is required"),
  density_threshold_medium: z.number().min(0).max(100),
  default_pallet_type: z.string().optional(),
  temperature_controlled: z.boolean().optional(),
  access_restrictions: z.string().optional(),
  auto_density_alerts: z.boolean().optional(),
  maintenance_cycle_days: z.number().min(1).optional(),
  location_description: z.string().optional(),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

interface Item {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_weight: number;
  total_weight: number;
  condition?: string;
  custodian?: string;
}

interface Case {
  id: string;
  case_id: string;
  case_type: string;
  weight: number;
  condition: string;
  items: Item[];
}

interface Pallet {
  id: string;
  pallet_id: string;
  pallet_type: string;
  max_capacity: number;
  current_weight: number;
  status: string;
  condition: string;
  notes?: string;
  cases: Case[];
  items: Item[];
}

interface OperationalSectionManagerProps {
  section: WarehouseSection;
  onBack: () => void;
  onSuccess: () => void;
}

export const OperationalSectionManager = ({
  section,
  onBack,
  onSuccess,
}: OperationalSectionManagerProps) => {
  const { warehouses } = useWarehouses();
  const [saving, setSaving] = useState(false);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [expandedPallets, setExpandedPallets] = useState<string[]>([]);
  const [expandedCases, setExpandedCases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPalletModalOpen, setAddPalletModalOpen] = useState(false);
  const [addCaseModalOpen, setAddCaseModalOpen] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [selectedPalletId, setSelectedPalletId] = useState<string>("");
  const [selectedPalletName, setSelectedPalletName] = useState<string>("");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedCaseName, setSelectedCaseName] = useState<string>("");

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      section_name: section.section_name,
      section_code: section.section_code,
      warehouse_id: section.warehouse_id || "",
      section_type: section.section_type || "General Storage",
      max_capacity: section.max_capacity,
      density_threshold_medium: section.density_threshold_medium || 80,
      default_pallet_type: section.default_pallet_type || "Standard 48x40",
      temperature_controlled: section.temperature_controlled || false,
      access_restrictions: section.access_restrictions || "All Users",
      auto_density_alerts: section.auto_density_alerts ?? true,
      maintenance_cycle_days: section.maintenance_cycle_days || 30,
      location_description: section.location_description || "",
    },
  });

  const loadPallets = async () => {
    try {
      setLoading(true);
      
      // Get pallets for this section
      const { data: palletsData, error: palletsError } = await supabase
        .from("pallets")
        .select("*")
        .eq("section_id", section.id)
        .order("created_at", { ascending: true });

      if (palletsError) throw palletsError;

      // Get cases for these pallets
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("*")
        .in("pallet_id", (palletsData || []).map((p) => p.id))
        .order("created_at", { ascending: true });

      if (casesError) throw casesError;

      // Get items for this section
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("section_id", section.id);

      if (itemsError) throw itemsError;

      // Transform data into hierarchical structure
      const transformedPallets: Pallet[] = (palletsData || []).map((pallet) => {
        // Get cases for this pallet
        const palletCases = (casesData || []).filter((c: any) => c.pallet_id === pallet.id);
        
        // Get items directly assigned to this pallet (no case)
        const directItems = (itemsData || []).filter(
          (i: any) => i.pallet_id === pallet.id && !i.case_id
        );

        // Transform cases with their items
        const cases: Case[] = palletCases.map((caseData: any) => {
          const caseItems = (itemsData || []).filter(
            (i: any) => i.case_id === caseData.id
          );

          return {
            id: caseData.id,
            case_id: caseData.case_id,
            case_type: caseData.case_type,
            weight: caseData.weight,
            condition: caseData.condition,
            items: caseItems.map((item: any) => ({
              id: item.id,
              item_id: item.item_id,
              item_name: item.item_name,
              quantity: item.quantity,
              unit_weight: item.unit_weight,
              total_weight: item.total_weight,
              condition: item.condition,
              custodian: item.custodian,
            })),
          };
        });

        // Transform direct items
        const items: Item[] = directItems.map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_weight: item.unit_weight,
          total_weight: item.total_weight,
          condition: item.condition,
          custodian: item.custodian,
        }));

        return {
          id: pallet.id,
          pallet_id: pallet.pallet_id,
          pallet_type: pallet.pallet_type,
          max_capacity: pallet.max_capacity,
          current_weight: pallet.current_weight,
          status: pallet.status,
          condition: pallet.condition,
          notes: pallet.notes,
          cases,
          items,
        };
      });

      setPallets(transformedPallets);
    } catch (error: any) {
      console.error("Error loading pallets:", error);
      toast({
        title: "Error loading contents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPallets();

    // Subscribe to realtime updates for pallets, cases, and items
    const channel = supabase
      .channel('section-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pallets',
          filter: `section_id=eq.${section.id}`
        },
        () => loadPallets()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases'
        },
        () => loadPallets()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `section_id=eq.${section.id}`
        },
        () => loadPallets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [section.id]);

  const analytics = useMemo(() => {
    const totalPallets = pallets.length;
    const totalCases = pallets.reduce((acc, p) => acc + p.cases.length, 0);
    const totalItems = pallets.reduce(
      (acc, p) =>
        acc +
        p.items.length +
        p.cases.reduce((cAcc, c) => cAcc + c.items.length, 0),
      0
    );
    const totalWeight = pallets.reduce(
      (acc, p) =>
        acc +
        p.current_weight +
        p.items.reduce((iAcc, i) => iAcc + (i.total_weight || 0), 0) +
        p.cases.reduce(
          (cAcc, c) =>
            cAcc + c.weight + c.items.reduce((iAcc, i) => iAcc + (i.total_weight || 0), 0),
          0
        ),
      0
    );
    const utilization = (section.current_capacity / section.max_capacity) * 100;

    return { totalPallets, totalCases, totalItems, totalWeight, utilization };
  }, [pallets, section]);

  const onSubmit = async (values: SectionFormValues) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("warehouse_sections")
        .update({
          section_name: values.section_name,
          section_code: values.section_code,
          warehouse_id: values.warehouse_id || null,
          section_type: values.section_type,
          max_capacity: values.max_capacity,
          density_threshold_medium: values.density_threshold_medium,
          default_pallet_type: values.default_pallet_type,
          temperature_controlled: values.temperature_controlled,
          access_restrictions: values.access_restrictions,
          auto_density_alerts: values.auto_density_alerts,
          maintenance_cycle_days: values.maintenance_cycle_days,
          location_description: values.location_description || null,
        })
        .eq("id", section.id);

      if (error) throw error;

      toast({
        title: "✅ Section updated successfully",
        description: `Section ${values.section_code} has been updated.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast({
        title: "Error updating section",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePallet = (palletId: string) => {
    setExpandedPallets((prev) =>
      prev.includes(palletId)
        ? prev.filter((id) => id !== palletId)
        : [...prev, palletId]
    );
  };

  const toggleCase = (caseId: string) => {
    setExpandedCases((prev) =>
      prev.includes(caseId)
        ? prev.filter((id) => id !== caseId)
        : [...prev, caseId]
    );
  };

  return (
    <div className="fixed inset-0 bg-[#F6F8FB] overflow-y-auto">
      <div className="min-h-full p-6">
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#0D1321]">
                Section {section.section_code}
              </h1>
              <p className="text-muted-foreground mt-1">
                Operational Management Interface
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Map
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Live Metrics Banner */}
        <Card className="p-6 bg-gradient-to-r from-[#2F5FFF]/10 to-blue-500/10 border-2 border-[#2F5FFF]/20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Capacity</p>
              <p className="text-2xl font-bold text-[#0D1321]">
                {section.current_capacity}/{section.max_capacity}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Utilization</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-[#2F5FFF]">
                  {analytics.utilization.toFixed(1)}%
                </p>
                <Progress value={analytics.utilization} className="h-2 flex-1" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pallets</p>
              <p className="text-2xl font-bold text-[#0D1321]">
                {analytics.totalPallets}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cases</p>
              <p className="text-2xl font-bold text-[#0D1321]">
                {analytics.totalCases}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Items</p>
              <p className="text-2xl font-bold text-[#0D1321]">
                {analytics.totalItems}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section Configuration */}
          <Card className="p-6 lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 text-[#0D1321]">
              Section Configuration
            </h2>
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="section_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="section_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Code *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="section_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="General Storage">General Storage</SelectItem>
                          <SelectItem value="Cold Storage">Cold Storage</SelectItem>
                          <SelectItem value="HazMat">HazMat</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Staging">Staging</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Capacity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature_controlled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                      <FormLabel>Temperature Controlled</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_density_alerts"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                      <FormLabel>Auto Density Alerts</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </Card>

          {/* Contents Overview */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0D1321] flex items-center gap-2">
                <Package className="h-5 w-5 text-[#2F5FFF]" />
                Contents Overview
              </h2>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    setSelectedPalletId("");
                    setSelectedPalletName("");
                    setSelectedCaseId("");
                    setSelectedCaseName("");
                    setAddItemModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
                <Button 
                  size="sm" 
                  className="gap-2 bg-[#2F5FFF]"
                  onClick={() => setAddPalletModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Pallet
                </Button>
              </div>
            </div>

            <Separator className="mb-4" />

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading contents...
              </div>
            ) : pallets.length === 0 ? (
              <div className="text-center py-12 border border-border/50 rounded-lg bg-muted/10">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Pallets Assigned</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding a pallet to this section
                </p>
                <Button 
                  className="gap-2 bg-[#2F5FFF]"
                  onClick={() => setAddPalletModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add First Pallet
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pallets.map((pallet) => {
                  const isPalletOpen = expandedPallets.includes(pallet.id);
                  const itemCount =
                    pallet.items.length +
                    pallet.cases.reduce((acc, c) => acc + c.items.length, 0);

                  return (
                    <Collapsible key={pallet.id} open={isPalletOpen}>
                      <Card className="overflow-hidden border-2 hover:border-[#2F5FFF] transition-colors">
                        <CollapsibleTrigger
                          onClick={() => togglePallet(pallet.id)}
                          className="w-full"
                        >
                          <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              {isPalletOpen ? (
                                <ChevronDown className="h-5 w-5 text-[#2F5FFF]" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <Package className="h-5 w-5 text-[#2F5FFF]" />
                              <div className="text-left">
                                <p className="font-semibold font-mono">
                                  {pallet.pallet_id}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {pallet.pallet_type} • {pallet.status}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {itemCount} items • {pallet.cases.length} cases • {pallet.current_weight} lbs
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">{itemCount} items</Badge>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-2 bg-muted/20">
                            {/* Cases */}
                            {pallet.cases.map((caseItem) => {
                              const isCaseOpen = expandedCases.includes(caseItem.id);

                              return (
                                <Collapsible key={caseItem.id} open={isCaseOpen}>
                                  <Card className="border">
                                    <CollapsibleTrigger
                                      onClick={() => toggleCase(caseItem.id)}
                                      className="w-full"
                                    >
                                      <div className="p-3 flex items-center justify-between hover:bg-muted/30">
                                        <div className="flex items-center gap-3">
                                          {isCaseOpen ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                          <Box className="h-4 w-4 text-blue-500" />
                                          <div className="text-left">
                                            <p className="font-medium text-sm">
                                              Case {caseItem.case_id}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {caseItem.items.length} items • {caseItem.weight} lbs
                                            </p>
                                          </div>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          {caseItem.items.length}
                                        </Badge>
                                      </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                      <div className="px-3 pb-3 space-y-1 bg-background">
                                        {caseItem.items.map((item) => (
                                          <div
                                            key={item.id}
                                            className="p-2 rounded border flex items-center justify-between text-sm hover:bg-muted/50"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Archive className="h-3 w-3 text-muted-foreground" />
                                              <span>{item.item_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-xs">
                                                Qty: {item.quantity}
                                              </Badge>
                                              {item.condition && (
                                                <Badge variant="secondary" className="text-xs">
                                                  {item.condition}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                         ))}
                                         
                                         {/* Add item to case button */}
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           className="w-full gap-2 text-[#2F5FFF] mt-2"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setSelectedPalletId(pallet.id);
                                             setSelectedPalletName(pallet.pallet_id);
                                             setSelectedCaseId(caseItem.id);
                                             setSelectedCaseName(caseItem.case_id);
                                             setAddItemModalOpen(true);
                                           }}
                                         >
                                           <Plus className="h-3 w-3" />
                                           Add Item to Case
                                         </Button>
                                       </div>
                                    </CollapsibleContent>
                                  </Card>
                                </Collapsible>
                              );
                            })}

                            {/* Direct Items (not in cases) */}
                            {pallet.items.map((item) => (
                              <div
                                key={item.id}
                                className="p-3 rounded border bg-background flex items-center justify-between hover:bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  <Archive className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{item.item_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Qty: {item.quantity}
                                  </Badge>
                                  {item.condition && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.condition}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPalletId(pallet.id);
                                  setSelectedPalletName(pallet.pallet_id);
                                  setAddCaseModalOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                                Add Case
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 text-[#2F5FFF]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPalletId(pallet.id);
                                  setSelectedPalletName(pallet.pallet_id);
                                  setSelectedCaseId("");
                                  setSelectedCaseName("");
                                  setAddItemModalOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                                Add Item to Pallet
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Analytics Card */}
        <Card className="p-6 bg-[#0D1321] text-white">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-[#2F5FFF]" />
            <h3 className="text-lg font-semibold">Section Analytics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-[#2F5FFF]" />
                <p className="text-sm opacity-70">Total Pallets</p>
              </div>
              <p className="text-3xl font-bold">{analytics.totalPallets}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Archive className="h-4 w-4 text-[#2F5FFF]" />
                <p className="text-sm opacity-70">Total Items</p>
              </div>
              <p className="text-3xl font-bold">{analytics.totalItems}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Weight className="h-4 w-4 text-[#2F5FFF]" />
                <p className="text-sm opacity-70">Total Units</p>
              </div>
              <p className="text-3xl font-bold">{analytics.totalWeight}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-[#2F5FFF]" />
                <p className="text-sm opacity-70">Utilization</p>
              </div>
              <p className="text-3xl font-bold">{analytics.utilization.toFixed(0)}%</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-[#2F5FFF]" />
                <p className="text-sm opacity-70">Last Audit</p>
              </div>
              <p className="text-sm">Not recorded</p>
            </div>
          </div>
        </Card>
        </div>
      </div>

      <AddWarehousePalletModal
        open={addPalletModalOpen}
        onClose={() => setAddPalletModalOpen(false)}
        sectionId={section.id}
        sectionName={section.section_name}
        onPalletAdded={loadPallets}
      />

      <AddCaseModal
        open={addCaseModalOpen}
        onClose={() => {
          setAddCaseModalOpen(false);
          setSelectedPalletId("");
          setSelectedPalletName("");
        }}
        palletId={selectedPalletId}
        palletName={selectedPalletName}
        sectionId={section.id}
        onCaseAdded={loadPallets}
      />

      <AddItemModal
        open={addItemModalOpen}
        onClose={() => {
          setAddItemModalOpen(false);
          setSelectedPalletId("");
          setSelectedPalletName("");
          setSelectedCaseId("");
          setSelectedCaseName("");
        }}
        sectionId={section.id}
        palletId={selectedPalletId || undefined}
        palletName={selectedPalletName || undefined}
        caseId={selectedCaseId || undefined}
        caseName={selectedCaseName || undefined}
        onItemAdded={loadPallets}
      />
    </div>
  );
};
