import { useState, useEffect, useRef } from "react";
import { SeedDataSection } from "./SeedDataSection";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Check, Archive, RotateCcw, AlertTriangle } from "lucide-react";
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
import type { WorkspaceSettings } from "@/contexts/SettingsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkspaceTabProps {
  settings: WorkspaceSettings;
  onSave: (settings: Partial<WorkspaceSettings>) => Promise<boolean>;
  saving: boolean;
}

export const WorkspaceTab = ({ settings, onSave, saving }: WorkspaceTabProps) => {
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [nameError, setNameError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { plan, refreshPlan } = useSubscription();
  const { hasPermission } = useWorkspacePermissions();
  const isAdmin = hasPermission("assign_roles");

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof WorkspaceSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setJustSaved(false);
    if (field === "workspace_name") {
      setNameError(value.trim() === "" ? "Workspace name is required" : "");
    }
  };

  const handleSave = async () => {
    const trimmedName = formData.workspace_name.trim();
    if (!trimmedName) {
      setNameError("Workspace name is required");
      return;
    }
    const toSave = { ...formData, workspace_name: trimmedName };
    const success = await onSave(toSave);
    if (success) {
      setHasChanges(false);
      setJustSaved(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setJustSaved(false), 2500);
    }
  };

  const handleCancel = () => {
    setFormData(settings);
    setHasChanges(false);
    setNameError("");
  };

  const handleArchiveToggle = async () => {
    setArchiving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rpcName = plan.isArchived ? "restore_workspace" : "archive_workspace";
      const { error } = await (supabase.rpc as any)(rpcName, { p_user_id: user.id });
      if (error) throw error;

      toast.success(plan.isArchived ? "Workspace restored successfully." : "Workspace has been archived.");
      await refreshPlan();
      setArchiveConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update workspace status.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Archived banner */}
      {plan.isArchived && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg animate-fade-in">
          <Archive className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">This workspace has been archived.</p>
            <p className="text-xs text-muted-foreground">
              Data is preserved but all modifications are disabled. Restore the workspace to resume operations.
            </p>
          </div>
        </div>
      )}

      <Card className="divide-y divide-border/50">
        {/* Workspace Name */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="workspace_name" className="text-sm font-medium">Workspace Name</Label>
            {justSaved && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium animate-fade-in">
                <Check className="h-3 w-3" /> Updated
              </span>
            )}
          </div>
          <Input
            id="workspace_name"
            value={formData.workspace_name}
            onChange={(e) => handleChange("workspace_name", e.target.value)}
            onBlur={() => {
              if (formData.workspace_name.trim() === "") {
                setNameError("Workspace name is required");
              }
            }}
            placeholder="My Organization"
            className={nameError ? "border-destructive" : ""}
            disabled={plan.isArchived}
          />
          {nameError ? (
            <p className="text-xs text-destructive">{nameError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Used in reports and exports</p>
          )}
        </div>

        {/* Time Format */}
        <div className="p-4 space-y-2">
          <Label htmlFor="time_format" className="text-sm font-medium">Time Format</Label>
          <Select
            value={formData.time_format} 
            onValueChange={(val) => handleChange("time_format", val)}
            disabled={plan.isArchived}
          >
            <SelectTrigger id="time_format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12-hour (2:30 PM)</SelectItem>
              <SelectItem value="24">24-hour (14:30)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Applies across the entire app</p>
        </div>
      </Card>

      {/* Save Bar */}
      {hasChanges && !plan.isArchived && (
        <div className="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg animate-fade-in">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !!nameError}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Archive / Restore Section — workspace_admin only */}
      {isAdmin && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
            Workspace Lifecycle
          </h3>
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {plan.isArchived ? "Restore Workspace" : "Archive Workspace"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.isArchived
                    ? "Reactivate this workspace to resume all operations."
                    : "Archiving disables all modifications. Data is preserved for export and review."}
                </p>
              </div>
              <Button
                variant={plan.isArchived ? "default" : "outline"}
                size="sm"
                className={plan.isArchived ? "" : "text-destructive hover:text-destructive hover:bg-destructive/5"}
                onClick={() => setArchiveConfirmOpen(true)}
              >
                {plan.isArchived ? (
                  <><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-1.5" /> Archive</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Archive/Restore Confirmation */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {plan.isArchived ? (
                <><RotateCcw className="h-5 w-5 text-primary" /> Restore Workspace</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> Archive Workspace</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {plan.isArchived
                ? "This will reactivate the workspace and restore full access for all team members."
                : "Archiving will disable all modifications — no assets, team members, or data can be created or edited. Admins can still view and export data. You can restore the workspace at any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveToggle}
              disabled={archiving}
              className={plan.isArchived ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {archiving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {plan.isArchived ? "Restore Workspace" : "Archive Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seed Data Management */}
      <SeedDataSection />
    </div>
  );
};
