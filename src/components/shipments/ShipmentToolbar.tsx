import { Save, Download, QrCode, Copy, Trash2, Printer, MoreVertical, Mail, Archive, Check, History, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ShipmentToolbarProps {
  status: string;
  onSave: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onScanBarcode: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onViewHistory: () => void;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const ShipmentToolbar = ({
  status,
  onSave,
  onExportPDF,
  onExportCSV,
  onPrint,
  onScanBarcode,
  onDuplicate,
  onDelete,
  onStatusChange,
  onViewHistory,
  isAdmin = false,
  createdAt,
  updatedAt,
}: ShipmentToolbarProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft": return "bg-gray-500 hover:bg-gray-600";
      case "in-transit": return "bg-blue-500 hover:bg-blue-600";
      case "delivered": return "bg-green-500 hover:bg-green-600";
      case "archived": return "bg-gray-600 hover:bg-gray-700";
      default: return "bg-gray-500";
    }
  };

  const getTimeSinceUpdate = () => {
    if (!updatedAt) return null;
    const diff = Date.now() - new Date(updatedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#1E2A44] via-[#2F5FFF] to-[#2F5FFF] text-white px-6 py-3 rounded-2xl shadow-2xl mb-6 border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-white/90">Status:</span>
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className={cn(
                  "w-40 border-white/20 text-white font-semibold transition-all",
                  getStatusColor(status)
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="In-Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onSave} 
                    className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105 shadow-lg"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save shipment to database</p>
                </TooltipContent>
              </Tooltip>

              {updatedAt && (
                <Badge className="bg-green-500/20 text-green-100 border-green-400/30 flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  Saved {getTimeSinceUpdate()}
                </Badge>
              )}
            </div>
          </div>
          
          <Separator orientation="vertical" className="hidden lg:block h-8 bg-white/20" />
          
          {/* Tools Section */}
          <div className="flex flex-wrap items-center gap-2 bg-white/5 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/10">
            <span className="text-xs font-semibold text-white/70 mr-1 hidden sm:inline">Export:</span>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onPrint} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Print</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print Manifest</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onExportPDF} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export as PDF</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onExportCSV} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">CSV</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export as CSV spreadsheet</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 bg-white/20 mx-1" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onScanBarcode} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Scan Barcode to add items</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onViewHistory} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all"
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View change history</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onScanBarcode} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Scan Barcode</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 bg-white/20 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onViewHistory} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all"
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View History</p>
              </TooltipContent>
            </Tooltip>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-white hover:bg-white/10 transition-all"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  <div>
                    <p>Duplicate Shipment</p>
                    <p className="text-xs text-muted-foreground">Create a copy with new ID</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  <div>
                    <p>Email Manifest</p>
                    <p className="text-xs text-muted-foreground">Send PDF to recipient</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" />
                  <div>
                    <p>Archive Shipment</p>
                    <p className="text-xs text-muted-foreground">Move to archived records</p>
                  </div>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Shipment
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
