/**
 * Data Governance Panel
 *
 * Full data lifecycle governance: retention policies, data classification matrix,
 * lineage tracking, PII inventory, and governance health scoring.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { DeletionRequestsPanel } from "@/components/admin/DeletionRequestsPanel";
import { DataLifecycleMonitor } from "@/components/admin/DataLifecycleMonitor";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Database,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  FileText,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  Tag,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────── */

interface PolicyData {
  data_type: string;
  display_name: string;
  retention_days: number;
  classification: string;
  contains_pii: boolean;
  auto_purge_enabled: boolean;
  purge_strategy: string;
  last_purge_at: string | null;
  last_purge_count: number;
  row_count: number;
  oldest_record: string | null;
  owner_team: string;
}

interface ClassificationData {
  table_name: string;
  column_name: string;
  classification: string;
  contains_pii: boolean;
  pii_type: string | null;
  masking_required: boolean;
  encryption_required: boolean;
}

interface RetentionWarning {
  severity: string;
  data_type: string;
  message: string;
  recommendation: string;
}

interface GovernanceResult {
  assessed_at: string;
  governance_score: number;
  policies: PolicyData[];
  classifications: ClassificationData[];
  classification_coverage: {
    total_tables: number;
    classified_tables: number;
    coverage_pct: number;
    pii_fields: number;
    masking_required: number;
  };
  lineage_stats: {
    total_records: number;
    last_7d: number;
    unique_sources: number;
    unique_targets: number;
  };
  retention_warnings: RetentionWarning[];
  summary: {
    total_policies: number;
    overdue_purges: number;
    total_checks: number;
    pass_checks: number;
    pii_fields: number;
    classified_tables: number;
  };
}

/* ── Constants ─────────────────────────────────────────── */

