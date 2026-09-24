/**
 * FeatureFlagsPanel — Enterprise-grade feature flag management.
 * Summary cards · Toolbar with filters · Rich table · Detail drawer · Lifecycle management.
 */

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags, useWorkspaceFlagOverrides, FeatureFlag } from "@/hooks/use-feature-flags";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  ToggleLeft,
  Plus,
  Search,
  Trash2,
  Building2,
  FlaskConical,
  Shield,
  Sparkles,
  CheckCircle2,
  MoreHorizontal,
  Copy,
  CalendarClock,
  Archive,
  Eye,
  Pencil,
  Target,
  History,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Power,
  PowerOff,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ───
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  beta: { label: "Beta", icon: FlaskConical, bg: "bg-primary/8", text: "text-primary" },
  experimental: { label: "Experimental", icon: Sparkles, bg: "bg-purple-500/8", text: "text-purple-600 dark:text-purple-400" },
  admin: { label: "Admin", icon: Shield, bg: "bg-warning/8", text: "text-warning" },
  general: { label: "General", icon: ToggleLeft, bg: "bg-muted/60", text: "text-muted-foreground" },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; icon: React.ElementType }> = {
  active: { label: "Active", dot: "bg-foreground/40", bg: "bg-muted/50", text: "text-foreground/70", icon: Power },
  enabled: { label: "Enabled", dot: "bg-success", bg: "bg-success/8", text: "text-success", icon: CheckCircle2 },
  disabled: { label: "Disabled", dot: "bg-muted-foreground/30", bg: "bg-muted/30", text: "text-muted-foreground/60", icon: PowerOff },
  scheduled: { label: "Scheduled", dot: "bg-primary", bg: "bg-primary/8", text: "text-primary", icon: CalendarClock },
  archived: { label: "Archived", dot: "bg-muted-foreground/20", bg: "bg-muted/20", text: "text-muted-foreground/40", icon: Archive },
  deprecated: { label: "Deprecated", dot: "bg-warning", bg: "bg-warning/8", text: "text-warning", icon: AlertTriangle },
};

const ENVIRONMENTS = ["production", "staging", "development"] as const;
const ENV_COLORS: Record<string, string> = {
  production: "bg-success/8 text-success border-success/20",
  staging: "bg-primary/8 text-primary border-primary/20",
  development: "bg-muted/60 text-muted-foreground border-border",
};

const getCategoryConfig = (cat: string) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;

const deriveFlagStatus = (flag: FeatureFlag) => {
  if (flag.status === "archived") return "archived";
  if (flag.status === "deprecated") return "deprecated";
  if (flag.scheduled_at && isAfter(new Date(flag.scheduled_at), new Date())) return "scheduled";
  if (flag.is_enabled) return "enabled";
  return "disabled";
};

const PAGE_SIZE = 15;

