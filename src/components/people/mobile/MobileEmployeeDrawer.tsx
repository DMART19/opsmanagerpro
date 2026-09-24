import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Mail,
  Phone,
  Shield,
  Users,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  XCircle,
  Trash2,
  MapPin,
  Calendar,
  Briefcase,
  LogIn,
  Pencil,
  Plus,
  Copy,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { EditEmployeeModal } from "../EditEmployeeModal";
import { AssetReturnDialog } from "@/components/inventory/AssetReturnDialog";
import { CredentialActionDialog } from "../CredentialActionDialog";
import { CredentialDetailDrawer } from "../CredentialDetailDrawer";
import { AssignCredentialToMemberDialog } from "./AssignCredentialToMemberDialog";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTeamMemberAttributes, useEmployeeAttributeValues } from "@/hooks/use-team-member-attributes";
import { cn } from "@/lib/utils";

interface MobileEmployeeDrawerProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export const MobileEmployeeDrawer = ({ 
  employee: employeeProp, 
  open, 
  onOpenChange, 
  onRefresh 
}: MobileEmployeeDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [assignCredentialOpen, setAssignCredentialOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [viewingCredentialDetail, setViewingCredentialDetail] = useState<any>(null);
  const { customFields } = useCustomFields("employees");
  const { attributes: customAttributes } = useTeamMemberAttributes();
  const { valuesMap: attributeValuesMap, isLoading: attributeValuesLoading } = useEmployeeAttributeValues(employeeProp?.id || null);

  const employee = employeeData || employeeProp;

  useEffect(() => {
    if (employeeProp) setEmployeeData(employeeProp);
  }, [employeeProp?.id]);

  useEffect(() => {
    if (!open) setEmployeeData(null);
  }, [open]);

  useEffect(() => {
    if (open && employeeProp?.id) loadEmployeeDetails();
  }, [open, employeeProp?.id]);

  const handleDeleteEmployee = async () => {
    if (!employee?.id) return;
    const { data: session } = await supabase.auth.getSession();
    const currentUserId = session?.session?.user?.id;
    if (!currentUserId) {
      toast.error("Please sign in to delete employees");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString(), deleted_by: currentUserId })
      .eq("id", employee.id);

    if (error) {
      if (error.code === '42501') toast.error("Permission denied", { description: "You need Manager or Admin role." });
      else toast.error("Failed to delete employee", { description: error.message });
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
    if (error) { toast.error(`Failed to ${isActive ? "deactivate" : "reactivate"} member`); return; }
    toast.success(`${employee.first_name} ${isActive ? "deactivated" : "reactivated"}`);
    await loadEmployeeDetails();
    onRefresh?.();
  };

  const loadEmployeeDetails = async () => {
    const currentId = employeeData?.id || employeeProp?.id;
    if (!currentId) return;
    setLoading(true);
    try {
      const { data: freshEmployee } = await supabase.from("employees").select(`*, team_role:role_id (id, name, color)`).eq("id", currentId).is("deleted_at", null).single();
      if (freshEmployee) setEmployeeData(freshEmployee);

      const { data: requirementsData } = await supabase.from("employee_requirements")
        .select(`*, requirement:requirement_id (id, title, requirement_type_ref:requirement_type_id(name), has_expiration, renewal_cycle_months, is_general)`)
        .eq("employee_id", currentId).order("updated_at", { ascending: false });
      setCertifications(requirementsData || []);

      const { data: checkoutsData } = await supabase.from("equipment_checkouts")
        .select(`*, equipment:equipment_id (id, name, asset_tag, category, status)`)
        .eq("staff_id", currentId).order("checkout_date", { ascending: false });
      setCheckouts(checkoutsData || []);
    } catch (error: any) {
      console.error("Error loading employee details:", error);
      toast.error("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active": return { label: "Active", variant: "success" as const };
      case "on-leave": return { label: "On Leave", variant: "warning" as const };
      case "inactive": return { label: "Inactive", variant: "secondary" as const };
      case "terminated": return { label: "Terminated", variant: "destructive" as const };
      default: return { label: status || "Active", variant: "secondary" as const };
    }
  };

  const getCredentialStatus = (cred: any) => {
    if (cred.status === "Missing") return { status: "missing", color: "text-warning", label: "Not Completed", icon: AlertCircle };
    if (cred.status === "Expired") return { status: "expired", color: "text-destructive", label: "Expired", icon: XCircle };
    if (!cred.expire_date) return { status: "valid", color: "text-success", label: "Valid", icon: CheckCircle };
    const daysUntilExpiry = differenceInDays(new Date(cred.expire_date), new Date());
    if (daysUntilExpiry < 0) return { status: "expired", color: "text-destructive", label: "Expired", icon: XCircle };
    if (daysUntilExpiry <= 30) return { status: "expiring", color: "text-warning", label: "Expiring Soon", icon: AlertCircle };
    return { status: "valid", color: "text-success", label: "Valid", icon: CheckCircle };
  };

  const statusConfig = getStatusConfig(employee.status || employee.employment_status || "active");
  const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`;
  const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
  const isActive = (employee.status || "active") === "active";

  const activeCheckouts = checkouts.filter(c => c.status === "active");
  const returnedCheckouts = checkouts.filter(c => c.status === "completed" || c.status === "returned");

  const expiringCredentials = certifications.filter(c => getCredentialStatus(c).status === "expiring").length;
  const expiredCredentials = certifications.filter(c => getCredentialStatus(c).status === "expired").length;
  const missingCredentials = certifications.filter(c => getCredentialStatus(c).status === "missing").length;
  const validCredentials = certifications.filter(c => getCredentialStatus(c).status === "valid").length;

  const hasAttentionNeeded = expiredCredentials > 0 || missingCredentials > 0;

  const getComplianceState = () => {
    if (expiredCredentials > 0) return { label: "Non-Compliant", color: "text-destructive", bg: "bg-destructive/10" };
    if (expiringCredentials > 0 || missingCredentials > 0) return { label: "At Risk", color: "text-warning", bg: "bg-warning/10" };
    if (certifications.length === 0) return { label: "No Credentials", color: "text-muted-foreground", bg: "bg-muted" };
    return { label: "Compliant", color: "text-success", bg: "bg-success/10" };
  };
  const complianceState = getComplianceState();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const hasCustomData = (employee.custom_data && Object.keys(employee.custom_data).length > 0 && customFields.length > 0) ||
    (customAttributes.length > 0 && Object.values(attributeValuesMap).some(v => v !== null && v !== undefined && v !== ""));

  // Compliance summary line
  const summaryParts: string[] = [];
  if (validCredentials > 0) summaryParts.push(`${validCredentials} Valid`);
  if (expiringCredentials > 0) summaryParts.push(`${expiringCredentials} Expiring`);
  if (expiredCredentials > 0) summaryParts.push(`${expiredCredentials} Expired`);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] flex flex-col">
          {/* ========== SECTION 1: Member Header ========== */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-4">
            {/* Identity row */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="h-16 w-16 ring-2 ring-border shadow-md">
                  {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={fullName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[2.5px] border-background",
                  statusConfig.variant === "success" ? "bg-emerald-500" :
                  statusConfig.variant === "warning" ? "bg-amber-500" :
                  statusConfig.variant === "destructive" ? "bg-red-500" : "bg-muted"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-semibold text-foreground tracking-tight truncate">{fullName}</h1>
                  {hasAttentionNeeded && (
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive/10 flex-shrink-0">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {employee.team_role?.name || employee.position || employee.department || "Team Member"}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className={cn(
                    "text-[10px] px-2 py-0.5 font-medium",
                    statusConfig.variant === "success" && "bg-emerald-500/10 text-emerald-600 border-0",
                    statusConfig.variant === "warning" && "bg-amber-500/10 text-amber-600 border-0",
                    statusConfig.variant === "destructive" && "bg-red-500/10 text-red-600 border-0"
                  )}>
                    {statusConfig.label}
                  </Badge>
                  <div className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", complianceState.bg, complianceState.color)}>
                    <Shield className="h-2.5 w-2.5" />
                    {complianceState.label}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="flex items-center gap-1 mb-0.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-lg font-bold text-foreground">{certifications.length}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">Credentials</span>
              </div>
              <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="flex items-center gap-1 mb-0.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span className="text-lg font-bold text-foreground">{activeCheckouts.length}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">Assets</span>
              </div>
              <div className={cn(
                "flex flex-col items-center p-2.5 rounded-xl border",
                expiredCredentials > 0
                  ? "bg-destructive/5 border-destructive/20"
                  : (expiringCredentials > 0 || missingCredentials > 0)
                    ? "bg-warning/5 border-warning/20"
                    : certifications.length > 0
                      ? "bg-success/5 border-success/20"
                      : "bg-muted/50 border-border/40"
              )}>
                <div className="flex items-center gap-1 mb-0.5">
                  {expiredCredentials > 0 ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (expiringCredentials > 0 || missingCredentials > 0) ? (
                    <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  ) : certifications.length > 0 ? (
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-[11px] font-bold",
                    expiredCredentials > 0 ? "text-destructive" :
                    (expiringCredentials > 0 || missingCredentials > 0) ? "text-warning" :
                    certifications.length > 0 ? "text-success" : "text-muted-foreground"
                  )}>
                    {expiredCredentials > 0 ? `${expiredCredentials} Issue${expiredCredentials > 1 ? "s" : ""}` :
                     (expiringCredentials > 0 || missingCredentials > 0) ? "At Risk" :
                     certifications.length > 0 ? "Good" : "N/A"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">Compliance</span>
              </div>
            </div>

            {/* ========== QUICK ACTIONS TOOLBAR ========== */}
            {!loading && (
              <div className="px-6 pb-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  <PermissionGate permission="manage_credentials" fallback="hidden" deniedMessage="">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-lg whitespace-nowrap flex-shrink-0"
                      onClick={() => setAssignCredentialOpen(true)}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Assign Credential
                    </Button>
                  </PermissionGate>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-lg whitespace-nowrap flex-shrink-0"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-lg whitespace-nowrap flex-shrink-0 text-muted-foreground"
                    onClick={() => setDeactivateDialogOpen(true)}
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    {isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ========== SCROLLABLE CONTENT ========== */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            {loading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {/* Contact Information */}
                <div className="bg-muted/40 rounded-2xl overflow-hidden">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">Contact Information</h3>
                  {employee.email ? (
                    <div className="flex items-center px-4 py-3.5">
                      <a href={`mailto:${employee.email}`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{employee.email}</p>
                          <p className="text-xs text-muted-foreground">Email</p>
                        </div>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(employee.email, "Email")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Not provided</p>
                        <p className="text-xs text-muted-foreground/70">Email</p>
                      </div>
                    </div>
                  )}
                  <div className="h-px bg-border/50 mx-4" />
                  {employee.phone ? (
                    <div className="flex items-center px-4 py-3.5">
                      <a href={`tel:${employee.phone}`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                        <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 text-success" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{employee.phone}</p>
                          <p className="text-xs text-muted-foreground">Phone</p>
                        </div>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(employee.phone, "Phone")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Not provided</p>
                        <p className="text-xs text-muted-foreground/70">Phone</p>
                      </div>
                    </div>
                  )}
                  {(!employee.email || !employee.phone) && (
                    <>
                      <div className="h-px bg-border/50 mx-4" />
                      <div className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-primary hover:text-primary" onClick={() => setEditModalOpen(true)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Contact Info
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* ========== SECTION 2: Compliance Status Panel ========== */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground tracking-tight">Activity & Assignments</h2>

                  {/* Compliance warning banner */}
                  {(expiredCredentials > 0 || missingCredentials > 0) && (
                    <div className={cn(
                      "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border",
                      expiredCredentials > 0
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-warning/5 border-warning/20"
                    )}>
                      <AlertTriangle className={cn("h-4 w-4 flex-shrink-0", expiredCredentials > 0 ? "text-destructive" : "text-warning")} />
                      <span className={cn("text-xs font-medium", expiredCredentials > 0 ? "text-destructive" : "text-warning")}>
                        Compliance Incomplete — {expiredCredentials > 0 ? `${expiredCredentials} expired` : ""}{expiredCredentials > 0 && missingCredentials > 0 ? ", " : ""}{missingCredentials > 0 ? `${missingCredentials} missing` : ""}
                      </span>
                    </div>
                  )}

                  {/* Stats grid — always visible */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground leading-none">{certifications.length}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Assigned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", expiredCredentials > 0 ? "bg-destructive/10" : "bg-muted")}>
                        <XCircle className={cn("h-4 w-4", expiredCredentials > 0 ? "text-destructive" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className={cn("text-lg font-bold leading-none", expiredCredentials > 0 ? "text-destructive" : "text-foreground")}>{expiredCredentials}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Expired</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", expiringCredentials > 0 ? "bg-warning/10" : "bg-muted")}>
                        <Clock className={cn("h-4 w-4", expiringCredentials > 0 ? "text-warning" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className={cn("text-lg font-bold leading-none", expiringCredentials > 0 ? "text-warning" : "text-foreground")}>{expiringCredentials}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Expiring Soon</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", missingCredentials > 0 ? "bg-warning/10" : "bg-muted")}>
                        <AlertCircle className={cn("h-4 w-4", missingCredentials > 0 ? "text-warning" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className={cn("text-lg font-bold leading-none", missingCredentials > 0 ? "text-warning" : "text-foreground")}>{missingCredentials}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Missing Required</p>
                      </div>
                    </div>
                  </div>

                  {/* Unified empty state when both credentials and assets are empty */}
                  {certifications.length === 0 && activeCheckouts.length === 0 && returnedCheckouts.length === 0 ? (
                    <div className="py-6 text-center rounded-2xl bg-muted/20 border border-dashed border-border/60">
                      <div className="flex justify-center gap-1 mb-2.5">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-0.5">No assignments yet</p>
                      <p className="text-xs text-muted-foreground mb-3">Assign credentials or assets to get started</p>
                      <div className="flex items-center justify-center gap-2">
                        <PermissionGate permission="manage_credentials" fallback="hidden" deniedMessage="">
                          <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => setAssignCredentialOpen(true)}>
                            <Shield className="h-3 w-3 mr-1" />
                            Assign Credential
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Credential Cards */}
                      {certifications.length > 0 && (
                        <div className="space-y-2">
                          {certifications.map((cred) => {
                            const credStatus = getCredentialStatus(cred);
                            const credName = cred.requirement?.title || "Unknown Credential";
                            const credType = cred.requirement?.requirement_type_ref?.name;

                            const handleOpenCredential = () => {
                              setSelectedCredential(cred);
                              setCredentialDialogOpen(true);
                            };

                            const getQuickActionLabel = () => {
                              if (credStatus.status === "missing") return "Resolve";
                              if (credStatus.status === "expired" || credStatus.status === "expiring") return "Update";
                              return "Edit";
                            };

                            return (
                              <div key={cred.id}>
                                <button
                                  onClick={handleOpenCredential}
                                  className={cn(
                                    "w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]",
                                    credStatus.status === "expired" ? "bg-destructive/10 border border-destructive/20" :
                                    credStatus.status === "expiring" || credStatus.status === "missing" ? "bg-warning/10 border border-warning/20" :
                                    "bg-muted/40"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground">{credName}</h4>
                                      {credType && <p className="text-xs text-muted-foreground mt-0.5">{credType}</p>}
                                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        {cred.issue_date ? <span>Issued {format(new Date(cred.issue_date), "PP")}</span> : <span className="text-warning">Not issued</span>}
                                        {cred.expire_date && (
                                          <>
                                            <span>•</span>
                                            <span className={credStatus.color}>Exp. {format(new Date(cred.expire_date), "PP")}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <Badge variant={credStatus.status === "expired" ? "destructive" : credStatus.status === "expiring" || credStatus.status === "missing" ? "warning" : "secondary"} className="text-xs rounded-full">
                                        {credStatus.label}
                                      </Badge>
                                      <span className={cn("text-xs font-medium flex items-center gap-1",
                                        credStatus.status === "missing" && "text-warning",
                                        credStatus.status === "expired" && "text-destructive",
                                        credStatus.status === "expiring" && "text-warning",
                                        credStatus.status === "valid" && "text-muted-foreground"
                                      )}>
                                        {credStatus.status === "valid" && <Pencil className="h-3 w-3" />}
                                        {getQuickActionLabel()}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                                {cred.requirement && (
                                  <button type="button" className="w-full text-left px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setViewingCredentialDetail(cred.requirement)}>
                                    <Users className="h-3 w-3" />
                                    View all holders →
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Asset checkouts */}
                      {(activeCheckouts.length > 0 || returnedCheckouts.length > 0) && (
                        <div className="space-y-2">
                          {certifications.length > 0 && (
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Assets</h3>
                          )}
                          {activeCheckouts.map((checkout) => (
                            <div key={checkout.id} className="bg-warning/5 border border-warning/20 p-4 rounded-2xl">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground">{checkout.equipment?.name || "Unknown Asset"}</h4>
                                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{checkout.equipment?.asset_tag || "No tag"}</p>
                                  <p className="text-xs text-muted-foreground mt-1.5">Since {formatDistanceToNow(new Date(checkout.checkout_date), { addSuffix: true })}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge variant="warning" className="text-xs rounded-full">In Use</Badge>
                                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs rounded-lg" onClick={() => {
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
                          {returnedCheckouts.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">History</p>
                              {returnedCheckouts.slice(0, 5).map((checkout) => (
                                <div key={checkout.id} className="bg-muted/40 p-3 rounded-xl flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{checkout.equipment?.name || "Unknown Asset"}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(checkout.checkout_date), "PP")}{checkout.checkin_date && ` → ${format(new Date(checkout.checkin_date), "PP")}`}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs rounded-full">Returned</Badge>
                                </div>
                              ))}
                              {returnedCheckouts.length > 5 && (
                                <p className="text-xs text-muted-foreground text-center pt-1">+ {returnedCheckouts.length - 5} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>

                {/* ========== SECTION 4: Additional Information ========== */}
                {(hasCustomData || employee.notes || (employee.tags && employee.tags.length > 0) || employee.base_location || employee.hire_date || employee.employee_id) && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-foreground tracking-tight">Additional Information</h2>

                    {/* Employment Info */}
                    {(employee.base_location || employee.hire_date || employee.employee_id) && (
                      <div className="bg-muted/40 rounded-2xl overflow-hidden">
                        {employee.employee_id && (
                          <>
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Briefcase className="h-4 w-4 text-muted-foreground" /></div>
                              <div><p className="text-sm font-medium">{employee.employee_id}</p><p className="text-xs text-muted-foreground">Employee ID</p></div>
                            </div>
                            {(employee.base_location || employee.hire_date) && <div className="h-px bg-border/50 mx-4" />}
                          </>
                        )}
                        {employee.base_location && (
                          <>
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
                              <div><p className="text-sm font-medium">{employee.base_location}</p><p className="text-xs text-muted-foreground">Location</p></div>
                            </div>
                            {employee.hire_date && <div className="h-px bg-border/50 mx-4" />}
                          </>
                        )}
                        {employee.hire_date && (
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
                            <div><p className="text-sm font-medium">{format(new Date(employee.hire_date), "PP")}</p><p className="text-xs text-muted-foreground">Hire Date</p></div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom fields */}
                    {hasCustomData && (
                      <div className="space-y-2">
                        {employee.custom_data && customFields.map((field) => {
                          const value = employee.custom_data?.[field.field_name];
                          if (value === undefined || value === null || value === "") return null;
                          let displayValue = value;
                          if (field.field_type === "checkbox") displayValue = value ? "Yes" : "No";
                          else if (field.field_type === "date" && value) { try { displayValue = format(new Date(value), "PP"); } catch { displayValue = value; } }
                          return (
                            <div key={field.id} className="flex justify-between items-center py-2 px-1">
                              <span className="text-sm text-muted-foreground">{field.field_label}</span>
                              <span className="text-sm font-medium">{String(displayValue)}</span>
                            </div>
                          );
                        })}
                        {!attributeValuesLoading && customAttributes.map((attr) => {
                          const value = attributeValuesMap[attr.id];
                          if (value === null || value === undefined || value === "") return null;
                          let displayValue: string = value;
                          if (attr.type === "boolean") displayValue = value === "true" ? "Yes" : "No";
                          else if (attr.type === "date") { try { displayValue = format(new Date(value), "PP"); } catch { displayValue = value; } }
                          return (
                            <div key={attr.id} className="flex justify-between items-center py-2 px-1">
                              <span className="text-sm text-muted-foreground">{attr.name}</span>
                              <span className="text-sm font-medium">{displayValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {employee.tags && employee.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {employee.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs rounded-full px-3 py-1">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {employee.notes && (
                      <div className="bg-muted/40 rounded-2xl p-4">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
                        <p className="text-sm text-foreground leading-relaxed">{employee.notes}</p>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>

          {/* ========== ACTIONS FOOTER ========== */}
          <div className="flex-shrink-0 px-6 pt-3 pb-6 border-t bg-background safe-area-bottom">
            <Button variant="ghost" size="sm" className="w-full h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove Team Member
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Dialogs */}
      <EditEmployeeModal open={editModalOpen} onOpenChange={setEditModalOpen} employee={employee} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
      <ConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Remove Team Member" description={<>Are you sure you want to remove <span className="font-semibold">{fullName}</span>? All their credentials and checkout history will be permanently deleted.</>} confirmLabel="Remove" variant="destructive" onConfirm={handleDeleteEmployee} showWarning warningText="This action cannot be undone." />
      <ConfirmationDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen} title={isActive ? "Deactivate Member" : "Reactivate Member"} description={<>{isActive ? <>Deactivate <span className="font-semibold">{fullName}</span>? They will be marked as inactive.</> : <>Reactivate <span className="font-semibold">{fullName}</span>?</>}</>} confirmLabel={isActive ? "Deactivate" : "Reactivate"} variant={isActive ? "destructive" : "default"} onConfirm={handleDeactivate} />
      <AssetReturnDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen} checkout={selectedCheckout} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
      <CredentialActionDialog assignment={selectedCredential} employeeName={fullName} open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
      <AssignCredentialToMemberDialog employeeId={employee.id} employeeName={fullName} alreadyAssignedIds={certifications.map((c: any) => c.requirement?.id).filter(Boolean)} open={assignCredentialOpen} onOpenChange={setAssignCredentialOpen} onSuccess={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
      <CredentialDetailDrawer credential={viewingCredentialDetail} open={!!viewingCredentialDetail} onOpenChange={(open) => !open && setViewingCredentialDetail(null)} onRefresh={async () => { await loadEmployeeDetails(); onRefresh?.(); }} />
    </>
  );
};
