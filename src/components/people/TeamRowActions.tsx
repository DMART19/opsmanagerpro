import { useState } from "react";
import { Edit, Eye, FilePlus, Lock, MoreHorizontal, Trash2, UserX, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { AssignCredentialToMemberDialog } from "./mobile/AssignCredentialToMemberDialog";
import { useFeatureGate } from "@/components/feature-locks";
import { FeatureLockModal } from "@/components/feature-locks/FeatureLockModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTeamRoles } from "@/hooks/use-team-roles";

interface TeamRowActionsProps {
  employee: any;
  onViewProfile: () => void;
  onViewCredentials: () => void;
  onRemove?: () => void;
  visible?: boolean;
}

export const TeamRowActions = ({
  employee,
  onViewProfile,
  onViewCredentials,
  onRemove,
  visible = false,
}: TeamRowActionsProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [assignCredentialOpen, setAssignCredentialOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(employee.role_id || "");
  const [changingRole, setChangingRole] = useState(false);
  const fullName = `${employee.first_name} ${employee.last_name}`.trim() || employee.email || "Member";

  const featureGate = useFeatureGate();
  const isLocked = featureGate?.isLocked ?? false;
  const lockedPlanName = featureGate?.requiredPlan ?? "";
  const { roles } = useTeamRoles();

  const isActive = (employee.status || "Active").toLowerCase() === "active";

  const handleRemove = async () => {
    // Soft delete - mark as deleted instead of permanent removal
    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", employee.id);
    if (error) throw error;

    toast({
      title: "Member removed",
      description: `${fullName} has been removed from your team.`,
    });
    onRemove?.();
  };

  const handleDeactivate = async () => {
    const newStatus = isActive ? "Inactive" : "Active";
    const { error } = await supabase
      .from("employees")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", employee.id);
    if (error) throw error;

    toast({
      title: isActive ? "Member deactivated" : "Member reactivated",
      description: `${fullName} is now ${newStatus.toLowerCase()}.`,
    });
    onRemove?.(); // triggers refetch
  };

  const handleChangeRole = async () => {
    if (!selectedRoleId || selectedRoleId === employee.role_id) {
      setChangeRoleOpen(false);
      return;
    }
    setChangingRole(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ role_id: selectedRoleId, updated_at: new Date().toISOString() })
        .eq("id", employee.id);
      if (error) throw error;
      toast({ title: "Role updated", description: `${fullName}'s role has been changed.` });
      onRemove?.();
      setChangeRoleOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to change role", description: err.message, variant: "destructive" });
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-1 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => {
              if (isLocked) { setLockModalOpen(true); return; }
              setEditModalOpen(true);
            }}>
              {isLocked ? <Lock className="h-4 w-4 mr-2 text-muted-foreground" /> : <Edit className="h-4 w-4 mr-2" />}
              Edit Member
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (isLocked) { setLockModalOpen(true); return; }
              setSelectedRoleId(employee.role_id || "");
              setChangeRoleOpen(true);
            }}>
              {isLocked ? <Lock className="h-4 w-4 mr-2 text-muted-foreground" /> : <Shield className="h-4 w-4 mr-2" />}
              Change Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (isLocked) { setLockModalOpen(true); return; }
              setAssignCredentialOpen(true);
            }}>
              {isLocked ? <Lock className="h-4 w-4 mr-2 text-muted-foreground" /> : <FilePlus className="h-4 w-4 mr-2" />}
              Assign Credential
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (isLocked) { setLockModalOpen(true); return; }
                setDeactivateDialogOpen(true);
              }}
            >
              <UserX className="h-4 w-4 mr-2" />
              {isActive ? "Deactivate Member" : "Reactivate Member"}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (isLocked) { setLockModalOpen(true); return; }
                setDeleteDialogOpen(true);
              }}
            >
              {isLocked ? <Lock className="h-4 w-4 mr-2 text-muted-foreground" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove team member?"
        description={`Are you sure you want to remove ${fullName}? This will permanently delete them and all their assigned credentials.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
        showWarning
        warningText="This action cannot be undone."
      />

      {/* Deactivate confirmation */}
      <ConfirmationDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title={isActive ? "Deactivate member?" : "Reactivate member?"}
        description={isActive
          ? `${fullName} will be marked as inactive and won't appear in active team views. You can reactivate them later.`
          : `${fullName} will be marked as active again.`
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        variant="default"
        onConfirm={handleDeactivate}
      />

      {/* Change Role dialog */}
      <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Update the role for {fullName}.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
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
            <Button variant="outline" onClick={() => setChangeRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeRole} disabled={changingRole}>
              {changingRole ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditEmployeeModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        employee={employee}
        onSuccess={() => onRemove?.()} 
      />

      <AssignCredentialToMemberDialog
        employeeId={employee.id}
        employeeName={fullName}
        alreadyAssignedIds={[]}
        open={assignCredentialOpen}
        onOpenChange={setAssignCredentialOpen}
        onSuccess={() => onRemove?.()}
      />

      <FeatureLockModal
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
        featureName="Team Management"
        description={`This action requires the ${lockedPlanName} plan. Upgrade to manage team members, assign credentials, and more.`}
        requiredPlan={lockedPlanName}
      />
    </>
  );
};
