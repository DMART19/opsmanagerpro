import { useMemo } from "react";
import { Users, AlertTriangle, XCircle, Clock, ShieldCheck } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type TeamStatusFilter = "all" | "at-risk" | "expired" | "expiring-soon" | "compliant";

interface TeamQuickFilterChipsProps {
  employees: any[];
  activeFilter: TeamStatusFilter;
  onFilterChange: (filter: TeamStatusFilter) => void;
  /** Role filter */
  activeRole: string | null;
  onRoleChange: (role: string | null) => void;
  /** Department filter */
  activeDepartment: string | null;
  onDepartmentChange: (dept: string | null) => void;
  className?: string;
}

const now = new Date();

function isExpired(emp: any): boolean {
  const reqs = emp.employee_requirements || [];
  return reqs.some((r: any) => r.expire_date && new Date(r.expire_date) < now);
}

function isExpiringSoon(emp: any): boolean {
  const reqs = emp.employee_requirements || [];
  const cutoff = new Date(now.getTime() + 30 * 86400000);
  return reqs.some((r: any) => {
    if (!r.expire_date) return false;
    const d = new Date(r.expire_date);
    return d >= now && d <= cutoff;
  });
}

function isAtRisk(emp: any): boolean {
  return isExpired(emp) || isExpiringSoon(emp);
}

function isCompliant(emp: any): boolean {
  const reqs = emp.employee_requirements || [];
  if (reqs.length === 0) return false;
  return !isExpired(emp) && !isExpiringSoon(emp);
}

export function applyTeamStatusFilter(employees: any[], filter: TeamStatusFilter): any[] {
  switch (filter) {
    case "at-risk": return employees.filter(isAtRisk);
    case "expired": return employees.filter(isExpired);
    case "expiring-soon": return employees.filter(isExpiringSoon);
    case "compliant": return employees.filter(isCompliant);
    default: return employees;
  }
}

const statusFilters = [
  { key: "all" as const, label: "All", icon: Users, tintClass: "bg-muted/50", activeTintClass: "bg-primary text-primary-foreground" },
  { key: "at-risk" as const, label: "At Risk", icon: AlertTriangle, tintClass: "bg-warning/10 text-warning", activeTintClass: "bg-warning text-warning-foreground" },
  { key: "expired" as const, label: "Expired", icon: XCircle, tintClass: "bg-destructive/10 text-destructive", activeTintClass: "bg-destructive text-destructive-foreground" },
  { key: "expiring-soon" as const, label: "Expiring Soon", icon: Clock, tintClass: "bg-warning/10 text-warning", activeTintClass: "bg-warning text-warning-foreground" },
  { key: "compliant" as const, label: "Compliant", icon: ShieldCheck, tintClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", activeTintClass: "bg-emerald-600 text-white dark:bg-emerald-500" },
];

export const TeamQuickFilterChips = ({
  employees,
  activeFilter,
  onFilterChange,
  activeRole,
  onRoleChange,
  activeDepartment,
  onDepartmentChange,
  className,
}: TeamQuickFilterChipsProps) => {
  const counts = useMemo(() => {
    const all = employees.length;
    const atRisk = employees.filter(isAtRisk).length;
    const expired = employees.filter(isExpired).length;
    const expiringSoon = employees.filter(isExpiringSoon).length;
    const compliant = employees.filter(isCompliant).length;
    return { all, "at-risk": atRisk, expired, "expiring-soon": expiringSoon, compliant } as Record<string, number>;
  }, [employees]);

  // Extract unique roles sorted by frequency
  const sortedRoles = useMemo(() => {
    const countMap = new Map<string, number>();
    employees.forEach((e) => {
      const role = e.team_role?.name || e.position;
      if (role) countMap.set(role, (countMap.get(role) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 10);
  }, [employees]);

  // Extract unique departments sorted by frequency
  const sortedDepartments = useMemo(() => {
    const countMap = new Map<string, number>();
    employees.forEach((e) => {
      if (e.department) countMap.set(e.department, (countMap.get(e.department) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 10);
  }, [employees]);

  const hasRoles = sortedRoles.length > 1;
  const hasDepartments = sortedDepartments.length > 1;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Row 1: Status quick filters */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-0.5">
          {statusFilters.map((f) => {
            const count = counts[f.key];
            const isActive = activeFilter === f.key;
            const show = f.key === "all" || count > 0;
            if (!show) return null;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => onFilterChange(isActive && f.key !== "all" ? "all" : f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
                  "min-h-[36px] active:scale-[0.96]",
                  isActive ? f.activeTintClass : cn(f.tintClass, "hover:opacity-80"),
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                <span className={cn(
                  "ml-0.5 text-[10px] font-bold tabular-nums",
                  isActive ? "opacity-80" : "opacity-70",
                )}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>

      {/* Row 2: Role chips */}
      {hasRoles && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-0.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider self-center mr-1 shrink-0">
              Role
            </span>
            {sortedRoles.map((role) => (
              <button
                key={role}
                onClick={() => onRoleChange(activeRole === role ? null : role)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                  "min-h-[32px] active:scale-[0.96]",
                  activeRole === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground/80 hover:bg-muted",
                )}
              >
                {role}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      )}

      {/* Row 3: Department chips */}
      {hasDepartments && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-0.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider self-center mr-1 shrink-0">
              Dept
            </span>
            {sortedDepartments.map((dept) => (
              <button
                key={dept}
                onClick={() => onDepartmentChange(activeDepartment === dept ? null : dept)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                  "min-h-[32px] active:scale-[0.96]",
                  activeDepartment === dept
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground/80 hover:bg-muted",
                )}
              >
                {dept}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      )}
    </div>
  );
};
