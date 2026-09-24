import { Users, UserPlus, Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageEmptyState } from "@/components/ui/page-empty-state";
import { GuidanceTooltip } from "@/components/guidance";

interface TeamEmptyStateProps {
  type: "no-members" | "no-results" | "no-attention-needed";
  onClearFilters?: () => void;
  onAddMember?: () => void;
  onImport?: () => void;
  onCreateCredential?: () => void;
}

export const TeamEmptyState = ({ type, onClearFilters, onAddMember, onImport, onCreateCredential }: TeamEmptyStateProps) => {
  if (type === "no-members") {
    return (
      <div className="space-y-4">
        <GuidanceTooltip
          guidanceId="team_empty_hint"
          message="Team members can help manage inventory and credentials. Start by inviting your first teammate."
        />
        <PageEmptyState
          icon={Users}
          title="Get started with your team"
          description="Add team members to manage credentials and operations, or create credentials first and assign them later."
          actionLabel="Add Team Member"
          onAction={onAddMember || (() => {})}
          secondaryLabel={onImport ? "Import Spreadsheet" : undefined}
          secondaryIcon={Upload}
          onSecondary={onImport}
        />
        {onCreateCredential && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onCreateCredential}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Or create credentials first
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (type === "no-attention-needed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground">
          No one needs attention right now.
        </p>
        <Button 
          variant="link" 
          onClick={onClearFilters}
          className="mt-2 text-primary"
        >
          View all members
        </Button>
      </div>
    );
  }

  // no-results
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <p className="text-muted-foreground">
        No members match your filters.
      </p>
      <Button 
        variant="link" 
        onClick={onClearFilters}
        className="mt-2 text-primary"
      >
        Clear filters
      </Button>
    </div>
  );
};
