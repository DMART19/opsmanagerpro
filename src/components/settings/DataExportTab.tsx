import { useState } from "react";
import { DataDeletionRequestCard } from "@/components/settings/DataDeletionRequestCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Package,
  Box,
  Users,
  ShieldCheck,
  CalendarDays,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
} from "lucide-react";
import {
  exportWorkspaceData,
  exportAllWorkspaceData,
  DATA_TYPE_LABELS,
  type ExportDataType,
  type ExportFormat,
  type ExportProgress,
} from "@/lib/workspace-export";
import { toast } from "@/hooks/use-toast";

const DATA_TYPE_ICONS: Record<ExportDataType, React.ElementType> = {
  assets: Package,
  containers: Box,
  team_members: Users,
  credentials: ShieldCheck,
  tasks: CalendarDays,
  pallets: Layers,
};

const DATA_TYPE_DESCRIPTIONS: Record<ExportDataType, string> = {
  assets: "All inventory assets with quantities, barcodes, and metadata",
  containers: "Containers with box numbers, descriptions, and item counts",
  team_members: "Team member profiles, roles, and contact info",
  credentials: "Credential assignments, statuses, and expiration dates",
  tasks: "Calendar tasks with statuses, priorities, and dates",
  pallets: "Pallet layouts with types, weights, and capacities",
};

export const DataExportTab = () => {
  const [selectedType, setSelectedType] = useState<ExportDataType | "all">("all");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setProgress(null);

    try {
      enforceRateLimit("export");
      if (selectedType === "all") {
        await exportAllWorkspaceData(format, setProgress);
      } else {
        await exportWorkspaceData(selectedType, format, setProgress);
      }
      toast({
        title: "Export complete",
        description: progress?.message || "Your data has been downloaded",
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-foreground">Export Workspace Data</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download your operational data in CSV or JSON format. Exports stay available for at least
            30 days after a subscription is cancelled.
          </p>
        </div>

      </div>

      {/* Data type cards */}
      <div className="space-y-3 mb-6">
        {/* All data option */}
        <button
          onClick={() => setSelectedType("all")}
          className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
            selectedType === "all"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">All Workspace Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export everything — assets, containers, team, credentials, tasks, and pallets
            </p>
          </div>
          {selectedType === "all" && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
              Selected
            </Badge>
          )}
        </button>

        {(Object.keys(DATA_TYPE_LABELS) as ExportDataType[]).map(type => {
          const Icon = DATA_TYPE_ICONS[type];
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{DATA_TYPE_LABELS[type]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{DATA_TYPE_DESCRIPTIONS[type]}</p>
              </div>
              {isSelected && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
                  Selected
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Format selector + export button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Format:</span>
          <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> CSV
                </span>
              </SelectItem>
              <SelectItem value="json">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" /> JSON
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} disabled={exporting} className="gap-2">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Exporting…" : "Export Data"}
        </Button>
      </div>

      {/* Progress indicator */}
      {progress && (
        <div className={`mt-4 flex items-center gap-2 text-sm rounded-md p-3 border ${
          progress.phase === "error"
            ? "bg-destructive/5 border-destructive/20 text-destructive"
            : progress.phase === "complete"
            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600"
            : "bg-muted/50 border-border text-muted-foreground"
        }`}>
          {progress.phase === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
          {progress.phase === "complete" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {(progress.phase === "fetching" || progress.phase === "formatting") && (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          )}
          <span>{progress.message}</span>
          {progress.recordCount !== undefined && progress.phase === "complete" && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {progress.recordCount.toLocaleString()} records
            </Badge>
          )}
        </div>
      )}

      {/* Data Deletion Request */}
      <DataDeletionRequestCard />
    </Card>
  );
};
