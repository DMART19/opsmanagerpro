import { useState } from "react";
import { Plus, Upload, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FlexibleRequirementsUpload } from "./FlexibleRequirementsUpload";
import { MobileTeamFAB } from "./mobile/MobileTeamFAB";
import { AddRequirementModal } from "./AddRequirementModal";
import { CredentialDetailDrawer } from "./CredentialDetailDrawer";
import { DynamicCredentialsTable } from "./DynamicCredentialsTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequirementsData } from "@/hooks/use-requirements-data";
import { useTourMode } from "@/contexts/TourModeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const RequirementsLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteOneDialogOpen, setDeleteOneDialogOpen] = useState(false);
  const [deletingOne, setDeletingOne] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [drawerInitialFilter, setDrawerInitialFilter] = useState<string | undefined>(undefined);

  const { requirements, loading, refetch, isDemoMode } = useRequirementsData();

  const filteredRequirements = requirements.filter((req) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      req.title?.toLowerCase().includes(query) ||
      req.requirement_type?.toLowerCase().includes(query);

    const matchesType = typeFilter === "all" || req.requirement_type === typeFilter;
    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "yes" && req.is_active) ||
      (activeFilter === "no" && !req.is_active);

    return matchesSearch && matchesType && matchesActive;
  });

  const uniqueTypes: string[] = Array.from(
    new Set(
      (requirements as Array<{ requirement_type?: string | null }>)
        .map((r) => r.requirement_type)
        .filter((t): t is string => typeof t === 'string' && t.length > 0)
    )
  );

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (isDemoMode) {
      toast.success(`Requirement ${!currentStatus ? "activated" : "deactivated"}`);
      return;
    }
    try {
      const { error } = await supabase
        .from("requirement_definitions")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Requirement ${!currentStatus ? "activated" : "deactivated"}`);
      refetch();
    } catch (error: any) {
      toast.error("Failed to update requirement", {
        description: error.message,
      });
    }
  };

  const handleDeleteAll = async () => {
    if (isDemoMode) {
      toast.success("All requirements deleted (demo)");
      setDeleteAllDialogOpen(false);
      return;
    }
    setDeletingAll(true);
    try {
      const { error } = await supabase
        .from("requirement_definitions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      toast.success("All requirements deleted successfully");
      refetch();
      setDeleteAllDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to delete all requirements", {
        description: error.message,
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteOne = async () => {
    if (!deleteTarget) return;
    if (isDemoMode) {
      toast.success("Credential deleted (demo)");
      setDeleteOneDialogOpen(false);
      setDeleteTarget(null);
      return;
    }
    setDeletingOne(true);
    try {
      // Delete associated employee_requirements first
      await supabase
        .from("employee_requirements")
        .delete()
        .eq("requirement_id", deleteTarget.id);

      const { error } = await supabase
        .from("requirement_definitions")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast.success(`"${deleteTarget.title}" deleted successfully`);
      refetch();
      setDeleteOneDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error("Failed to delete credential", {
        description: error.message,
      });
    } finally {
      setDeletingOne(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Credentials Library</h2>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Define reusable credentials here, then assign them to team members.
            </p>
          </div>
          {/* Desktop action buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 bg-background"
              onClick={() => setImportModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Import Spreadsheet
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteAllDialogOpen(true)}
                  disabled={requirements.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">Remove all credential definitions</p>
                <p className="text-xs text-muted-foreground">This won't delete team members.</p>
              </TooltipContent>
            </Tooltip>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingRequirement(null);
                setAddModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Credential
            </Button>
          </div>
          {/* Mobile: single primary action + overflow */}
          <div className="flex sm:hidden items-center gap-2 w-full">
            <Button
              className="gap-2 flex-1"
              onClick={() => {
                setEditingRequirement(null);
                setAddModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Credential
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-background flex-shrink-0"
              onClick={() => setImportModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => setDeleteAllDialogOpen(true)}
              disabled={requirements.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters - stacked on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Input
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background w-full sm:w-64"
          />
          <div className="flex gap-2">
            {/* Type filter - only show if there are multiple types */}
            {uniqueTypes.length > 0 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-background flex-1 sm:w-40 sm:flex-initial">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Active filter */}
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="bg-background flex-1 sm:w-36 sm:flex-initial">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Active Only</SelectItem>
                <SelectItem value="no">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <DynamicCredentialsTable
          requirements={filteredRequirements}
          onRowClick={(req) => {
            setSelectedCredential(req);
            setDrawerInitialFilter(undefined);
            setDetailDrawerOpen(true);
          }}
          onRowClickWithFilter={(req, filter) => {
            setSelectedCredential(req);
            setDrawerInitialFilter(filter);
            setDetailDrawerOpen(true);
          }}
          onEdit={(req) => {
            setEditingRequirement(req);
            setAddModalOpen(true);
          }}
          onToggleActive={toggleActive}
          onDelete={(req) => {
            setDeleteTarget(req);
            setDeleteOneDialogOpen(true);
          }}
        />
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        Showing {filteredRequirements.length} of {requirements.length} credentials
      </div>

      <FlexibleRequirementsUpload
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={refetch}
      />

      <AddRequirementModal
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setEditingRequirement(null);
        }}
        onSuccess={refetch}
        editingRequirement={editingRequirement}
      />

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all{" "}
              <strong>{requirements.length} credentials</strong> from the database,
              including all associated team member records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? "Deleting..." : "Delete All Credentials"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOneDialogOpen} onOpenChange={setDeleteOneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credential?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? 
              This will also remove all team member assignments for this credential. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOne}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOne}
              disabled={deletingOne}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingOne ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CredentialDetailDrawer
        credential={selectedCredential}
        open={detailDrawerOpen}
        onOpenChange={(open) => {
          setDetailDrawerOpen(open);
          if (!open) {
            setSelectedCredential(null);
            setDrawerInitialFilter(undefined);
          }
        }}
        onRefresh={refetch}
        initialFilter={drawerInitialFilter as any}
      />

      {/* Mobile FAB for adding credentials */}
      <MobileTeamFAB
        label="Add Credential"
        onAction={() => {
          setEditingRequirement(null);
          setAddModalOpen(true);
        }}
      />
    </Card>
  );
};
