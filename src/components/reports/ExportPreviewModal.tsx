import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  FileCheck, 
  Table, 
  Download, 
  Clock, 
  Filter, 
  Shield,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ExportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: 'pdf' | 'csv';
  activeFilters: string[];
  onConfirm: () => void;
}

export const ExportPreviewModal = ({
  open,
  onOpenChange,
  exportType,
  activeFilters,
  onConfirm,
}: ExportPreviewModalProps) => {
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);

  const isPDF = exportType === 'pdf';

  const handleExport = () => {
    onConfirm();
    onOpenChange(false);
  };

  const exportSections = [
    { id: 'summary', label: 'Executive Summary', description: 'Key metrics and KPIs', checked: includeSummary, onChange: setIncludeSummary },
    { id: 'charts', label: 'Charts & Visualizations', description: 'Compliance trends, resource status', checked: includeCharts, onChange: setIncludeCharts, pdfOnly: true },
    { id: 'details', label: 'Detailed Data', description: 'Full records and line items', checked: includeDetails, onChange: setIncludeDetails },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isPDF ? (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Table className="h-5 w-5 text-green-600" />
              </div>
            )}
            <div>
              <DialogTitle>
                {isPDF ? 'Export for Audit' : 'Export Raw Data'}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {isPDF 
                  ? 'Generate a formatted PDF report for compliance audits' 
                  : 'Download complete dataset as CSV for analysis'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Audit-Ready Badge for PDF */}
          {isPDF && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                Audit-Ready Format
              </span>
              <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                Certified
              </Badge>
            </div>
          )}

          {/* Export Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Timestamp
              </div>
              <p className="text-sm font-medium">{format(new Date(), "MMM d, yyyy HH:mm")}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3 w-3" />
                Filters Applied
              </div>
              <p className="text-sm font-medium">
                {activeFilters.length > 0 ? `${activeFilters.length} active` : 'All data'}
              </p>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data Scope</Label>
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map((filter, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Section Selection */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Include in Export
            </Label>
            {exportSections
              .filter(section => !section.pdfOnly || isPDF)
              .map((section) => (
                <div 
                  key={section.id}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                    section.checked 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-muted/30 border-transparent"
                  )}
                >
                  <Checkbox 
                    id={section.id} 
                    checked={section.checked} 
                    onCheckedChange={(checked) => section.onChange(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label 
                      htmlFor={section.id} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {section.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                  {section.checked && (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {isPDF ? 'Generate PDF' : 'Download CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
