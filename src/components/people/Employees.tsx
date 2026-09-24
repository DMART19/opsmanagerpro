import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus, Upload, Download, ShieldCheck, Filter, MoreHorizontal, Lock, AlertTriangle } from "lucide-react";
import { TeamToolbar } from "./TeamToolbar";
import { useMobileSearch } from "@/contexts/MobileSearchContext";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { MobilePagination } from "@/components/ui/mobile-pagination";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { RequirementsLibrary } from "./RequirementsLibrary";
import { EmployeeDrawer } from "./EmployeeDrawer";
import { EditEmployeeModal } from "./EditEmployeeModal";
import { AssignCredentialToMemberDialog } from "./mobile/AssignCredentialToMemberDialog";
import { AddTeamMemberModal } from "./AddTeamMemberModal";
import { TeamImportWizard } from "./TeamImportWizard";
import { useEmployeesData } from "@/hooks/use-employees-data";
import { useInvalidateEmployees } from "@/hooks/use-employees";
import { Skeleton } from "@/components/ui/skeleton";
import { filterEmployees, EmployeeFiltersState } from "./EmployeeFilters";
import { TeamQuickFilterChips, TeamStatusFilter, applyTeamStatusFilter } from "./TeamQuickFilterChips";
import { BulkAssignRequirements } from "./BulkAssignRequirements";
import { BulkActionsBar } from "./BulkActionsBar";
import { EnhancedPagination } from "@/components/inventory/EnhancedPagination";
import { useTeamFilter } from "@/contexts/TeamFilterContext";
import { TeamEmptyState } from "./TeamEmptyState";
import { TeamViewToggle, TeamViewMode } from "./TeamViewToggle";
import { ComplianceTable } from "./ComplianceTable";
import { CompactMetricsStrip } from "./CompactMetricsStrip";
import { MobileCredentialDashboard } from "./mobile/MobileCredentialDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { differenceInDays } from "date-fns";
import { DynamicTeamTable } from "./DynamicTeamTable";
import { useFeatureGate } from "@/components/feature-locks";
import { FeatureLockModal } from "@/components/feature-locks/FeatureLockModal";
import { UpgradeLimitModal } from "@/components/subscription";
import { useAccessControl } from "@/hooks/use-access-control";

// Mobile components
import {
  MobileTeamList,
  MobileTeamSearchHeader,
  MobileTeamFilterSheet,
  MobileTeamActionsSheet,
  MobileTeamBulkActionsBar,
  MobileEmployeeDrawer,
} from "./mobile";
import { MobileTeamActiveFilters } from "./mobile/MobileTeamActiveFilters";
import { MobileQuickActionsSheet } from "./mobile/MobileQuickActionsSheet";
import { MobileBulkDeleteSheet } from "./MobileBulkDeleteSheet";
import { createExcelFile, createCsvFile } from "@/lib/excel-utils";
import { ExportFieldsModal, ExportField } from "@/components/export/ExportFieldsModal";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmployeesProps {
  externalInviteOpen?: boolean;
  onExternalInviteChange?: (open: boolean) => void;
}

