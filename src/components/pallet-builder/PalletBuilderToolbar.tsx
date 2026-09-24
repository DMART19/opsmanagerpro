import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Save, 
  Trash2, 
  Package,
  FileDown,
} from "lucide-react";
import { PalletConfig } from "@/pages/PalletBuilder";
import { cn } from "@/lib/utils";

interface PalletBuilderToolbarProps {
  selectedPallet: PalletConfig | null;
  metrics: {
    totalWeight: number;
    maxWeight: number;
    weightUsage: number;
    itemCount: number;
    layers: number;
  };
  strictMode?: boolean;
  onToggleStrictMode?: () => void;
  onClearAll: () => void;
  onSave: (name: string) => Promise<void>;
  onSaveAsTemplate?: (name: string) => Promise<void>;
  onOverwrite?: () => Promise<void>;
  onExport?: () => void;
  onAutoLoad?: () => void;
  onSmartLayout?: () => void;
  autoLoadStrategy?: string;
  onChangeStrategy?: (strategy: string) => void;
  hasItems: boolean;
  activeBuildName?: string | null;
  isDirty?: boolean;
}

export const PalletBuilderToolbar = ({
  selectedPallet,
  metrics,
  onClearAll,
  onSave,
  onSaveAsTemplate,
  onOverwrite,
  onExport,
  onSmartLayout,
  hasItems,
  activeBuildName,
  isDirty,
}: PalletBuilderToolbarProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    
    setSaving(true);
    try {
      await onSave(saveName.trim());
      // Only close dialog after successful save - onSave will show error toast if it fails
      setSaveDialogOpen(false);
      setSaveName("");
    } catch (err) {
      // Keep dialog open on error so user can retry
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleOverwrite = async () => {
    if (!onOverwrite) return;
    setSaving(true);
    try {
      await onOverwrite();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !onSaveAsTemplate) return;
    
    setSaving(true);
    try {
      await onSaveAsTemplate(templateName.trim());
      setTemplateDialogOpen(false);
      setTemplateName("");
    } finally {
      setSaving(false);
    }
  };

  const canSave = selectedPallet && hasItems;
  const hasActiveBuild = !!activeBuildName;

  // Save button tooltip
  const saveTooltip = !selectedPallet 
    ? "Select a pallet first" 
    : !hasItems 
    ? "Add at least one item to save" 
    : undefined;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Selected Pallet Info */}
      {selectedPallet && (
        <div className="hidden xl:flex items-center gap-1.5 mr-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedPallet.width}" × {selectedPallet.length}"
          </span>
        </div>
      )}

      {/* Clear All */}
      {hasItems && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="gap-1 text-muted-foreground hover:text-destructive h-8 px-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline text-xs">Clear</span>
        </Button>
      )}

      {/* Save — simple button when active build exists */}
      {hasActiveBuild && onOverwrite ? (
        <Button
          size="sm"
          disabled={!canSave || saving || !isDirty}
          className={cn(
            "gap-1.5 transition-all h-8",
            hasItems && isDirty && "shadow-sm"
          )}
          onClick={handleOverwrite}
        >
          <Save className="h-3.5 w-3.5" />
          Save
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70 animate-pulse" />}
        </Button>
      ) : (
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!canSave}
                        data-save-trigger
                        className={cn(
                          "gap-1.5 transition-all h-8",
                          hasItems && "shadow-sm"
                        )}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Pallet Build</DialogTitle>
                        <DialogDescription>
                          Save this pallet configuration for future use or export.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="save-name">Build Name</Label>
                          <Input
                            id="save-name"
                            placeholder="e.g., Medical Supplies - Config A"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          />
                        </div>
                        
                        <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pallet Type</span>
                            <span className="font-medium">{selectedPallet?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items Placed</span>
                            <span className="font-medium">{metrics.itemCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Weight</span>
                            <span className="font-medium">{metrics.totalWeight.toLocaleString()} lbs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Layers Used</span>
                            <span className="font-medium">{metrics.layers}</span>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!saveName.trim() || saving}>
                          {saving ? "Saving..." : "Save Build"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </span>
              </TooltipTrigger>
              {saveTooltip && (
                <TooltipContent side="bottom">
                  <p className="text-xs">{saveTooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Export */}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          disabled={!canSave}
          className="gap-1 h-8 px-2"
          onClick={onExport}
        >
          <FileDown className="h-3.5 w-3.5" />
          <span className="hidden md:inline text-xs">Export</span>
        </Button>
      )}
    </div>
  );
};
