import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, Loader2, UserPlus, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignMembersToCredentialDialogProps {
  credential: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAssignedIds: string[];
  onSuccess: () => void;
  /** Optional: called with newly assigned member IDs after successful assignment */
  onAssignedMembers?: (memberIds: string[]) => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  department: string | null;
}

export const AssignMembersToCredentialDialog = ({
  credential,
  open,
  onOpenChange,
  alreadyAssignedIds,
  onSuccess,
  onAssignedMembers,
}: AssignMembersToCredentialDialogProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadEmployees();
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, position, department_ref:department_id(name)")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("first_name");

      if (error) throw error;
      setEmployees((data || []).map((e: any) => ({
        ...e,
        department: e.department_ref?.name ?? null,
      })));
    } catch (error: any) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create employee_requirements records for each selected employee
      const inserts = Array.from(selectedIds).map((employeeId) => ({
        employee_id: employeeId,
        requirement_id: credential.id,
        user_id: user.id,
        status: "Assigned", // Default status when newly assigned
      }));

      const { error } = await supabase
        .from("employee_requirements")
        .insert(inserts);

      if (error) throw error;

      const assignedCount = selectedIds.size;
      const assignedIds = Array.from(selectedIds);
      
      toast.success(
        `Assigned ${assignedCount} member${assignedCount > 1 ? "s" : ""} to ${credential.title}`,
        {
          description: "Click on a member to complete their credential details.",
        }
      );
      
      onSuccess();
      onAssignedMembers?.(assignedIds);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error assigning members:", error);
      toast.error(error.message || "Failed to assign members");
    } finally {
      setSaving(false);
    }
  };

  // Filter out already assigned employees and apply search
  const availableEmployees = employees.filter((emp) => {
    // Exclude already assigned
    if (alreadyAssignedIds.includes(emp.id)) return false;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      return (
        fullName.includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Members
          </DialogTitle>
          <DialogDescription>
            Select team members to assign the "{credential?.title}" credential
          </DialogDescription>
          
          {/* Helpful hint */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 mt-3">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              After assigning, click on each member to complete their credential details (issue date, expiration, etc.)
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Member List */}
          <ScrollArea className="h-[300px] -mx-2 px-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableEmployees.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {employees.length === alreadyAssignedIds.length
                    ? "All team members are already assigned"
                    : searchQuery
                    ? "No matching members found"
                    : "No team members available"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {availableEmployees.map((emp) => {
                  const isSelected = selectedIds.has(emp.id);
                  const initials = `${emp.first_name[0]}${emp.last_name[0]}`;
                  const fullName = `${emp.first_name} ${emp.last_name}`;

                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(emp.id)}
                      />
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.position || emp.department || emp.email || "Team Member"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selection count */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} member{selectedIds.size > 1 ? "s" : ""} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={saving || selectedIds.size === 0}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>Assign {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
