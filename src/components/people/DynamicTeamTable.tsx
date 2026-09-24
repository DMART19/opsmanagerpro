import { useMemo, useState, useEffect } from "react";
import { Settings2, AlertCircle, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamRowActions } from "./TeamRowActions";

import { TeamEmptyState } from "./TeamEmptyState";
import { cn } from "@/lib/utils";
import { useDynamicTeamColumns, DynamicColumn } from "@/hooks/use-dynamic-team-columns";

interface DynamicTeamTableProps {
  employees: any[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (employee: any) => void;
  onRefresh: () => void;
  focusMode?: string;
  onClearFilters: () => void;
}

export const DynamicTeamTable = ({
  employees,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onRowClick,
  onRefresh,
  focusMode,
  onClearFilters,
}: DynamicTeamTableProps) => {
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  // Track screen width for responsive columns
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build custom attribute values map for all employees
  const customAttributeValues = useMemo(() => {
    const valuesMap: Record<string, Record<string, string | null>> = {};
    employees.forEach((emp) => {
      if (emp.custom_data) {
        valuesMap[emp.id] = emp.custom_data;
      }
    });
    return valuesMap;
  }, [employees]);

  const {
    columnsWithData,
    visibleColumnIds,
    toggleColumn,
    showAllColumns,
    showDefaultColumns,
    getResponsiveColumns,
    hiddenColumnsCount,
  } = useDynamicTeamColumns({
    employees,
    customAttributeValues,
  });

  // Calculate max columns based on screen width
  const maxColumns = useMemo(() => {
    if (screenWidth < 768) return 2;
    if (screenWidth < 1024) return 4;
    if (screenWidth < 1280) return 5;
    return undefined; // No limit on large screens
  }, [screenWidth]);

  // Get columns to display - ONLY columns with data
  const displayColumns = useMemo(() => {
    return getResponsiveColumns(maxColumns);
  }, [getResponsiveColumns, maxColumns]);

  // Render cell content based on column type
  const renderCellContent = (column: DynamicColumn, employee: any) => {
    const stats = employee.requirements_stats || {};

    switch (column.id) {
      case "name":
        const initials = `${employee.first_name[0]}${employee.last_name[0]}`;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 transition-transform group-hover:scale-105">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {employee.first_name} {employee.last_name}
              </div>
              {employee.email && (
                <div className="text-xs text-muted-foreground/60">{employee.email}</div>
              )}
            </div>
          </div>
        );

      case "role":
        if (!employee.team_role?.name && !employee.position) return null;
        return (
          <div className="flex flex-col gap-1">
            {employee.team_role && (
              <Badge
                variant="secondary"
                className="w-fit text-xs"
                style={{
                  backgroundColor: `${employee.team_role.color}20`,
                  color: employee.team_role.color,
                }}
              >
                {employee.team_role.name}
              </Badge>
            )}
            {employee.position && (
              <span className="text-muted-foreground text-sm">{employee.position}</span>
            )}
          </div>
        );

      case "department":
        if (!employee.department) return null;
        return (
          <span className="text-sm text-muted-foreground">
            {employee.department}
          </span>
        );

      case "credential_status": {
        const total = stats.total || 0;
        const missingExpired = stats.missing_expired || 0;
        const expiringSoon = stats.expiring_soon || 0;

        if (total === 0) {
          return (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border/60">
              No Credentials
            </Badge>
          );
        }
        if (missingExpired > 0) {
          return (
            <Badge className="text-xs bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 gap-1">
              <AlertCircle className="h-3 w-3" />
              Action Required ({missingExpired})
            </Badge>
          );
        }
        if (expiringSoon > 0) {
          return (
            <Badge className="text-xs bg-warning/15 text-warning border-warning/30 hover:bg-warning/20 gap-1">
              <Clock className="h-3 w-3" />
              Expiring Soon ({expiringSoon})
            </Badge>
          );
        }
        return (
          <Badge className="text-xs bg-success/15 text-success border-success/30 hover:bg-success/20">
            Up to Date
          </Badge>
        );
      }

      case "credential_summary": {
        const total = stats.total || 0;
        const missingExpired = stats.missing_expired || 0;
        const expiringSoon = stats.expiring_soon || 0;
        const valid = total - missingExpired - expiringSoon;

        if (total === 0) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <div className="flex items-center gap-2 text-xs font-medium tabular-nums">
            {valid > 0 && (
              <span className="inline-flex items-center gap-0.5 text-success">
                <CheckCircle2 className="h-3 w-3" /> {valid}
              </span>
            )}
            {expiringSoon > 0 && (
              <span className="inline-flex items-center gap-0.5 text-warning">
                <Clock className="h-3 w-3" /> {expiringSoon}
              </span>
            )}
            {missingExpired > 0 && (
              <span className="inline-flex items-center gap-0.5 text-destructive">
                <XCircle className="h-3 w-3" /> {missingExpired}
              </span>
            )}
          </div>
        );
      }

      case "expiring_soon": {
        const count = stats.expiring_soon || 0;
        if (count === 0) return <span className="text-sm text-muted-foreground tabular-nums">—</span>;
        return (
          <span className="text-sm font-medium text-warning tabular-nums">{count}</span>
        );
      }

      case "action_required": {
        const count = stats.missing_expired || 0;
        if (count === 0) return <span className="text-sm text-muted-foreground tabular-nums">—</span>;
        return (
          <span className="text-sm font-bold text-destructive tabular-nums">{count}</span>
        );
      }

      default:
        // Custom attribute columns
        if (column.isCustomAttribute) {
          const value = customAttributeValues[employee.id]?.[column.attributeId!] 
            || employee.custom_data?.[column.attributeId!]
            || employee.custom_data?.[column.label];
          if (!value) return null;
          return <span className="text-sm">{value}</span>;
        }
        return null;
    }
  };

  // Count hidden columns with data (for responsive indicator)
  const hiddenColumnsWithData = columnsWithData.filter(
    (col) => !displayColumns.some((dc) => dc.id === col.id)
  );

  return (
    <div className="space-y-2">
      {/* Column visibility control - only show if there are optional columns */}
      {columnsWithData.length > 1 && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                Columns
                {hiddenColumnsCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {hiddenColumnsCount} hidden
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Visible Columns</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {displayColumns.length}/{columnsWithData.length}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Quick actions */}
              <div className="flex gap-1 p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={showAllColumns}
                  className="flex-1 h-7 text-xs"
                >
                  Show All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={showDefaultColumns}
                  className="flex-1 h-7 text-xs"
                >
                  Defaults
                </Button>
              </div>
              <DropdownMenuSeparator />

              {columnsWithData.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumnIds.has(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                  disabled={column.isRequired} // Required columns can't be toggled
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.isCustomAttribute && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Custom
                      </Badge>
                    )}
                    {column.isRequired && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Required
                      </Badge>
                    )}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-metric)" }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/90 backdrop-blur-sm sticky top-0 z-10 border-b border-border/60">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={employees.length > 0 && selectedIds.size === employees.length}
                    onCheckedChange={onToggleSelectAll}
                  />
                </TableHead>
                {displayColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "font-semibold text-foreground/80 text-xs uppercase tracking-wider",
                      column.width,
                      column.id === "status" && "text-center"
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
                {/* Actions column - always visible */}
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayColumns.length + 2} className="p-0">
                    {focusMode === "needs-attention" ? (
                      <TeamEmptyState
                        type="no-attention-needed"
                        onClearFilters={onClearFilters}
                      />
                    ) : (
                      <TeamEmptyState
                        type="no-results"
                        onClearFilters={onClearFilters}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee, index) => {
                  const isSelected = selectedIds.has(employee.id);
                  const stats = employee.requirements_stats || {};
                  const needsAttention = stats.missing_expired > 0 || stats.expiring_soon > 0;

                  return (
                    <TableRow
                      key={employee.id}
                      className={cn(
                        "cursor-pointer transition-all duration-150 group h-[3rem]",
                        "hover:bg-muted/30 hover:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.3)]",
                        isSelected
                          ? "bg-primary/5 hover:bg-primary/10"
                          : stats.missing_expired > 0
                          ? "bg-destructive/[0.04] hover:bg-destructive/[0.08]"
                          : stats.expiring_soon > 0
                          ? "bg-warning/[0.04] hover:bg-warning/[0.08]"
                          : index % 2 === 0
                          ? "bg-card"
                          : "bg-muted/15",
                        focusMode === "needs-attention" && !needsAttention && "opacity-60"
                      )}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelection(employee.id)}
                        />
                      </TableCell>
                      {displayColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          onClick={() => onRowClick(employee)}
                          className={cn(column.id === "status" && "text-center")}
                        >
                          {renderCellContent(column, employee)}
                        </TableCell>
                      ))}
                      {/* Actions column - always visible */}
                      <TableCell>
                        <TeamRowActions
                          employee={employee}
                          onViewProfile={() => onRowClick(employee)}
                          onViewCredentials={() => onRowClick(employee)}
                          onRemove={onRefresh}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Hidden columns indicator - for responsive screens */}
      {hiddenColumnsWithData.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {hiddenColumnsWithData.length} column{hiddenColumnsWithData.length > 1 ? "s" : ""}{" "}
          hidden on this screen size. Click a row to view all details.
        </p>
      )}
    </div>
  );
};
