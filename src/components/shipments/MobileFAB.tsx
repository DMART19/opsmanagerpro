import { Button } from "@/components/ui/button";
import { Plus, Save, QrCode } from "lucide-react";

interface MobileFABProps {
  onAddItem: () => void;
  onSave: () => void;
  onScan: () => void;
}

export const MobileFAB = ({ onAddItem, onSave, onScan }: MobileFABProps) => {
  return (
    <div className="lg:hidden fixed bottom-6 right-4 flex flex-col gap-3 z-50 safe-area-inset-bottom">
      <Button 
        onClick={onScan}
        size="icon"
        className="h-12 w-12 min-h-[48px] min-w-[48px] rounded-full bg-[#0D1321] hover:bg-[#0D1321]/90 shadow-2xl active:scale-95 transition-transform"
        aria-label="Scan QR code"
      >
        <QrCode className="h-5 w-5" />
      </Button>
      
      <Button 
        onClick={onAddItem}
        size="icon"
        className="h-12 w-12 min-h-[48px] min-w-[48px] rounded-full bg-[#2F5FFF] hover:bg-[#2F5FFF]/90 shadow-2xl active:scale-95 transition-transform"
        aria-label="Add item"
      >
        <Plus className="h-5 w-5" />
      </Button>
      
      <Button 
        onClick={onSave}
        size="icon"
        className="h-14 w-14 min-h-[56px] min-w-[56px] rounded-full bg-green-600 hover:bg-green-700 shadow-2xl active:scale-95 transition-transform"
        aria-label="Save shipment"
      >
        <Save className="h-6 w-6" />
      </Button>
    </div>
  );
};
