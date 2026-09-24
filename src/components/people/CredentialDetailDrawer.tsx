import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Shield,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  RefreshCw,
  UserPlus,
  ChevronRight,
  Mail,
  Trash2,
  User,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoCredentialMembers } from "@/hooks/use-requirements-data";
import { InlineAssignMembersPopover } from "./InlineAssignMembersPopover";
import { ResolveCredentialDialog } from "./ResolveCredentialDialog";
import { MobileEmployeeDrawer } from "./mobile/MobileEmployeeDrawer";

interface CredentialDetailDrawerProps {
  credential: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
  initialFilter?: FilterType;
}

interface AssignedMember {
  id: string;
  employee_id: string;
  status: string;
  issue_date: string | null;
  expire_date: string | null;
  notes: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    position: string | null;
    department: string | null;
  };
}

type FilterType = "all" | "attention" | "expired" | "missing";

export const CredentialDetailDrawer = ({ 
  credential, 
  open, 
  onOpenChange, 
  onRefresh,
  initialFilter,
}: CredentialDetailDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [_assignDialogOpen, _setAssignDialogOpen] = useState(false);
  const [resolvingAssignment, setResolvingAssignment] = useState<AssignedMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewingMember, setViewingMember] = useState<any>(null);
  const { complianceSettings } = useUserSettings();
  const { isTourMode } = useTourMode();
  const demoMembers = useDemoCredentialMembers(credential?.id || null);

  useEffect(() => {
    if (open && credential?.id) {
      if (isTourMode) {
        setAssignedMembers(demoMembers as AssignedMember[]);
        setLoading(false);
      } else {
        loadAssignedMembers();
      }
      setActiveFilter(initialFilter || "all");
    }
  }, [open, credential?.id, isTourMode, demoMembers, initialFilter]);

  const loadAssignedMembers = async () => {
    if (!credential?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_requirements")
        .select(`
          id,
          employee_id,
          status,
          issue_date,
          expire_date,
          notes,
            employee:employee_id (
              id,
              first_name,
              last_name,
              email,
              position,
              department_ref:department_id(name)
            )
        `)
        .eq("requirement_id", credential.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setAssignedMembers((data || []).map((d: any) => ({
        ...d,
        employee: d.employee ? { ...d.employee, department: d.employee.department_ref?.name ?? null } : d.employee,
      })) as AssignedMember[]);
    } catch (error: any) {
      console.error("Error loading assigned members:", error);
      toast.error("Failed to load assigned members");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteConfirmId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .delete()
        .eq("id", deleteConfirmId);

      if (error) throw error;

      toast.success("Member removed from credential");
      loadAssignedMembers();
      onRefresh?.();
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error(error.message || "Failed to remove member");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusForAssignment = (assignment: AssignedMember) => {
    const warningDays = complianceSettings.warning_threshold_days || 30;
    
    if (assignment.status === "Missing" || assignment.status === "Assigned") {
      return { 
        status: "assigned", 
        color: "text-muted-foreground", 
        bgColor: "bg-muted/50",
        borderColor: "border-border",
        label: "Assigned — pending completion", 
        actionLabel: "Complete",
        icon: AlertCircle,
        needsAction: false,
      };
    }
    
    if (assignment.status === "Expired" || 
        (assignment.expire_date && differenceInDays(new Date(assignment.expire_date), new Date()) < 0)) {
      return { 
        status: "expired", 
        color: "text-destructive", 
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        label: "Expired", 
        actionLabel: "Renew",
        icon: XCircle,
        needsAction: true,
      };
    }
    
    if (assignment.expire_date) {
      const daysUntilExpiry = differenceInDays(new Date(assignment.expire_date), new Date());
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= warningDays) {
        return { 
          status: "expiring", 
          color: "text-warning", 
          bgColor: "bg-warning/10",
          borderColor: "border-warning/30",
          label: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`, 
          actionLabel: "Update",
          icon: Clock,
          needsAction: true,
        };
      }
    }
    
    return { 
      status: "valid", 
      color: "text-success", 
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      label: "Valid", 
      actionLabel: "View",
      icon: CheckCircle,
      needsAction: false,
    };
  };

  // Calculate stats
  const stats = useMemo(() => {
    const results = {
      total: assignedMembers.length,
      valid: 0,
      attention: 0,
      expired: 0,
    };
    
    assignedMembers.forEach(m => {
      const s = getStatusForAssignment(m);
      if (s.status === "valid") results.valid++;
      else if (s.status === "expired") results.expired++;
      else results.attention++;
    });
    
    return results;
  }, [assignedMembers, complianceSettings]);

  // Filter members based on active filter
  const filteredMembers = useMemo(() => {
    if (activeFilter === "all") return assignedMembers;
    
    return assignedMembers.filter(m => {
      const s = getStatusForAssignment(m);
      if (activeFilter === "attention") {
        return s.status === "assigned" || s.status === "expiring";
      }
      if (activeFilter === "expired") {
        return s.status === "expired";
      }
      if (activeFilter === "missing") {
        return s.status === "assigned";
      }
      return true;
    });
  }, [assignedMembers, activeFilter, complianceSettings]);

  const handleStatClick = (filter: FilterType) => {
    setActiveFilter(prev => prev === filter ? "all" : filter);
  };

  if (!credential) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full max-h-screen overflow-hidden bg-background">
        
        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-6 pr-12 pt-8 pb-6 border-b bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold text-foreground truncate">
                {credential.title}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {credential.requirement_type || "Uncategorized"}
                </Badge>
                {credential.is_general && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    All Members
                  </Badge>
                )}
                {!credential.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-6">
            
            {/* Credential Details */}
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wider">Expires</span>
                  </div>
                  <p className="text-sm font-medium">
                    {credential.has_expiration ? "Yes" : "No"}
                  </p>
                </div>
                
                {credential.has_expiration && credential.renewal_cycle_months && (
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">Renewal</span>
                    </div>
                    <p className="text-sm font-medium">
                      Every {credential.renewal_cycle_months} month{credential.renewal_cycle_months !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>

              {credential.description && (
                <p className="text-sm text-muted-foreground">{credential.description}</p>
              )}
            </section>

            <Separator />

            {/* Statistics - Clickable */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Assignment Summary
                </h3>
                {activeFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setActiveFilter("all")}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/40">
                  <span className="text-xl font-semibold text-foreground">{stats.total}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-success/10">
                  <span className="text-xl font-semibold text-success">{stats.valid}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Valid</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStatClick("attention")}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-lg transition-all",
                    "hover:ring-2 hover:ring-warning/50 cursor-pointer",
                    activeFilter === "attention" 
                      ? "bg-warning/20 ring-2 ring-warning" 
                      : "bg-warning/10"
                  )}
                >
                  <span className="text-xl font-semibold text-warning">{stats.attention}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Attention</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatClick("expired")}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-lg transition-all",
                    "hover:ring-2 hover:ring-destructive/50 cursor-pointer",
                    activeFilter === "expired" 
                      ? "bg-destructive/20 ring-2 ring-destructive" 
                      : "bg-destructive/10"
                  )}
                >
                  <span className="text-xl font-semibold text-destructive">{stats.expired}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Expired</span>
                </button>
              </div>
              
              {(stats.attention > 0 || stats.expired > 0) && (
                <p className="text-xs text-muted-foreground text-center">
                  {activeFilter === "all" 
                    ? "Click Attention or Expired to filter. Click a member to resolve."
                    : `Showing ${filteredMembers.length} member${filteredMembers.length !== 1 ? "s" : ""} that need attention.`}
                </p>
              )}
            </section>

            <Separator />

            {/* Assigned Members List */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {activeFilter === "all" 
                    ? `Assigned Team Members (${assignedMembers.length})`
                    : `Filtered Members (${filteredMembers.length})`}
                </h3>
                <InlineAssignMembersPopover
                  credential={credential}
                  alreadyAssignedIds={assignedMembers.map((m) => m.employee_id)}
                  onSuccess={() => {
                    loadAssignedMembers();
                    onRefresh?.();
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add More
                  </Button>
                </InlineAssignMembersPopover>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : assignedMembers.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No team members assigned</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Assign members to begin tracking their compliance status.
                  </p>
                  <InlineAssignMembersPopover
                    credential={credential}
                    alreadyAssignedIds={assignedMembers.map((m) => m.employee_id)}
                    onSuccess={() => {
                      loadAssignedMembers();
                      onRefresh?.();
                    }}
                  >
                    <Button size="sm" className="gap-1.5">
                      <UserPlus className="h-4 w-4" />
                      Assign Members
                    </Button>
                  </InlineAssignMembersPopover>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center rounded-lg bg-muted/30">
                  <CheckCircle className="h-8 w-8 mx-auto text-success/50 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    No members need attention
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All filtered members are up to date
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((assignment) => {
                    const status = getStatusForAssignment(assignment);
                    const StatusIcon = status.icon;
                    const fullName = `${assignment.employee?.first_name || ""} ${assignment.employee?.last_name || ""}`.trim();
                    const initials = `${assignment.employee?.first_name?.[0] || ""}${assignment.employee?.last_name?.[0] || ""}`;
                    
                    return (
                      <div
                        key={assignment.id}
                        className={cn(
                          "group relative rounded-xl border transition-all cursor-pointer",
                          "hover:shadow-md active:scale-[0.99]",
                          status.borderColor,
                          status.needsAction && status.bgColor
                        )}
                        onClick={() => setResolvingAssignment(assignment)}
                      >
                        <div className="p-3 sm:p-4">
                          {/* Mobile-optimized stacked layout */}
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Name and email */}
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{fullName}</p>
                                {assignment.employee?.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{assignment.employee.email}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Status badge - full width on mobile */}
                              <div className="flex items-center justify-between gap-2">
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                                  status.bgColor,
                                  status.needsAction && "ring-1 ring-inset",
                                  status.needsAction && status.status === "assigned" && "ring-muted-foreground/30",
                                  status.needsAction && status.status === "expired" && "ring-destructive/50",
                                  status.needsAction && status.status === "expiring" && "ring-warning/50",
                                )}>
                                  <StatusIcon className={cn("h-3 w-3 flex-shrink-0", status.color)} />
                                  <span className={cn("truncate", status.color)}>
                                    {status.needsAction 
                                      ? status.label
                                      : status.label}
                                  </span>
                                </div>
                                
                                {status.needsAction && (
                                  <span className={cn("text-xs font-medium flex-shrink-0", status.color)}>
                                    {status.actionLabel} →
                                  </span>
                                )}
                                
                                {!status.needsAction && (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick info for valid credentials */}
                          {!status.needsAction && assignment.expire_date && (
                            <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ml-12 sm:ml-13">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span>Issued: {assignment.issue_date ? format(new Date(assignment.issue_date), "PP") : "—"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>Expires: {format(new Date(assignment.expire_date), "PP")}</span>
                              </div>
                            </div>
                          )}

                          {/* Mobile actions row */}
                          <div className="mt-2 pt-2 border-t border-border/30 sm:hidden ml-12 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1.5 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingMember(assignment.employee);
                              }}
                            >
                              <User className="h-3.5 w-3.5" />
                              View Profile
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 px-2 ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(assignment.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Unassign
                            </Button>
                          </div>
                        </div>

                        {/* Remove button (appears on hover - desktop only) */}
                        <button
                          type="button"
                          className={cn(
                            "absolute top-2 right-2 p-1.5 rounded-md",
                            "hidden sm:block opacity-0 group-hover:opacity-100",
                            "bg-background/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
                            "transition-all"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(assignment.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Inline assign is now handled by InlineAssignMembersPopover */}

        {/* Resolve Credential Dialog */}
        <ResolveCredentialDialog
          assignment={resolvingAssignment}
          credential={credential}
          open={!!resolvingAssignment}
          onOpenChange={(open) => !open && setResolvingAssignment(null)}
          onSuccess={() => {
            loadAssignedMembers();
            onRefresh?.();
          }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member from credential?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove this credential assignment from the team member. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAssignment}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Member profile overlay */}
        <MobileEmployeeDrawer
          employee={viewingMember}
          open={!!viewingMember}
          onOpenChange={(open) => !open && setViewingMember(null)}
          onRefresh={() => {
            loadAssignedMembers();
            onRefresh?.();
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
