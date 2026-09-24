import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExportField {
  key: string;
  label: string;
  defaultSelected?: boolean;
}

interface ExportFieldsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ExportField[];
  formats: ("csv" | "excel" | "pdf")[];
  onExport: (selectedFields: string[], format: "csv" | "excel" | "pdf") => void;
  filterSummary?: string;
  title?: string;
  itemCount?: number;
}

const STORAGE_KEY = "export_selected_fields";

export const ExportFieldsModal = ({
  open,
  onOpenChange,
  fields,
  formats,
  onExport,
  filterSummary,
  title = "Export Report",
  itemCount = 0,
}: ExportFieldsModalProps) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Initialize from saved preferences or defaults
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const valid = parsed.filter(k => fields.some(f => f.key === k));
        if (valid.length > 0) {
          setSelectedFields(new Set(valid));
          return;
        }
      }
    } catch {}
    setSelectedFields(new Set(fields.filter(f => f.defaultSelected !== false).map(f => f.key)));
  }, [open, fields]);

  const toggleField = (key: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFields.size === fields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(fields.map(f => f.key)));
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (selectedFields.size === 0) return;
    setIsExporting(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedFields]));
      await onExport([...selectedFields], format);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  const formatIcons = {
    csv: FileText,
    excel: FileSpreadsheet,
    pdf: FileDown,
  };
  const formatLabels = {
    csv: "CSV",
    excel: "Excel",
    pdf: "PDF",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {itemCount > 0 && <>{itemCount} records · </>}
            Select fields to include
          </DialogDescription>
        </DialogHeader>

        {filterSummary && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">{filterSummary}</p>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[40vh] px-5">
          <div className="space-y-1 pb-2">
            {/* Select All */}
            <button
              className="flex items-center gap-3 w-full py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
              onClick={toggleAll}
            >
              <Checkbox
                checked={selectedFields.size === fields.length}
                className="pointer-events-none"
              />
              <span className="text-sm font-medium">Select All</span>
            </button>

            <div className="border-t border-border/40 my-1" />

            {fields.map(field => (
              <button
                key={field.key}
                className="flex items-center gap-3 w-full py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                onClick={() => toggleField(field.key)}
              >
                <Checkbox
                  checked={selectedFields.has(field.key)}
                  className="pointer-events-none"
                />
                <span className="text-sm">{field.label}</span>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Export buttons */}
        <div className="border-t border-border px-5 py-4 flex gap-2">
          {formats.map(format => {
            const Icon = formatIcons[format];
            return (
              <Button
                key={format}
                className="flex-1 gap-2"
                variant={format === "pdf" ? "default" : "outline"}
                disabled={selectedFields.size === 0 || isExporting}
                onClick={() => handleExport(format)}
              >
                <Icon className="h-4 w-4" />
                {formatLabels[format]}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
