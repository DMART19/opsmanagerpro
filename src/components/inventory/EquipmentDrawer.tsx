import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Calendar, 
  MapPin, 
  Wrench, 
  User, 
  History, 
  LogOut,
  LogIn,
  Move, 
  Edit, 
  Archive,
  QrCode,
  FileText,
  Paperclip,
  Shield,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  Plus,
  AlertCircle,
  Package
} from "lucide-react";
import { toast } from "sonner";
import { AssetCheckoutDialog } from "./AssetCheckoutDialog";
import { AssetReturnDialog } from "./AssetReturnDialog";
import { useAssetCheckout } from "@/hooks/use-asset-checkout";

interface Equipment {
  id: string | number;
  assetTag?: string;
  asset_tag?: string;
  name: string;
  type?: string;
  category?: string;
  status: string;
  section?: string;
  pallet?: string;
  condition?: string;
  custodian?: string;
  lastCheckIn?: string;
  expirationDate?: string | null;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serial_number?: string;
  warrantyExpiration?: string;
  warehouse?: string;
  row?: string;
  bay?: string;
  custodianRole?: string;
  custodianContact?: string;
  assignedSince?: string;
  imageUrl?: string;
  location_in_warehouse?: string;
  // Quantity fields
  total_quantity?: number;
  available_quantity?: number;
  checked_out_quantity?: number;
}

interface EquipmentDrawerProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const statusConfig = {
  available: { 
    label: "Available", 
    color: "bg-success/10 text-success border-success/20",
    icon: "🟢"
  },
  "checked-out": { 
    label: "Checked Out", 
    color: "bg-warning/10 text-warning border-warning/20",
    icon: "🟠"
  },
  maintenance: { 
    label: "Maintenance", 
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: "🔴"
  },
};