const CLASSIFICATION_STYLE: Record<string, { badge: string; label: string }> = {
  public:       { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700", label: "Public" },
  internal:     { badge: "border-blue-500/30 bg-blue-500/10 text-blue-700",         label: "Internal" },
  confidential: { badge: "border-orange-500/30 bg-orange-500/10 text-orange-700",   label: "Confidential" },
  restricted:   { badge: "border-red-500/30 bg-red-500/10 text-red-700",           label: "Restricted" },
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/5",
  high:     "border-orange-500/40 bg-orange-500/5",
  medium:   "border-yellow-500/40 bg-yellow-500/5",
  low:      "border-blue-500/40 bg-blue-500/5",
};

/* ── Component ─────────────────────────────────────────── */

export const DataGovernancePanel = () => {
  const [result, setResult] = useState<GovernanceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<PolicyData | null>(null);

  const fetchGovernance = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("assess_data_governance");
      if (error) throw error;
      setResult(data as unknown as GovernanceResult);
    } catch (err) {
      console.error("Governance fetch failed:", err);
      toast.error("Failed to load governance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGovernance(); }, [fetchGovernance]);

  const executePurge = async (dataType: string) => {
    setPurging(dataType);
    try {
      const { data, error } = await supabase.rpc("execute_data_purge", { p_data_type: dataType });
      if (error) throw error;
      const res = data as any;
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Purged ${res?.deleted ?? 0} records from ${dataType}`);
        fetchGovernance();
      }
    } catch (err) {
      toast.error("Purge failed");
    } finally {
      setPurging(null);
      setConfirmPurge(null);
    }
  };

  const overallStatus = useMemo(() => {
    if (!result) return "healthy";
    return result.governance_score >= 80 ? "healthy" : result.governance_score >= 50 ? "warning" : "critical";
  }, [result]);

  /* Group classifications by table */
  const classifiedByTable = useMemo(() => {
    if (!result) return {};
    return result.classifications.reduce<Record<string, ClassificationData[]>>((acc, c) => {
      (acc[c.table_name] ??= []).push(c);
      return acc;
    }, {});
  }, [result]);

  if (loading && !result) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = result?.summary;
  const coverage = result?.classification_coverage;
  const lineage = result?.lineage_stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Lifecycle Governance
          </h2>
          <p className="text-sm text-muted-foreground">
            Retention, classification, lineage & compliance
            {result?.assessed_at && (
              <span className="ml-2 text-xs">
                · assessed {formatDistanceToNow(new Date(result.assessed_at), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={fetchGovernance}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Assess
        </Button>
      </div>

      {/* Score Banner */}
      <Card className={cn(
        "border",
        overallStatus === "healthy" && "border-emerald-500/30 bg-emerald-500/5",
        overallStatus === "warning" && "border-yellow-500/30 bg-yellow-500/5",
        overallStatus === "critical" && "border-red-500/30 bg-red-500/5",
      )}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {overallStatus === "healthy" && <ShieldCheck className="h-10 w-10 text-emerald-600" />}
              {overallStatus === "warning" && <AlertTriangle className="h-10 w-10 text-yellow-600" />}
              {overallStatus === "critical" && <ShieldAlert className="h-10 w-10 text-red-600" />}
              <div>
                <p className="text-2xl font-bold">{result?.governance_score ?? 0}%</p>
                <p className="text-sm text-muted-foreground">
                  {overallStatus === "healthy" && "Data governance posture is strong"}
                  {overallStatus === "warning" && "Some governance policies need attention"}
                  {overallStatus === "critical" && "Critical governance issues detected"}
                </p>
              </div>
            </div>
            <div className="hidden sm:grid grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-xl font-bold">{summary?.total_policies ?? 0}</p>
                <p className="text-xs text-muted-foreground">Policies</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-600">{summary?.overdue_purges ?? 0}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{summary?.pii_fields ?? 0}</p>
                <p className="text-xs text-muted-foreground">PII Fields</p>
              </div>
              <div>
                <p className="text-xl font-bold">{coverage?.coverage_pct ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Classified</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{summary?.total_policies ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Data Policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Tag className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{coverage?.classified_tables ?? 0}/{coverage?.total_tables ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Tables Classified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <EyeOff className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{coverage?.masking_required ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Masking Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <GitBranch className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{lineage?.total_records ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Lineage Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{lineage?.last_7d ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Lineage (7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Retention Warnings */}
      {result && result.retention_warnings.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Retention Warnings ({result.retention_warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.retention_warnings.map((w, i) => (
              <div key={i} className={cn("p-3 rounded-lg border", SEVERITY_STYLE[w.severity] ?? SEVERITY_STYLE.medium)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{w.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{w.data_type}</span>
                    </div>
                    <p className="text-sm font-medium">{w.message}</p>
                    <p className="text-xs text-muted-foreground">{w.recommendation}</p>
                  </div>
                  <XCircle className="h-4 w-4 shrink-0 text-destructive/60 mt-0.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="retention" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="retention" className="text-xs gap-1.5">
            <Archive className="h-3.5 w-3.5" /> Retention Policies
          </TabsTrigger>
          <TabsTrigger value="classification" className="text-xs gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Data Classification
          </TabsTrigger>
          <TabsTrigger value="lineage" className="text-xs gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Data Lineage
          </TabsTrigger>
        </TabsList>

        {/* Retention Policies */}
        <TabsContent value="retention">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data Type</TableHead>
                      <TableHead className="text-xs w-[80px]">Class</TableHead>
                      <TableHead className="text-xs w-[70px]">PII</TableHead>
                      <TableHead className="text-xs w-[80px]">Retention</TableHead>
                      <TableHead className="text-xs w-[80px]">Strategy</TableHead>
                      <TableHead className="text-xs w-[80px]">Records</TableHead>
                      <TableHead className="text-xs w-[100px]">Last Purge</TableHead>
                      <TableHead className="text-xs w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result?.policies.map(p => {
                      const cls = CLASSIFICATION_STYLE[p.classification] ?? CLASSIFICATION_STYLE.internal;
                      const isOverdue = p.auto_purge_enabled && p.retention_days > 0 && p.oldest_record &&
                        new Date(p.oldest_record) < new Date(Date.now() - p.retention_days * 86400000);
                      return (
                        <TableRow key={p.data_type} className={isOverdue ? "bg-destructive/5" : ""}>
                          <TableCell>
                            <div>
                              <p className="text-xs font-medium">{p.display_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{p.data_type}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", cls.badge)}>{cls.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {p.contains_pii
                              ? <Badge variant="outline" className="text-[10px] border-red-500/30 bg-red-500/10 text-red-700">PII</Badge>
                              : <span className="text-[10px] text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.retention_days > 0 ? `${p.retention_days}d` : <span className="text-muted-foreground">∞</span>}
                          </TableCell>
                          <TableCell className="text-[10px]">{p.purge_strategy}</TableCell>
                          <TableCell className="text-xs font-mono">{p.row_count.toLocaleString()}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {p.last_purge_at
                              ? formatDistanceToNow(new Date(p.last_purge_at), { addSuffix: true })
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            {p.auto_purge_enabled && p.retention_days > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={purging === p.data_type}
                                onClick={() => setConfirmPurge(p)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Purge
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Manual</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Classification */}
        <TabsContent value="classification">
          <div className="space-y-4">
            {/* Coverage summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Classification Coverage</p>
                      <p className="text-xs text-muted-foreground">
                        {coverage?.classified_tables} of {coverage?.total_tables} tables classified
                        · {coverage?.pii_fields} PII fields identified
                        · {coverage?.masking_required} require masking
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{coverage?.coverage_pct ?? 0}%</div>
                </div>
              </CardContent>
            </Card>

            {/* Classification by table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(classifiedByTable).map(([table, fields]) => (
                <Card key={table}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono">{table}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {fields.length} fields
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {fields.map((f, i) => {
                      const cls = CLASSIFICATION_STYLE[f.classification] ?? CLASSIFICATION_STYLE.internal;
                      return (
                        <div key={i} className="flex items-center justify-between p-2 rounded-md border bg-card/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono truncate">{f.column_name}</span>
                            {f.contains_pii && (
                              <Badge variant="outline" className="text-[8px] border-red-500/30 bg-red-500/10 text-red-700">
                                PII{f.pii_type ? `: ${f.pii_type}` : ""}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {f.masking_required && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                            {f.encryption_required && <Lock className="h-3 w-3 text-muted-foreground" />}
                            <Badge variant="outline" className={cn("text-[8px]", cls.badge)}>{cls.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Data Lineage */}
        <TabsContent value="lineage">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                Data Lineage Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Tracks data origin, transformations, and purge operations across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg border bg-card/50 text-center">
                  <p className="text-xl font-bold">{lineage?.total_records ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Total Records</p>
                </div>
                <div className="p-3 rounded-lg border bg-card/50 text-center">
                  <p className="text-xl font-bold">{lineage?.last_7d ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Last 7 Days</p>
                </div>
                <div className="p-3 rounded-lg border bg-card/50 text-center">
                  <p className="text-xl font-bold">{lineage?.unique_sources ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Source Tables</p>
                </div>
                <div className="p-3 rounded-lg border bg-card/50 text-center">
                  <p className="text-xl font-bold">{lineage?.unique_targets ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Target Tables</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium">Lineage Principles Enforced</p>
                {[
                  { icon: Lock, text: "Lineage records are immutable — cannot be edited or deleted" },
                  { icon: GitBranch, text: "Data purges automatically create lineage entries" },
                  { icon: Eye, text: "Snapshot restores tracked with full provenance" },
                  { icon: CheckCircle2, text: "All transformations reference source and target" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Lifecycle Monitoring */}
      <DataLifecycleMonitor />

      {/* Data Deletion Requests (Admin Review) */}
      <DeletionRequestsPanel />

      {/* Purge Confirmation */}
      <AlertDialog open={!!confirmPurge} onOpenChange={() => setConfirmPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Purge</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently {confirmPurge?.purge_strategy === "hard_delete" ? "delete" : "archive"} records
              from <strong>{confirmPurge?.display_name}</strong> older than{" "}
              <strong>{confirmPurge?.retention_days} days</strong>.
              {confirmPurge?.contains_pii && (
                <span className="block mt-1 text-red-600 font-medium">⚠ This data type contains PII.</span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmPurge && executePurge(confirmPurge.data_type)}
            >
              {purging ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
