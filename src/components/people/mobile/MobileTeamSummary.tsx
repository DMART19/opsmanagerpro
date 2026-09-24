import { Card } from "@/components/ui/card";
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamFilter, TeamFilterType } from "@/contexts/TeamFilterContext";

interface MobileTeamSummaryProps {
  totalMembers: number;
  compliantMembers: number;
  expiringSoonMembers: number;
  incompleteMembers: number;
  complianceRate: number;
  urgentCount: number;
  upcomingCount: number;
  hasAnyCredentials?: boolean;
}

export const MobileTeamSummary = ({
  totalMembers,
  compliantMembers,
  expiringSoonMembers,
  incompleteMembers,
  hasAnyCredentials = true,
}: MobileTeamSummaryProps) => {
  const { activeFilter, setActiveFilter } = useTeamFilter();
  
  // Don't show if no members
  if (totalMembers === 0) {
    return null;
  }

  const handleFilterTap = (filter: TeamFilterType) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };

  // Check if we have any meaningful credential data to display
  const hasCredentialData = hasAnyCredentials && (compliantMembers > 0 || expiringSoonMembers > 0 || incompleteMembers > 0);

  return (
    <div className="grid grid-cols-2 gap-2" data-tour="mobile-team-summary">
      <FilterCard 
        label="All Members" 
        value={totalMembers} 
        icon={Users} 
        color="text-primary" 
        bgColor="bg-primary/10" 
        isActive={activeFilter === "all"} 
        onClick={() => handleFilterTap("all")} 
      />
      <FilterCard 
        label="Up to Date" 
        value={hasCredentialData ? compliantMembers : null}
        emptyText="No credentials"
        icon={CheckCircle2} 
        color="text-success" 
        bgColor="bg-success/10" 
        isActive={activeFilter === "compliant"} 
        onClick={() => hasCredentialData && handleFilterTap("compliant")}
        disabled={!hasCredentialData}
      />
      {(expiringSoonMembers > 0 || hasCredentialData) && (
        <FilterCard 
          label="Expiring Soon" 
          value={expiringSoonMembers} 
          icon={Clock} 
          color={expiringSoonMembers > 0 ? "text-warning" : "text-success"} 
          bgColor={expiringSoonMembers > 0 ? "bg-warning/10" : "bg-success/10"} 
          isActive={activeFilter === "expiring-soon"} 
          onClick={() => expiringSoonMembers > 0 && handleFilterTap("expiring-soon")}
          disabled={expiringSoonMembers === 0}
        />
      )}
      {(incompleteMembers > 0 || hasCredentialData) && (
        <FilterCard 
          label="Needs Attention" 
          value={incompleteMembers} 
          icon={incompleteMembers > 0 ? AlertCircle : CheckCircle2} 
          color={incompleteMembers > 0 ? (incompleteMembers > 5 ? "text-destructive" : "text-warning") : "text-success"} 
          bgColor={incompleteMembers > 0 ? (incompleteMembers > 5 ? "bg-destructive/10" : "bg-warning/10") : "bg-success/10"} 
          isActive={activeFilter === "incomplete"} 
          onClick={() => incompleteMembers > 0 && handleFilterTap("incomplete")}
          disabled={incompleteMembers === 0}
        />
      )}
    </div>
  );
};

interface FilterCardProps {
  label: string;
  value: number | null;
  emptyText?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const FilterCard = ({
  label,
  value,
  emptyText,
  icon: Icon,
  color,
  bgColor,
  isActive,
  onClick,
  disabled
}: FilterCardProps) => (
  <Card 
    className={cn(
      "p-3.5 transition-all border-border/50",
      !disabled && "cursor-pointer active:scale-95 hover:shadow-md",
      isActive && "ring-2 ring-primary border-primary",
      disabled && "opacity-70"
    )}
    style={{ boxShadow: isActive ? undefined : "var(--shadow-metric)" }}
    onClick={onClick}
  >
    <div className="flex items-center gap-2.5">
      <div className={cn("p-2 rounded-xl", bgColor)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="flex-1 min-w-0">
        {value !== null ? (
          <p className={cn("text-2xl font-extrabold tracking-tight", color)}>{value}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 truncate font-medium">{label}</p>
      </div>
    </div>
    {isActive && <p className="text-[10px] text-primary font-medium mt-1">Tap to clear</p>}
  </Card>
);
