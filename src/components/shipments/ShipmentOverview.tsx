import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Warehouse, Calendar, Truck, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShipmentOverviewProps {
  shipmentNumber: string;
  destination: string;
  originWarehouse: string;
  departureDate: string;
  arrivalDate: string;
  carrier: string;
  transportType: string;
  preparedBy: string;
  notes: string;
  specialInstructions: string;
  status: string;
  warehouses: any[];
  onFieldChange: (field: string, value: string) => void;
}

export const ShipmentOverview = ({
  shipmentNumber,
  destination,
  originWarehouse,
  departureDate,
  arrivalDate,
  carrier,
  transportType,
  preparedBy,
  notes,
  specialInstructions,
  status,
  warehouses,
  onFieldChange,
}: ShipmentOverviewProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft": return "bg-gray-500";
      case "in-transit": return "bg-blue-500";
      case "delivered": return "bg-green-500";
      case "archived": return "bg-gray-400";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card className="shadow-lg border-l-4 border-l-[#2F5FFF]">
      <CardHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Shipment Overview</CardTitle>
            <CardDescription className="text-gray-200 mt-1">
              Basic routing and transport information
            </CardDescription>
          </div>
          <Badge className={`${getStatusColor(status)} text-lg px-4 py-1`}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* Routing & Locations Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-[#2F5FFF]" />
            <h3 className="text-lg font-bold text-[#0D1321]">Routing & Locations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Origin Location <span className="text-red-500">*</span>
              </Label>
              <Select value={originWarehouse} onValueChange={(value) => onFieldChange("originWarehouse", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} - {wh.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination <span className="text-red-500">*</span>
              </Label>
              <Input 
                value={destination} 
                onChange={(e) => onFieldChange("destination", e.target.value)}
                placeholder="e.g., Region IV - Atlanta Distribution Center"
                className={cn("mt-1", !destination && "border-destructive/50")}
              />
              {!destination && (
                <p className="text-xs text-destructive mt-1">Required: Enter the delivery destination</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Shipment ID</Label>
              <Input 
                value={shipmentNumber} 
                disabled 
                className="bg-[#F6F8FB] font-mono font-bold text-[#0D1321] mt-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Schedule & Transport Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-[#2F5FFF]" />
            <h3 className="text-lg font-bold text-[#0D1321]">Schedule & Transport</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Departure Date
              </Label>
              <Input 
                type="datetime-local" 
                value={departureDate}
                onChange={(e) => onFieldChange("departureDate", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Arrival Date
              </Label>
              <Input 
                type="datetime-local" 
                value={arrivalDate}
                onChange={(e) => onFieldChange("arrivalDate", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Carrier
              </Label>
              <Select value={carrier} onValueChange={(value) => onFieldChange("carrier", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company Transport">Company Transport</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="USPS">USPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Transport Type
              </Label>
              <Select value={transportType} onValueChange={(value) => onFieldChange("transportType", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ground">Ground</SelectItem>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Sea">Sea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes & Instructions Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-[#2F5FFF]" />
            <h3 className="text-lg font-bold text-[#0D1321]">Notes & Instructions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">General Notes</Label>
              <Textarea 
                value={notes}
                onChange={(e) => onFieldChange("notes", e.target.value)}
                placeholder="e.g., #Expedite #FragileContents - Priority supplies&#10;Use hashtags to categorize: #Fragile #Expedite #Urgent"
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Use #hashtags for quick filtering (e.g., #Fragile, #Expedite)
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Special Instructions</Label>
              <Textarea 
                value={specialInstructions}
                onChange={(e) => onFieldChange("specialInstructions", e.target.value)}
                placeholder="e.g., Deliver to Loading Dock 3. Contact site coordinator upon arrival. Requires signature from authorized personnel."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include delivery instructions, contact info, or access requirements
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Prepared By
            </Label>
            <Input 
              value={preparedBy} 
              disabled 
              className="bg-[#F6F8FB] mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-semibold text-muted-foreground">Current Status</Label>
            <Select value={status} onValueChange={(value) => onFieldChange("status", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="In-Transit">In Transit</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
