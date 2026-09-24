import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, Calendar, FileText, RefreshCw, Save, Loader2, Package, Users, Activity } from "lucide-react";
import { useTourMode } from "@/contexts/TourModeContext";
import { toast } from "@/hooks/use-toast";
import type { ExportSettings } from "@/hooks/use-user-settings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataExportsTabProps {
  settings: ExportSettings;
  onSave: (settings: Partial<ExportSettings>) => Promise<boolean>;
  saving: boolean;
}

export const DataExportsTab = ({ settings, onSave, saving }: DataExportsTabProps) => {
  const { isTourMode, startDemo, endDemo } = useTourMode();
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof ExportSettings, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const success = await onSave(formData);
    if (success) setHasChanges(false);
  };

  const handleCancel = () => {
    setFormData(settings);
    setHasChanges(false);
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await endDemo();
      const success = await startDemo();
      if (success) {
        toast({
          title: "Demo reset",
          description: "Your demo data has been reset to the initial state.",
        });
      }
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Could not reset demo data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleExport = (type: string) => {
    toast({
      title: "Export started",
      description: `Your ${type} export is being prepared.`,
    });
  };

  const exportTypes = [
    { id: "inventory", icon: Package, title: "Inventory", description: "All assets and items" },
    { id: "team", icon: Users, title: "Team", description: "Employees and credentials" },
    { id: "activity", icon: Activity, title: "Activity", description: "Checkouts and changes" },
  ];

  return (
    <div className="space-y-4">
      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-lg">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[100px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>
      )}

      {/* Export Preferences */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Export Preferences
        </h3>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <Label className="font-medium">Default Format</Label>
                <p className="text-xs text-muted-foreground">File type for exports</p>
              </div>
              <Select
                value={formData.default_format}
                onValueChange={(val) => handleChange("default_format", val)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <Label className="font-medium">Default Date Range</Label>
                <p className="text-xs text-muted-foreground">Time period for reports</p>
              </div>
              <Select
                value={formData.date_range_default}
                onValueChange={(val) => handleChange("date_range_default", val)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <Label className="font-medium">Include Headers</Label>
                <p className="text-xs text-muted-foreground">Column names as first row</p>
              </div>
            </div>
            <Switch
              checked={formData.include_headers}
              onCheckedChange={(val) => handleChange("include_headers", val)}
            />
          </div>
        </Card>
      </div>

      {/* Quick Exports */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Quick Exports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {exportTypes.map((exportType) => {
            const Icon = exportType.icon;
            return (
              <Card 
                key={exportType.id}
                className="p-4 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                onClick={() => handleExport(exportType.title)}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{exportType.title}</p>
                    <p className="text-xs text-muted-foreground">{exportType.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Demo Controls */}
      {isTourMode && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Demo Mode
          </h3>
          <Card className="p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="h-5 w-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <Label className="font-medium">Reset Demo Data</Label>
                  <p className="text-xs text-muted-foreground">Restore to original state</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-warning text-warning hover:bg-warning/10"
                onClick={() => setShowResetConfirm(true)}
              >
                Reset
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Demo Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all demo data. Any changes you've made will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetDemo}
              disabled={resetting}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
