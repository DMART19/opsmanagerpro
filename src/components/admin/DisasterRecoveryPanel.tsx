/**
 * Disaster Recovery — Operational Control Center
 * 
 * Three-section layout answering:
 * 1. Are my backups working?  → System Recovery Status
 * 2. Can I restore right now? → Backup Management
 * 3. What if we fail today?   → Recovery Simulation
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  HardDrive, ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw,
  CheckCircle2, XCircle, Info, Database, Clock, Server,
  Activity, Zap, Play, BarChart3, ArrowRight, Timer,
  TrendingUp, Shield, CircleDot, Loader2, Gauge, Settings2, Save,
  RotateCcw, Calendar, History, Radio, AlertOctagon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────

interface BackupRecord {
  id: string;
  backup_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  backup_size_bytes: number | null;
  table_count: number | null;
  row_count: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface RecoveryCheck {
  check_type: string;
  status: string;
  details: Record<string, unknown>;
  checked_at: string;
}

interface BackupConfig {
  id: string;
  frequency: string;
  retention_days: number;
  snapshot_strategy: string;
  storage_location: string;
  updated_at: string;
}

// ─── Constants ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pass:  { label: "Passing",  icon: CheckCircle2,  color: "text-emerald-600" },
  warn:  { label: "Warning",  icon: AlertTriangle,  color: "text-yellow-600" },
  fail:  { label: "Failing",  icon: XCircle,         color: "text-destructive" },
  info:  { label: "Info",     icon: Info,            color: "text-blue-600" },
};

const CHECK_LABELS: Record<string, { label: string; question: string }> = {
  last_backup:          { label: "Last Backup",          question: "Is our most recent backup healthy?" },
  workspace_snapshots:  { label: "Workspace Snapshots",  question: "Are workspace recovery points available?" },
  rls_coverage:         { label: "RLS Coverage",         question: "Is data access properly restricted?" },
  audit_immutability:   { label: "Audit Immutability",   question: "Are audit logs tamper-proof?" },
  data_volume:          { label: "Data Volume",          question: "How much data would we need to restore?" },
};

// ─── Helpers ─────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function getBackupAge(backup: BackupRecord | undefined): { label: string; severity: "good" | "warn" | "critical" } {
  if (!backup?.completed_at) return { label: "No backups", severity: "critical" };
  const hours = differenceInHours(new Date(), new Date(backup.completed_at));
  if (hours < 24) return { label: `${hours}h ago`, severity: "good" };
  if (hours < 72) return { label: `${Math.floor(hours / 24)}d ago`, severity: "warn" };
  return { label: `${Math.floor(hours / 24)}d ago`, severity: "critical" };
}

function getRecoveryScore(checks: RecoveryCheck[]): number {
  if (checks.length === 0) return 0;
  const weights: Record<string, number> = { pass: 100, warn: 50, fail: 0, info: 75 };
  const total = checks.reduce((sum, c) => sum + (weights[c.status] ?? 50), 0);
  return Math.round(total / checks.length);
}

// ─── Recovery Test Types ─────────────────────────────────────────

interface RecoveryTestResult {
  name: string;
  description: string;
  status: "pass" | "warn" | "fail" | "running";
  detail: string;
  recommendation: string;
  weight: number;
}

// ─── Simulation Logic ────────────────────────────────────────────

interface SimulationResult {
  scenario: string;
  description: string;
  rto: string;       // Recovery Time Objective
  rpo: string;       // Recovery Point Objective
  dataAtRisk: string;
  confidence: number; // 0-100
  actions: string[];
}

function buildSimulations(
  backups: BackupRecord[],
  checks: RecoveryCheck[],
  lastBackup: BackupRecord | undefined
): SimulationResult[] {
  const hasRecentBackup = lastBackup?.completed_at
    ? differenceInHours(new Date(), new Date(lastBackup.completed_at)) < 24
    : false;
  const snapCheck = checks.find(c => c.check_type === "workspace_snapshots");
  const snapCount = Number(snapCheck?.details?.total_snapshots ?? 0);
  const volCheck = checks.find(c => c.check_type === "data_volume");
  const totalAssets = Number(volCheck?.details?.total_assets ?? 0);
  const totalMembers = Number(volCheck?.details?.total_employees ?? 0);

  return [
    {
      scenario: "Complete Database Loss",
      description: "Total loss of the primary database with no standby replica available.",
      rto: hasRecentBackup ? "< 2 hours" : "> 8 hours",
      rpo: lastBackup?.completed_at
        ? `${differenceInMinutes(new Date(), new Date(lastBackup.completed_at))} min of data`
        : "Unknown — no backup",
      dataAtRisk: `${totalAssets.toLocaleString()} assets, ${totalMembers} team members`,
      confidence: hasRecentBackup ? 85 : 25,
      actions: hasRecentBackup
        ? ["Restore from latest backup", "Validate RLS policies", "Notify workspace owners"]
        : ["Trigger emergency backup NOW", "Investigate backup pipeline", "Prepare manual recovery"],
    },
    {
      scenario: "Single Workspace Corruption",
      description: "A workspace's data is corrupted or accidentally deleted by a user.",
      rto: snapCount > 0 ? "< 15 minutes" : "1-4 hours",
      rpo: snapCount > 0 ? "Last snapshot point" : "Last full backup",
      dataAtRisk: "Isolated to one workspace",
      confidence: snapCount > 0 ? 95 : 50,
      actions: snapCount > 0
        ? ["Use Workspace Recovery panel", "Select target snapshot", "Run selective restore"]
        : ["Restore workspace from full backup", "Filter target user data", "Re-import manually"],
    },
    {
      scenario: "Ransomware / Unauthorized Access",
      description: "Malicious actor gains write access and modifies or encrypts data.",
      rto: "2-6 hours",
      rpo: hasRecentBackup ? "Last clean backup" : "Unknown",
      dataAtRisk: "Potentially all workspace data",
      confidence: hasRecentBackup && snapCount > 0 ? 70 : 30,
      actions: [
        "Isolate affected accounts immediately",
        "Audit change_history for malicious writes",
        "Restore from pre-incident backup",
        "Rotate all API keys and tokens",
      ],
    },
  ];
}

// ─── Sub-components ──────────────────────────────────────────────

const RecoveryScoreGauge = ({ score }: { score: number }) => {
  const color = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-yellow-600" : "text-destructive";
  const bgColor = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={color}
          />
        </svg>
        <div className="text-center">
          <motion.span
            className={cn("text-2xl font-bold", color)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Score</p>
        </div>
      </div>
      <Badge variant="outline" className={cn("text-xs", color)}>
        {score >= 80 ? "Recovery Ready" : score >= 50 ? "Needs Attention" : "At Risk"}
      </Badge>
    </div>
  );
};

const StatusPulse = ({ status }: { status: "good" | "warn" | "critical" }) => {
  const colors = {
    good: "bg-emerald-500",
    warn: "bg-yellow-500",
    critical: "bg-destructive",
  };
  return (
    <span className="relative flex h-3 w-3">
      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colors[status])} />
      <span className={cn("relative inline-flex rounded-full h-3 w-3", colors[status])} />
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────

export const DisasterRecoveryPanel = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [checks, setChecks] = useState<RecoveryCheck[]>([]);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<Partial<BackupConfig>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runningAssessment, setRunningAssessment] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<number | null>(null);
  const [backupTimelineFilter, setBackupTimelineFilter] = useState<"24h" | "7d" | "30d">("7d");

  // Recovery test state
  const [runningRecoveryTest, setRunningRecoveryTest] = useState(false);
  const [recoveryTestResults, setRecoveryTestResults] = useState<RecoveryTestResult[] | null>(null);
  const [recoveryTestScore, setRecoveryTestScore] = useState<number | null>(null);
  const [recoveryTestTimestamp, setRecoveryTestTimestamp] = useState<Date | null>(null);

  // Restore state
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [restoreMode, setRestoreMode] = useState<"latest" | "snapshot" | "date">("latest");
  const [selectedRestorePoint, setSelectedRestorePoint] = useState<string | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [backupRes, checkRes, configRes, snapshotRes] = await Promise.all([
        supabase
          .from("backup_records")
          .select("*")
          .order("completed_at", { ascending: false })
          .limit(25),
        supabase
          .from("recovery_checks")
          .select("*")
          .order("checked_at", { ascending: false })
          .limit(25),
        supabase
          .from("backup_config")
          .select("*")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("workspace_snapshots")
          .select("id, name, snapshot_type, created_at, asset_count, container_count, employee_count, task_count, snapshot_size, user_id")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (backupRes.data) setBackups(backupRes.data as unknown as BackupRecord[]);
      if (checkRes.data) setChecks(checkRes.data as unknown as RecoveryCheck[]);
      if (configRes.data) {
        const cfg = configRes.data as unknown as BackupConfig;
        setConfig(cfg);
        setConfigDraft(cfg);
      }
      if (snapshotRes.data) setSnapshots(snapshotRes.data);
    } catch (err) {
      console.error("Failed to load DR data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runAssessment = async () => {
    setRunningAssessment(true);
    try {
      const { error } = await supabase.rpc("run_recovery_assessment");
      if (error) throw error;
      toast.success("Recovery assessment completed");
      await fetchData();
    } catch (err: any) {
      toast.error("Assessment failed: " + err.message);
    } finally {
      setRunningAssessment(false);
    }
  };

  const triggerBackup = async () => {
    setRunningBackup(true);
    try {
      const { error } = await supabase.from("backup_records").insert({
        backup_type: "manual",
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Manual backup initiated");
      await fetchData();
    } catch (err: any) {
      toast.error("Backup failed: " + err.message);
    } finally {
      setRunningBackup(false);
    }
  };

  const saveConfig = async () => {
    if (!config?.id) return;
    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from("backup_config")
        .update({
          frequency: configDraft.frequency,
          retention_days: configDraft.retention_days,
          snapshot_strategy: configDraft.snapshot_strategy,
          storage_location: configDraft.storage_location,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);
      if (error) throw error;
      toast.success("Backup configuration saved");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to save config: " + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const configChanged = config && (
    configDraft.frequency !== config.frequency ||
    configDraft.retention_days !== config.retention_days ||
    configDraft.snapshot_strategy !== config.snapshot_strategy ||
    configDraft.storage_location !== config.storage_location
  );

  // ─── Recovery Test Logic ──────────────────────────────────────

  const runRecoveryTest = async () => {
    setRunningRecoveryTest(true);
    setRecoveryTestResults(null);
    setRecoveryTestScore(null);

    const tests: RecoveryTestResult[] = [
      { name: "Backup Recency", description: "Last backup completed within the expected schedule window", status: "running", detail: "", recommendation: "", weight: 25 },
      { name: "Restore Integrity", description: "Workspace snapshots are verified, complete, and restorable", status: "running", detail: "", recommendation: "", weight: 25 },
      { name: "Storage Redundancy", description: "Backups are stored across multiple locations or strategies", status: "running", detail: "", recommendation: "", weight: 20 },
      { name: "Recovery Time Estimate", description: "Estimated time to fully restore the system from latest backup", status: "running", detail: "", recommendation: "", weight: 15 },
      { name: "Data Completeness", description: "Backup covers all critical tables with row-level verification", status: "running", detail: "", recommendation: "", weight: 10 },
      { name: "Policy & Access Readiness", description: "RLS policies and audit controls are active to protect restored data", status: "running", detail: "", recommendation: "", weight: 5 },
    ];

    setRecoveryTestResults([...tests]);
    await new Promise(r => setTimeout(r, 500));

    // ── Check 1: Backup Recency ──────────────────────────────────
    try {
      const [{ data: latestBk, error }, { data: cfgData }] = await Promise.all([
        supabase.from("backup_records").select("id, status, completed_at, backup_size_bytes, backup_type")
          .eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("backup_config").select("frequency").limit(1).maybeSingle(),
      ]);
      if (error) throw error;

      const expectedHours: Record<string, number> = { hourly: 2, daily: 26, weekly: 170 };
      const freq = cfgData?.frequency ?? "daily";
      const maxAge = expectedHours[freq] ?? 26;

      if (latestBk?.completed_at) {
        const hoursAgo = differenceInHours(new Date(), new Date(latestBk.completed_at));
        if (hoursAgo <= maxAge) {
          tests[0] = { ...tests[0], status: "pass", detail: `Last ${latestBk.backup_type} backup ${hoursAgo}h ago — within ${freq} schedule`, recommendation: "" };
        } else if (hoursAgo <= maxAge * 2) {
          tests[0] = { ...tests[0], status: "warn", detail: `Backup is ${hoursAgo}h old — exceeds ${freq} window of ${maxAge}h`, recommendation: `Your ${freq} schedule expects a backup every ${maxAge}h. Run a manual backup now or check if the automated pipeline is stalled.` };
        } else {
          tests[0] = { ...tests[0], status: "fail", detail: `Backup is ${Math.floor(hoursAgo / 24)} days old — severely overdue`, recommendation: `No backup in over ${Math.floor(hoursAgo / 24)} days. Trigger an immediate backup and investigate why scheduled backups stopped running.` };
        }
      } else {
        tests[0] = { ...tests[0], status: "fail", detail: "No completed backups found in the system", recommendation: "No backups exist. Run a backup immediately and configure an automated schedule." };
      }
    } catch {
      tests[0] = { ...tests[0], status: "fail", detail: "Could not query backup records", recommendation: "Database connection issue — verify backend connectivity." };
    }
    setRecoveryTestResults([...tests]);
    await new Promise(r => setTimeout(r, 400));

    // ── Check 2: Restore Integrity ───────────────────────────────
    try {
      const { data: snaps } = await supabase
        .from("workspace_snapshots")
        .select("id, created_at, snapshot_size, asset_count, container_count, employee_count, snapshot_type")
        .order("created_at", { ascending: false })
        .limit(10);

      const validSnaps = (snaps || []).filter(s =>
        s.snapshot_size && s.snapshot_size > 0 && (s.asset_count || s.container_count || s.employee_count)
      );
      const totalSnaps = snaps?.length ?? 0;
      const corruptOrEmpty = totalSnaps - validSnaps.length;

      if (validSnaps.length >= 3 && corruptOrEmpty === 0) {
        const latest = validSnaps[0];
        const latestAge = differenceInHours(new Date(), new Date(latest.created_at));
        tests[1] = { ...tests[1], status: "pass", detail: `${validSnaps.length} verified snapshots · Latest ${latestAge}h ago (${formatBytes(latest.snapshot_size)})`, recommendation: "" };
      } else if (validSnaps.length > 0) {
        tests[1] = { ...tests[1], status: "warn", detail: `${validSnaps.length} valid of ${totalSnaps} total snapshots${corruptOrEmpty > 0 ? ` · ${corruptOrEmpty} empty or incomplete` : ""}`, recommendation: `Only ${validSnaps.length} snapshot(s) have verified data. Create additional snapshots to ensure at least 3 restorable restore points.${corruptOrEmpty > 0 ? ` ${corruptOrEmpty} snapshot(s) appear empty — these may have failed during creation.` : ""}` };
      } else {
        tests[1] = { ...tests[1], status: "fail", detail: totalSnaps > 0 ? `${totalSnaps} snapshots found but none contain valid data` : "No workspace snapshots exist", recommendation: totalSnaps > 0 ? "Existing snapshots are empty or corrupt. Create a fresh snapshot from the Time Machine panel." : "No recovery points available. Create a workspace snapshot immediately to enable point-in-time recovery." };
      }
    } catch {
      tests[1] = { ...tests[1], status: "fail", detail: "Cannot query snapshot storage", recommendation: "Snapshot query failed — check database permissions." };
    }
    setRecoveryTestResults([...tests]);
    await new Promise(r => setTimeout(r, 400));

    // ── Check 3: Storage Redundancy ──────────────────────────────
    try {
      const [{ data: cfgData }, { data: recentBackups }] = await Promise.all([
        supabase.from("backup_config").select("storage_location, snapshot_strategy").limit(1).maybeSingle(),
        supabase.from("backup_records").select("backup_type, status").eq("status", "completed").order("completed_at", { ascending: false }).limit(10),
      ]);

      const location = cfgData?.storage_location ?? "platform_managed";
      const strategy = cfgData?.snapshot_strategy ?? "full";
      const hasMultipleTypes = new Set((recentBackups || []).map(b => b.backup_type)).size >= 2;

      if (location === "external" && hasMultipleTypes) {
        tests[2] = { ...tests[2], status: "pass", detail: `External storage configured · ${strategy} strategy · Multiple backup types in rotation`, recommendation: "" };
      } else if (location === "external" || hasMultipleTypes) {
        const parts: string[] = [];
        if (location === "platform_managed") parts.push("using platform-managed storage only");
        if (!hasMultipleTypes) parts.push("single backup type in use");
        tests[2] = { ...tests[2], status: "warn", detail: `${location === "external" ? "External" : "Platform"} storage · ${strategy} strategy · ${hasMultipleTypes ? "Mixed" : "Single"} backup types`, recommendation: `Partial redundancy: ${parts.join("; ")}. ${location === "platform_managed" ? "Configure external storage as a secondary location." : "Use both manual and scheduled backups for type diversity."}` };
      } else {
        tests[2] = { ...tests[2], status: "warn", detail: `Platform-managed storage only · ${strategy} strategy`, recommendation: "All backups are in a single platform-managed location. If the platform experiences an outage, backups may be inaccessible. Configure external storage for true redundancy." };
      }
    } catch {
      tests[2] = { ...tests[2], status: "fail", detail: "Could not evaluate storage configuration", recommendation: "Unable to read backup configuration — check database access." };
    }
    setRecoveryTestResults([...tests]);
    await new Promise(r => setTimeout(r, 400));

    // ── Check 4: Recovery Time Estimate ──────────────────────────
    try {
      const { data: latestBk } = await supabase
        .from("backup_records")
        .select("backup_size_bytes, row_count, table_count, started_at, completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestBk?.row_count && latestBk?.table_count) {
        const rows = latestBk.row_count;
        const tables = latestBk.table_count;
        const sizeBytes = latestBk.backup_size_bytes ?? 0;
        // Estimate: ~5k rows/sec restore speed, plus 30s per table for schema + index
        const estimatedSeconds = Math.ceil(rows / 5000) + (tables * 30) + 60;
        const estimatedMin = Math.ceil(estimatedSeconds / 60);

        if (estimatedMin <= 15) {
          tests[3] = { ...tests[3], status: "pass", detail: `Estimated restore: ~${estimatedMin} min · ${rows.toLocaleString()} rows across ${tables} tables (${formatBytes(sizeBytes)})`, recommendation: "" };
        } else if (estimatedMin <= 60) {
          tests[3] = { ...tests[3], status: "warn", detail: `Estimated restore: ~${estimatedMin} min · ${rows.toLocaleString()} rows across ${tables} tables`, recommendation: `Recovery would take roughly ${estimatedMin} minutes. Consider using incremental backups or reducing data volume to lower the restore window.` };
        } else {
          const estimatedHrs = (estimatedMin / 60).toFixed(1);
          tests[3] = { ...tests[3], status: "fail", detail: `Estimated restore: ~${estimatedHrs}h · ${rows.toLocaleString()} rows across ${tables} tables`, recommendation: `Recovery time exceeds 1 hour. Switch to incremental backup strategy, archive old data, or increase restore parallelism to reduce RTO.` };
        }
      } else {
        tests[3] = { ...tests[3], status: "warn", detail: "Cannot estimate — backup metadata incomplete", recommendation: "Backups are missing row count or table count metadata. Run a fresh backup to populate these fields for accurate estimation." };
      }
    } catch {
      tests[3] = { ...tests[3], status: "fail", detail: "Recovery time estimation failed", recommendation: "Could not access backup metadata for estimation." };
    }
    setRecoveryTestResults([...tests]);
    await new Promise(r => setTimeout(r, 400));

    // ── Check 5: Data Completeness ───────────────────────────────
    try {
      const { data: recentBackups } = await supabase
        .from("backup_records")
        .select("table_count, row_count, backup_size_bytes, status, completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(3);

      const completed = recentBackups || [];
      if (completed.length >= 2) {
        const latest = completed[0];
        const previous = completed[1];
        const rowDelta = (latest.row_count ?? 0) - (previous.row_count ?? 0);
        const tableDelta = (latest.table_count ?? 0) - (previous.table_count ?? 0);
        const hasAllMeta = latest.table_count && latest.row_count && latest.backup_size_bytes;

        if (hasAllMeta && tableDelta >= 0 && Math.abs(rowDelta) < (latest.row_count ?? 1) * 0.5) {
          tests[4] = { ...tests[4], status: "pass", detail: `${latest.table_count} tables · ${(latest.row_count ?? 0).toLocaleString()} rows · ${formatBytes(latest.backup_size_bytes)} · Δ${rowDelta >= 0 ? "+" : ""}${rowDelta} rows from previous`, recommendation: "" };
        } else if (hasAllMeta) {
          tests[4] = { ...tests[4], status: "warn", detail: `${latest.table_count} tables · Row count changed by ${rowDelta.toLocaleString()} (${tableDelta >= 0 ? `+${tableDelta}` : tableDelta} tables)`, recommendation: `Significant data variance detected between consecutive backups. ${tableDelta < 0 ? `${Math.abs(tableDelta)} table(s) disappeared — possible schema migration issue.` : `Row count shifted by ${Math.abs(rowDelta).toLocaleString()} — verify no unintended bulk operations occurred.`}` };
        } else {
          tests[4] = { ...tests[4], status: "warn", detail: "Backup metadata incomplete — cannot verify coverage", recommendation: "One or more backup records lack table counts or row counts. Run a fresh backup to ensure complete metadata." };
        }
      } else if (completed.length === 1) {
        tests[4] = { ...tests[4], status: "warn", detail: `Single backup: ${completed[0].table_count ?? "?"} tables · ${(completed[0].row_count ?? 0).toLocaleString()} rows`, recommendation: "Only one backup exists — no baseline for comparison. Create additional backups to enable drift detection." };
      } else {
        tests[4] = { ...tests[4], status: "fail", detail: "No completed backups to analyze", recommendation: "Run a backup to establish a data completeness baseline." };
      }
    } catch {
      tests[4] = { ...tests[4], status: "fail", detail: "Data completeness check failed", recommendation: "Could not query backup records for analysis." };
    }
    setRecoveryTestResults([...tests]);
    await new Promise(r => setTimeout(r, 400));

    // ── Check 6: Policy & Access Readiness ───────────────────────
    try {
      const { data: checksData } = await supabase
        .from("recovery_checks")
        .select("check_type, status, details")
        .order("checked_at", { ascending: false })
        .limit(15);

      const unique = new Map<string, { status: string; details: any }>();
      (checksData || []).forEach(c => { if (!unique.has(c.check_type)) unique.set(c.check_type, c); });

      const rlsCheck = unique.get("rls_coverage");
      const auditCheck = unique.get("audit_immutability");
      const totalChecks = unique.size;
      const failedChecks = [...unique.values()].filter(c => c.status === "fail").length;

      if (totalChecks === 0) {
        tests[5] = { ...tests[5], status: "warn", detail: "No environment checks have been run", recommendation: "Run a Recovery Assessment to evaluate RLS policies and audit log integrity before attempting a restore." };
      } else if (failedChecks === 0) {
        const rlsPct = rlsCheck?.details?.coverage_pct;
        const auditOk = auditCheck?.details?.audit_triggers_active;
        tests[5] = { ...tests[5], status: "pass", detail: `${totalChecks} checks passing${rlsPct ? ` · RLS ${rlsPct}%` : ""}${auditOk ? " · Audit immutable" : ""}`, recommendation: "" };
      } else {
        const failedNames = [...unique.entries()].filter(([, c]) => c.status === "fail").map(([k]) => k);
        tests[5] = { ...tests[5], status: failedChecks >= 2 ? "fail" : "warn", detail: `${failedChecks}/${totalChecks} policy checks failing: ${failedNames.join(", ")}`, recommendation: `Failing checks mean restored data may not be properly protected. Fix these before restoring: ${failedNames.join(", ")}. Run a Recovery Assessment to update.` };
      }
    } catch {
      tests[5] = { ...tests[5], status: "fail", detail: "Policy check query failed", recommendation: "Unable to verify RLS and audit readiness." };
    }
    setRecoveryTestResults([...tests]);

    // Compute weighted score
    const totalWeight = tests.reduce((s, t) => s + t.weight, 0);
    const earned = tests.reduce((s, t) => {
      const multiplier = t.status === "pass" ? 1 : t.status === "warn" ? 0.5 : 0;
      return s + t.weight * multiplier;
    }, 0);
    const score = Math.round((earned / totalWeight) * 100);
    setRecoveryTestScore(score);
    setRecoveryTestTimestamp(new Date());
    setRunningRecoveryTest(false);
  };

  // ─── Derived data ─────────────────────────────────────────────

  const latestChecks = useMemo(() => {
    const map: Record<string, RecoveryCheck> = {};
    checks.forEach(c => { if (!map[c.check_type]) map[c.check_type] = c; });
    return Object.values(map);
  }, [checks]);

  const lastBackup = backups.find(b => b.status === "completed");
  const backupAge = getBackupAge(lastBackup);
  const recoveryScore = getRecoveryScore(latestChecks);
  const passCount = latestChecks.filter(c => c.status === "pass").length;
  const warnCount = latestChecks.filter(c => c.status === "warn").length;
  const failCount = latestChecks.filter(c => c.status === "fail").length;
  const simulations = useMemo(
    () => buildSimulations(backups, latestChecks, lastBackup),
    [backups, latestChecks, lastBackup]
  );

  const completedBackups = backups.filter(b => b.status === "completed");
  const completedBackupsForRestore = completedBackups; // alias for restore logic
  const filteredBackups = useMemo(() => {
    const now = new Date();
    const cutoff = backupTimelineFilter === "24h"
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      : backupTimelineFilter === "7d"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return backups.filter(b => {
      const d = new Date(b.completed_at || b.started_at);
      return d >= cutoff;
    });
  }, [backups, backupTimelineFilter]);
  const failedBackups = backups.filter(b => b.status === "failed");
  const successRate = backups.length > 0
    ? Math.round((completedBackups.length / backups.length) * 100) : 0;

  // ─── Restore logic ────────────────────────────────────────────

  const restorePoints = useMemo(() => {
    const points: { id: string; label: string; sublabel: string; type: "backup" | "snapshot"; source: any }[] = [];

    completedBackupsForRestore.forEach(b => {
      if (!b.completed_at) return;
      const d = new Date(b.completed_at);
      const age = formatDistanceToNow(d, { addSuffix: true });
      points.push({
        id: `backup-${b.id}`,
        label: `${format(d, "MMM d, yyyy")} — ${format(d, "HH:mm")} backup`,
        sublabel: `${b.backup_type} · ${formatBytes(b.backup_size_bytes)} · ${age}`,
        type: "backup",
        source: b,
      });
    });

    snapshots.forEach((s: any) => {
      const d = new Date(s.created_at);
      const age = formatDistanceToNow(d, { addSuffix: true });
      const counts = [
        s.asset_count && `${s.asset_count} assets`,
        s.container_count && `${s.container_count} containers`,
        s.employee_count && `${s.employee_count} team`,
      ].filter(Boolean).join(" · ");
      points.push({
        id: `snapshot-${s.id}`,
        label: s.name || `${format(d, "MMM d, yyyy")} — ${s.snapshot_type} snapshot`,
        sublabel: `${counts} · ${age}`,
        type: "snapshot",
        source: s,
      });
    });

    points.sort((a, b) => {
      const dateA = a.type === "backup" ? a.source.completed_at : a.source.created_at;
      const dateB = b.type === "backup" ? b.source.completed_at : b.source.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return points;
  }, [completedBackupsForRestore, snapshots]);

  const filteredRestorePoints = useMemo(() => {
    if (restoreMode === "latest") return restorePoints.slice(0, 1);
    if (restoreMode === "snapshot") return restorePoints.filter(p => p.type === "snapshot");
    return restorePoints;
  }, [restorePoints, restoreMode]);

  const selectedPoint = restorePoints.find(p => p.id === selectedRestorePoint);

  const executeRestore = async () => {
    if (!selectedPoint) return;
    setRestoring(true);
    try {
      if (selectedPoint.type === "snapshot") {
        const snapshotId = selectedPoint.source.id;
        const userId = selectedPoint.source.user_id;
        const { error } = await supabase.rpc("restore_workspace_snapshot", {
          p_user_id: userId,
          p_snapshot_id: snapshotId,
          p_restore_mode: "full",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("backup_records").insert({
          backup_type: "restore",
          status: "in_progress",
          started_at: new Date().toISOString(),
          metadata: { source_backup_id: selectedPoint.source.id, restore_type: "full" },
        });
        if (error) throw error;
      }
      toast.success("Workspace restore initiated successfully");
      setRestoreConfirmOpen(false);
      setConfirmText("");
      setSelectedRestorePoint(null);
      await fetchData();
    } catch (err: any) {
      toast.error("Restore failed: " + err.message);
    } finally {
      setRestoring(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Disaster Recovery Control Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor, manage, and simulate recovery scenarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={runAssessment} disabled={runningAssessment} className="gap-1.5">
            {runningAssessment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Run Assessment
          </Button>
          <Button size="sm" onClick={triggerBackup} disabled={runningBackup} className="gap-1.5">
            {runningBackup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
            Backup Now
          </Button>
        </div>
      </div>

      {/* ─── Four-section tabs ────────────────────────────────── */}
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">System</span> Status
          </TabsTrigger>
          <TabsTrigger value="backups" className="gap-1.5 text-xs sm:text-sm">
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Backup</span> Mgmt
          </TabsTrigger>
          <TabsTrigger value="restore" className="gap-1.5 text-xs sm:text-sm">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restore</span> System
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-1.5 text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Recovery</span> Sim
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: System Recovery Status
            "Are my backups working?"
           ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="status" className="space-y-4">
          {/* Operational Risk Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Last Successful Backup */}
            <Card className={cn(
              "border-l-4",
              backupAge.severity === "good" ? "border-l-emerald-500" :
              backupAge.severity === "warn" ? "border-l-yellow-500" : "border-l-destructive"
            )}>
              <CardContent className="p-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <StatusPulse status={backupAge.severity} />
                    Last Successful Backup
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{backupAge.label}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">
                    {lastBackup?.backup_type ?? "none"}
                  </Badge>
                  {lastBackup?.completed_at && (
                    <span>{format(new Date(lastBackup.completed_at), "MMM d, HH:mm")}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recovery Time Estimate */}
            {(() => {
              const rows = lastBackup?.row_count ?? 0;
              const tables = lastBackup?.table_count ?? 0;
              const estimatedSec = rows > 0 ? Math.ceil(rows / 5000) + (tables * 30) + 60 : 0;
              const estimatedMin = Math.ceil(estimatedSec / 60);
              const rteSeverity: "good" | "warn" | "critical" = estimatedMin <= 15 ? "good" : estimatedMin <= 60 ? "warn" : "critical";
              return (
                <Card className={cn(
                  "border-l-4",
                  rteSeverity === "good" ? "border-l-emerald-500" :
                  rteSeverity === "warn" ? "border-l-yellow-500" : "border-l-destructive"
                )}>
                  <CardContent className="p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Timer className="h-3 w-3" />
                      Recovery Time Estimate
                    </div>
                    <p className="text-2xl font-bold tracking-tight">
                      {rows > 0 ? (estimatedMin < 60 ? `${estimatedMin} min` : `${(estimatedMin / 60).toFixed(1)} hr`) : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {rows > 0
                        ? `${tables} tables · ${rows.toLocaleString()} rows to restore`
                        : "No backup data to estimate from"}
                    </p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Backup Storage Usage */}
            {(() => {
              const totalBytes = completedBackups.reduce((s, b) => s + (b.backup_size_bytes ?? 0), 0);
              const avgBytes = completedBackups.length > 0 ? Math.round(totalBytes / completedBackups.length) : 0;
              return (
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <HardDrive className="h-3 w-3" />
                      Backup Storage Usage
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{formatBytes(totalBytes)}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{completedBackups.length} backups</span>
                      <span>·</span>
                      <span>~{formatBytes(avgBytes)} avg</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Recovery Confidence Score */}
            <Card className={cn(
              "border-l-4",
              recoveryScore >= 80 ? "border-l-emerald-500" :
              recoveryScore >= 50 ? "border-l-yellow-500" : "border-l-destructive"
            )}>
              <CardContent className="p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Gauge className="h-3 w-3" />
                  Recovery Confidence
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold tracking-tight">{recoveryScore}%</p>
                  <Badge
                    variant={recoveryScore >= 80 ? "default" : recoveryScore >= 50 ? "warning" : "destructive"}
                    className="text-[10px] h-4 px-1.5"
                  >
                    {recoveryScore >= 80 ? "Ready" : recoveryScore >= 50 ? "At Risk" : "Critical"}
                  </Badge>
                </div>
                <div className="w-full mt-0.5">
                  <Progress
                    value={recoveryScore}
                    className="h-1.5"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {successRate}% backup success · {latestChecks.length} checks run
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ─── Recovery Status Indicator ─────────────────────── */}
          {(() => {
            const issues: string[] = [];
            if (!lastBackup) issues.push("No backups have been created");
            else if (backupAge.severity === "critical") issues.push(`Backups not running (last: ${backupAge.label})`);
            else if (backupAge.severity === "warn") issues.push(`Backup overdue (last: ${backupAge.label})`);
            if (snapshots.length === 0) issues.push("No snapshots available");
            if (failedBackups.length > 0) issues.push(`${failedBackups.length} recent backup failure${failedBackups.length > 1 ? "s" : ""}`);
            if (recoveryScore < 50) issues.push(`Recovery confidence critically low (${recoveryScore}%)`);
            if (latestChecks.length === 0) issues.push("No recovery checks have been run");
            else if (failCount > 0) issues.push(`${failCount} recovery check${failCount > 1 ? "s" : ""} failing`);
            else if (warnCount > 0) issues.push(`${warnCount} recovery check${warnCount > 1 ? "s" : ""} with warnings`);

            const severity: "good" | "warn" | "critical" =
              issues.length === 0 ? "good" :
              (!lastBackup || backupAge.severity === "critical" || recoveryScore < 50 || failCount > 0) ? "critical" : "warn";

            const statusLabel = severity === "good" ? "All Systems Operational" : severity === "warn" ? "Needs Attention" : "Critical Issues Detected";
            const StatusIcon = severity === "good" ? CheckCircle2 : severity === "warn" ? AlertTriangle : ShieldAlert;

            return (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn(
                  "border",
                  severity === "good" ? "border-emerald-500/30 bg-emerald-500/5" :
                  severity === "warn" ? "border-yellow-500/30 bg-yellow-500/5" :
                  "border-destructive/30 bg-destructive/5"
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "p-2.5 rounded-xl shrink-0",
                          severity === "good" ? "bg-emerald-500/10" :
                          severity === "warn" ? "bg-yellow-500/10" :
                          "bg-destructive/10"
                        )}>
                          <StatusIcon className={cn(
                            "h-6 w-6",
                            severity === "good" ? "text-emerald-600" :
                            severity === "warn" ? "text-yellow-600" :
                            "text-destructive"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recovery Status</p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <p className="text-lg font-bold text-foreground">{statusLabel}</p>
                            <Badge
                              variant={severity === "good" ? "default" : severity === "warn" ? "warning" : "destructive"}
                              className="text-[10px] h-5 px-2"
                            >
                              {issues.length === 0 ? "Healthy" : `${issues.length} issue${issues.length > 1 ? "s" : ""}`}
                            </Badge>
                          </div>

                          {issues.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              <p className="text-xs font-medium text-foreground">Issues detected:</p>
                              <ul className="space-y-1">
                                {issues.map((issue, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <span className={cn(
                                      "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                                      severity === "critical" ? "bg-destructive" : "bg-yellow-500"
                                    )} />
                                    {issue}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {severity === "good" && (
                            <p className="text-xs text-muted-foreground mt-2">
                              All backups are current, snapshots are available, and recovery checks are passing.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={severity !== "good" ? "default" : "outline"}
                          onClick={runAssessment}
                          disabled={runningAssessment}
                          className="gap-1.5 h-9 text-xs"
                        >
                          {runningAssessment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          Run Recovery Assessment
                        </Button>
                        {severity !== "good" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={triggerBackup}
                            disabled={runningBackup}
                            className="gap-1.5 h-9 text-xs"
                          >
                            {runningBackup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                            Run Backup Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* Score gauge + secondary stats */}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
            <Card className="flex items-center justify-center px-8 py-6">
              <RecoveryScoreGauge score={recoveryScore} />
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Success Rate
                  </div>
                  <p className="text-xl font-bold">{successRate}%</p>
                  <p className="text-[11px] text-muted-foreground">
                    {completedBackups.length}/{backups.length} backups
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Server className="h-3 w-3" />
                    Snapshots
                  </div>
                  <p className="text-xl font-bold">{snapshots.length}</p>
                  <p className="text-[11px] text-muted-foreground">
                    recovery points
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Checks
                  </div>
                  <p className="text-xl font-bold">{latestChecks.length}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="text-emerald-600">{passCount}✓</span>
                    {" · "}
                    <span className="text-yellow-600">{warnCount}⚠</span>
                    {" · "}
                    <span className="text-destructive">{failCount}✗</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Failed
                  </div>
                  <p className="text-xl font-bold">{failedBackups.length}</p>
                  <p className="text-[11px] text-muted-foreground">
                    backup failures
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recovery Readiness Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Recovery Readiness Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestChecks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No checks have been run yet</p>
                  <p className="text-xs mt-1 mb-4">Run an assessment to evaluate your recovery posture.</p>
                  <Button size="sm" onClick={runAssessment} disabled={runningAssessment} className="gap-1.5">
                    {runningAssessment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Run First Assessment
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {latestChecks.map((check) => {
                    const cfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.info;
                    const Icon = cfg.icon;
                    const meta = CHECK_LABELS[check.check_type];
                    const detailText = getCheckDetail(check);
                    return (
                      <motion.div
                        key={check.check_type}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <Icon className={cn("h-5 w-5 shrink-0", cfg.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{meta?.label ?? check.check_type}</p>
                            <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", cfg.color)}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {meta?.question}
                          </p>
                          {detailText && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">{detailText}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(check.checked_at), { addSuffix: true })}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Recovery Plan ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Recovery Plan
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">Incident Playbook</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Follow these steps in order during an actual recovery incident.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8">
                {/* Vertical connector */}
                <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />

                {[
                  {
                    step: 1,
                    title: "Assess the Situation",
                    description: "Identify the scope of data loss or corruption. Check error logs and determine which workspaces are affected.",
                    action: "Run Recovery Assessment",
                    onAction: runAssessment,
                    actionDisabled: runningAssessment,
                    actionLoading: runningAssessment,
                    icon: Activity,
                    status: latestChecks.length > 0 ? "done" as const : "pending" as const,
                  },
                  {
                    step: 2,
                    title: "Restore Latest Snapshot",
                    description: "Select the most recent verified snapshot or backup and initiate the restore process. A pre-restore snapshot is created automatically.",
                    action: "Go to Restore",
                    onAction: () => {
                      const el = document.querySelector('[data-value="restore"]') as HTMLElement;
                      el?.click();
                    },
                    icon: RotateCcw,
                    status: snapshots.length > 0 ? "ready" as const : "blocked" as const,
                    statusNote: snapshots.length === 0 ? "No snapshots available" : `${snapshots.length} snapshots ready`,
                  },
                  {
                    step: 3,
                    title: "Verify Data Integrity",
                    description: "Run the recovery simulation to confirm restored data is complete and consistent. Validate row counts, table coverage, and RLS policies.",
                    action: "Run Simulation",
                    onAction: () => {
                      const el = document.querySelector('[data-value="simulation"]') as HTMLElement;
                      el?.click();
                    },
                    icon: Shield,
                    status: recoveryScore >= 80 ? "done" as const : recoveryScore >= 50 ? "ready" as const : "pending" as const,
                  },
                  {
                    step: 4,
                    title: "Reconnect Services",
                    description: "Verify that authentication, real-time subscriptions, and edge functions are operational. Confirm API endpoints are responding correctly.",
                    icon: Zap,
                    status: "pending" as const,
                  },
                  {
                    step: 5,
                    title: "Notify Stakeholders",
                    description: "Inform workspace administrators that service has been restored. Document the incident timeline and root cause for the post-mortem.",
                    icon: Info,
                    status: "pending" as const,
                  },
                ].map((item) => {
                  const stepDone = item.status === "done";
                  const stepBlocked = item.status === "blocked";
                  return (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: item.step * 0.06 }}
                      className="relative mb-4 last:mb-0"
                    >
                      {/* Step number circle */}
                      <div className={cn(
                        "absolute -left-8 top-3 h-[30px] w-[30px] rounded-full flex items-center justify-center text-xs font-bold border-2 border-background z-10",
                        stepDone ? "bg-emerald-500 text-white" :
                        stepBlocked ? "bg-muted text-muted-foreground" :
                        "bg-primary text-primary-foreground"
                      )}>
                        {stepDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.step}
                      </div>

                      <div className={cn(
                        "p-4 rounded-lg border transition-colors",
                        stepDone ? "bg-emerald-500/5 border-emerald-500/20" :
                        stepBlocked ? "bg-muted/30 border-border/50 opacity-60" :
                        "bg-card border-border/50 hover:bg-accent/30"
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <item.icon className={cn(
                                "h-4 w-4 shrink-0",
                                stepDone ? "text-emerald-600" :
                                stepBlocked ? "text-muted-foreground" :
                                "text-primary"
                              )} />
                              <p className="text-sm font-semibold text-foreground">{item.title}</p>
                              {item.statusNote && (
                                <Badge
                                  variant={stepBlocked ? "destructive" : "secondary"}
                                  className="text-[10px] h-4 px-1.5"
                                >
                                  {item.statusNote}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                          {item.action && item.onAction && (
                            <Button
                              size="sm"
                              variant={stepDone ? "outline" : "secondary"}
                              onClick={item.onAction}
                              disabled={item.actionDisabled || stepBlocked}
                              className="gap-1.5 h-8 text-xs shrink-0"
                            >
                              {item.actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                              {item.action}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: Backup Management
            "Can I restore my system right now?"
           ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="backups" className="space-y-4">
          {/* Backup pipeline health */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className={cn(
              "border-l-4",
              completedBackups.length > 0 ? "border-l-emerald-500" : "border-l-destructive"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Completed</p>
                    <p className="text-3xl font-bold mt-1">{completedBackups.length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className={cn(
              "border-l-4",
              failedBackups.length === 0 ? "border-l-emerald-500" : "border-l-destructive"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Failed</p>
                    <p className="text-3xl font-bold mt-1">{failedBackups.length}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Size</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatBytes(completedBackups.reduce((s, b) => s + (b.backup_size_bytes ?? 0), 0))}
                    </p>
                  </div>
                  <HardDrive className="h-8 w-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Backup Configuration ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Backup Configuration
                  {config?.updated_at && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(config.updated_at), { addSuffix: true })}
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {configChanged && (
                    <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30 animate-pulse">
                      Unsaved changes
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={saveConfig}
                    disabled={savingConfig || !configChanged}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {savingConfig ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Configuration
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!config ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No backup configuration found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Frequency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Backup Frequency
                    </label>
                    <Select
                      value={configDraft.frequency || "daily"}
                      onValueChange={(v) => setConfigDraft(prev => ({ ...prev, frequency: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/70">
                      {configDraft.frequency === "hourly" ? "Every hour — highest protection, most storage" :
                       configDraft.frequency === "weekly" ? "Once per week — lowest storage cost" :
                       "Once per day — recommended balance"}
                    </p>
                  </div>

                  {/* Retention */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Timer className="h-3 w-3" /> Backup Retention
                    </label>
                    <Select
                      value={String(configDraft.retention_days || 30)}
                      onValueChange={(v) => setConfigDraft(prev => ({ ...prev, retention_days: Number(v) }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/70">
                      Backups older than {configDraft.retention_days || 30} days are automatically purged
                    </p>
                  </div>

                  {/* Snapshot Strategy */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Database className="h-3 w-3" /> Snapshot Strategy
                    </label>
                    <Select
                      value={configDraft.snapshot_strategy || "full"}
                      onValueChange={(v) => setConfigDraft(prev => ({ ...prev, snapshot_strategy: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Backup</SelectItem>
                        <SelectItem value="incremental">Incremental Backup</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/70">
                      {configDraft.snapshot_strategy === "incremental"
                        ? "Only changed data since last backup — faster, less storage"
                        : "Complete copy of all data — slower but fully self-contained"}
                    </p>
                  </div>

                  {/* Storage Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <HardDrive className="h-3 w-3" /> Storage Location
                    </label>
                    <Select
                      value={configDraft.storage_location || "platform_managed"}
                      onValueChange={(v) => setConfigDraft(prev => ({ ...prev, storage_location: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform_managed">Platform Managed</SelectItem>
                        <SelectItem value="external">External Storage</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/70">
                      {configDraft.storage_location === "external"
                        ? "Stored on your configured external storage"
                        : "Stored securely on the platform"}
                    </p>
                  </div>
                </div>
              )}

              {/* Current config summary strip */}
              {config && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Active Policy:</span>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" /> {config.frequency}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Timer className="h-2.5 w-2.5" /> {config.retention_days}d retention
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Database className="h-2.5 w-2.5" /> {config.snapshot_strategy}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <HardDrive className="h-2.5 w-2.5" /> {config.storage_location === "platform_managed" ? "platform" : "external"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={triggerBackup}
                      disabled={runningBackup}
                      className="gap-1.5 h-8"
                    >
                      {runningBackup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Run Backup Now
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Backup Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Backup Timeline
                  <Badge variant="secondary" className="text-xs">{filteredBackups.length} records</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-input bg-background p-0.5">
                    {([
                      { value: "24h", label: "24 hours" },
                      { value: "7d", label: "7 days" },
                      { value: "30d", label: "30 days" },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setBackupTimelineFilter(opt.value)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                          backupTimelineFilter === opt.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={triggerBackup} disabled={runningBackup} className="gap-1.5 h-7 text-xs">
                    {runningBackup ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                    New Backup
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredBackups.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No backups in this time range</p>
                  <p className="text-xs mt-1 mb-4">
                    {backups.length === 0
                      ? "Create your first backup to enable disaster recovery."
                      : "Try expanding the filter to see older backups."}
                  </p>
                  {backups.length === 0 && (
                    <Button size="sm" onClick={triggerBackup} disabled={runningBackup} className="gap-1.5">
                      <Database className="h-3.5 w-3.5" /> Create First Backup
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px] -mx-1 px-1">
                  <div className="relative pl-6">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-1">
                      {filteredBackups.map((b, idx) => {
                        const duration = b.completed_at && b.started_at
                          ? differenceInMinutes(new Date(b.completed_at), new Date(b.started_at))
                          : null;
                        const isSuccess = b.status === "completed";
                        const isFailed = b.status === "failed";
                        const isInProgress = b.status === "in_progress";

                        // Show date separator when the day changes
                        const bDate = b.completed_at || b.started_at;
                        const prevDate = idx > 0 ? (filteredBackups[idx - 1].completed_at || filteredBackups[idx - 1].started_at) : null;
                        const showDateLabel = !prevDate || format(new Date(bDate), "yyyy-MM-dd") !== format(new Date(prevDate), "yyyy-MM-dd");

                        return (
                          <div key={b.id}>
                            {showDateLabel && (
                              <div className="flex items-center gap-2 py-2 -ml-6">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  {format(new Date(bDate), "EEEE, MMM d")}
                                </span>
                                <div className="flex-1 h-px bg-border/50" />
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className={cn(
                                "relative flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                isFailed ? "bg-destructive/5 border-destructive/20" :
                                isInProgress ? "bg-yellow-500/5 border-yellow-500/20" :
                                "bg-card hover:bg-accent/30 border-border/50"
                              )}
                            >
                              {/* Timeline dot */}
                              <div className={cn(
                                "absolute -left-6 top-1/2 -translate-y-1/2 h-[9px] w-[9px] rounded-full border-2 border-background z-10",
                                isSuccess ? "bg-emerald-500" :
                                isFailed ? "bg-destructive" :
                                "bg-yellow-500 animate-pulse"
                              )} />

                              {/* Time */}
                              <div className="w-14 shrink-0 text-center">
                                <p className="text-sm font-bold tabular-nums">
                                  {format(new Date(bDate), "HH:mm")}
                                </p>
                              </div>

                              <Separator orientation="vertical" className="h-8" />

                              {/* Details */}
                              <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant={isSuccess ? "default" : isFailed ? "destructive" : "warning"}
                                      className="text-[10px] h-4 px-1.5"
                                    >
                                      {b.status === "completed" ? "Success" : b.status === "failed" ? "Failed" : "Running"}
                                    </Badge>
                                    <span className="text-xs font-medium capitalize">{b.backup_type}</span>
                                  </div>
                                  {isFailed && b.error_message && (
                                    <p className="text-[10px] text-destructive truncate mt-0.5">{b.error_message}</p>
                                  )}
                                </div>

                                <div className="text-right">
                                  <p className="text-xs font-mono font-medium">{formatBytes(b.backup_size_bytes)}</p>
                                  <p className="text-[10px] text-muted-foreground">size</p>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs font-mono font-medium">
                                    {b.table_count ?? "—"}<span className="text-muted-foreground">t</span> / {b.row_count?.toLocaleString() ?? "—"}<span className="text-muted-foreground">r</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">coverage</p>
                                </div>

                                <div className="text-right w-12">
                                  <p className="text-xs font-mono font-medium">
                                    {duration !== null ? `${duration}m` : isInProgress ? "…" : "—"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">time</p>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: Restore System
            "Restore workspace from backup or snapshot"
           ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="restore" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                Restore System
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Select a restore strategy and choose a recovery point to roll back workspace data.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Restore mode */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Restore Option</label>
                <RadioGroup
                  value={restoreMode}
                  onValueChange={(v) => {
                    setRestoreMode(v as "latest" | "snapshot" | "date");
                    setSelectedRestorePoint(null);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {[
                    { value: "latest", icon: Zap, title: "Restore Latest Backup", desc: "Roll back to the most recent successful backup" },
                    { value: "snapshot", icon: History, title: "Restore From Snapshot", desc: "Choose a workspace snapshot as the restore point" },
                    { value: "date", icon: Calendar, title: "Restore Specific Date", desc: "Browse all available backups and snapshots" },
                  ].map(opt => (
                    <Label
                      key={opt.value}
                      htmlFor={`restore-${opt.value}`}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                        restoreMode === opt.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:bg-accent/40"
                      )}
                    >
                      <RadioGroupItem value={opt.value} id={`restore-${opt.value}`} className="mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5">
                          <opt.icon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium">{opt.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Restore point list */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="h-3 w-3" />
                  Choose Restore Point
                  <Badge variant="secondary" className="text-[10px] ml-1">{filteredRestorePoints.length} available</Badge>
                </label>

                {filteredRestorePoints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No restore points available</p>
                    <p className="text-xs mt-1">
                      {restoreMode === "snapshot"
                        ? "No workspace snapshots found. Create a snapshot first."
                        : "No completed backups found. Run a backup to create a restore point."}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className={cn(filteredRestorePoints.length > 5 && "h-[320px]")}>
                    <div className="space-y-1.5 pr-1">
                      {filteredRestorePoints.map((point) => (
                        <motion.button
                          key={point.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setSelectedRestorePoint(point.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3",
                            selectedRestorePoint === point.id
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                              : "border-border hover:bg-accent/40"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                            point.type === "backup" ? "bg-primary/10" : "bg-secondary"
                          )}>
                            {point.type === "backup"
                              ? <Database className="h-3.5 w-3.5 text-primary" />
                              : <History className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{point.label}</p>
                            <p className="text-xs text-muted-foreground">{point.sublabel}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {point.type}
                          </Badge>
                          {selectedRestorePoint === point.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <Separator />

              {/* Restore action */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-muted-foreground max-w-md">
                  {selectedPoint ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      Selected: <strong>{selectedPoint.label}</strong>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      Select a restore point above to continue
                    </span>
                  )}
                </div>
                <Button
                  size="default"
                  onClick={() => setRestoreConfirmOpen(true)}
                  disabled={!selectedPoint}
                  className="gap-2"
                  variant="destructive"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Restore Confirmation Modal ────────────────────────── */}
        <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" />
                Confirm Workspace Restore
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>
                    You are about to restore the workspace to a previous state. This is a{" "}
                    <strong className="text-destructive">destructive operation</strong> that will:
                  </p>
                  <ul className="space-y-1.5 ml-1">
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      <span><strong>Overwrite</strong> all current assets, containers, team members, and tasks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      <span><strong>Replace</strong> current data with the selected restore point</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>A <strong>pre-restore snapshot</strong> will be created automatically as a safety net</span>
                    </li>
                  </ul>

                  {selectedPoint && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                      <p className="text-xs font-medium text-foreground">Restore Point</p>
                      <p className="text-xs font-mono">{selectedPoint.label}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedPoint.sublabel}</p>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium">
                      Type <strong className="font-mono text-destructive">RESTORE</strong> to confirm:
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="RESTORE"
                      className="font-mono text-sm h-9"
                      autoFocus
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setConfirmText(""); }}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={executeRestore}
                disabled={confirmText !== "RESTORE" || restoring}
                className="gap-1.5"
              >
                {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {restoring ? "Restoring…" : "Restore Workspace"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: Recovery Simulation
            "Can we actually restore the system?"
           ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="simulation" className="space-y-4">
          {/* Recovery Test Runner */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Recovery Simulation
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verify that your system can actually be restored by running live validation checks.
                  </p>
                </div>
                <Button
                  onClick={runRecoveryTest}
                  disabled={runningRecoveryTest}
                  className="gap-2"
                  size="sm"
                >
                  {runningRecoveryTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run Recovery Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Score Display */}
              {recoveryTestScore !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <div className="relative h-32 w-32 flex items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
                      <motion.circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="currentColor"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - recoveryTestScore / 100) }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className={cn(
                          recoveryTestScore >= 80 ? "text-emerald-600" :
                          recoveryTestScore >= 50 ? "text-yellow-600" : "text-destructive"
                        )}
                      />
                    </svg>
                    <div className="text-center">
                      <motion.span
                        className={cn(
                          "text-3xl font-bold",
                          recoveryTestScore >= 80 ? "text-emerald-600" :
                          recoveryTestScore >= 50 ? "text-yellow-600" : "text-destructive"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {recoveryTestScore}%
                      </motion.span>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Readiness</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge
                      variant={recoveryTestScore >= 80 ? "success" : recoveryTestScore >= 50 ? "warning" : "destructive"}
                      className="text-xs"
                    >
                      {recoveryTestScore >= 80 ? "Recovery Ready" : recoveryTestScore >= 50 ? "Partially Ready" : "Not Ready"}
                    </Badge>
                    {recoveryTestTimestamp && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Tested {format(recoveryTestTimestamp, "MMM d, yyyy 'at' HH:mm")}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Test Results */}
              {recoveryTestResults && (
                <div className="space-y-2">
                  {recoveryTestResults.map((test, idx) => {
                    const isRunning = test.status === "running";
                    const statusIcon = isRunning ? Loader2 :
                      test.status === "pass" ? CheckCircle2 :
                      test.status === "warn" ? AlertTriangle : XCircle;
                    const StatusIcon = statusIcon;
                    const statusColor = isRunning ? "text-muted-foreground" :
                      test.status === "pass" ? "text-emerald-600" :
                      test.status === "warn" ? "text-yellow-600" : "text-destructive";

                    return (
                      <motion.div
                        key={test.name}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-lg border transition-colors",
                          isRunning ? "bg-muted/30 border-border animate-pulse" : "bg-card"
                        )}
                      >
                        <StatusIcon className={cn("h-5 w-5 shrink-0", statusColor, isRunning && "animate-spin")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{test.name}</p>
                            {!isRunning && (
                              <Badge
                                variant={test.status === "pass" ? "success" : test.status === "warn" ? "warning" : "destructive"}
                                className="text-[10px] h-4 px-1.5"
                              >
                                {test.status === "pass" ? "Passed" : test.status === "warn" ? "Warning" : "Failed"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>
                          {test.detail && !isRunning && (
                            <p className="text-xs text-muted-foreground/70 mt-1 font-mono">{test.detail}</p>
                          )}
                          {test.recommendation && !isRunning && (
                            <p className="text-xs mt-1.5 px-2.5 py-1.5 rounded-md bg-muted/60 border border-border/50 text-muted-foreground leading-relaxed">
                              <span className="font-medium text-foreground/80">↳ </span>{test.recommendation}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">Weight</p>
                          <p className="text-xs font-mono font-medium">{test.weight}%</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {!recoveryTestResults && !runningRecoveryTest && (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No recovery test has been run yet</p>
                  <p className="text-xs mt-1 mb-5 max-w-sm mx-auto">
                    Run a recovery test to verify backup accessibility, data integrity, snapshot availability, and environment readiness.
                  </p>
                  <Button size="sm" onClick={runRecoveryTest} className="gap-2">
                    <Play className="h-3.5 w-3.5" />
                    Run Recovery Test
                  </Button>
                </div>
              )}

              {/* Scenario Simulations (existing) */}
              {recoveryTestScore !== null && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2 mb-3">
                      <Gauge className="h-4 w-4 text-primary" />
                      Failure Scenario Analysis
                    </p>
                    <div className="space-y-3">
                      {simulations.map((sim, idx) => (
                        <motion.div
                          key={sim.scenario}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <button
                            onClick={() => setActiveSimulation(activeSimulation === idx ? null : idx)}
                            className={cn(
                              "w-full text-left p-4 rounded-lg border transition-all",
                              activeSimulation === idx
                                ? "bg-accent border-primary/30 shadow-sm"
                                : "bg-card hover:bg-accent/40"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                  sim.confidence >= 70 ? "bg-emerald-500/10" :
                                  sim.confidence >= 40 ? "bg-yellow-500/10" : "bg-destructive/10"
                                )}>
                                  <Gauge className={cn(
                                    "h-5 w-5",
                                    sim.confidence >= 70 ? "text-emerald-600" :
                                    sim.confidence >= 40 ? "text-yellow-600" : "text-destructive"
                                  )} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{sim.scenario}</p>
                                  <p className="text-xs text-muted-foreground">{sim.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                  <p className="text-xs text-muted-foreground">Confidence</p>
                                  <p className={cn(
                                    "text-sm font-bold",
                                    sim.confidence >= 70 ? "text-emerald-600" :
                                    sim.confidence >= 40 ? "text-yellow-600" : "text-destructive"
                                  )}>
                                    {sim.confidence}%
                                  </p>
                                </div>
                                <ArrowRight className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform",
                                  activeSimulation === idx && "rotate-90"
                                )} />
                              </div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {activeSimulation === idx && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 ml-4 border-l-2 border-primary/20 space-y-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-lg bg-muted/50 p-3">
                                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">RTO</p>
                                      <p className="text-sm font-bold mt-0.5">{sim.rto}</p>
                                      <p className="text-[10px] text-muted-foreground">Recovery Time</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-3">
                                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">RPO</p>
                                      <p className="text-sm font-bold mt-0.5">{sim.rpo}</p>
                                      <p className="text-[10px] text-muted-foreground">Data Loss Window</p>
                                    </div>
                                    <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Data at Risk</p>
                                      <p className="text-sm font-bold mt-0.5">{sim.dataAtRisk}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-medium">Recovery Confidence</p>
                                      <p className="text-xs font-mono">{sim.confidence}%</p>
                                    </div>
                                    <Progress value={sim.confidence} className="h-2" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                                      <Play className="h-3 w-3 text-primary" />
                                      Recovery Action Plan
                                    </p>
                                    <div className="space-y-1.5">
                                      {sim.actions.map((action, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                                            {i + 1}
                                          </span>
                                          <span className="text-muted-foreground pt-0.5">{action}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Check detail text helper ────────────────────────────────────

function getCheckDetail(check: RecoveryCheck): string {
  const d = check.details || {};
  switch (check.check_type) {
    case "rls_coverage":
      return d.coverage_pct != null ? `${d.coverage_pct}% of tables protected` : "";
    case "workspace_snapshots":
      return `${d.total_snapshots ?? 0} snapshots available`;
    case "data_volume":
      return `${d.total_assets ?? 0} assets · ${d.total_employees ?? 0} members · ${d.total_workspaces ?? 0} workspaces`;
    case "last_backup":
      return d.age_hours != null ? `${Number(d.age_hours).toFixed(1)}h since last backup` : "";
    case "audit_immutability":
      return d.audit_triggers_active ? "Immutability triggers active" : "Triggers missing!";
    default:
      return "";
  }
}
