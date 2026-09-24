import { useMemo, useState, useEffect } from "react";
import { Settings2, Eye, Pencil, FileText, Users, AlertTriangle, XCircle, ChevronDown, RefreshCw, Calendar, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDynamicCredentialsColumns, CredentialColumn } from "@/hooks/use-dynamic-credentials-columns";

interface DynamicCredentialsTableProps {
  requirements: any[];
  onRowClick: (requirement: any) => void;
  onRowClickWithFilter?: (requirement: any, filter: string) => void;
  onEdit: (requirement: any) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete?: (requirement: any) => void;
}

export const DynamicCredentialsTable = ({
  requirements,
  onRowClick,
  onRowClickWithFilter,
  onEdit,
  onToggleActive,
  onDelete,
}: DynamicCredentialsTableProps) => {
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  // Track screen width for responsive columns
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    columnsWithData,
    visibleColumnIds,
    toggleColumn,
    showAllColumns,
    showDefaultColumns,
    getResponsiveColumns,
    hiddenColumnsCount,
  } = useDynamicCredentialsColumns({ requirements });

  // Calculate max columns based on screen width
  const maxColumns = useMemo(() => {
    if (screenWidth < 768) return 3;
    if (screenWidth < 1024) return 5;
    if (screenWidth < 1280) return 7;
    return undefined; // No limit on large screens
  }, [screenWidth]);

  // Get columns to display
  const displayColumns = useMemo(() => {
    return getResponsiveColumns(maxColumns);
  }, [getResponsiveColumns, maxColumns]);

  // Render cell content based on column type
  const renderCellContent = (column: CredentialColumn, req: any) => {
    switch (column.id) {
      case "title":
        return (
          <span className="font-medium max-w-xs truncate block">
            {req.title}
          </span>
        );

      case "type":
        if (!req.requirement_type) return null;
        return (
          <Badge variant="outline" className="text-xs">
            {req.requirement_type}
          </Badge>
        );


      case "total":
        const total = req.xTOTotal || 0;
        if (total === 0) return null;
        return <span className="text-sm">{total}</span>;

      case "current":
        const current = req.xCurrentTotal || 0;
        if (current === 0) return null;
        return <span className="text-sm text-green-600 font-medium">{current}</span>;

      case "expired":
        const expired = req.xExpiredTotal || 0;
        if (expired === 0) return null;
        return <span className="text-sm text-red-600 font-medium">{expired}</span>;

      case "missing":
        const missing = req.xMissingTotal || 0;
        if (missing === 0) return null;
        return <span className="text-sm text-orange-600 font-medium">{missing}</span>;

      case "renewal":
        const value = column.accessor(req);
        if (!value) return null;
        return <span className="text-sm text-muted-foreground">{value}</span>;

      case "sort":
        if (req.sort_key === null || req.sort_key === undefined) return null;
        return <span className="text-sm font-mono">{req.sort_key}</span>;

      case "active":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={req.is_active}
              onCheckedChange={() => onToggleActive(req.id, req.is_active)}
            />
          </div>
        );

      case "actions":
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRowClick(req)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View assignments</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(req)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit credential</TooltipContent>
            </Tooltip>
            {onDelete && (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(req)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete credential</TooltipContent>
              </Tooltip>
            )}
          </div>
        );

      default:
        // Custom attribute columns
        if (column.isCustomAttribute) {
          const attrValue = req.custom_data?.[column.attributeId!];
          if (!attrValue) return null;
          return <span className="text-sm">{attrValue}</span>;
        }
        return null;
    }
  };

  // Count hidden columns with data (for responsive indicator)
  const hiddenColumnsWithData = columnsWithData.filter(
    (col) => !displayColumns.some((dc) => dc.id === col.id)
  );

  // Empty state
  if (requirements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No credentials match your current filters.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Column visibility control - only show if there are optional columns */}
      {columnsWithData.length > 3 && (
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
                  disabled={column.isRequired}
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

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {displayColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "font-semibold",
                      column.width,
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right"
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req, index) => (
                <TableRow
                  key={req.id}
                  className={cn(
                    "cursor-pointer transition-all duration-150 group",
                    "hover:bg-accent/50 hover:shadow-sm",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                  onClick={() => onRowClick(req)}
                >
                  {displayColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right"
                      )}
                    >
                      {renderCellContent(column, req)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tablet View (Medium screens) */}
      <div className="hidden md:block lg:hidden rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {displayColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "font-semibold text-xs",
                      column.width,
                      column.align === "center" && "text-center"
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req, index) => (
                <TableRow
                  key={req.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    "hover:bg-accent/50",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                  onClick={() => onRowClick(req)}
                >
                  {displayColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        "py-3",
                        column.align === "center" && "text-center"
                      )}
                    >
                      {renderCellContent(column, req)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View — expandable, purpose-built */}
      <div className="md:hidden space-y-2">
        {requirements.map((req) => (
          <MobileCredentialCard
            key={req.id}
            req={req}
            onRowClick={onRowClick}
            onRowClickWithFilter={onRowClickWithFilter}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

/** Expandable mobile credential card */
const MobileCredentialCard = ({
  req,
  onRowClick,
  onRowClickWithFilter,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  req: any;
  onRowClick: (r: any) => void;
  onRowClickWithFilter?: (r: any, filter: string) => void;
  onEdit: (r: any) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete?: (r: any) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasStats = req.xTOTotal > 0 || req.xCurrentTotal > 0 || req.xExpiredTotal > 0 || req.xMissingTotal > 0;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Summary row — always visible */}
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] leading-tight truncate">
            {req.title}
          </h3>
          {/* Compact inline stats */}
          {hasStats && (
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="text-muted-foreground">
                <Users className="inline h-3 w-3 mr-0.5 -mt-px" />
                {req.xCurrentTotal || 0}
              </span>
              {(req.xMissingTotal || 0) > 0 && (
                <span className="text-warning font-medium">
                  <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-px" />
                  {req.xMissingTotal}
                </span>
              )}
              {(req.xExpiredTotal || 0) > 0 && (
                <span className="text-destructive font-medium">
                  <XCircle className="inline h-3 w-3 mr-0.5 -mt-px" />
                  {req.xExpiredTotal}
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded detail — progressive disclosure */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t animate-fade-in">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {req.requirement_type && (
              <Badge variant="outline" className="text-xs">
                {req.requirement_type}
              </Badge>
            )}
            {req.is_general && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                All Members
              </Badge>
            )}
            {!req.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
            {req.has_expiration && req.renewal_cycle_months && (
              <Badge variant="outline" className="text-xs gap-1">
                <RefreshCw className="h-3 w-3" />
                Every {req.renewal_cycle_months}mo
              </Badge>
            )}
          </div>

          {/* Description */}
          {req.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {req.description}
            </p>
          )}

          {/* Tappable relational stats */}
          {hasStats && (
            <div className="grid grid-cols-3 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="flex flex-col items-center p-2.5 rounded-lg bg-muted/40 hover:bg-accent transition-colors"
                onClick={() => onRowClickWithFilter?.(req, "all") ?? onRowClick(req)}
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                <div className="font-semibold text-foreground">{req.xCurrentTotal || 0}</div>
                <div className="text-muted-foreground text-[10px]">Assigned</div>
              </button>
              <button
                type="button"
                className="flex flex-col items-center p-2.5 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors"
                onClick={() => onRowClickWithFilter?.(req, "missing") ?? onRowClick(req)}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-warning mb-0.5" />
                <div className="font-semibold text-warning">{req.xMissingTotal || 0}</div>
                <div className="text-muted-foreground text-[10px]">Missing</div>
              </button>
              <button
                type="button"
                className="flex flex-col items-center p-2.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors"
                onClick={() => onRowClickWithFilter?.(req, "expired") ?? onRowClick(req)}
              >
                <XCircle className="h-3.5 w-3.5 text-destructive mb-0.5" />
                <div className="font-semibold text-destructive">{req.xExpiredTotal || 0}</div>
                <div className="text-muted-foreground text-[10px]">Expired</div>
              </button>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs min-w-0"
              onClick={() => onRowClick(req)}
            >
              <Eye className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">View Members</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => onEdit(req)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive border-destructive/30"
                onClick={() => onDelete(req)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <div className="ml-auto">
              <Switch
                checked={req.is_active}
                onCheckedChange={() => onToggleActive(req.id, req.is_active)}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
