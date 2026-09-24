import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Phone,
  Shield,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  XCircle,
  Trash2,
  ExternalLink,
  LogIn,
  FileText,
  Pencil,
  Copy,
  AlertTriangle,
  UserX,
  Plus,
  MapPin,
  Briefcase,
  Building2,
  ShieldPlus,
  PhoneCall,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { AssetReturnDialog } from "@/components/inventory/AssetReturnDialog";
import { ItemCheckinDialog } from "@/components/inventory/ItemCheckinDialog";
import { CredentialActionDialog } from "./CredentialActionDialog";
import { InlineEditField } from "./InlineEditField";
import { InlineAssignCredentialPopover } from "./InlineAssignCredentialPopover";
import { RoleSuggestedCredentials } from "./RoleSuggestedCredentials";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTeamMemberAttributes, useEmployeeAttributeValues } from "@/hooks/use-team-member-attributes";
import { useComplianceSettings } from "@/hooks/use-compliance-settings";
import { useEmployeeItemCheckouts, ItemCheckout, isCheckoutOverdue } from "@/hooks/use-item-checkout";
import { useTeamRoles } from "@/hooks/use-team-roles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type DrawerTab = "overview" | "credentials" | "activity";

interface EmployeeDrawerProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export const EmployeeDrawer = ({ employee: employeeProp, open, onOpenChange, onRefresh }: EmployeeDrawerProps) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [employeeRequirements, setEmployeeRequirements] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [itemCheckinDialogOpen, setItemCheckinDialogOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);
  const [selectedItemCheckout, setSelectedItemCheckout] = useState<ItemCheckout | null>(null);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [assignCredentialOpen, setAssignCredentialOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const { customFields } = useCustomFields("employees");
  const { attributes: customAttributes } = useTeamMemberAttributes();
  const { valuesMap: attributeValuesMap, isLoading: attributeValuesLoading } = useEmployeeAttributeValues(employeeProp?.id || null);
  const { getCredentialStatus, warningThresholdDays } = useComplianceSettings();
  const { roles } = useTeamRoles();
  
  const { 
    activeCheckouts: activeItemCheckouts, 
    returnedCheckouts: returnedItemCheckouts,
    overdueCheckouts: overdueItemCheckouts,
    loading: itemCheckoutsLoading,
    refetch: refetchItemCheckouts
  } = useEmployeeItemCheckouts(employeeProp?.id || null);

  const employee = employeeData || employeeProp;

  useEffect(() => {
    if (employeeProp) {
      setEmployeeData(employeeProp);
    }
  }, [employeeProp?.id]);

  useEffect(() => {
    if (!open) {
      setEmployeeData(null);
      setActiveTab("overview");
    }
  }, [open]);

  const handleEditSuccess = async () => {
    await loadEmployeeDetails();
    onRefresh?.();
  };

  const handleDeleteEmployee = async () => {
    if (!employee?.id) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      toast.error("Please sign in to delete employees");
      return;
    }
    const { error } = await supabase.from("employees").update({ deleted_at: new Date().toISOString(), deleted_by: session.session.user.id }).eq("id", employee.id);
    if (error) {
      console.error("Delete error:", error);
      if (error.code === '42501') {
        toast.error("Permission denied", { description: "You need Manager or Admin role to delete employees." });
      } else {
        toast.error("Failed to delete employee", { description: error.message });
      }
      throw error;
    }
    toast.success("Team member removed", { description: `${employee.first_name} ${employee.last_name} has been removed.` });
    onOpenChange(false);
    await onRefresh?.();
  };

  const handleDeactivate = async () => {
    if (!employee?.id) return;
    const isActive = (employee.status || "active") === "active";
    const newStatus = isActive ? "inactive" : "active";
    const { error } = await supabase.from("employees").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", employee.id);
    if (error) {
      toast.error(`Failed to ${isActive ? "deactivate" : "reactivate"} member`);
      return;
    }
    toast.success(`${employee.first_name} ${isActive ? "deactivated" : "reactivated"}`);
    await loadEmployeeDetails();
    onRefresh?.();
  };

  useEffect(() => {
    if (open && employeeProp?.id) {
      loadEmployeeDetails();
    }
  }, [open, employeeProp?.id]);

  const loadEmployeeDetails = async () => {
    const currentId = employeeData?.id || employeeProp?.id;
    if (!currentId) return;
    setLoading(true);
    try {
      const { data: freshEmployee, error: empError } = await supabase
        .from("employees")
        .select(`*, team_role:role_id (id, name, color)`)
        .eq("id", currentId)
        .is("deleted_at", null)
        .single();
      if (empError) console.error("Error fetching employee:", empError);
      else if (freshEmployee) setEmployeeData(freshEmployee);

      const { data: certsData } = await supabase
        .from("certifications")
        .select("*")
        .eq("staff_id", currentId)
        .order("expiry_date", { ascending: true });
      setCertifications(certsData || []);

      const { data: reqData } = await supabase
        .from("employee_requirements")
        .select(`*, requirement:requirement_id (id, title, requirement_type_ref:requirement_type_id(name), description, has_expiration, renewal_cycle_months, is_general)`)
        .eq("employee_id", currentId)
        .order("updated_at", { ascending: false });
      setEmployeeRequirements(reqData || []);

      const { data: checkoutsData } = await supabase
        .from("equipment_checkouts")
        .select(`*, equipment:equipment_id (id, name, asset_tag, category, status)`)
        .eq("staff_id", currentId)
        .order("checkout_date", { ascending: false });
      setCheckouts(checkoutsData || []);

      // Load activity history from change_history
      const { data: historyData } = await supabase
        .from("change_history")
        .select("*")
        .eq("object_id", currentId)
        .in("object_type", ["employee", "employee_requirement"])
        .order("created_at", { ascending: false })
        .limit(20);
      setActivityHistory(historyData || []);
    } catch (error: any) {
      console.error("Error loading employee details:", error);
      toast.error("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  const handleInlineSave = async (field: string, value: string) => {
    if (!employee?.id) return;
    const { error } = await supabase
      .from("employees")
      .update({ [field]: value || null, updated_at: new Date().toISOString() })
      .eq("id", employee.id);
    if (error) {
      toast.error(`Failed to update ${field}`);
      throw error;
    }
    toast.success("Updated successfully");
    setEmployeeData((prev: any) => prev ? { ...prev, [field]: value || null } : prev);
    onRefresh?.();
  };

  const handleRoleInlineSave = async (roleId: string) => {
    if (!employee?.id) return;
    const { error } = await supabase
      .from("employees")
      .update({ role_id: roleId || null, updated_at: new Date().toISOString() })
      .eq("id", employee.id);
    if (error) {
      toast.error("Failed to update role");
      return;
    }
    toast.success("Role updated");
    await loadEmployeeDetails();
    onRefresh?.();
  };


  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active": return { label: "Active", variant: "success" as const, icon: CheckCircle };
      case "on-leave": return { label: "On Leave", variant: "warning" as const, icon: Clock };
      case "inactive": return { label: "Inactive", variant: "secondary" as const, icon: XCircle };
      case "terminated": return { label: "Terminated", variant: "destructive" as const, icon: XCircle };
      default: return { label: status || "Active", variant: "secondary" as const, icon: AlertCircle };
    }
  };

  if (!employee) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="p-0 w-full sm:max-w-xl">
          <div className="flex items-center justify-center h-full">
            <Skeleton className="w-full h-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const statusConfig = getStatusConfig(employee.status || employee.employment_status || "active");
  const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`;
  const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  const isActive = (employee.status || "active") === "active";

  const activeCheckouts = checkouts.filter(c => c.status === "active");
  const returnedCheckouts = checkouts.filter(c => c.status === "completed" || c.status === "returned");
  const totalActiveCheckouts = activeCheckouts.length + activeItemCheckouts.length;

  const hasCustomData = (employee.custom_data && Object.keys(employee.custom_data).length > 0 && customFields.length > 0) ||
    (customAttributes.length > 0 && Object.values(attributeValuesMap).some(v => v !== null && v !== undefined && v !== ""));

  const totalCredentials = employeeRequirements.length;
  const expiringCredentials = employeeRequirements.filter(req => {
    const status = getCredentialStatus(req.expire_date, req.status);
    return status.status === "expiring";
  }).length;
  const expiredCredentials = employeeRequirements.filter(req => {
    const status = getCredentialStatus(req.expire_date, req.status);
    return status.status === "expired";
  }).length;
  const assignedCredentials = employeeRequirements.filter(req => {
    const status = getCredentialStatus(req.expire_date, req.status);
    return status.status === "assigned";
  }).length;
  const validCredentials = employeeRequirements.filter(req => {
    const status = getCredentialStatus(req.expire_date, req.status);
    return status.status === "valid";
  }).length;

  const hasAttentionNeeded = expiredCredentials > 0 || overdueItemCheckouts.length > 0;

  const getComplianceState = () => {
    if (expiredCredentials > 0) return { label: "Non-Compliant", color: "text-destructive", bg: "bg-destructive/10" };
    if (expiringCredentials > 0) return { label: "At Risk", color: "text-warning", bg: "bg-warning/10" };
    if (totalCredentials === 0) return { label: "No Credentials", color: "text-muted-foreground", bg: "bg-muted" };
    return { label: "Compliant", color: "text-success", bg: "bg-success/10" };
  };
  const complianceState = getComplianceState();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const complianceSummaryParts: string[] = [];
  if (validCredentials > 0) complianceSummaryParts.push(`${validCredentials} Valid`);
  if (expiringCredentials > 0) complianceSummaryParts.push(`${expiringCredentials} Expiring`);
  if (expiredCredentials > 0) complianceSummaryParts.push(`${expiredCredentials} Expired`);
  if (assignedCredentials > 0) complianceSummaryParts.push(`${assignedCredentials} Assigned`);

  const tabs: { id: DrawerTab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "credentials", label: "Credentials", count: totalCredentials },
    { id: "activity", label: "Activity", count: totalActiveCheckouts },
  ];

  const handleAddCredential = () => {
    setAssignCredentialOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full max-h-screen overflow-hidden bg-background">
        
        {/* ========== HEADER: Identity ========== */}
        <div className="flex-shrink-0 px-5 pr-12 pt-5 pb-2 border-b bg-gradient-to-b from-muted/15 to-transparent">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm flex-shrink-0">
              {employee.avatar_url && (
                <AvatarImage src={employee.avatar_url} alt={fullName} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{fullName}</h1>
                {hasAttentionNeeded && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {expiredCredentials > 0 && `${expiredCredentials} expired`}
                          {expiredCredentials > 0 && assignedCredentials > 0 && ", "}
                          {assignedCredentials > 0 && `${assignedCredentials} assigned`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-muted-foreground text-sm truncate mt-0.5">
                {employee.team_role?.name || employee.position || employee.department || "Team Member"}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant={statusConfig.variant} className="text-[10px] px-2 py-0.5">
                  {statusConfig.label}
                </Badge>
                <div className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", complianceState.bg, complianceState.color)}>
                  <Shield className="h-3 w-3" />
                  {complianceState.label}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <TooltipProvider delayDuration={200}>
                  {[
                    { label: "Edit", icon: Pencil, onClick: () => setEditModalOpen(true) },
                    { label: "Add Credential", icon: ShieldPlus, onClick: () => {}, isCredentialAction: true },
                    { label: "Message", icon: Mail, onClick: () => employee.email ? (window.location.href = `mailto:${employee.email}`) : toast.info("No email on file") },
                    { label: "Call", icon: PhoneCall, onClick: () => employee.phone ? (window.location.href = `tel:${employee.phone}`) : toast.info("No phone on file") },
                  ].map((action) => {
                    const btn = (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                        onClick={action.onClick}
                      >
                        <action.icon className="h-3.5 w-3.5" />
                      </Button>
                    );

                    if ((action as any).isCredentialAction) {
                      return (
                        <InlineAssignCredentialPopover
                          key={action.label}
                          employeeId={employee.id}
                          employeeName={fullName}
                          alreadyAssignedIds={employeeRequirements.map((r: any) => r.requirement_id).filter(Boolean)}
                          onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }}
                        >
                          <div>
                            <Tooltip>
                              <TooltipTrigger asChild>{btn}</TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">{action.label}</TooltipContent>
                            </Tooltip>
                          </div>
                        </InlineAssignCredentialPopover>
                      );
                    }

                    return (
                      <Tooltip key={action.label}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">{action.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </div>
          </div>

          {/* ========== TABS ========== */}
          <div className="flex items-center mt-3 -mb-[1px] relative">
            {tabs.map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative px-3.5 py-2 text-sm font-medium transition-colors duration-150",
                    isTabActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "text-[10px] tabular-nums font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                        isTabActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {isTabActive && (
                    <motion.div
                      layoutId="drawer-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========== SCROLLABLE CONTENT ========== */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-4 space-y-3">
            
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : (
              <>
                {/* ==================== OVERVIEW TAB ==================== */}
                {activeTab === "overview" && (
                  <div className="space-y-3 animate-fade-in">

                     {/* ── Credential Status Card ── */}
                    <section className="rounded-lg border border-border/30 bg-card overflow-hidden">
                      <div className="px-3.5 py-2.5 border-b border-border/20 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                          <Shield className="h-3 w-3" />
                          Credentials
                        </h3>
                        {totalCredentials > 0 && (
                          <button
                            onClick={() => setActiveTab("credentials")}
                            className="text-[11px] text-primary hover:underline font-medium"
                          >
                            View all
                          </button>
                        )}
                      </div>

                      {totalCredentials === 0 ? (
                        <div className="px-3.5 py-5 flex flex-col items-center text-center">
                          <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
                            <Shield className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-0.5">0 assigned</p>
                          <p className="text-xs text-muted-foreground mb-3">Track certifications and compliance for this member.</p>
                          <div className="flex items-center gap-2">
                            <InlineAssignCredentialPopover
                              employeeId={employee.id}
                              employeeName={fullName}
                              alreadyAssignedIds={employeeRequirements.map((r: any) => r.requirement_id).filter(Boolean)}
                              onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }}
                            >
                              <Button size="sm" className="gap-1.5 h-8 text-xs">
                                <ShieldPlus className="h-3.5 w-3.5" />
                                Assign Credential
                              </Button>
                            </InlineAssignCredentialPopover>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Summary counts */}
                          <div className="grid grid-cols-4 divide-x divide-border/20 border-b border-border/20">
                            <div className="flex flex-col items-center py-2.5">
                              <span className="text-lg font-bold text-success tabular-nums">{validCredentials}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">Valid</span>
                            </div>
                            <div className="flex flex-col items-center py-2.5">
                              <span className="text-lg font-bold text-warning tabular-nums">{expiringCredentials}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">Expiring</span>
                            </div>
                            <div className="flex flex-col items-center py-2.5">
                              <span className="text-lg font-bold text-destructive tabular-nums">{expiredCredentials}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">Expired</span>
                            </div>
                            <div className="flex flex-col items-center py-2.5">
                              <span className="text-lg font-bold text-muted-foreground tabular-nums">{assignedCredentials}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">Assigned</span>
                            </div>
                          </div>

                          {/* Top credentials preview list */}
                          <div className="divide-y divide-border/15">
                            {employeeRequirements.slice(0, 3).map((req) => {
                              const credStatus = getCredentialStatus(req.expire_date, req.status);
                              const StatusIcon = credStatus.severity === "critical" ? XCircle 
                                : credStatus.severity === "warning" ? AlertCircle 
                                : credStatus.severity === "success" ? CheckCircle 
                                : Clock;
                              const daysUntilExpiry = req.expire_date ? differenceInDays(new Date(req.expire_date), new Date()) : null;

                              return (
                                <div
                                  key={req.id}
                                  className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setSelectedCredential(req);
                                    setCredentialDialogOpen(true);
                                  }}
                                >
                                  <StatusIcon className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    credStatus.severity === "critical" && "text-destructive",
                                    credStatus.severity === "warning" && "text-warning",
                                    credStatus.severity === "success" && "text-success",
                                    !["critical","warning","success"].includes(credStatus.severity) && "text-muted-foreground",
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {req.requirement?.title || "Unknown"}
                                      </p>
                                      {credStatus.status === "expired" && (
                                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-semibold shrink-0">
                                          Expired
                                        </Badge>
                                      )}
                                      {credStatus.status === "expiring" && daysUntilExpiry !== null && (
                                        <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4 font-semibold shrink-0">
                                          {daysUntilExpiry <= 0 ? "Expires today" : `Expires in ${daysUntilExpiry}d`}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {credStatus.status === "expired" && daysUntilExpiry !== null
                                        ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                        : credStatus.status === "valid" && daysUntilExpiry !== null
                                        ? `Expires ${format(new Date(req.expire_date), "MMM d, yyyy")}`
                                        : credStatus.status === "valid" && !req.expire_date
                                        ? "No expiration"
                                        : credStatus.status === "expiring" && req.expire_date
                                        ? format(new Date(req.expire_date), "MMM d, yyyy")
                                        : credStatus.label}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {employeeRequirements.length > 3 && (
                              <button
                                onClick={() => setActiveTab("credentials")}
                                className="w-full text-center py-2 text-xs text-primary hover:bg-muted/30 font-medium transition-colors"
                              >
                                +{employeeRequirements.length - 3} more
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </section>

                    {/* ── Contact Information Card ── */}
                    <section className="rounded-lg border border-border/30 bg-card p-3.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2.5">
                        Contact Information
                      </h3>
                      <div className="space-y-1">
                        <InlineEditField
                          value={employee.email || ""}
                          onSave={(v) => handleInlineSave("email", v)}
                          type="email"
                          placeholder="email@example.com"
                          icon={<Mail className="h-3.5 w-3.5" />}
                          emptyLabel="Email"
                        />
                        <InlineEditField
                          value={employee.phone || ""}
                          onSave={(v) => handleInlineSave("phone", v)}
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          icon={<Phone className="h-3.5 w-3.5" />}
                          emptyLabel="Phone"
                        />
                        {employee.base_location && (
                          <div className="flex items-center gap-2.5 py-1.5 px-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{employee.base_location}</span>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* ── Role & Organization Card ── */}
                    {(roles.length > 0 || employee.team_role?.name || employee.position || employee.department) && (
                      <section className="rounded-lg border border-border/30 bg-card p-3.5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2.5">
                          Role & Organization
                        </h3>
                        <div className="space-y-0.5">
                          <div className="flex justify-between items-center py-1.5 px-1.5 group rounded-md hover:bg-muted/40 -mx-1.5 transition-colors">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-3.5 w-3.5" />
                              Role
                            </span>
                            <div className="flex items-center gap-1.5">
                              {employee.team_role ? (
                                <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${employee.team_role.color}20`, color: employee.team_role.color }}>
                                  {employee.team_role.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">Not assigned</span>
                              )}
                              <Select value={employee.role_id || ""} onValueChange={handleRoleInlineSave}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent shadow-none opacity-0 group-hover:opacity-100 transition-opacity [&>svg]:hidden">
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
                                        {role.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {employee.position && (
                            <div className="flex justify-between items-center py-1.5 px-1.5">
                              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5" />
                                Position
                              </span>
                              <span className="text-sm font-medium">{employee.position}</span>
                            </div>
                          )}
                          {employee.department && (
                            <div className="flex justify-between items-center py-1.5 px-1.5">
                              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5" />
                                Department
                              </span>
                              <span className="text-sm font-medium">{employee.department}</span>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {/* ── Additional Information Card ── */}
                    {(hasCustomData || employee.notes || (employee.tags && employee.tags.length > 0)) && (
                      <section className="rounded-lg border border-border/30 bg-card p-3.5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2.5">
                          Additional Information
                        </h3>
                        <div className="space-y-3">
                          {hasCustomData && (
                            <div className="space-y-0.5">
                              {employee.custom_data && customFields.map((field) => {
                                const value = employee.custom_data?.[field.field_name];
                                if (value === undefined || value === null || value === "") return null;
                                let displayValue = value;
                                if (field.field_type === "checkbox") displayValue = value ? "Yes" : "No";
                                else if (field.field_type === "date" && value) {
                                  try { displayValue = format(new Date(value), "PP"); } catch { displayValue = value; }
                                }
                                return (
                                  <div key={field.id} className="flex justify-between items-center py-1.5 px-1.5">
                                    <span className="text-sm text-muted-foreground">{field.field_label}</span>
                                    <span className="text-sm font-medium">{String(displayValue)}</span>
                                  </div>
                                );
                              })}
                              {!attributeValuesLoading && customAttributes.map((attr) => {
                                const value = attributeValuesMap[attr.id];
                                if (value === null || value === undefined || value === "") return null;
                                let displayValue: string = value;
                                switch (attr.type) {
                                  case "boolean": displayValue = value === "true" ? "Yes" : "No"; break;
                                  case "date": try { displayValue = format(new Date(value), "PP"); } catch { displayValue = value; } break;
                                }
                                return (
                                  <div key={attr.id} className="flex justify-between items-center py-1.5 px-1.5">
                                    <span className="text-sm text-muted-foreground">{attr.name}</span>
                                    <span className="text-sm font-medium">{displayValue}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {employee.notes && (
                            <div className="px-1.5">
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{employee.notes}</p>
                            </div>
                          )}

                          {employee.tags && employee.tags.length > 0 && (
                            <div className="px-1.5">
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Tags</p>
                              <div className="flex flex-wrap gap-1">
                                {employee.tags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] font-normal px-2 py-0.5">{tag}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* ==================== CREDENTIALS TAB ==================== */}
                {activeTab === "credentials" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        {totalCredentials} credential{totalCredentials !== 1 ? "s" : ""} assigned
                      </h3>
                      <InlineAssignCredentialPopover
                        employeeId={employee.id}
                        employeeName={fullName}
                        alreadyAssignedIds={employeeRequirements.map((r: any) => r.requirement_id).filter(Boolean)}
                        onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }}
                      >
                        <Button size="sm" className="gap-1.5 h-8">
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </InlineAssignCredentialPopover>
                    </div>

                    {/* Role-based suggestions */}
                    <RoleSuggestedCredentials
                      employeeId={employee.id}
                      roleId={employee.role_id || null}
                      departmentId={employee.department_id || null}
                      roleName={roles.find((r: any) => r.id === employee.role_id)?.name || null}
                      alreadyAssignedIds={employeeRequirements.map((r: any) => r.requirement_id).filter(Boolean)}
                      onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }}
                    />

                    {employeeRequirements.length === 0 ? (
                      <div className="py-10 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
                        <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground mb-1">No credentials assigned</p>
                        <p className="text-xs text-muted-foreground mb-4">Assign credentials to start tracking compliance.</p>
                        <div className="flex flex-col items-center gap-2">
                          <InlineAssignCredentialPopover
                            employeeId={employee.id}
                            employeeName={fullName}
                            alreadyAssignedIds={employeeRequirements.map((r: any) => r.requirement_id).filter(Boolean)}
                            onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }}
                          >
                            <Button size="sm" className="gap-1.5">
                              <Plus className="h-3.5 w-3.5" />
                              Assign Credentials
                            </Button>
                          </InlineAssignCredentialPopover>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/40 overflow-hidden bg-card">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Credential</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider w-[100px]">Status</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider w-[110px]">Expiration</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employeeRequirements.map((req, index) => {
                              const credStatus = getCredentialStatus(req.expire_date, req.status);
                              const StatusIcon = credStatus.severity === "critical" ? XCircle 
                                : credStatus.severity === "warning" ? AlertCircle 
                                : credStatus.severity === "success" ? CheckCircle 
                                : Clock;
                              const daysUntilExpiry = req.expire_date ? differenceInDays(new Date(req.expire_date), new Date()) : null;

                              return (
                                <TableRow
                                  key={req.id}
                                  className={cn(
                                    "cursor-pointer transition-all duration-150 group",
                                    "hover:bg-muted/30",
                                    index % 2 === 0 ? "bg-card" : "bg-muted/10"
                                  )}
                                  onClick={() => {
                                    setSelectedCredential(req);
                                    setCredentialDialogOpen(true);
                                  }}
                                >
                                  <TableCell className="py-2.5">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                          {req.requirement?.title || "Unknown"}
                                        </p>
                                        {credStatus.status === "expired" && (
                                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-semibold shrink-0">
                                            Expired
                                          </Badge>
                                        )}
                                        {credStatus.status === "expiring" && daysUntilExpiry !== null && (
                                          <Badge variant="warning" className="text-[9px] px-1.5 py-0 h-4 font-semibold shrink-0">
                                            {daysUntilExpiry <= 0 ? "Expires today" : `Expires in ${daysUntilExpiry}d`}
                                          </Badge>
                                        )}
                                      </div>
                                      {req.requirement?.requirement_type_ref?.name && (
                                        <p className="text-[10px] text-muted-foreground truncate">{req.requirement.requirement_type_ref.name}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge
                                      variant={credStatus.severity === "critical" ? "destructive" : credStatus.severity === "warning" ? "warning" : "secondary"}
                                      className="text-[10px] gap-1 whitespace-nowrap"
                                    >
                                      <StatusIcon className="h-3 w-3" />
                                      {credStatus.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    {req.expire_date ? (
                                      <span className={cn(
                                        "text-xs tabular-nums",
                                        credStatus.status === "expired" && "text-destructive",
                                        credStatus.status === "expiring" && "text-warning"
                                      )}>
                                        {format(new Date(req.expire_date), "MMM d, yyyy")}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No expiry</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-1">
                                      {credStatus.status === "expired" && (
                                        <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                                      )}
                                      {credStatus.status === "expiring" && (
                                        <span className="flex h-2 w-2 rounded-full bg-warning animate-pulse" />
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCredential(req);
                                          setCredentialDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* ==================== ACTIVITY TAB ==================== */}
                {activeTab === "activity" && (
                  <div className="space-y-4 animate-fade-in">
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Assigned Assets</h3>

                      {activeCheckouts.length === 0 && returnedCheckouts.length === 0 && activeItemCheckouts.length === 0 ? (
                        <div className="py-8 text-center rounded-lg bg-muted/20">
                          <Package className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground mb-0.5">No items assigned</p>
                          <p className="text-xs text-muted-foreground">This member has no checked-out assets</p>
                        </div>
                      ) : (
                        <>
                          {activeCheckouts.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">Currently Checked Out ({activeCheckouts.length})</p>
                              {activeCheckouts.map((checkout) => (
                                <div key={checkout.id} className="p-3 rounded-lg bg-warning/5 border border-warning/20 group">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm text-foreground truncate">{checkout.equipment?.name || "Unknown Asset"}</h4>
                                        {checkout.equipment?.id && (
                                          <button className="opacity-0 group-hover:opacity-100 transition-opacity" title="View asset details">
                                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[11px] text-muted-foreground font-mono">{checkout.equipment?.asset_tag || "No tag"}</p>
                                        {checkout.equipment?.category && (
                                          <>
                                            <span className="text-muted-foreground">•</span>
                                            <p className="text-[11px] text-muted-foreground">{checkout.equipment.category}</p>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                        <span>Checked out {formatDistanceToNow(new Date(checkout.checkout_date), { addSuffix: true })}</span>
                                        {checkout.due_date && (
                                          <>
                                            <span>•</span>
                                            <span className={cn(
                                              differenceInDays(new Date(checkout.due_date), new Date()) < 0 ? "text-destructive font-medium" :
                                              differenceInDays(new Date(checkout.due_date), new Date()) <= 3 ? "text-warning font-medium" : ""
                                            )}>
                                              Due {format(new Date(checkout.due_date), "PP")}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                      <Badge variant="warning" className="text-[10px] flex-shrink-0">In Use</Badge>
                                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => {
                                        setSelectedCheckout({ ...checkout, staff: { id: employee.id, first_name: employee.first_name, last_name: employee.last_name } });
                                        setReturnDialogOpen(true);
                                      }}>
                                        <LogIn className="h-3 w-3" />
                                        Return
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeItemCheckouts.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">Inventory Items ({activeItemCheckouts.length})</p>
                              {activeItemCheckouts.map((checkout) => (
                                <div key={checkout.id} className="p-2.5 rounded-lg bg-warning/5 border border-warning/15 flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Package className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                                    <span className="text-sm truncate">{(checkout as any).item?.description || "Unknown"}</span>
                                  </div>
                                  <Badge variant="warning" className="text-[10px] flex-shrink-0">In Use</Badge>
                                </div>
                              ))}
                            </div>
                          )}

                          {returnedCheckouts.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Checkout History ({returnedCheckouts.length})</p>
                              {returnedCheckouts.slice(0, 5).map((checkout) => (
                                <div key={checkout.id} className="flex items-center justify-between py-2 group">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{checkout.equipment?.name || "Unknown Asset"}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {format(new Date(checkout.checkout_date), "PP")}
                                      {checkout.checkin_date && ` → ${format(new Date(checkout.checkin_date), "PP")}`}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px]">Returned</Badge>
                                </div>
                              ))}
                              {returnedCheckouts.length > 5 && (
                                <p className="text-xs text-muted-foreground text-center pt-2">+ {returnedCheckouts.length - 5} more</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </section>

                    {/* ── Activity History ── */}
                    <section className="rounded-lg border border-border/30 bg-card overflow-hidden">
                      <div className="px-3.5 py-2.5 border-b border-border/20">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Activity History
                        </h3>
                      </div>
                      {activityHistory.length === 0 ? (
                        <div className="py-6 text-center">
                          <Clock className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/15">
                          {activityHistory.map((event) => {
                            const actionMap: Record<string, { label: string; icon: typeof Shield; color: string }> = {
                              create: { label: "Created", icon: Plus, color: "text-success" },
                              insert: { label: "Credential assigned", icon: Shield, color: "text-primary" },
                              update: { label: "Profile updated", icon: Pencil, color: "text-muted-foreground" },
                              delete: { label: "Removed", icon: Trash2, color: "text-destructive" },
                            };
                            const config = actionMap[event.action] || { label: event.action, icon: Clock, color: "text-muted-foreground" };
                            const EventIcon = config.icon;

                            let detail = "";
                            if (event.field_changed) {
                              detail = event.field_changed === "requirement_id" 
                                ? "Credential assigned" 
                                : `${event.field_changed.replace(/_/g, " ")} changed`;
                            }
                            if (event.action === "insert" && event.object_type === "employee_requirement") {
                              detail = event.new_value || "Credential assigned";
                            }

                            return (
                              <div key={event.id} className="flex items-start gap-3 px-3.5 py-2.5">
                                <div className={cn("mt-0.5 flex-shrink-0", config.color)}>
                                  <EventIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground">
                                    {detail || config.label}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ========== ACTIONS FOOTER ========== */}
        <div className="flex-shrink-0 px-4 py-2.5 border-t bg-card/80 backdrop-blur-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" className="flex-1 h-9 text-sm gap-1.5" onClick={() => setEditModalOpen(true)}>
              <Edit className="h-3.5 w-3.5" />
              Edit Details
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={() => setDeactivateDialogOpen(true)}>
              <UserX className="h-3.5 w-3.5" />
              {isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
          <button
            className="w-full text-center text-[11px] text-muted-foreground/70 hover:text-destructive transition-colors py-0.5"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Remove Team Member
          </button>
        </div>

        {/* Dialogs */}
        <EditEmployeeModal open={editModalOpen} onOpenChange={setEditModalOpen} employee={employee} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
        <ConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Remove Team Member" description={<>Are you sure you want to remove <span className="font-semibold">{fullName}</span>? All their credentials and checkout history will be permanently deleted.</>} confirmLabel="Remove" variant="destructive" onConfirm={handleDeleteEmployee} showWarning warningText="This action cannot be undone." />
        <ConfirmationDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen} title={isActive ? "Deactivate Member" : "Reactivate Member"} description={<>{isActive ? <>Are you sure you want to deactivate <span className="font-semibold">{fullName}</span>? They will be marked as inactive.</> : <>Reactivate <span className="font-semibold">{fullName}</span>? They will be marked as active again.</>}</>} confirmLabel={isActive ? "Deactivate" : "Reactivate"} variant={isActive ? "destructive" : "default"} onConfirm={handleDeactivate} />
        <AssetReturnDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen} checkout={selectedCheckout} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
        <ItemCheckinDialog open={itemCheckinDialogOpen} onOpenChange={setItemCheckinDialogOpen} checkout={selectedItemCheckout} onSuccess={() => { refetchItemCheckouts(); onRefresh?.(); }} />
        <CredentialActionDialog assignment={selectedCredential} employeeName={fullName} open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
        {/* Inline credential assignment is now handled by InlineAssignCredentialPopover */}
      </SheetContent>
    </Sheet>
  );
};
