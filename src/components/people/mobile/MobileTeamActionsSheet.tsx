import { Upload, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface MobileTeamActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onStartSelection?: () => void;
  hasMembers?: boolean;
}

export const MobileTeamActionsSheet = ({
  open,
  onOpenChange,
  onImport,
  onExportCsv,
  onExportExcel,
  onStartSelection,
  hasMembers = false,
}: MobileTeamActionsSheetProps) => {
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
          {/* Batch Delete Option */}
          {hasMembers && onStartSelection && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start h-14 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleAction(onStartSelection)}
              >
                <Trash2 className="h-5 w-5 mr-3" />
                Select Members to Delete
              </Button>
              <Separator />
            </>
          )}

          {/* Import Section */}
          <Button
            variant="ghost"
            className="w-full justify-start h-14 text-base"
            onClick={() => handleAction(onImport)}
          >
            <Upload className="h-5 w-5 mr-3" />
            Import from Spreadsheet
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
