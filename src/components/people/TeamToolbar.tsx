import { UserPlus, Upload, FileDown, Settings2, MoreHorizontal, Printer, ShieldCheck, ChevronDown } from "lucide-react";
import { QuickAssignCommand } from "./QuickAssignCommand";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useIsMobile } from "@/hooks/use-mobile";
import { GuidanceHighlight } from "@/components/guidance/GuidanceHighlight";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DataFreshness } from "@/components/ui/data-freshness";

interface TeamToolbarProps {
  memberCount: number;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onAddMember: () => void;
  onAssignCredentials: () => void;
  onImport: () => void;
  onExport: (format: "csv" | "excel" | "pdf") => void;
  onPrint?: () => void;
  onManageCredentialTypes?: () => void;
  onQuickAssignSuccess?: () => void;
}

export const TeamToolbar = ({
  memberCount,
  lastUpdated,
  isRefreshing,
  onRefresh,
  onAddMember,
  onAssignCredentials,
  onImport,
  onExport,
  onPrint,
  onManageCredentialTypes,
  onQuickAssignSuccess,
}: TeamToolbarProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        {/* Left: Member count + freshness */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}
          </span>
          <DataFreshness
            lastUpdated={lastUpdated}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
          {!isMobile && <QuickAssignCommand onSuccess={onQuickAssignSuccess} />}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <PermissionGate permission="manage_team" fallback="disabled" deniedMessage="Team management requires Workspace Admin.">
            {isMobile ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 animate-in fade-in-0 zoom-in-95 duration-150">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      requestAnimationFrame(() => onAddMember());
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Team Member
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      requestAnimationFrame(() => onAssignCredentials());
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Assign Credentials
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <GuidanceHighlight resolveKey="add_team_member_button">
                  <Button onClick={onAddMember} className="gap-2" id="add_team_member_button">
                    <UserPlus className="h-4 w-4" />
                    Add Team Member
                  </Button>
                </GuidanceHighlight>
                <GuidanceHighlight resolveKey="assign_credentials_button">
                  <Button onClick={onAssignCredentials} variant="outline" className="gap-2" id="assign_credentials_button">
                    <ShieldCheck className="h-4 w-4" />
                    Assign Credentials
                  </Button>
                </GuidanceHighlight>
              </div>
            )}
          </PermissionGate>

          {/* Settings / Credential Types */}
          {onManageCredentialTypes && (
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={onManageCredentialTypes}>
              <Settings2 className="h-4 w-4" />
            </Button>
          )}

          {/* Secondary Actions - Grouped (matching InventoryToolbar) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onImport} className="gap-2">
                <Upload className="h-4 w-4" />
                Import Spreadsheet
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Export</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onExport("csv")} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("excel")} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              {onPrint && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onPrint} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print View
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
