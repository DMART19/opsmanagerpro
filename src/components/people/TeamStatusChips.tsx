import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Users, AlertTriangle, XCircle, Clock, ShieldOff, ShieldCheck } from "lucide-react";

export type TeamStatusFilter = "all" | "at-risk" | "expired" | "expiring-soon" | "no-credentials" | "compliant";

interface TeamStatusChipsProps {
  employees: any[];
  activeFilter: TeamStatusFilter;
  onFilterChange: (filter: TeamStatusFilter) => void;
  className?: string;
}

interface ChipDef {
  key: TeamStatusFilter;
  label: string;
  icon: React.ReactNode;
  countFn: (employees: any[]) => number;
  colorActive: string;
  colorDot: string;
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

function hasNoCredentials(emp: any): boolean {
  const reqs = emp.employee_requirements || [];
  return reqs.length === 0;
}

function isCompliant(emp: any): boolean {
  const reqs = emp.employee_requirements || [];
  if (reqs.length === 0) return false;
  return !isExpired(emp) && !isExpiringSoon(emp);
}

const CHIPS: ChipDef[] = [
  {
    key: "all",
    label: "All",
    icon: <Users className="h-3.5 w-3.5" />,
    countFn: (emps) => emps.length,
    colorActive: "border-primary bg-primary/10 text-primary",
    colorDot: "bg-primary",
  },
  {
    key: "at-risk",
    label: "At Risk",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    countFn: (emps) => emps.filter(isAtRisk).length,
    colorActive: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    colorDot: "bg-amber-500",
  },
  {
    key: "expired",
    label: "Expired",
    icon: <XCircle className="h-3.5 w-3.5" />,
    countFn: (emps) => emps.filter(isExpired).length,
    colorActive: "border-destructive bg-destructive/10 text-destructive",
    colorDot: "bg-destructive",
  },
  {
    key: "expiring-soon",
    label: "Expiring Soon",
    icon: <Clock className="h-3.5 w-3.5" />,
    countFn: (emps) => emps.filter(isExpiringSoon).length,
    colorActive: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    colorDot: "bg-orange-500",
  },
  {
    key: "compliant",
    label: "Compliant",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    countFn: (emps) => emps.filter(isCompliant).length,
    colorActive: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    colorDot: "bg-emerald-500",
  },
];

/**
 * Apply the team status filter to employees
 */
export function applyTeamStatusFilter(employees: any[], filter: TeamStatusFilter): any[] {
  switch (filter) {
    case "at-risk": return employees.filter(isAtRisk);
    case "expired": return employees.filter(isExpired);
    case "expiring-soon": return employees.filter(isExpiringSoon);
    case "no-credentials": return employees.filter(hasNoCredentials);
    case "compliant": return employees.filter(isCompliant);
    default: return employees;
  }
}

export const TeamStatusChips = ({
  employees,
  activeFilter,
  onFilterChange,
  className,
}: TeamStatusChipsProps) => {
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    CHIPS.forEach(chip => {
      result[chip.key] = chip.countFn(employees);
    });
    return result;
  }, [employees]);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {CHIPS.map((chip) => {
        const count = counts[chip.key];
        const isActive = activeFilter === chip.key;

        // Hide chips with 0 count (except "All")
        if (chip.key !== "all" && count === 0) return null;

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilterChange(chip.key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              isActive
                ? cn(chip.colorActive, "shadow-sm")
                : "border-border/40 text-foreground/70 hover:border-border/70 hover:bg-muted/50"
            )}
          >
            {isActive ? chip.icon : <span className={cn("h-2 w-2 rounded-full flex-shrink-0", chip.colorDot)} />}
            <span>{chip.label}</span>
            <span className={cn(
              "ml-0.5 text-[10px] tabular-nums",
              isActive ? "opacity-80" : "text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
