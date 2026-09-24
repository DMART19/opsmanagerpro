import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2, Settings2, Box } from "lucide-react";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { CacheBox, useBoxes } from "@/hooks/use-boxes";
import { toast } from "@/hooks/use-toast";
import { useDynamicColumns, useResponsiveColumnCount, ColumnDefinition } from "@/hooks/use-dynamic-columns";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DynamicBoxTableProps {
  boxes: CacheBox[];
  isLoading: boolean;
  onView: (box: CacheBox) => void;
  onEdit: (box: CacheBox) => void;
  onDelete: (id: string) => void;
  selectedBoxes: string[];
  onSelectBox: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const DynamicBoxTable = ({
  boxes,
  isLoading,
  onView,
  onEdit,
  onDelete,
  selectedBoxes,
  onSelectBox,
  onSelectAll,
}: DynamicBoxTableProps) => {
  const { customFields } = useCustomFields("cache_boxes");
  const { updateBox } = useBoxes();
  const [editingCell, setEditingCell] = useState<{ boxId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [rowEditValues, setRowEditValues] = useState<Record<string, any>>({});
  const maxColumns = useResponsiveColumnCount();

  // Build column definitions dynamically
  const columnDefinitions = useMemo((): ColumnDefinition<CacheBox>[] => {
    const coreColumns: ColumnDefinition<CacheBox>[] = [
      { 
        id: "box_number", 
        label: "Box Number", 
        priority: 1, 
        required: true,
        accessor: (box) => box.box_number,
        width: "w-[150px]"
      },
      { 
        id: "cache_box_type", 
        label: "Type", 
        priority: 2,
        accessor: (box) => box.cache_box_type,
        width: "w-[150px]"
      },
      { 
        id: "box_description", 
        label: "Description", 
        priority: 3,
        accessor: (box) => box.box_description,
        width: "w-[300px]"
      },
      { 
        id: "status_cache_box", 
        label: "Status", 
        priority: 2,
        accessor: (box) => box.status_cache_box,
        width: "w-[120px]"
      },
      { 
        id: "box_number_alt", 
        label: "Alt Number", 
        priority: 4,
        accessor: (box) => box.box_number_alt,
        width: "w-[120px]"
      },
      { 
        id: "barcode", 
        label: "Barcode", 
        priority: 4,
        accessor: (box) => box.barcode,
        width: "w-[150px]"
      },
      { 
        id: "x_group_display", 
        label: "Group", 
        priority: 4,
        accessor: (box) => box.x_group_display,
        width: "w-[120px]"
      },
    ];

    // Add custom field columns
    const customColumns: ColumnDefinition<CacheBox>[] = customFields.map(cf => ({
      id: cf.field_name,
      label: cf.field_label,
      priority: 5 as const,
      accessor: (box) => (box.custom_data as any)?.[cf.field_name],
      width: "w-[150px]",
    }));

    return [...coreColumns, ...customColumns];
  }, [customFields]);

  // Use the dynamic columns hook
  const {
    columnsWithData,
    visibleColumns,
    userVisibleIds,
    toggleColumn,
    showAllColumns,
    resetToDefaults,
    getResponsiveColumns,
    hiddenColumnsCount,
  } = useDynamicColumns({
    data: boxes,
    columns: columnDefinitions,
    storageKey: "container_table",
  });

  // Get responsive columns
  const displayedColumns = useMemo(() => {
    return getResponsiveColumns(maxColumns);
  }, [getResponsiveColumns, maxColumns]);

  // List of core field IDs for distinguishing from custom fields
  const coreFieldIds = useMemo(() => new Set([
    "box_number", "cache_box_type", "box_description", "status_cache_box",
    "box_number_alt", "barcode", "x_group_display"
  ]), []);

  const handleSaveCell = async (box: CacheBox, fieldKey: string, value: string) => {
    try {
      // Check if it's a core field or custom field
      const isCoreField = coreFieldIds.has(fieldKey);
      
      if (isCoreField) {
        // Update core field directly
        await updateBox.mutateAsync({
          id: box.id,
          [fieldKey]: value || null,
        });
      } else {
        // Update custom_data for custom fields
        const updatedCustomData = {
          ...(box.custom_data || {}),
          [fieldKey]: value || null,
        };
        await updateBox.mutateAsync({
          id: box.id,
          custom_data: updatedCustomData,
        });
      }
      
      toast({
        title: "Success",
        description: "Box updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setEditingCell(null);
  };

  const handleStartRowEdit = (box: CacheBox) => {
    setEditingRow(box.id);
    const values: Record<string, any> = {};
    displayedColumns.forEach(col => {
      values[col.id] = getFieldValue(box, col.id);
    });
    setRowEditValues(values);
  };

  const handleSaveRow = async (box: CacheBox) => {
    try {
      const coreUpdates: any = { id: box.id };
      const customUpdates: any = { ...(box.custom_data || {}) };

      displayedColumns.forEach(col => {
        const isCoreField = coreFieldIds.has(col.id);
        if (isCoreField) {
          coreUpdates[col.id] = rowEditValues[col.id] || null;
        } else {
          customUpdates[col.id] = rowEditValues[col.id] || null;
        }
      });

      await updateBox.mutateAsync({
        ...coreUpdates,
        custom_data: customUpdates,
      });

      toast({
        title: "Success",
        description: "Box updated successfully",
      });
      setEditingRow(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelRowEdit = () => {
    setEditingRow(null);
    setRowEditValues({});
  };

  const getFieldValue = (box: CacheBox, fieldKey: string) => {
    // Check core fields first
    if (fieldKey in box) {
      return (box as any)[fieldKey];
    }
    // Check custom_data
    if (box.custom_data && typeof box.custom_data === 'object') {
      return (box.custom_data as any)[fieldKey];
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "in":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "checked out":
      case "out":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "maintenance":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-3">
      {/* Column Visibility Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedBoxes.length > 0 ? (
            <span className="font-medium text-foreground">
              {selectedBoxes.length} box{selectedBoxes.length !== 1 ? "es" : ""} selected
            </span>
          ) : (
            <span>Showing {boxes.length} boxes</span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Columns
              {hiddenColumnsCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {hiddenColumnsCount} hidden
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Columns</span>
              <span className="text-xs text-muted-foreground font-normal">
                {displayedColumns.length}/{columnsWithData.length}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
                onClick={resetToDefaults}
                className="flex-1 h-7 text-xs"
              >
                Defaults
              </Button>
            </div>
            <DropdownMenuSeparator />
            {columnsWithData.map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={userVisibleIds.has(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
                disabled={col.required}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dynamic Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={boxes.length > 0 && selectedBoxes.length === boxes.length}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              {displayedColumns.map(col => (
                <TableHead key={col.id} className={col.width}>
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={displayedColumns.length + 2} className="text-center py-8 text-muted-foreground">
                  Loading boxes...
                </TableCell>
              </TableRow>
            ) : boxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayedColumns.length + 2} className="p-0">
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="p-5 rounded-2xl bg-primary/10 mb-6">
                      <Box className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No containers created</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Containers help organize assets into pallets, storage locations, or kits.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              boxes.map((box) => {
                const isRowEditing = editingRow === box.id;
                
                return (
                  <TableRow 
                    key={box.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, input, [role="checkbox"]')) return;
                      if (!isRowEditing) onView(box);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedBoxes.includes(box.id)}
                        onCheckedChange={(checked) => onSelectBox(box.id, checked as boolean)}
                        disabled={isRowEditing}
                      />
                    </TableCell>
                    {displayedColumns.map(col => {
                      const value = getFieldValue(box, col.id);
                      const isEditing = editingCell?.boxId === box.id && editingCell?.field === col.id;

                      return (
                        <TableCell
                          key={col.id}
                          className={col.id === "box_description" ? "max-w-[300px] truncate" : ""}
                          onDoubleClick={() => {
                            if (!isRowEditing) {
                              setEditingCell({ boxId: box.id, field: col.id });
                              setEditValue(value || "");
                            }
                          }}
                        >
                          {isRowEditing ? (
                            <Input
                              value={rowEditValues[col.id] || ""}
                              onChange={(e) => setRowEditValues(prev => ({
                                ...prev,
                                [col.id]: e.target.value
                              }))}
                              className="h-8"
                            />
                          ) : isEditing ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              onBlur={() => handleSaveCell(box, col.id, editValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveCell(box, col.id, editValue);
                                } else if (e.key === "Escape") {
                                  setEditingCell(null);
                                }
                              }}
                              className="h-8"
                            />
                          ) : col.id === "status_cache_box" ? (
                            <Badge variant="outline" className={getStatusColor(value)}>
                              {value || "N/A"}
                            </Badge>
                          ) : col.id === "barcode" ? (
                            <span className="font-mono text-xs">{value}</span>
                          ) : (
                            <span>{value}</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      {isRowEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveRow(box)}
                            className="h-8"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelRowEdit}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(box)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartRowEdit(box)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(box.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
