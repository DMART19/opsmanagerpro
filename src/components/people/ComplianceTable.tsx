import { useMemo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle, XCircle, ShieldCheck, Plus, Upload, Users, Bell, CircleDot, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { useRequirementsData } from "@/hooks/use-requirements-data";
import { Skeleton } from "@/components/ui/skeleton";
import { AddRequirementModal } from "./AddRequirementModal";
import { FlexibleRequirementsUpload } from "./FlexibleRequirementsUpload";
import { CredentialDetailDrawer } from "./CredentialDetailDrawer";
import { InlineAssignMembersPopover } from "./InlineAssignMembersPopover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ComplianceTableProps {
  onCredentialClick?: (credentialId: string) => void;
}

export const ComplianceTable = ({ onCredentialClick }: ComplianceTableProps) => {
  const { requirements, loading, refetch } = useRequirementsData();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [assignMissingTarget, setAssignMissingTarget] = useState<any>(null);
  const [assignMissingFilter, setAssignMissingFilter] = useState<string | undefined>(undefined);

  const rows = useMemo(() => {
    return requirements.map((req) => {
      const total = req.xTOTotal || 0;
      const compliant = req.xCurrentTotal || 0;
      const expired = req.xExpiredTotal || 0;
      const missing = req.xMissingTotal || 0;
      const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;
      return { ...req, total, compliant, expired, missing, rate };
    }).sort((a, b) => a.rate - b.rate);
  }, [requirements]);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))
    );
  }, [rows]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      // Chunk to avoid PostgREST URL length limits (Bad Request on large .in() lists)
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { error: assignErr } = await supabase
          .from("employee_requirements")
          .delete()
          .in("requirement_id", slice);
        if (assignErr) throw assignErr;

        const { error } = await supabase
          .from("requirement_definitions")
          .delete()
          .in("id", slice);
        if (error) throw error;
      }

      toast.success(`${ids.length} credential${ids.length > 1 ? "s" : ""} deleted`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRowClick = (row: any) => {
    setSelectedCredential(row);
    setDetailDrawerOpen(true);
    onCredentialClick?.(row.id);
  };

  const handleEdit = (row: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRequirement(row);
    setAddModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Delete assignments first
      await supabase
        .from("employee_requirements")
        .delete()
        .eq("requirement_id", deleteTarget.id);

      const { error } = await supabase
        .from("requirement_definitions")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4" style={{ boxShadow: "var(--shadow-metric)" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-2 w-24" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    const steps = [
      {
        number: 1,
        title: "Create Credential Type",
        description: "Define what credentials your team needs — like Forklift License, CPR, or Safety Training.",
        icon: ShieldCheck,
        action: (
          <Button onClick={() => setAddModalOpen(true)} className="gap-2 mt-3">
            <Plus className="h-4 w-4" />
            Create Credential Type
          </Button>
        ),
        active: true,
      },
      {
        number: 2,
        title: "Assign Credentials to Members",
        description: "Link credentials to team members and set expiration dates.",
        icon: Users,
        active: false,
      },
      {
        number: 3,
        title: "Monitor Expirations & Alerts",
        description: "Track compliance status and get notified before credentials expire.",
        icon: Bell,
        active: false,
      },
    ];

    return (
      <>
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-metric)" }}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/40">
            <h3 className="text-lg font-semibold text-foreground">Set Up Compliance Tracking</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Follow these steps to start tracking your team's credentials.
            </p>
          </div>

          {/* Steps */}
          <div className="divide-y divide-border/30">
            {steps.map((step) => (
              <div
                key={step.number}
                className={cn(
                  "flex gap-4 px-6 py-5 transition-colors",
                  step.active ? "bg-primary/[0.03]" : "opacity-50"
                )}
              >
                {/* Step indicator */}
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  step.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step.number}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <step.icon className={cn("h-4 w-4 shrink-0", step.active ? "text-primary" : "text-muted-foreground")} />
                    <h4 className={cn("text-sm font-medium", step.active ? "text-foreground" : "text-muted-foreground")}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  {step.action && step.action}
                </div>
              </div>
            ))}
          </div>

          {/* Import alternative */}
          <div className="px-6 py-4 border-t border-border/40 bg-muted/30">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Or import credential types from a spreadsheet
            </button>
          </div>
        </div>

        <AddRequirementModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSuccess={() => refetch()}
        />
        <FlexibleRequirementsUpload
          open={importOpen}
          onOpenChange={setImportOpen}
          onImportComplete={() => refetch()}
        />
      </>
    );
  }

  return (
    <>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 animate-fade-in">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} credential{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 ml-auto"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-metric)" }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/90 backdrop-blur-sm sticky top-0 z-10 border-b border-border/60">
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground/80 text-xs uppercase tracking-wider min-w-[200px]">
                  Credential
                </TableHead>
                <TableHead className="font-semibold text-foreground/80 text-xs uppercase tracking-wider w-24 text-center">
                  Assigned
                </TableHead>
                <TableHead className="font-semibold text-foreground/80 text-xs uppercase tracking-wider w-24 text-center">
                  <span className="text-success">Compliant</span>
                </TableHead>
                <TableHead className="font-semibold text-foreground/80 text-xs uppercase tracking-wider w-24 text-center">
                  <span className="text-destructive">Expired</span>
                </TableHead>
                <TableHead className="font-semibold text-foreground/80 text-xs uppercase tracking-wider w-24 text-center">
                  <span className="text-warning">Missing</span>
                </TableHead>
                <TableHead className="font-semibold text-foreground/80 text-xs uppercase tracking-wider w-44">
                  Compliance %
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const hasIssues = row.expired > 0 || row.missing > 0;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer transition-all duration-150 group h-[4.25rem]",
                      "hover:bg-muted/30 hover:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.3)]",
                      index % 2 === 0 ? "bg-card" : "bg-muted/15"
                    )}
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell className="pl-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          hasIssues ? "bg-destructive/10" : "bg-success/10"
                        )}>
                          {hasIssues ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                            {row.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {row.category && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {row.category}
                              </Badge>
                            )}
                            <Badge
                              variant={row.is_required ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {row.is_required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium tabular-nums">{row.total}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          row.compliant > 0 ? "text-success cursor-pointer hover:underline" : "text-muted-foreground"
                        )}
                        onClick={row.compliant > 0 ? (e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedCredential(row);
                          setAssignMissingFilter(undefined);
                          setDetailDrawerOpen(true);
                        } : undefined}
                      >
                        {row.compliant}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.expired > 0 ? (
                        <Badge
                          variant="destructive"
                          className="text-xs tabular-nums cursor-pointer hover:bg-destructive/90 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCredential(row);
                            setAssignMissingFilter("expired");
                            setDetailDrawerOpen(true);
                          }}
                        >
                          {row.expired}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground tabular-nums">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.missing > 0 ? (
                        <Badge
                          className="text-xs tabular-nums bg-warning/15 text-warning border-warning/30 hover:bg-warning/25 cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCredential(row);
                            setAssignMissingFilter("missing");
                            setDetailDrawerOpen(true);
                          }}
                        >
                          {row.missing}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground tabular-nums">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Progress
                          value={row.rate}
                          className={cn(
                            "h-2 flex-1",
                            row.rate >= 90 ? "[&>div]:bg-success" :
                            row.rate >= 70 ? "[&>div]:bg-warning" :
                            "[&>div]:bg-destructive"
                          )}
                        />
                        <span className={cn(
                          "text-sm font-bold tabular-nums w-12 text-right",
                          row.rate >= 90 ? "text-success" :
                          row.rate >= 70 ? "text-warning" :
                          "text-destructive"
                        )}>
                          {row.rate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {(row.missing > 0 || row.expired > 0) && (
                          <InlineAssignMembersPopover
                            credential={row}
                            alreadyAssignedIds={[]}
                            onSuccess={refetch}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                            >
                              <UserPlus className="h-3 w-3" />
                              Assign
                            </Button>
                          </InlineAssignMembersPopover>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEdit(row, e as any)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(row);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Credential Detail Drawer */}
      <CredentialDetailDrawer
        credential={selectedCredential}
        open={detailDrawerOpen}
        onOpenChange={(open) => {
          setDetailDrawerOpen(open);
          if (!open) {
            setSelectedCredential(null);
            setAssignMissingTarget(null);
            setAssignMissingFilter(undefined);
            refetch();
          }
        }}
        onRefresh={refetch}
        initialFilter={assignMissingFilter as any}
      />

      {/* Edit Modal */}
      <AddRequirementModal
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setEditingRequirement(null);
        }}
        onSuccess={() => {
          refetch();
          setEditingRequirement(null);
        }}
        editingRequirement={editingRequirement}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credential type?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
              This will also remove all team member assignments for this credential. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} credential{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected credential types and remove all team member assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