export const Employees = ({ externalInviteOpen, onExternalInviteChange }: EmployeesProps = {}) => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileSearch = useMobileSearch();
  const [searchQuery, setSearchQuery] = useState("");

  // On mobile, sync global search → local search
  useEffect(() => {
    if (isMobile) {
      setSearchQuery(mobileSearch.query);
    }
  }, [isMobile, mobileSearch.query]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [mobileDeleteSheetOpen, setMobileDeleteSheetOpen] = useState(false);
  const [isMobileDeleting, setIsMobileDeleting] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [filters, setFilters] = useState<EmployeeFiltersState>({
    department: "all",
    status: "all",
    hireDateRange: "all",
    complianceStatus: "all",
    role: "all",
    credentialType: "all",
    expirationWindow: "all",
  });
  const [statusFilter, setStatusFilter] = useState<TeamStatusFilter>("all");
  const [chipRole, setChipRole] = useState<string | null>(null);
  const [chipDepartment, setChipDepartment] = useState<string | null>(null);
  const [teamView, setTeamView] = useState<TeamViewMode>("members");
  const [credentialTypesOpen, setCredentialTypesOpen] = useState(false);
  const [quickActionsEmployee, setQuickActionsEmployee] = useState<any | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Merge external and internal modal state
  const addModalOpen = externalInviteOpen ?? internalAddOpen;
  const setAddModalOpen = (open: boolean) => {
    if (onExternalInviteChange) onExternalInviteChange(open);
    setInternalAddOpen(open);
  };

  const { employees, loading, isDemoMode } = useEmployeesData();
  const invalidateEmployees = useInvalidateEmployees();
  const refreshTeamData = useCallback(async () => {
    await invalidateEmployees();
  }, [invalidateEmployees]);
  const { activeFilter, focusMode, setFocusMode } = useTeamFilter();
  const featureGate = useFeatureGate();
  const isTeamLocked = featureGate?.isLocked ?? false;
  const lockedPlanName = featureGate?.requiredPlan ?? "";

  const {
    tryAddTeamMember,
    showLimitModal: showUpgradeModal,
    limitType: upgradeLimitType,
    featureName: upgradeFeatureName,
    closeLimitModal: closeUpgradeModal,
  } = useAccessControl();

  /** Guard for locked actions — shows modal instead of performing action */
  const guardAction = (action: () => void) => {
    if (isTeamLocked) {
      setLockModalOpen(true);
      return;
    }
    // Check team member count limit
    if (!tryAddTeamMember()) return;
    action();
  };

  // Auto-open employee drawer when navigated via highlight param
  useEffect(() => {
    if (!loading && employees.length > 0) {
      const highlightId = searchParams.get("highlight");
      if (highlightId) {
        const emp = employees.find((e) => e.id === highlightId);
        if (emp) {
          setSelectedEmployee(emp);
          setDrawerOpen(true);
        }
        searchParams.delete("highlight");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [loading, employees, searchParams, setSearchParams]);

  // Extract unique departments
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      if (e.department_id && e.department) {
        map.set(e.department_id, e.department);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  // Context-based filters
  const contextFilteredEmployees = useMemo(() => {
    if (!activeFilter || activeFilter === "all") return employees;
    return employees.filter((emp) => {
      const stats = emp.requirements_stats || {};
      switch (activeFilter) {
        case "compliant":
          return stats.total > 0 && stats.missing_expired === 0 && stats.expiring_soon === 0;
        case "expiring-soon":
          return stats.expiring_soon > 0;
        case "incomplete":
          return stats.missing_expired > 0;
        default:
          return true;
      }
    });
  }, [employees, activeFilter]);

  // Apply status chip filter, then legacy filters + search
  const filteredEmployees = useMemo(() => {
    const statusFiltered = applyTeamStatusFilter(contextFilteredEmployees, statusFilter);
    // Apply chip-based role/department filters
    let afterChips = statusFiltered;
    if (chipRole) {
      afterChips = afterChips.filter((emp) => (emp.team_role?.name || emp.position) === chipRole);
    }
    if (chipDepartment) {
      afterChips = afterChips.filter((emp) => emp.department === chipDepartment);
    }
    let result = filterEmployees(afterChips, filters, searchQuery);
    
    // Also match by team_role name and credential/requirement titles
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const preFilterIds = new Set(result.map(e => e.id));
      const extraMatches = statusFiltered.filter((emp) => {
        if (preFilterIds.has(emp.id)) return false;
        if (emp.team_role?.name?.toLowerCase().includes(q)) return true;
        if (emp.department?.toLowerCase().includes(q)) return true;
        if (emp.status?.toLowerCase().includes(q)) return true;
        const reqs = emp.employee_requirements || [];
        return reqs.some((r: any) => r.requirement?.title?.toLowerCase().includes(q));
      });
      if (extraMatches.length > 0) {
        result = [...result, ...extraMatches];
      }
    }
    
    // Default priority sorting: missing → expiring → ok
    result = result.sort((a, b) => {
      const aStats = a.requirements_stats || {};
      const bStats = b.requirements_stats || {};
      const aPriority = (aStats.missing_expired || 0) * 3 + (aStats.expiring_soon || 0);
      const bPriority = (bStats.missing_expired || 0) * 3 + (bStats.expiring_soon || 0);
      return bPriority - aPriority;
    });

    if (focusMode === "needs-attention") {
      result = result.sort((a, b) => {
        const aStats = a.requirements_stats || {};
        const bStats = b.requirements_stats || {};
        const aCritical = (aStats.missing_expired || 0) * 2 + (aStats.expiring_soon || 0);
        const bCritical = (bStats.missing_expired || 0) * 2 + (bStats.expiring_soon || 0);
        return bCritical - aCritical;
      });
    }
    return result;
  }, [contextFilteredEmployees, statusFilter, chipRole, chipDepartment, filters, searchQuery, focusMode]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  // Reset page on filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, activeFilter, focusMode, statusFilter, chipRole, chipDepartment]);

  // Selection helpers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === paginatedEmployees.length) {
        return new Set();
      }
      return new Set(paginatedEmployees.map((e) => e.id));
    });
  }, [paginatedEmployees]);

  const selectedEmployees = useMemo(() => employees.filter((e) => selectedIds.has(e.id)), [employees, selectedIds]);

  const handleRowClick = useCallback((employee: any) => {
    setSelectedEmployee(employee);
    setDrawerOpen(true);
  }, []);


  const activeFilterCount = useMemo(() => [
    filters.department !== "all",
    filters.status !== "all",
    filters.hireDateRange !== "all",
    filters.complianceStatus !== "all",
    filters.role !== "all",
    filters.credentialType !== "all",
    filters.expirationWindow !== "all",
    statusFilter !== "all",
  ].filter(Boolean).length, [filters, statusFilter]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setChipRole(null);
    setChipDepartment(null);
    setFilters({ department: "all", status: "all", hireDateRange: "all", complianceStatus: "all", role: "all", credentialType: "all", expirationWindow: "all" });
  }, []);

  // Export handlers
  const teamExportFields = useMemo((): ExportField[] => [
    { key: "name", label: "Name", defaultSelected: true },
    { key: "role", label: "Role", defaultSelected: true },
    { key: "email", label: "Email", defaultSelected: true },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status", defaultSelected: true },
    { key: "department", label: "Department", defaultSelected: true },
    { key: "position", label: "Position" },
    { key: "employee_id", label: "Employee ID" },
    { key: "hire_date", label: "Hire Date" },
    { key: "certs", label: "Certifications" },
    { key: "cert_dates", label: "Expiration Dates" },
  ], []);

  const teamFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (searchQuery) parts.push(`Search: "${searchQuery}"`);
    if (filters.department !== "all") parts.push(`Department: ${filters.department}`);
    if (filters.status !== "all") parts.push(`Status: ${filters.status}`);
    if (filters.role !== "all") parts.push(`Role: ${filters.role}`);
    if (selectedIds.size > 0) parts.push(`${selectedIds.size} selected`);
    return parts.length > 0 ? `Filtered by: ${parts.join(" · ")}` : undefined;
  }, [searchQuery, filters, selectedIds]);

  const handleExport = useCallback((format: "csv" | "excel") => {
    setExportModalOpen(true);
  }, []);

  const executeTeamExport = useCallback(async (selectedFieldKeys: string[], format: "csv" | "excel" | "pdf") => {
    const dataToExport_raw = selectedIds.size > 0 ? selectedEmployees : filteredEmployees;

    const fieldMap: Record<string, (emp: any) => any> = {
      name: e => `${e.first_name} ${e.last_name}`,
      role: e => e.team_role?.name || "",
      email: e => e.email || "",
      phone: e => e.phone || "",
      status: e => e.status || "",
      department: e => e.department || "",
      position: e => e.position || "",
      employee_id: e => e.employee_id || "",
      hire_date: e => e.hire_date || "",
      certs: e => (e.employee_requirements || []).map((r: any) => r.requirement?.title || "").filter(Boolean).join("; "),
      cert_dates: e => (e.employee_requirements || []).map((r: any) => r.expire_date || "").filter(Boolean).join("; "),
    };

    const selectedExportFields = teamExportFields.filter(f => selectedFieldKeys.includes(f.key));
    const exportData = dataToExport_raw.map(emp => {
      const row: Record<string, any> = {};
      for (const field of selectedExportFields) {
        row[field.label] = fieldMap[field.key]?.(emp) ?? "";
      }
      return row;
    });

    try {
      const filename = `team-members-${new Date().toISOString().split("T")[0]}`;
      if (format === "excel") {
        await createExcelFile(exportData, `${filename}.xlsx`, "Team Members");
      } else {
        createCsvFile(exportData, `${filename}.csv`);
      }
      toast({ title: "Export successful", description: `Exported ${exportData.length} team members as ${format.toUpperCase()}` });
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    }
  }, [selectedIds, selectedEmployees, filteredEmployees, teamExportFields]);

  // Mobile bulk delete
  const handleMobileBulkDelete = async () => {
    setIsMobileDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      // Soft delete
      const { error: empError } = await supabase.from("employees").update({ deleted_at: new Date().toISOString() }).in("id", ids);
      if (empError) throw empError;
      toast({ title: "Members deleted", description: `Successfully removed ${selectedIds.size} team member${selectedIds.size > 1 ? "s" : ""}.` });
      setSelectedIds(new Set());
      await refreshTeamData();
      setMobileDeleteSheetOpen(false);
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message || "Could not delete selected members.", variant: "destructive" });
    } finally {
      setIsMobileDeleting(false);
    }
  };

  const mobileSelectionMode = selectedIds.size > 0;

  // Count employees needing attention
  const needsAttentionCount = useMemo(() => {
    return employees.filter((emp) => {
      const stats = emp.requirements_stats || {};
      return (stats.missing_expired || 0) > 0 || (stats.expiring_soon || 0) > 0;
    }).length;
  }, [employees]);

  // ─── MOBILE VIEW ───
  if (isMobile) {
    return (
      <>
        {/* Credential awareness dashboard */}
        <MobileCredentialDashboard />

        {/* Mobile header: Filter + Invite (search is handled by global nav) */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b pb-3 -mx-4 px-4 pt-3" data-tour="mobile-team-filters">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 relative",
                activeFilterCount > 0 && "border-primary text-primary"
              )}
              onClick={() => setMobileFiltersOpen(true)}
              aria-label="Open filters"
            >
              <Filter className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {isTeamLocked ? (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0 opacity-60"
                    onClick={() => setLockModalOpen(true)}
                    aria-label="Invite Member (locked)"
                  >
                    <Lock className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Available on {lockedPlanName} plan</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] flex-shrink-0"
                onClick={() => setAddModalOpen(true)}
                aria-label="Invite Member"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips (mobile) */}
        {employees.length > 0 && (
          <div className="py-2 -mx-4 px-4">
            <TeamQuickFilterChips
              employees={contextFilteredEmployees}
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
              activeRole={chipRole}
              onRoleChange={setChipRole}
              activeDepartment={chipDepartment}
              onDepartmentChange={setChipDepartment}
            />
          </div>
        )}

        {/* Active Filter Chips */}
        {employees.length > 0 && (
          <MobileTeamActiveFilters
            filters={filters}
            onFiltersChange={setFilters}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
          />
        )}

        {/* Filtered totals */}
        {filteredEmployees.length > 0 && (
          <div className="flex items-center gap-3 px-1 py-1.5 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{filteredEmployees.length}</span> members</span>
            {filteredEmployees.length < employees.length && (
              <>
                <span className="text-border">·</span>
                <span className="text-muted-foreground/70">of {employees.length} total</span>
              </>
            )}
          </div>
        )}

        {/* Member List – no FAB overlap, uses pb-6 */}
        <div className={`mt-1 ${mobileSelectionMode ? "pb-40" : "pb-6"}`}>
          <MobileTeamList
            employees={paginatedEmployees}
            loading={loading}
            onViewEmployee={handleRowClick}
            onRefresh={refreshTeamData}
            hasEmployees={employees.length > 0}
            onAddMember={() => setAddModalOpen(true)}
            onClearFilters={handleClearFilters}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            selectionMode={mobileSelectionMode}
            
            onAddCredential={(emp) => {
              setQuickActionsEmployee(emp);
              setQuickAssignOpen(true);
            }}
            onEditMember={(emp) => {
              setQuickActionsEmployee(emp);
              setQuickEditOpen(true);
            }}
            onDeactivateMember={(emp) => {
              setSelectedEmployee(emp);
              setDrawerOpen(true);
            }}
          />
        </div>

        {/* Mobile Pagination */}
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEmployees.length}
          onPageChange={setCurrentPage}
        />


        <MobileTeamBulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onDelete={() => setMobileDeleteSheetOpen(true)}
          onExport={() => handleExport("csv")}
          onAssignTraining={() => {
            toast({
              title: "Ready to assign",
              description: `Open member details to assign credentials to ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}.`,
            });
          }}
        />

        <MobileBulkDeleteSheet
          open={mobileDeleteSheetOpen}
          onOpenChange={setMobileDeleteSheetOpen}
          memberCount={selectedIds.size}
          memberNames={selectedEmployees.map((e) => `${e.first_name} ${e.last_name}`)}
          onConfirm={handleMobileBulkDelete}
          isDeleting={isMobileDeleting}
        />

        {/* Filter Sheet */}
        <MobileTeamFilterSheet
          open={mobileFiltersOpen}
          onOpenChange={setMobileFiltersOpen}
          filters={filters}
          onFiltersChange={setFilters}
          departments={departments}
          employees={employees}
        />

        {/* Actions Sheet */}
        <MobileTeamActionsSheet
          open={mobileActionsOpen}
          onOpenChange={setMobileActionsOpen}
          onImport={() => setImportModalOpen(true)}
          onExportCsv={() => handleExport("csv")}
          onExportExcel={() => handleExport("excel")}
          onStartSelection={() => {
            if (paginatedEmployees.length > 0) {
              setSelectedIds(new Set([paginatedEmployees[0].id]));
            }
          }}
          hasMembers={employees.length > 0}
        />

        {/* Modals/Drawers */}
        <AddTeamMemberModal open={addModalOpen} onOpenChange={setAddModalOpen} onSuccess={refreshTeamData} />
        <TeamImportWizard open={importModalOpen} onOpenChange={setImportModalOpen} onImported={refreshTeamData} />

        {isMobile ? (
          <MobileEmployeeDrawer employee={selectedEmployee} open={drawerOpen} onOpenChange={setDrawerOpen} onRefresh={refreshTeamData} />
        ) : (
          <EmployeeDrawer employee={selectedEmployee} open={drawerOpen} onOpenChange={setDrawerOpen} onRefresh={refreshTeamData} />
        )}

        {/* Quick Actions Sheet (long-press) */}
        <MobileQuickActionsSheet
          employee={quickActionsEmployee}
          open={quickActionsOpen}
          onOpenChange={setQuickActionsOpen}
          onViewProfile={(emp) => {
            setSelectedEmployee(emp);
            setDrawerOpen(true);
          }}
          onAddCredential={(emp) => {
            setQuickActionsEmployee(emp);
            setQuickAssignOpen(true);
          }}
          onRenewCredential={(emp) => {
            setSelectedEmployee(emp);
            setDrawerOpen(true);
          }}
          onEditMember={(emp) => {
            setQuickActionsEmployee(emp);
            setQuickEditOpen(true);
          }}
        />

        {/* Quick Edit Modal (from long-press) */}
        <EditEmployeeModal
          open={quickEditOpen}
          onOpenChange={setQuickEditOpen}
          employee={quickActionsEmployee}
          onSuccess={refreshTeamData}
        />

        {/* Quick Assign Credential (from long-press) */}
        <AssignCredentialToMemberDialog
          employeeId={quickActionsEmployee?.id || ""}
          employeeName={quickActionsEmployee ? `${quickActionsEmployee.first_name} ${quickActionsEmployee.last_name}` : ""}
          alreadyAssignedIds={[]}
          open={quickAssignOpen}
          onOpenChange={setQuickAssignOpen}
          onSuccess={refreshTeamData}
        />
      </>
    );
  }


  // Empty state — allow switching to credentials view
  if (!loading && employees.length === 0) {
    return (
      <>
        {/* View Toggle — always visible so users can access Credentials tab */}
        <div className="flex items-center justify-between mb-4" data-tour="team-filters" data-team-table>
          <TeamViewToggle view={teamView} onViewChange={setTeamView} />
        </div>

        {teamView === "compliance" ? (
          <ComplianceTable />
        ) : (
          <TeamEmptyState
            type="no-members"
            onAddMember={() => setAddModalOpen(true)}
            onImport={() => setImportModalOpen(true)}
            onCreateCredential={() => setTeamView("compliance")}
          />
        )}

        <AddTeamMemberModal open={addModalOpen} onOpenChange={setAddModalOpen} onSuccess={refreshTeamData} />
        <TeamImportWizard open={importModalOpen} onOpenChange={setImportModalOpen} onImported={refreshTeamData} />
      </>
    );
  }

  // ─── DESKTOP VIEW ───
  return (
    <>
      {/* Compact Metrics Strip */}
      <CompactMetricsStrip />

      {/* Needs Attention Strip */}
      {needsAttentionCount > 0 && (
        <button
          onClick={() => setStatusFilter("at-risk")}
          className={cn(
            "w-full mb-3 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/15",
            statusFilter === "at-risk" && "ring-2 ring-warning/30"
          )}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{needsAttentionCount} employee{needsAttentionCount > 1 ? "s" : ""} need{needsAttentionCount === 1 ? "s" : ""} attention</span>
          <span className="ml-auto text-xs opacity-70">Click to filter →</span>
        </button>
      )}

      {/* Unified Toolbar (matches Assets page structure) */}
      <TeamToolbar
        memberCount={filteredEmployees.length}
        lastUpdated={employees.length > 0 ? new Date() : null}
        isRefreshing={loading}
        onRefresh={refreshTeamData}
        onAddMember={() => guardAction(() => setAddModalOpen(true))}
        onAssignCredentials={() => setCredentialTypesOpen(true)}
        onImport={() => setImportModalOpen(true)}
        onExport={(format) => {
          if (format === "pdf") {
            setExportModalOpen(true);
          } else {
            handleExport(format);
          }
        }}
        onPrint={() => window.print()}
        onManageCredentialTypes={() => setCredentialTypesOpen(true)}
        onQuickAssignSuccess={refreshTeamData}
      />

      <Card className="p-3 sm:p-4 bg-card border-border/50 mt-3" style={{ boxShadow: "var(--shadow-metric)" }}>
        {/* Search bar */}
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, role, department, credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Quick Filter Chips */}
          <TeamQuickFilterChips
            employees={contextFilteredEmployees}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            activeRole={chipRole}
            onRoleChange={setChipRole}
            activeDepartment={chipDepartment}
            onDepartmentChange={setChipDepartment}
          />

          {/* Tabs: Directory | Credentials */}
          <div className="flex items-center justify-between" data-tour="team-filters" data-team-table>
            <TeamViewToggle view={teamView} onViewChange={setTeamView} />
          </div>
        </div>

        {teamView === "compliance" ? (
          <ComplianceTable />
        ) : (
          <>
            {/* Filtered totals */}
            {!loading && filteredEmployees.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pb-2">
                <span><span className="font-medium text-foreground">{filteredEmployees.length}</span> team members</span>
                {filteredEmployees.length < employees.length && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-muted-foreground/70">of {employees.length} total</span>
                  </>
                )}
              </div>
            )}
            {loading ? (
              <div className="rounded-xl border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1 max-w-[200px]" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="px-4 py-4 border-t flex items-center gap-4" style={{ opacity: 1 - i * 0.08 }}>
                    <Skeleton className="h-4 w-4 flex-shrink-0" />
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <DynamicTeamTable
                employees={paginatedEmployees}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleSelectAll={toggleSelectAll}
                onRowClick={handleRowClick}
                onRefresh={refreshTeamData}
                focusMode={focusMode}
                onClearFilters={handleClearFilters}
              />
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <EnhancedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEmployees.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        )}
      </Card>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedEmployees={selectedEmployees}
        onClearSelection={() => setSelectedIds(new Set())}
        onRefresh={refreshTeamData}
      />


      <AddTeamMemberModal open={addModalOpen} onOpenChange={setAddModalOpen} onSuccess={refreshTeamData} />
      <TeamImportWizard open={importModalOpen} onOpenChange={setImportModalOpen} onImported={refreshTeamData} />

      {isMobile ? (
        <MobileEmployeeDrawer employee={selectedEmployee} open={drawerOpen} onOpenChange={setDrawerOpen} onRefresh={refreshTeamData} />
      ) : (
        <EmployeeDrawer employee={selectedEmployee} open={drawerOpen} onOpenChange={setDrawerOpen} onRefresh={refreshTeamData} />
      )}

      {/* Credential Types Sheet */}
      <Sheet open={credentialTypesOpen} onOpenChange={setCredentialTypesOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-y-auto">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Credential Types
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 pt-4">
            <RequirementsLibrary />
          </div>
        </SheetContent>
      </Sheet>

      {/* Export Fields Modal */}
      <ExportFieldsModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        fields={teamExportFields}
        formats={["csv", "excel"]}
        onExport={executeTeamExport}
        filterSummary={teamFilterSummary}
        title="Export Team Members"
        itemCount={selectedIds.size > 0 ? selectedIds.size : filteredEmployees.length}
      />

      <MobileTeamFilterSheet
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        departments={departments}
        employees={employees}
      />

      <FeatureLockModal
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
        featureName="Team Management"
        description={`Team management is available on the ${lockedPlanName} plan. Upgrade to manage your team roster, assign roles, and track credentials.`}
        requiredPlan={lockedPlanName}
      />
      <UpgradeLimitModal
        open={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitType={upgradeLimitType}
        featureName={upgradeFeatureName}
      />
    </>
  );
};