export const FeatureFlagsPanel = () => {
  const queryClient = useQueryClient();
  const { data: flags, isLoading } = useFeatureFlags();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FeatureFlag | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);

  const [newFlag, setNewFlag] = useState({
    flag_key: "", name: "", description: "", category: "general",
    environment: "production", owner: "",
  });

  // ─── Derived Metrics ───
  const metrics = useMemo(() => {
    const all = flags || [];
    const enabled = all.filter(f => f.is_enabled && f.status !== "archived");
    const disabled = all.filter(f => !f.is_enabled && f.status !== "archived");
    const scheduled = all.filter(f => f.scheduled_at && isAfter(new Date(f.scheduled_at), new Date()));
    const experimental = all.filter(f => f.category === "experimental");
    const needsReview = all.filter(f => {
      if (f.expires_at && isBefore(new Date(f.expires_at), new Date())) return true;
      if (f.status === "deprecated") return true;
      return false;
    });
    return { total: all.length, enabled: enabled.length, disabled: disabled.length, scheduled: scheduled.length, experimental: experimental.length, needsReview: needsReview.length };
  }, [flags]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    return (flags || []).filter(f => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (environmentFilter !== "all" && (f.environment || "production") !== environmentFilter) return false;

      const status = deriveFlagStatus(f);
      if (statusFilter === "needs_review") {
        const expired = f.expires_at && isBefore(new Date(f.expires_at), new Date());
        if (!expired && f.status !== "deprecated") return false;
      } else if (statusFilter !== "all" && status !== statusFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.flag_key.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || (f.owner || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [flags, search, categoryFilter, statusFilter, environmentFilter]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // ─── Handlers ───
  const handleToggleGlobal = async (flag: FeatureFlag) => {
    const newValue = !flag.is_enabled;
    const { error } = await supabase
      .from("feature_flags")
      .update({ is_enabled: newValue, updated_at: new Date().toISOString() } as any)
      .eq("id", flag.id);
    if (error) { toast.error("Failed to toggle flag"); return; }
    toast.success(`${flag.name} ${newValue ? "enabled" : "disabled"}`);
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    queryClient.invalidateQueries({ queryKey: ["feature-flag", flag.flag_key] });
  };

  const handleCreate = async () => {
    if (!newFlag.flag_key || !newFlag.name) { toast.error("Key and name are required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("feature_flags")
      .insert({
        flag_key: newFlag.flag_key, name: newFlag.name,
        description: newFlag.description || null, category: newFlag.category,
        is_enabled: false, rollout_percentage: 0, created_by: user?.id || null,
        environment: newFlag.environment, owner: newFlag.owner || null,
      } as any);
    if (error) { toast.error(error.message.includes("duplicate") ? "Flag key already exists" : "Failed to create flag"); return; }
    toast.success("Feature flag created");
    setCreateOpen(false);
    setNewFlag({ flag_key: "", name: "", description: "", category: "general", environment: "production", owner: "" });
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  const handleDelete = async (flag: FeatureFlag) => {
    const { error } = await supabase.from("feature_flags").delete().eq("id", flag.id);
    if (error) { toast.error("Failed to delete flag"); return; }
    toast.success(`Deleted ${flag.name}`);
    setDeleteConfirm(null); setDrawerOpen(false); setSelectedFlag(null);
    const next = new Set(selectedIds); next.delete(flag.id); setSelectedIds(next);
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  const handleArchive = async (flag: FeatureFlag) => {
    const { error } = await supabase.from("feature_flags")
      .update({ status: "archived", is_enabled: false, updated_at: new Date().toISOString() } as any)
      .eq("id", flag.id);
    if (error) { toast.error("Failed to archive"); return; }
    toast.success(`${flag.name} archived`);
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  const handleDuplicate = async (flag: FeatureFlag) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("feature_flags").insert({
      flag_key: `${flag.flag_key}_copy`, name: `${flag.name} (Copy)`,
      description: flag.description, category: flag.category,
      is_enabled: false, rollout_percentage: 0, created_by: user?.id || null,
      environment: flag.environment || "production", owner: flag.owner || null,
    } as any);
    if (error) { toast.error("Failed to duplicate"); return; }
    toast.success("Flag duplicated");
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) { toast.error("Select flags first"); return; }
    const ids = Array.from(selectedIds);
    let updatePayload: any = {};
    if (action === "enable") updatePayload = { is_enabled: true, updated_at: new Date().toISOString() };
    else if (action === "disable") updatePayload = { is_enabled: false, updated_at: new Date().toISOString() };
    else if (action === "archive") updatePayload = { status: "archived", is_enabled: false, updated_at: new Date().toISOString() };
    else return;
    const { error } = await supabase.from("feature_flags").update(updatePayload as any).in("id", ids);
    if (error) { toast.error("Bulk action failed"); return; }
    toast.success(`${action} applied to ${ids.length} flags`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === paginated.length ? new Set() : new Set(paginated.map(f => f.id)));
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const hasActiveFilters = search || categoryFilter !== "all" || statusFilter !== "all" || environmentFilter !== "all";
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setEnvironmentFilter("all"); setCurrentPage(0); };

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: Hash, label: "Total Flags", value: metrics.total, variant: "default" as const, action: () => { setStatusFilter("all"); setCategoryFilter("all"); } },
          { icon: CheckCircle2, label: "Enabled", value: metrics.enabled, variant: "success" as const, action: () => setStatusFilter("enabled") },
          { icon: PowerOff, label: "Disabled", value: metrics.disabled, variant: "default" as const, action: () => setStatusFilter("disabled") },
          { icon: CalendarClock, label: "Scheduled", value: metrics.scheduled, variant: "info" as const, action: () => setStatusFilter("scheduled") },
          { icon: AlertTriangle, label: "Needs Review", value: metrics.needsReview, variant: (metrics.needsReview > 0 ? "warning" : "default") as any, action: () => setStatusFilter("needs_review") },
          { icon: FlaskConical, label: "Experimental", value: metrics.experimental, variant: "accent" as const, action: () => { setCategoryFilter("experimental"); setStatusFilter("all"); } },
        ].map((card, i) => (
          <SummaryCard key={card.label} {...card} onClick={card.action} index={i} isActive={
            (card.label === "Enabled" && statusFilter === "enabled") ||
            (card.label === "Disabled" && statusFilter === "disabled") ||
            (card.label === "Scheduled" && statusFilter === "scheduled") ||
            (card.label === "Needs Review" && statusFilter === "needs_review") ||
            (card.label === "Experimental" && categoryFilter === "experimental")
          } />
        ))}
      </div>

      {/* ─── Toolbar ─── */}
      <Card className="overflow-visible">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search flags, keys, owners…"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(0); }}
                className="pl-9 bg-muted/30 border-transparent focus:border-border focus:bg-card transition-colors"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[135px] bg-muted/30 border-transparent data-[state=open]:border-border"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[135px] bg-muted/30 border-transparent data-[state=open]:border-border"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={environmentFilter} onValueChange={v => { setEnvironmentFilter(v); setCurrentPage(0); }}>
                <SelectTrigger className="w-[135px] bg-muted/30 border-transparent data-[state=open]:border-border"><SelectValue placeholder="Environment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Envs</SelectItem>
                  {ENVIRONMENTS.map(e => (
                    <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-9 px-2" onClick={clearFilters}>
                  Clear
                </Button>
              )}

              <AnimatePresence>
                {selectedIds.size > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 h-9 border-primary/30 text-primary">
                          <ListFilter className="h-3.5 w-3.5" />
                          {selectedIds.size} selected
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleBulkAction("enable")}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-success" /> Enable All
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction("disable")}>
                          <PowerOff className="h-4 w-4 mr-2" /> Disable All
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBulkAction("archive")} className="text-destructive focus:text-destructive">
                          <Archive className="h-4 w-4 mr-2" /> Archive All
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0 h-9 shadow-sm">
              <Plus className="h-4 w-4" /> New Flag
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Table ─── */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            hasActiveFilters ? (
              <div className="py-20 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-medium text-foreground/70">No flags match your filters</h3>
                <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">Try adjusting your search or clearing the active filters.</p>
                <Button variant="outline" size="sm" className="mt-5" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                  <ToggleLeft className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No feature flags yet</h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Create your first flag to control feature rollout across the platform.
                </p>
                <Button onClick={() => setCreateOpen(true)} className="mt-5 gap-2 shadow-sm">
                  <Plus className="h-4 w-4" /> Create First Flag
                </Button>
              </div>
            )
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="w-12 pl-4">
                        <Checkbox
                          checked={selectedIds.size === paginated.length && paginated.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Env</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((flag, idx) => {
                      const cat = getCategoryConfig(flag.category);
                      const status = deriveFlagStatus(flag);
                      const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.disabled;
                      const isSelected = selectedIds.has(flag.id);
                      const envColor = ENV_COLORS[flag.environment || "production"] || ENV_COLORS.development;

                      return (
                        <TableRow
                          key={flag.id}
                          className={cn(
                            "group cursor-pointer transition-all duration-150",
                            isSelected && "bg-primary/[0.03]",
                            status === "archived" && "opacity-50",
                          )}
                          onClick={() => { setSelectedFlag(flag); setDrawerOpen(true); }}
                        >
                          <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(flag.id)} />
                          </TableCell>

                          {/* Flag name */}
                          <TableCell className="py-3">
                            <div className="min-w-[180px]">
                              <p className="text-[13px] font-medium text-foreground leading-snug">{flag.name}</p>
                              {flag.description && (
                                <p className="text-[11px] text-muted-foreground/70 truncate max-w-[260px] mt-0.5 leading-relaxed">{flag.description}</p>
                              )}
                            </div>
                          </TableCell>

                          {/* Key */}
                          <TableCell>
                            <code className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border/30">
                              {flag.flag_key}
                            </code>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md", cat.bg, cat.text)}>
                              <cat.icon className="h-3 w-3" />
                              {cat.label}
                            </span>
                          </TableCell>

                          {/* Owner */}
                          <TableCell>
                            <span className={cn("text-xs", flag.owner ? "text-foreground/70 font-medium" : "text-muted-foreground/40")}>
                              {flag.owner || "—"}
                            </span>
                          </TableCell>

                          {/* Environment */}
                          <TableCell>
                            <span className={cn("inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border", envColor)}>
                              {(flag.environment || "production").slice(0, 4)}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2.5">
                              <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full", statusCfg.bg, statusCfg.text)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                                {statusCfg.label}
                              </span>
                              {status !== "archived" && status !== "deprecated" && (
                                <Switch
                                  checked={flag.is_enabled}
                                  onCheckedChange={() => handleToggleGlobal(flag)}
                                  className="scale-[0.8] data-[state=checked]:bg-success"
                                />
                              )}
                            </div>
                          </TableCell>

                          {/* Updated */}
                          <TableCell>
                            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                              {formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => { setSelectedFlag(flag); setDrawerOpen(true); }}>
                                  <Eye className="h-4 w-4 mr-2.5 text-muted-foreground" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedFlag(flag); setDrawerOpen(true); }}>
                                  <Pencil className="h-4 w-4 mr-2.5 text-muted-foreground" /> Edit Flag
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(flag)}>
                                  <Copy className="h-4 w-4 mr-2.5 text-muted-foreground" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSelectedFlag(flag); setDrawerOpen(true); }}>
                                  <Target className="h-4 w-4 mr-2.5 text-muted-foreground" /> Manage Targeting
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedFlag(flag); setDrawerOpen(true); }}>
                                  <CalendarClock className="h-4 w-4 mr-2.5 text-muted-foreground" /> Schedule Rollout
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedFlag(flag); setDrawerOpen(true); }}>
                                  <History className="h-4 w-4 mr-2.5 text-muted-foreground" /> Audit Log
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleArchive(flag)} className="text-warning focus:text-warning">
                                  <Archive className="h-4 w-4 mr-2.5" /> Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteConfirm(flag)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/50">
                  <p className="text-[11px] text-muted-foreground/60 tabular-nums">
                    {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} flags
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={currentPage >= pageCount - 1} onClick={() => setCurrentPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Dialogs ─── */}
      <FlagDetailDrawer
        flag={selectedFlag}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDelete={(f) => { setDrawerOpen(false); setDeleteConfirm(f); }}
        onArchive={handleArchive}
        onDuplicate={handleDuplicate}
      />

      <CreateFlagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        newFlag={newFlag}
        setNewFlag={setNewFlag}
        onSubmit={handleCreate}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Feature Flag
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              This will permanently remove <strong className="text-foreground">{deleteConfirm?.name}</strong>{" "}
              (<code className="text-[11px] bg-muted px-1 py-0.5 rounded">{deleteConfirm?.flag_key}</code>).
              Any code referencing this flag will default to disabled. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete Flag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Summary Card ───