const getDateStatusColor = (date: string) => {
  const daysUntil = Math.floor((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "text-destructive";
  if (daysUntil < 7) return "text-warning";
  return "text-success";
};

export const EquipmentDrawer = ({ equipment, open, onOpenChange, onRefresh }: EquipmentDrawerProps) => {
  const navigate = useNavigate();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);
  const [activeCheckouts, setActiveCheckouts] = useState<any[]>([]);
  const { getAssetCheckouts } = useAssetCheckout();

  // Load active checkouts when drawer opens
  useEffect(() => {
    if (open && equipment?.id) {
      getAssetCheckouts(String(equipment.id)).then(setActiveCheckouts);
    }
  }, [open, equipment?.id]);

  if (!equipment) return null;

  // Normalize field names (support both camelCase and snake_case)
  const assetTag = equipment.assetTag || equipment.asset_tag || "";
  const serialNumber = equipment.serialNumber || equipment.serial_number || "";
  const totalQuantity = equipment.total_quantity ?? 1;
  const availableQuantity = equipment.available_quantity ?? 1;
  const checkedOutQuantity = equipment.checked_out_quantity ?? 0;
  const type = equipment.type || equipment.category || "General";
  const condition = equipment.condition || "Good";
  const location = equipment.location_in_warehouse || equipment.section || "";

  const statusInfo = statusConfig[equipment.status as keyof typeof statusConfig] || statusConfig.available;

  const handleGenerateLabel = () => {
    toast.success("QR Code label generated successfully");
  };

  const handleViewMap = () => {
    toast.info("Opening warehouse map...");
  };

  const handleLogMaintenance = () => {
    toast.success("Maintenance log opened");
  };

  const handleCheckout = () => {
    setCheckoutDialogOpen(true);
  };

  const handleReturn = (checkout: any) => {
    setSelectedCheckout(checkout);
    setReturnDialogOpen(true);
  };

  const handleEdit = () => {
    navigate(`/inventory/add?edit=${equipment.id}`);
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onRefresh?.();
    if (equipment?.id) {
      getAssetCheckouts(String(equipment.id)).then(setActiveCheckouts);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background">
        {/* Enhanced Header with Image and Status */}
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {equipment.imageUrl ? (
                <img src={equipment.imageUrl} alt={equipment.name} className="w-full h-full object-cover" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl mb-2">{equipment.name}</SheetTitle>
              <SheetDescription className="font-mono text-sm mb-3">
                {assetTag}
              </SheetDescription>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className={statusInfo.color}>
                  <span className="mr-1">{statusInfo.icon}</span>
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline">{condition}</Badge>
                <Badge variant="outline">{type}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={handleGenerateLabel}
                >
                  <QrCode className="h-3 w-3" />
                  Generate Label
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Button 
            className="gap-2" 
            size="sm" 
            onClick={handleCheckout}
            disabled={availableQuantity === 0}
          >
            <LogOut className="h-4 w-4" />
            Check Out
          </Button>
          <Button variant="outline" className="gap-2" size="sm">
            <Move className="h-4 w-4" />
            Move
          </Button>
          <Button variant="outline" className="gap-2" size="sm" onClick={handleEdit}>
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" size="sm">
            <Archive className="h-4 w-4" />
            Retire
          </Button>
        </div>

        {/* Secondary Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="ghost" size="sm" className="gap-2">
            <Wrench className="h-4 w-4" />
            View Maintenance Log
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            History
          </Button>
        </div>

        {/* Accordion Sections */}
        <Accordion type="multiple" defaultValue={["stock", "summary", "location"]} className="space-y-2">
          {/* Stock/Quantity Section */}
          <AccordionItem value="stock" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-semibold">Stock & Assignments</span>
                {checkedOutQuantity > 0 && (
                  <Badge variant="secondary" className="ml-2">{checkedOutQuantity} out</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2 pb-4">
                {/* Quantity Overview */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{totalQuantity}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{availableQuantity}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10">
                    <p className="text-2xl font-bold text-warning">{checkedOutQuantity}</p>
                    <p className="text-xs text-muted-foreground">Checked Out</p>
                  </div>
                </div>

                {/* Active Checkouts */}
                {activeCheckouts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Currently Assigned To</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activeCheckouts.map((checkout) => (
                        <div
                          key={checkout.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {checkout.staff?.first_name} {checkout.staff?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {checkout.quantity} • Since {new Date(checkout.checkout_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleReturn(checkout)}
                          >
                            <LogIn className="h-3 w-3" />
                            Return
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeCheckouts.length === 0 && checkedOutQuantity === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    All units are available in stock
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Summary Section */}
          <AccordionItem value="summary" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-semibold">Summary</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium mt-1">{statusInfo.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Condition:</span>
                    <p className="font-medium mt-1">{condition}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium mt-1">{type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Manufacturer:</span>
                    <p className="font-medium mt-1">{equipment.manufacturer || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <p className="font-medium mt-1">{equipment.model || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serial Number:</span>
                    <p className="font-mono font-medium mt-1 text-xs">{serialNumber || assetTag}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Warranty Expiration:</span>
                    <p className={`font-medium mt-1 ${equipment.warrantyExpiration ? getDateStatusColor(equipment.warrantyExpiration) : ""}`}>
                      {equipment.warrantyExpiration ? new Date(equipment.warrantyExpiration).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Location Section */}
          <AccordionItem value="location" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-semibold">Location</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Warehouse:</span>
                    <p className="font-medium mt-1">{equipment.warehouse || "Main Warehouse"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Section:</span>
                    <p className="font-medium mt-1">{equipment.section}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pallet:</span>
                    <p className="font-mono font-medium mt-1">{equipment.pallet}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Row / Bay:</span>
                    <p className="font-medium mt-1">{equipment.row || "R3"} / {equipment.bay || "B2"}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 mt-2"
                  onClick={handleViewMap}
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Map
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Custodian Section */}
          <AccordionItem value="custodian" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-semibold">Custodian</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2 pb-4">
                {equipment.custodian === "—" ? (
                  <p className="text-muted-foreground text-sm">Not assigned</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <span className="text-muted-foreground text-sm">Name:</span>
                      <p className="font-medium mt-1">{equipment.custodian}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Role:</span>
                      <p className="font-medium mt-1">{equipment.custodianRole || "Team Member"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{equipment.custodianContact || "sarah.chen@company.com"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">+1 (555) 0123</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned Since:</span>
                      <span className="font-medium">{equipment.assignedSince || equipment.lastCheckIn}</span>
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Maintenance Section */}
          <AccordionItem value="maintenance" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <span className="font-semibold">Maintenance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Service:</span>
                    <p className="font-medium mt-1">2025-09-15</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Service:</span>
                    <p className={`font-medium mt-1 ${getDateStatusColor("2025-12-15")}`}>2025-12-15</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Service Interval:</span>
                    <p className="font-medium mt-1">90 days</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleLogMaintenance}
                >
                  <Plus className="h-4 w-4" />
                  Log Maintenance
                </Button>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Service History</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {[
                      { date: "2025-09-15", type: "Routine Inspection", tech: "Mike Johnson" },
                      { date: "2025-06-10", type: "Oil Change", tech: "Lisa Wong" },
                      { date: "2025-03-05", type: "Parts Replacement", tech: "Mike Johnson" },
                    ].map((entry, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/50">
                        <Wrench className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{entry.type}</p>
                          <p className="text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString()} • {entry.tech}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Compliance Section */}
          <AccordionItem value="compliance" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-semibold">Compliance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2 pb-4">
                <div>
                  <p className="text-sm font-medium mb-2">Certification Requirements</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-success border-success/20">
                      OSHA Certified
                    </Badge>
                    <Badge variant="outline" className="text-success border-success/20">
                      EPA Compliant
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Calibration Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Calibration:</span>
                      <span className="font-medium">2025-08-01</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Due:</span>
                      <span className={`font-medium ${getDateStatusColor("2026-08-01")}`}>2026-08-01</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calibration Interval:</span>
                      <span className="font-medium">12 months</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-warning">Inspection Due Soon</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Annual safety inspection due in 14 days
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Attachments Section */}
          <AccordionItem value="attachments" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <span className="font-semibold">Attachments</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "User Manual", type: "PDF", size: "2.4 MB" },
                    { name: "Inspection Report", type: "PDF", size: "856 KB" },
                    { name: "Certificate", type: "PDF", size: "124 KB" },
                    { name: "Equipment Photo", type: "JPG", size: "1.2 MB" },
                  ].map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.type} • {file.size}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add File
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Recent History Section */}
          <AccordionItem value="history" className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <span className="font-semibold">Recent History</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2 pb-4 max-h-64 overflow-y-auto">
                {[
                  { date: "2025-11-05", action: "Checked In", user: "Admin User", icon: LogOut },
                  { date: "2025-10-28", action: "Checked Out", user: "Sarah Chen", icon: LogOut },
                  { date: "2025-10-15", action: "Moved to Section B", user: "Admin User", icon: Move },
                  { date: "2025-09-15", action: "Maintenance Completed", user: "Mike Johnson", icon: Wrench },
                  { date: "2025-09-10", action: "Checked In", user: "Admin User", icon: LogOut },
                ].map((entry, index) => {
                  const IconComponent = entry.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 text-sm p-3 rounded-lg bg-muted/50"
                    >
                      <IconComponent className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{entry.action}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {new Date(entry.date).toLocaleDateString()} • {entry.user}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SheetContent>

      {/* Checkout Dialog */}
      <AssetCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        equipment={{
          id: String(equipment.id),
          name: equipment.name,
          asset_tag: assetTag,
          total_quantity: totalQuantity,
          available_quantity: availableQuantity,
          checked_out_quantity: checkedOutQuantity,
          status: equipment.status,
        }}
        onSuccess={handleSuccess}
      />

      {/* Return Dialog */}
      <AssetReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        checkout={selectedCheckout}
        onSuccess={handleSuccess}
      />
    </Sheet>
  );
};
