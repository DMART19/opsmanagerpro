import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Check,
  ShieldCheck,
  XCircle,
  Clock,
  ShieldPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MemberCredentialOverlay } from "./MemberCredentialOverlay";
import { useState } from "react";

interface MobileTeamSelectableCardProps {
  employee: any;
  onView: (employee: any) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
  
  onAddCredential?: (employee: any) => void;
  onEditMember?: (employee: any) => void;
  onDeactivateMember?: (employee: any) => void;
}

// Deterministic avatar color from name
const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const LEADER_KEYWORDS = [
  "manager",
  "supervisor",
  "lead",
  "director",
  "chief",
  "head",
  "admin",
];

const isLeaderRole = (employee: any): boolean => {
  const role = (employee.team_role?.name || employee.position || "").toLowerCase();
  return LEADER_KEYWORDS.some((k) => role.includes(k));
};

const getAggregateCredentialStatus = (stats: any) => {
  if (!stats || stats.total === 0) {
    return {
      label: "No Credentials",
      icon: XCircle,
      className: "text-muted-foreground",
      bgClassName: "bg-muted",
    };
  }
  if (stats.missing_expired > 0) {
    return {
      label: "Expired",
      icon: XCircle,
      className: "text-destructive",
      bgClassName: "bg-destructive/10",
    };
  }
  if (stats.expiring_soon > 0) {
    return {
      label: "Due Soon",
      icon: Clock,
      className: "text-amber-600 dark:text-amber-400",
      bgClassName: "bg-amber-100 dark:bg-amber-900/30",
    };
  }
  return {
    label: "Compliant",
    icon: ShieldCheck,
    className: "text-emerald-600 dark:text-emerald-400",
    bgClassName: "bg-emerald-100 dark:bg-emerald-900/30",
  };
};

export const MobileTeamSelectableCard = memo(({
  employee,
  onView,
  isSelected,
  onToggleSelect,
  selectionMode,
  onAddCredential,
}: MobileTeamSelectableCardProps) => {
  const [credentialOverlayOpen, setCredentialOverlayOpen] = useState(false);
  const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`;

  const getEmploymentStatusLabel = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || "active";
    switch (normalizedStatus) {
      case "active":
        return "Active";
      case "onboarding":
        return "Onboarding";
      case "in training":
      case "training required":
        return "Training";
      case "on-leave":
        return "On Leave";
      case "inactive":
        return "Inactive";
      default:
        return status || "Active";
    }
  };

  const employmentStatus = employee.status || employee.employment_status || "active";
  const credStatus = getAggregateCredentialStatus(employee.requirements_stats);
  const CredIcon = credStatus.icon;
  const stats = employee.requirements_stats || {};
  const needsAction =
    (stats.missing_expired ?? 0) > 0 || (stats.expiring_soon ?? 0) > 0;

  const expirationBadge = useMemo(() => {
    const reqs = employee.employee_requirements || [];
    const now = new Date();
    let soonestDays: number | null = null;
    let hasExpired = false;

    for (const r of reqs) {
      if (!r.expire_date) continue;
      const expDate = new Date(r.expire_date);
      const diffMs = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / 86400000);

      if (diffDays < 0) {
        hasExpired = true;
      } else if (diffDays <= 90) {
        if (soonestDays === null || diffDays < soonestDays) {
          soonestDays = diffDays;
        }
      }
    }

    if (hasExpired) {
      return { label: "Expired", variant: "expired" as const };
    }
    if (soonestDays !== null) {
      return { label: `Expires in ${soonestDays}d`, variant: "expiring" as const };
    }
    return null;
  }, [employee.employee_requirements]);

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect(employee.id);
    } else {
      onView(employee);
    }
  };

  const handleCredentialBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectionMode) {
      setCredentialOverlayOpen(true);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "relative px-4 py-3.5 transition-shadow duration-200 cursor-pointer rounded-xl min-h-[68px] border-border/20 shadow-[0_1px_2px_0_hsl(var(--foreground)/0.03)]",
          isSelected ? "ring-2 ring-primary bg-primary/5" : "active:bg-muted/30"
        )}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <div className="flex items-center gap-3">
          {selectionMode && (
            <div
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(employee.id);
              }}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
              </div>
            </div>
          )}

          <Avatar
            className={cn(
              "h-12 w-12 flex-shrink-0",
              isLeaderRole(employee) &&
                "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
            )}
          >
            <AvatarFallback
              className={cn(
                "font-bold text-base tracking-tight",
                getAvatarColor(`${employee.first_name} ${employee.last_name}`)
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] leading-snug truncate">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-[13px] text-muted-foreground truncate mt-px">
              {employee.position || "No position"}
              {employee.department && ` · ${employee.department}`}
            </p>
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              <span className="text-[11px] text-muted-foreground/60">
                {getEmploymentStatusLabel(employmentStatus)}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium gap-1 px-2 py-0 cursor-pointer hover:opacity-80 transition-opacity",
                  credStatus.className,
                  "border-current/20"
                )}
                onClick={handleCredentialBadgeClick}
              >
                <CredIcon className="h-3 w-3" />
                {credStatus.label}
              </Badge>
              {expirationBadge && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold gap-1 px-1.5 py-0",
                    expirationBadge.variant === "expired"
                      ? "text-destructive border-destructive/30 bg-destructive/10"
                      : "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                  )}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {expirationBadge.label}
                </Badge>
              )}
            </div>
          </div>

          {!selectionMode && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
          )}
        </div>

        {needsAction && !selectionMode && onAddCredential && (
          <div className="mt-2 pt-2 border-t border-border/10">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 w-full rounded-xl text-xs font-semibold gap-1.5",
                (stats.missing_expired ?? 0) > 0
                  ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : "border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onAddCredential(employee);
              }}
            >
              <ShieldPlus className="h-3.5 w-3.5" />
              {(stats.missing_expired ?? 0) > 0 ? "Add Credential" : "Renew Credential"}
            </Button>
          </div>
        )}
      </Card>

      <MemberCredentialOverlay
        employee={employee}
        open={credentialOverlayOpen}
        onOpenChange={setCredentialOverlayOpen}
      />
    </>
  );
});

MobileTeamSelectableCard.displayName = "MobileTeamSelectableCard";
