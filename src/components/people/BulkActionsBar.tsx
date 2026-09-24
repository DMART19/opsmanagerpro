import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Download, Users, Trash2, UserX, Shield, ShieldCheck, Search, Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { createPreActionSnapshot } from "@/lib/snapshot-utils";
import { BulkDeleteConfirmationDialog } from "./BulkDeleteConfirmationDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamRoles } from "@/hooks/use-team-roles";
import { useRequirements, REQUIREMENTS_QUERY_KEY } from "@/hooks/use-requirements";
import { EMPLOYEES_QUERY_KEY } from "@/hooks/use-employees";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedEmployees: any[];
  onClearSelection: () => void;
  onRefresh?: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  selectedEmployees,
  onClearSelection,
  onRefresh,
}: BulkActionsBarProps) => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);
  const { roles } = useTeamRoles();

  // Inline credential assignment state
  const [credPopoverOpen, setCredPopoverOpen] = useState(false);
  const [credSearch, setCredSearch] = useState("");
  const [selectedCredIds, setSelectedCredIds] = useState<Set<string>>(new Set());
  const [assigningCreds, setAssigningCreds] = useState(false);
  const { requirements, loading: reqLoading } = useRequirements();

  // Reset credential selection when popover closes
  useEffect(() => {
    if (!credPopoverOpen) {
      setCredSearch("");
      setSelectedCredIds(new Set());
    }
  }, [credPopoverOpen]);

  if (selectedCount === 0) return null;

  const handleDeactivateSelected = async () => {
    const ids = selectedEmployees.map(e => e.id);
    const { error } = await supabase
      .from("employees")
      .update({ status: "Inactive", updated_at: new Date().toISOString() })
      .in("id", ids);

    if (error) throw error;

    toast.success(`Deactivated ${selectedCount} member${selectedCount > 1 ? "s" : ""}`);
    onClearSelection();
    onRefresh?.();
  };

  const handleBulkAssignRole = async () => {
    if (!bulkRoleId) return;
    setAssigningRole(true);
    try {
      const ids = selectedEmployees.map(e => e.id);
      const { error } = await supabase
        .from("employees")
        .update({ role_id: bulkRoleId, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      toast.success(`Role updated for ${selectedCount} member${selectedCount > 1 ? "s" : ""}`);
      onClearSelection();
      onRefresh?.();
      setAssignRoleOpen(false);
    } catch (err: any) {
      toast.error("Failed to assign role", { description: err.message });
    } finally {
      setAssigningRole(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await createPreActionSnapshot(`Bulk delete ${selectedCount} team member(s)`);
      const ids = selectedEmployees.map(e => e.id);
      const { error: empError } = await supabase
        .from("employees")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (empError) throw empError;
      toast.success("Members removed", {
        description: `Successfully removed ${selectedCount} team member${selectedCount > 1 ? "s" : ""}.`,
      });
      onClearSelection();
      onRefresh?.();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error("Delete failed", {
        description: error.message || "Could not delete selected members.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCredential = (id: string) => {
    setSelectedCredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAssignCredentials = async () => {
    if (selectedCredIds.size === 0) return;
    setAssigningCreds(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const assignments: any[] = [];
      for (const emp of selectedEmployees) {
        for (const reqId of selectedCredIds) {
          assignments.push({
            employee_id: emp.id,
            requirement_id: reqId,
            status: "Assigned",
            user_id: user.id,
          });
        }
      }

      const batchSize = 100;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        const { error } = await supabase
          .from("employee_requirements")
          .upsert(batch, { onConflict: "employee_id,requirement_id", ignoreDuplicates: true });
        if (error) throw error;
      }

      toast.success(
        `Assigned ${selectedCredIds.size} credential${selectedCredIds.size > 1 ? "s" : ""} to ${selectedCount} member${selectedCount > 1 ? "s" : ""}`
      );
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
      setCredPopoverOpen(false);
      onRefresh?.();
    } catch (error: any) {
      toast.error("Failed to assign", { description: error.message });
    } finally {
      setAssigningCreds(false);
    }
  };

  const filteredRequirements = requirements
    .filter(r => r.is_active)
    .filter(r => !credSearch || r.title.toLowerCase().includes(credSearch.toLowerCase()));

  const groupedReqs = filteredRequirements.reduce((acc, req) => {
    const type = req.requirement_type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(req);
    return acc;
  }, {} as Record<string, any[]>);

  const memberNames = selectedEmployees.map(e => `${e.first_name} ${e.last_name}`);

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-sm border-t shadow-lg",
          "animate-in slide-in-from-bottom-4 duration-300"
        )}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Selection info */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1.5">
                <Users className="h-4 w-4" />
                {selectedCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Inline Assign Credentials */}
              <Popover open={credPopoverOpen} onOpenChange={setCredPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Assign Credentials</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[340px] p-0"
                  align="end"
                  side="top"
                  sideOffset={8}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="px-3 pt-3 pb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Assign to {selectedCount} member{selectedCount > 1 ? "s" : ""}</p>
                      {selectedCredIds.size > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedCredIds.size} selected
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search credentials..."
                        value={credSearch}
                        onChange={(e) => setCredSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>

                  <ScrollArea className="max-h-[260px] border-t">
                    {reqLoading ? (
                      <div className="py-8 text-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                      </div>
                    ) : filteredRequirements.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">No credentials found</p>
                    ) : (
                      <div className="p-2 space-y-3">
                        {Object.entries(groupedReqs).map(([type, reqs]) => (
                          <div key={type}>
                            <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {type}
                            </p>
                            {(reqs as any[]).map((req) => (
                              <label
                                key={req.id}
                                className={cn(
                                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                                  selectedCredIds.has(req.id) ? "bg-primary/10" : "hover:bg-muted/50"
                                )}
                              >
                                <Checkbox
                                  checked={selectedCredIds.has(req.id)}
                                  onCheckedChange={() => toggleCredential(req.id)}
                                  className="h-3.5 w-3.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{req.title}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Action footer */}
                  <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/30">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                      disabled={selectedCredIds.size === 0 || assigningCreds}
                      onClick={handleBulkAssignCredentials}
                    >
                      {assigningCreds ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="h-3.5 w-3.5" />
                      )}
                      Assign {selectedCredIds.size > 0 ? `(${selectedCredIds.size})` : ""}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkRoleId("");
                  setAssignRoleOpen(true);
                }}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Assign Role</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivateDialogOpen(true)}
                className="gap-2"
              >
                <UserX className="h-4 w-4" />
                <span className="hidden sm:inline">Deactivate</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Remove</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BulkDeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        memberCount={selectedCount}
        memberNames={memberNames}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
      />

      <ConfirmationDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title={`Deactivate ${selectedCount} member${selectedCount > 1 ? "s" : ""}?`}
        description={`This will set ${selectedCount} selected team member${selectedCount > 1 ? "s" : ""} to Inactive status. You can reactivate them later.`}
        confirmLabel="Deactivate"
        variant="default"
        onConfirm={handleDeactivateSelected}
      />

      <Dialog open={assignRoleOpen} onOpenChange={setAssignRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Set the role for {selectedCount} selected member{selectedCount > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Role</Label>
            <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssignRole} disabled={assigningRole || !bulkRoleId}>
              {assigningRole ? "Saving..." : "Apply Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
