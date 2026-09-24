import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Weight, Truck, Copy, Check, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ShipmentBadgeProps {
  shipmentNumber: string;
  status: string;
  totalItems: number;
  totalWeight: number;
  carrier: string;
}

export const ShipmentBadge = ({
  shipmentNumber,
  status,
  totalItems,
  totalWeight,
  carrier,
}: ShipmentBadgeProps) => {
  const [copied, setCopied] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft": return "bg-gray-500 text-white";
      case "in-transit": return "bg-blue-500 text-white";
      case "delivered": return "bg-green-500 text-white";
      case "archived": return "bg-gray-400 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getLoadProgress = () => {
    if (totalItems === 0) return { label: "Empty", percent: 0, icon: "📦" };
    if (status.toLowerCase() === "delivered") return { label: "Delivered", percent: 100, icon: "✅" };
    if (status.toLowerCase() === "in-transit") return { label: "In Transit", percent: 100, icon: "🚚" };
    if (totalItems > 0 && totalItems < 10) return { label: "Partial", percent: 50, icon: "📦" };
    return { label: "Ready to Ship", percent: 95, icon: "🚚" };
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shipmentNumber);
    setCopied(true);
    toast({ title: "Copied!", description: "Shipment ID copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = getLoadProgress();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Shipment Info Card */}
      <div className="bg-gradient-to-r from-[#1E2A44] to-[#2F5FFF] text-white p-5 rounded-2xl shadow-lg border border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-300 font-medium">Shipment ID</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{shipmentNumber}</span>
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white hover:bg-white/10"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
          <Badge className={`${getStatusColor(status)} text-sm px-3 py-1 font-semibold`}>
            {status}
          </Badge>
        </div>
        
        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Load Progress</span>
            <span className="font-semibold flex items-center gap-1">
              <span>{progress.icon}</span>
              {progress.label}
            </span>
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Carrier Info Card */}
      <div className="bg-gradient-to-r from-[#1E2A44] to-[#2F5FFF] text-white p-5 rounded-2xl shadow-lg border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-300 font-medium">Carrier</p>
            <span className="font-bold text-lg">{carrier}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
          <div>
            <p className="text-xs text-gray-300">Transport</p>
            <p className="text-sm font-semibold">Ground</p>
          </div>
          <div>
            <p className="text-xs text-gray-300">Service</p>
            <p className="text-sm font-semibold">Standard</p>
          </div>
        </div>
      </div>

      {/* Metrics Card */}
      <div className="bg-gradient-to-r from-[#1E2A44] to-[#2F5FFF] text-white p-5 rounded-2xl shadow-lg border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs text-gray-300 font-medium">Shipment Metrics</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-3 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-gray-300" />
              <p className="text-xs text-gray-300">Items</p>
            </div>
            <p className="font-bold text-2xl">{totalItems}</p>
          </div>
          
          <div className="bg-white/5 p-3 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Weight className="h-4 w-4 text-gray-300" />
              <p className="text-xs text-gray-300">Weight</p>
            </div>
            <p className="font-bold text-2xl">{totalWeight.toFixed(0)}</p>
            <p className="text-xs text-gray-300">lbs</p>
          </div>
        </div>
      </div>
    </div>
  );
};
