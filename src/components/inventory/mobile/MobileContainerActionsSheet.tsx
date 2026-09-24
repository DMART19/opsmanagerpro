import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface MobileContainerActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onDeleteAll?: () => void;
  totalCount: number;
}

export const MobileContainerActionsSheet = ({
  open,
  onOpenChange,
  onImport,
  onExportCsv,
  onExportExcel,
  onExportPdf,
  onDeleteAll,
  totalCount,
}: MobileContainerActionsSheetProps) => {
  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>More Actions</SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {/* Import Section */}
          <Button
            variant="ghost"
            className="w-full justify-start h-14 text-base"
            onClick={() => handleAction(onImport)}
          >
            <Upload className="h-5 w-5 mr-3" />
            Import Spreadsheet
          </Button>

          <Separator />

          {/* Export Section */}
          <p className="text-xs text-muted-foreground px-4 pt-2">Export Data</p>
          
          <Button
            variant="ghost"
            className="w-full justify-start h-12"
            onClick={() => handleAction(onExportCsv)}
          >
            <FileText className="h-5 w-5 mr-3" />
            Export as CSV
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start h-12"
            onClick={() => handleAction(onExportExcel)}
          >
            <FileSpreadsheet className="h-5 w-5 mr-3" />
            Export as Excel
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start h-12"
            onClick={() => handleAction(onExportPdf)}
          >
            <FileText className="h-5 w-5 mr-3" />
            Export as PDF
          </Button>

          {/* Danger Zone */}
          {onDeleteAll && totalCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleAction(onDeleteAll)}
              >
                <Trash2 className="h-5 w-5 mr-3" />
                Delete All ({totalCount})
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
