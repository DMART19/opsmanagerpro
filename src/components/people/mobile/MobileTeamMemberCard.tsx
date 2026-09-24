import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, CheckCircle2, AlertTriangle, XCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTeamMemberCardProps {
  employee: any;
  onView: (employee: any) => void;
  isSelected?: boolean;
}

type CredentialStatus = "ok" | "expiring" | "action_required" | "none";

function getCredentialInfo(employee: any): { status: CredentialStatus; label: string } {
  const stats = employee.requirements_stats;
  if (!stats || stats.total === 0) return { status: "none", label: "No Credentials" };

  const missingExpired = stats.missing_expired ?? 0;
  const expiring = stats.expiring_soon ?? 0;

  if (missingExpired > 0) {
    return { status: "action_required", label: `${missingExpired} Expired` };
  }
  if (expiring > 0) {
    return { status: "expiring", label: `${expiring} Expiring Soon` };
  }
  return { status: "ok", label: "Credentials OK" };
}

const statusConfig: Record<
  CredentialStatus,
  { dot: string; bg: string; text: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  expiring: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  action_required: {
    dot: "bg-destructive",
    bg: "bg-destructive/10",
    text: "text-destructive",
    Icon: XCircle,
  },
  none: {
    dot: "bg-muted-foreground/30",
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    Icon: Minus,
  },
};

export const MobileTeamMemberCard = memo(
  ({ employee, onView, isSelected }: MobileTeamMemberCardProps) => {
    const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`;
    const employmentStatus = employee.status || employee.employment_status || "Active";

    const { status, label } = useMemo(() => getCredentialInfo(employee), [employee]);
    const cfg = statusConfig[status];
    const StatusIcon = cfg.Icon;

    return (
      <Card
        className={cn(
          "p-3.5 transition-all duration-200 cursor-pointer rounded-2xl border-border/40 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]",
          "active:scale-[0.98] active:bg-muted/50",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={() => onView(employee)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView(employee);
          }
        }}
      >
        {/* Row 1: Avatar + Name + Role */}
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0 shadow-sm ring-2 ring-background">
            {employee.avatar_url && (
              <AvatarImage
                src={employee.avatar_url}
                alt={`${employee.first_name} ${employee.last_name}`}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] leading-tight truncate text-foreground">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {employee.position || "No position"}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
        </div>

        {/* Row 2: Employment status badge + Credential status badge */}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/15">
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg leading-none">
            {employmentStatus}
          </span>

          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg leading-none",
              cfg.bg
            )}
          >
            <StatusIcon className={cn("h-3 w-3 flex-shrink-0", cfg.text)} />
            <span className={cn("text-[11px] font-semibold truncate", cfg.text)}>
              {label}
            </span>
          </div>
        </div>
      </Card>
    );
  }
);

MobileTeamMemberCard.displayName = "MobileTeamMemberCard";
