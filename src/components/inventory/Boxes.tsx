import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Upload, Trash2, FileDown, Settings, Download, X } from "lucide-react";
import { useBoxes } from "@/hooks/use-boxes";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddBoxModal } from "./AddBoxModal";
import { BoxDetailsDrawer } from "./BoxDetailsDrawer";
import { ContainersImportWizard } from "./ContainersImportWizard";
import { DynamicBoxTable } from "./DynamicBoxTable";
import { MobileContainerSearchHeader } from "./mobile/MobileContainerSearchHeader";
import { MobileContainerFilterSheet } from "./mobile/MobileContainerFilterSheet";
import { MobileContainerActionsSheet } from "./mobile/MobileContainerActionsSheet";
import { MobileContainerList } from "./mobile/MobileContainerList";
import { MobileAssetFAB } from "./mobile/MobileAssetFAB";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const Boxes = () => {
  const isMobile = useIsMobile();
  const {
    boxes,
    isLoading,
    deleteBox,
    refetch
  } = useBoxes();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

  // Filter boxes
  const filteredBoxes = boxes.filter(box => {
    const matchesSearch = box.box_number.toLowerCase().includes(searchQuery.toLowerCase()) || box.box_number_alt?.toLowerCase().includes(searchQuery.toLowerCase()) || box.box_description?.toLowerCase().includes(searchQuery.toLowerCase()) || box.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || box.cache_box_type === typeFilter;
    const matchesStatus = statusFilter === "all" || box.status_cache_box === statusFilter;
    const matchesGroup = groupFilter === "all" || box.x_group_display === groupFilter;
    return matchesSearch && matchesType && matchesStatus && matchesGroup;
  });

  // Get unique values for filters
  const boxTypes = Array.from(new Set(boxes.map(b => b.cache_box_type).filter(Boolean)));
  const statuses = Array.from(new Set(boxes.map(b => b.status_cache_box).filter(Boolean)));
  const groups = Array.from(new Set(boxes.map(b => b.x_group_display).filter(Boolean)));
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this box?")) {
      deleteBox.mutate(id);
    }
  };
  const handleView = (box: any) => {
    setSelectedBox(box);
    setIsDetailsOpen(true);
  };
  const handleEdit = (box: any) => {
    setSelectedBox(box);
    setIsAddModalOpen(true);
  };
  const handleSelectBox = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedBoxes(prev => [...prev, id]);
    } else {
      setSelectedBoxes(prev => prev.filter(boxId => boxId !== id));
    }
  };
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBoxes(filteredBoxes.map(box => box.id));
    } else {
      setSelectedBoxes([]);
    }
  };
  const handleBatchDelete = async () => {
    if (selectedBoxes.length === 0) return;
    if (!confirm(`Delete ${selectedBoxes.length} selected boxes?`)) return;
    try {
      const {
        error
      } = await supabase.from("cache_boxes").delete().in("id", selectedBoxes);
      if (error) throw error;
      toast({
        title: "Batch delete successful",
        description: `Deleted ${selectedBoxes.length} boxes`
      });
      setSelectedBoxes([]);
      refetch();
    } catch (error: any) {
      toast({
        title: "Batch delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      const dataToExport = selectedBoxes.length > 0 ? boxes.filter(box => selectedBoxes.includes(box.id)) : filteredBoxes;
      const exportData = dataToExport.map(box => ({
        "Box Number": box.box_number,
        "Alt Number": box.box_number_alt || "",
        "Type": box.cache_box_type,
        "Description": box.box_description || "",
        "Barcode": box.barcode || "",
        "Status": box.status_cache_box,
        "Group": box.x_group_display || ""
      }));
      const filename = `containers_export_${new Date().toISOString().split('T')[0]}`;
      if (format === "excel") {
        const {
          createExcelFile
        } = await import("@/lib/excel-utils");
        await createExcelFile(exportData, `${filename}.xlsx`, "Containers");
      } else if (format === "csv") {
        const {
          createCsvFile
        } = await import("@/lib/excel-utils");
        createCsvFile(exportData, `${filename}.csv`);
      } else if (format === "pdf") {
        const jsPDF = (await import("jspdf")).default;
        const doc = new jsPDF({
          orientation: "landscape"
        });
        doc.setFontSize(16);
        doc.text("Containers Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
        doc.text(`Total Containers: ${exportData.length}`, 14, 28);
        let y = 38;
        const pageHeight = doc.internal.pageSize.height;

        // Header
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Box #", 14, y);
        doc.text("Type", 50, y);
        doc.text("Description", 90, y);
        doc.text("Status", 180, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        exportData.forEach(item => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(item["Box Number"]?.substring(0, 15) || "", 14, y);
          doc.text(item["Type"]?.substring(0, 20) || "", 50, y);
          doc.text(item["Description"]?.substring(0, 45) || "", 90, y);
          doc.text(item["Status"] || "", 180, y);
          y += 5;
        });
        doc.save(`${filename}.pdf`);
      }
      toast({
        title: "Export successful",
        description: `Exported ${exportData.length} containers as ${format.toUpperCase()}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDeleteAll = async () => {
    try {
      const {
        error
      } = await supabase.from("cache_boxes").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;
      toast({
        title: "All boxes deleted",
        description: "Successfully deleted all boxes from the database."
      });
      setDeleteAllDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Delete all failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "checked out":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "maintenance":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "internal":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Calculate active filter count for mobile
  const activeFilterCount = [
    typeFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
    groupFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const resetFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setGroupFilter("all");
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <MobileContainerSearchHeader
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsMobileFilterOpen(true)}
          onMoreClick={() => setIsMobileActionsOpen(true)}
          filterCount={activeFilterCount}
        />

        <div className="px-4 pt-2">
          <MobileContainerList
            boxes={filteredBoxes}
            isLoading={isLoading}
            onView={handleView}
            onAddNew={() => setIsAddModalOpen(true)}
          />
        </div>

        {/* Mobile FAB - Container context */}
        <MobileAssetFAB 
          mode="container"
          onAddItem={() => setIsAddModalOpen(true)} 
          onAddContainer={() => setIsAddModalOpen(true)} 
        />

        {/* Mobile Sheets */}
        <MobileContainerFilterSheet
          open={isMobileFilterOpen}
          onOpenChange={setIsMobileFilterOpen}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          groupFilter={groupFilter}
          onGroupChange={setGroupFilter}
          boxTypes={boxTypes}
          statuses={statuses}
          groups={groups}
          onReset={resetFilters}
        />

        <MobileContainerActionsSheet
          open={isMobileActionsOpen}
          onOpenChange={setIsMobileActionsOpen}
          onImport={() => setIsUploadOpen(true)}
          onExportCsv={() => handleExport("csv")}
          onExportExcel={() => handleExport("excel")}
          onExportPdf={() => handleExport("pdf")}
          onDeleteAll={() => setDeleteAllDialogOpen(true)}
          totalCount={boxes.length}
        />

        {/* Modals */}
        <AddBoxModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedBox(null);
          }}
          onCreateAnother={() => { setIsAddModalOpen(false); setSelectedBox(null); setTimeout(() => setIsAddModalOpen(true), 150); }}
          box={selectedBox}
        />

        <BoxDetailsDrawer
          box={selectedBox}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedBox(null);
          }}
        />

        <ContainersImportWizard
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onImported={refetch}
        />

        <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Containers</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete ALL {boxes.length} containers?
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop Layout
  return <>
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Containers</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage containers, boxes, and documentation
              </p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsUploadOpen(true)} variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Import Spreadsheet
              </Button>
              {selectedBoxes.length > 0 && <Button variant="destructive" size="sm" onClick={handleBatchDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedBoxes.length}
                </Button>}
              <Button variant="outline" size="sm" onClick={() => setDeleteAllDialogOpen(true)} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
              
              <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Container
              </Button>
            </div>
          </div>

          {/* Search and Filters - only render dropdowns for fields with data */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search containers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {/* Container Type - only shown when >1 distinct types exist */}
            {boxTypes.length > 1 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Container Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {boxTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Status - only shown when >1 distinct statuses exist */}
            {statuses.length > 1 && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Group - only shown when >1 distinct groups exist */}
            {groups.length > 1 && (
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map(group => <SelectItem key={group} value={group}>{group}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Clear filters button - only when filters are active */}
            {(typeFilter !== "all" || statusFilter !== "all" || groupFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setGroupFilter("all"); }} className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredBoxes.length} of {boxes.length} containers
          </div>

          {/* Dynamic Table */}
          <DynamicBoxTable boxes={filteredBoxes} isLoading={isLoading} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} selectedBoxes={selectedBoxes} onSelectBox={handleSelectBox} onSelectAll={handleSelectAll} />
        </div>
      </Card>

      <AddBoxModal isOpen={isAddModalOpen} onClose={() => {
      setIsAddModalOpen(false);
      setSelectedBox(null);
    }} onCreateAnother={() => { setIsAddModalOpen(false); setSelectedBox(null); setTimeout(() => setIsAddModalOpen(true), 150); }} box={selectedBox} />

      <BoxDetailsDrawer box={selectedBox} isOpen={isDetailsOpen} onClose={() => {
      setIsDetailsOpen(false);
      setSelectedBox(null);
    }} />

      <ContainersImportWizard open={isUploadOpen} onOpenChange={setIsUploadOpen} onImported={refetch} />

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Boxes from Cache Box Management</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL {boxes.length} boxes from the cache box database? 
              This action is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All Boxes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};