const SummaryCard = ({
  icon: Icon, label, value, variant = "default", onClick, index, isActive,
}: {
  icon: React.ElementType; label: string; value: number; index: number; isActive?: boolean;
  variant?: "default" | "success" | "warning" | "info" | "accent";
  onClick?: () => void;
}) => {
  const styles = {
    default: { bg: "bg-muted/50", text: "text-muted-foreground", ring: "ring-border" },
    success: { bg: "bg-success/8", text: "text-success", ring: "ring-success/30" },
    warning: { bg: "bg-warning/8", text: "text-warning", ring: "ring-warning/30" },
    info: { bg: "bg-primary/8", text: "text-primary", ring: "ring-primary/30" },
    accent: { bg: "bg-purple-500/8", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/30" },
  };
  const s = styles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card
        interactive
        className={cn(
          "cursor-pointer transition-all duration-200",
          isActive && "ring-2 ring-offset-1 ring-offset-card",
          isActive && s.ring,
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">{label}</p>
              <p className={cn(
                "text-2xl font-bold tabular-nums leading-none tracking-tight",
                value > 0 ? "text-foreground" : "text-muted-foreground/25",
              )}>
                {value}
              </p>
            </div>
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
              <Icon className={cn("h-[18px] w-[18px]", s.text)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── Create Dialog ───
const CreateFlagDialog = ({
  open, onOpenChange, newFlag, setNewFlag, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  newFlag: { flag_key: string; name: string; description: string; category: string; environment: string; owner: string };
  setNewFlag: (v: any) => void; onSubmit: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[540px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          Create Feature Flag
        </DialogTitle>
        <DialogDescription>Define a new feature flag for controlled rollout.</DialogDescription>
      </DialogHeader>
      <div className="space-y-5 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Flag Key</Label>
            <Input
              placeholder="beta_new_feature"
              value={newFlag.flag_key}
              onChange={e => setNewFlag({ ...newFlag, flag_key: e.target.value.replace(/[^a-z0-9_]/g, "") })}
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground/60">Lowercase + underscores only</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Display Name</Label>
            <Input placeholder="New Feature Beta" value={newFlag.name} onChange={e => setNewFlag({ ...newFlag, name: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Description</Label>
          <Textarea placeholder="What this flag controls…" value={newFlag.description} onChange={e => setNewFlag({ ...newFlag, description: e.target.value })} rows={2} className="resize-none" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Category</Label>
            <Select value={newFlag.category} onValueChange={v => setNewFlag({ ...newFlag, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Environment</Label>
            <Select value={newFlag.environment} onValueChange={v => setNewFlag({ ...newFlag, environment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map(e => (
                  <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Owner</Label>
            <Input placeholder="Team / Person" value={newFlag.owner} onChange={e => setNewFlag({ ...newFlag, owner: e.target.value })} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} className="shadow-sm">Create Flag</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ─── Flag Detail Drawer ───
const FlagDetailDrawer = ({
  flag, open, onOpenChange, onDelete, onArchive, onDuplicate,
}: {
  flag: FeatureFlag | null; open: boolean; onOpenChange: (v: boolean) => void;
  onDelete: (f: FeatureFlag) => void; onArchive: (f: FeatureFlag) => void; onDuplicate: (f: FeatureFlag) => void;
}) => {
  const queryClient = useQueryClient();
  const { data: overrides, isLoading: overridesLoading } = useWorkspaceFlagOverrides(flag?.id ?? null);
  const [newWorkspaceId, setNewWorkspaceId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({ name: "", description: "", owner: "", rollout: 0 });

  if (!flag) return null;

  const cat = getCategoryConfig(flag.category);
  const status = deriveFlagStatus(flag);
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.disabled;
  const envColor = ENV_COLORS[flag.environment || "production"] || ENV_COLORS.development;

  const handleStartEdit = () => {
    setEditValues({ name: flag.name, description: flag.description || "", owner: flag.owner || "", rollout: flag.rollout_percentage });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase.from("feature_flags")
      .update({ name: editValues.name, description: editValues.description || null, owner: editValues.owner || null, rollout_percentage: editValues.rollout, updated_at: new Date().toISOString() } as any)
      .eq("id", flag.id);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Flag updated");
    setEditMode(false);
    queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  const handleAddOverride = async () => {
    if (!newWorkspaceId.trim()) { toast.error("Enter a workspace ID"); return; }
    const { error } = await supabase.from("workspace_feature_flags").insert({ flag_id: flag.id, workspace_id: newWorkspaceId.trim(), is_enabled: true } as any);
    if (error) { toast.error(error.message.includes("duplicate") ? "Override exists" : "Failed to add"); return; }
    toast.success("Override added");
    setNewWorkspaceId("");
    queryClient.invalidateQueries({ queryKey: ["workspace-feature-flags", flag.id] });
  };

  const handleToggleOverride = async (id: string, val: boolean) => {
    await supabase.from("workspace_feature_flags").update({ is_enabled: !val, updated_at: new Date().toISOString() } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["workspace-feature-flags", flag.id] });
  };

  const handleDeleteOverride = async (id: string) => {
    await supabase.from("workspace_feature_flags").delete().eq("id", id);
    toast.success("Override removed");
    queryClient.invalidateQueries({ queryKey: ["workspace-feature-flags", flag.id] });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditMode(false); }}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 border-b border-border/50">
          <div className="px-6 py-4">
            <SheetHeader className="pb-0">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-base font-semibold leading-snug">{editMode ? "Edit Flag" : flag.name}</SheetTitle>
                <div className="flex gap-1 shrink-0">
                  {!editMode && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleStartEdit}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onDuplicate(flag)}>
                            <Copy className="h-4 w-4 mr-2 text-muted-foreground" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onArchive(flag)} className="text-warning focus:text-warning">
                            <Archive className="h-4 w-4 mr-2" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(flag)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </SheetHeader>
            {!editMode && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <code className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                  {flag.flag_key}
                </code>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md", cat.bg, cat.text)}>
                  <cat.icon className="h-2.5 w-2.5" /> {cat.label}
                </span>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", statusCfg.bg, statusCfg.text)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} /> {statusCfg.label}
                </span>
                <span className={cn("inline-flex text-[10px] font-mono uppercase px-2 py-0.5 rounded border", envColor)}>
                  {flag.environment || "production"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {editMode ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Name</Label>
                <Input value={editValues.name} onChange={e => setEditValues({ ...editValues, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea value={editValues.description} onChange={e => setEditValues({ ...editValues, description: e.target.value })} rows={3} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Owner</Label>
                <Input value={editValues.owner} onChange={e => setEditValues({ ...editValues, owner: e.target.value })} placeholder="Team / Person" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Rollout Percentage</Label>
                  <span className="text-sm font-bold tabular-nums text-primary">{editValues.rollout}%</span>
                </div>
                <Slider value={[editValues.rollout]} onValueChange={v => setEditValues({ ...editValues, rollout: v[0] })} max={100} step={1} />
              </div>
              <div className="flex gap-2 pt-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button className="flex-1 shadow-sm" onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Description */}
              {flag.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{flag.description}</p>
              )}

              {/* Metadata */}
              <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <MetaItem label="Owner" value={flag.owner || "Unassigned"} muted={!flag.owner} />
                  <MetaItem label="Rollout" value={`${flag.rollout_percentage}%`} />
                  <MetaItem label="Created" value={format(new Date(flag.created_at), "MMM d, yyyy")} />
                  <MetaItem label="Updated" value={formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })} />
                  {flag.scheduled_at && <MetaItem label="Scheduled" value={format(new Date(flag.scheduled_at), "MMM d, yyyy h:mm a")} />}
                  {flag.expires_at && <MetaItem label="Expires" value={format(new Date(flag.expires_at), "MMM d, yyyy")} />}
                </div>
              </div>

              {/* Workspace Overrides */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground/60" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Workspace Overrides</h4>
                </div>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">Override the global flag state for specific workspaces.</p>

                <div className="flex gap-2">
                  <Input
                    placeholder="Workspace ID…"
                    value={newWorkspaceId}
                    onChange={e => setNewWorkspaceId(e.target.value)}
                    className="flex-1 font-mono text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddOverride} className="gap-1 shrink-0">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>

                {overridesLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (overrides || []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/40 py-4 text-center">
                    <p className="text-[11px] text-muted-foreground/40">No overrides configured</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(overrides || []).map(o => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-3 transition-colors hover:bg-muted/20">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono text-foreground/80">{o.workspace_id.slice(0, 14)}…</p>
                          <p className="text-[10px] text-muted-foreground/50">
                            {formatDistanceToNow(new Date(o.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={o.is_enabled} onCheckedChange={() => handleToggleOverride(o.id, o.is_enabled)} className="data-[state=checked]:bg-success" />
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-destructive" onClick={() => handleDeleteOverride(o.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Code Usage */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Usage in Code</h4>
                <div className="rounded-lg bg-foreground/[0.03] border border-border/30 overflow-hidden">
                  <pre className="text-[11px] text-muted-foreground font-mono p-4 leading-relaxed overflow-x-auto">
{`const { isEnabled } = useFeatureFlag("${flag.flag_key}");

if (isEnabled) {
  // Show feature
}`}
                  </pre>
                </div>
              </div>

              {/* Notes */}
              {flag.notes && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Notes</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{flag.notes}</p>
                </div>
              )}

              {/* Danger zone */}
              <div className="pt-2">
                <div className="rounded-xl border border-destructive/15 bg-destructive/[0.02] p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-destructive/80">Danger Zone</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground/70">Archive this flag</p>
                      <p className="text-[10px] text-muted-foreground/50">Disable and hide from active views</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-warning/30 text-warning hover:bg-warning/10 hover:text-warning" onClick={() => onArchive(flag)}>
                      Archive
                    </Button>
                  </div>
                  <Separator className="bg-destructive/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground/70">Delete this flag</p>
                      <p className="text-[10px] text-muted-foreground/50">Permanently remove — cannot be undone</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(flag)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Meta Item ───
const MetaItem = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="space-y-1">
    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">{label}</p>
    <p className={cn("text-xs font-medium", muted ? "text-muted-foreground/40 italic" : "text-foreground/80")}>{value}</p>
  </div>
);
