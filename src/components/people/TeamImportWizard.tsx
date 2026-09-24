import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  ArrowRight, ArrowLeft, Download, Loader2, FileText,
  ChevronDown, ChevronUp, Sparkles, Users, Zap, Shield,
  AlertTriangle, Settings2
} from "lucide-react";
import { parseExcelFile, createExcelFile, createCsvFile } from "@/lib/excel-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Field definitions ──────────────────────────────────────────────
const TEAM_FIELDS = [
  { value: "first_name", label: "First Name", required: true },
  { value: "last_name", label: "Last Name", required: true },
  { value: "email", label: "Email", required: false },
  { value: "phone", label: "Phone", required: false },
  { value: "position", label: "Position / Title", required: false },
  { value: "department", label: "Department", required: false },
  { value: "employee_id", label: "Employee ID", required: false },
  { value: "fema_id", label: "Reference ID", required: false },
  { value: "base_location", label: "Location", required: false },
  { value: "hire_date", label: "Hire Date", required: false },
  { value: "status", label: "Status", required: false },
  { value: "notes", label: "Notes", required: false },
];

const COLUMN_SYNONYMS: Record<string, string[]> = {
  first_name: ["first name", "firstname", "first", "given name", "fname", "given"],
  last_name: ["last name", "lastname", "last", "surname", "family name", "lname", "family"],
  email: ["email", "e-mail", "email address", "mail", "e mail"],
  phone: ["phone", "phone number", "telephone", "tel", "mobile", "cell", "phone #", "cell phone"],
  position: ["position", "title", "job title", "role", "job", "occupation", "job role"],
  department: ["department", "dept", "team", "division", "group", "unit"],
  employee_id: ["employee id", "emp id", "employee number", "emp #", "id", "staff id", "emp no"],
  fema_id: ["reference id", "ref id", "sid"],
  base_location: ["location", "office", "site", "base", "work location", "office location", "city"],
  hire_date: ["hire date", "start date", "date hired", "employment date", "joined", "date of hire"],
  status: ["status", "employment status", "active", "state", "emp status"],
  notes: ["notes", "comments", "remarks", "additional info"],
};

// Special detection for combined name columns
const FULL_NAME_SYNONYMS = ["full name", "fullname", "name", "employee name", "team member", "member name", "full_name"];

// ─── Types ──────────────────────────────────────────────────────────
interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  autoMatched: boolean;
}

interface AnalysisResult {
  totalRows: number;
  confidence: "high" | "medium" | "low";
  fieldsRecognized: number;
  totalFields: number;
  issues: AnalysisIssue[];
  autoFixes: AutoFix[];
  fullNameColumn: string | null;
  duplicates: number;
}

interface AnalysisIssue {
  type: "missing_email" | "invalid_email" | "invalid_phone" | "duplicate" | "blank_name" | "invalid_date";
  count: number;
  message: string;
  severity: "warning" | "error";
  autoFixable: boolean;
}

interface AutoFix {
  type: string;
  description: string;
  count: number;
}

type WizardStep = "upload" | "review" | "importing";

interface TeamImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

// ─── Utilities ──────────────────────────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[_\-\s#.]+/g, " ").trim();
}

function autoMatchColumn(columnName: string): string | null {
  const norm = normalize(columnName);
  for (const field of TEAM_FIELDS) {
    const synonyms = COLUMN_SYNONYMS[field.value] || [];
    const allMatches = [field.value.replace(/_/g, " "), field.label.toLowerCase(), ...synonyms];
    for (const match of allMatches) {
      const normMatch = normalize(match);
      if (norm === normMatch || norm.includes(normMatch) || normMatch.includes(norm)) {
        return field.value;
      }
    }
  }
  return null;
}

function isFullNameColumn(columnName: string): boolean {
  const norm = normalize(columnName);
  return FULL_NAME_SYNONYMS.some(s => norm === normalize(s) || norm.includes(normalize(s)));
}

function splitFullName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  // Last word is last name, rest is first name
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone.trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Component ──────────────────────────────────────────────────────
export const TeamImportWizard = ({
  open,
  onOpenChange,
  onImported
}: TeamImportWizardProps) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<WizardStep>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Cleaned data after normalization
  const [cleanedData, setCleanedData] = useState<Record<string, unknown>[]>([]);

  const [showMapping, setShowMapping] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // ─── Analysis ───────────────────────────────────────────────────
  const analyzeData = useCallback((
    rows: Record<string, unknown>[],
    hdrs: string[],
    mappings: ColumnMapping[]
  ): AnalysisResult => {
    const fieldsRecognized = mappings.filter(m => m.dbField).length;
    const fullNameCol = hdrs.find(h => isFullNameColumn(h)) || null;
    const issues: AnalysisIssue[] = [];
    const autoFixes: AutoFix[] = [];

    // Detect full name splitting
    if (fullNameCol) {
      autoFixes.push({
        type: "name_split",
        description: `"${fullNameCol}" will be split into First + Last name`,
        count: rows.length,
      });
    }

    // Check for email issues
    const emailCol = mappings.find(m => m.dbField === "email")?.excelColumn;
    if (emailCol) {
      const missing = rows.filter(r => !r[emailCol] || String(r[emailCol]).trim() === "").length;
      const invalid = rows.filter(r => {
        const v = r[emailCol];
        return v && String(v).trim() !== "" && !isValidEmail(String(v));
      }).length;
      if (missing > 0) {
        issues.push({ type: "missing_email", count: missing, message: `${missing} missing emails`, severity: "warning", autoFixable: false });
      }
      if (invalid > 0) {
        issues.push({ type: "invalid_email", count: invalid, message: `${invalid} invalid email formats`, severity: "warning", autoFixable: true });
        autoFixes.push({ type: "email_normalize", description: "Normalize email formatting", count: invalid });
      }
    }

    // Check phone normalization
    const phoneCol = mappings.find(m => m.dbField === "phone")?.excelColumn;
    if (phoneCol) {
      const withPhone = rows.filter(r => r[phoneCol] && String(r[phoneCol]).trim()).length;
      if (withPhone > 0) {
        autoFixes.push({ type: "phone_normalize", description: "Normalize phone formats", count: withPhone });
      }
    }

    // Check blank names
    const firstNameCol = mappings.find(m => m.dbField === "first_name")?.excelColumn;
    const lastNameCol = mappings.find(m => m.dbField === "last_name")?.excelColumn;
    if (!fullNameCol) {
      const blankNames = rows.filter(r => {
        const fn = firstNameCol ? String(r[firstNameCol] || "").trim() : "";
        const ln = lastNameCol ? String(r[lastNameCol] || "").trim() : "";
        return !fn && !ln;
      }).length;
      if (blankNames > 0) {
        issues.push({ type: "blank_name", count: blankNames, message: `${blankNames} rows with no name`, severity: "error", autoFixable: false });
      }
    }

    // Check duplicates (by email)
    let duplicates = 0;
    if (emailCol) {
      const seen = new Set<string>();
      rows.forEach(r => {
        const email = String(r[emailCol] || "").trim().toLowerCase();
        if (email && seen.has(email)) duplicates++;
        if (email) seen.add(email);
      });
      if (duplicates > 0) {
        issues.push({ type: "duplicate", count: duplicates, message: `${duplicates} duplicate emails`, severity: "warning", autoFixable: true });
        autoFixes.push({ type: "dedup", description: "Skip duplicate rows", count: duplicates });
      }
    }

    // Whitespace trimming
    autoFixes.push({ type: "trim", description: "Trim whitespace from all fields", count: rows.length });

    // Blank row removal
    const blankRows = rows.filter(r => Object.values(r).every(v => !v || String(v).trim() === "")).length;
    if (blankRows > 0) {
      autoFixes.push({ type: "blank_rows", description: "Remove blank rows", count: blankRows });
    }

    // Confidence
    const hasRequiredMapped = TEAM_FIELDS.filter(f => f.required).every(
      f => mappings.some(m => m.dbField === f.value) || fullNameCol
    );
    const errorCount = issues.filter(i => i.severity === "error").reduce((sum, i) => sum + i.count, 0);
    const confidence: "high" | "medium" | "low" =
      hasRequiredMapped && errorCount === 0 ? "high" :
        hasRequiredMapped ? "medium" : "low";

    return {
      totalRows: rows.length,
      confidence,
      fieldsRecognized: fieldsRecognized + (fullNameCol ? 1 : 0),
      totalFields: hdrs.length,
      issues,
      autoFixes,
      fullNameColumn: fullNameCol,
      duplicates,
    };
  }, []);

  // ─── Clean data ─────────────────────────────────────────────────
  const buildCleanedData = useCallback((
    rows: Record<string, unknown>[],
    mappings: ColumnMapping[],
    analysisResult: AnalysisResult
  ): Record<string, unknown>[] => {
    const mappingLookup: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.dbField) mappingLookup[m.excelColumn] = m.dbField;
    });

    const emailCol = mappings.find(m => m.dbField === "email")?.excelColumn;
    const seenEmails = new Set<string>();

    return rows
      // Remove blank rows
      .filter(r => !Object.values(r).every(v => !v || String(v).trim() === ""))
      .map(row => {
        const record: Record<string, unknown> = {};

        // Handle full name splitting
        if (analysisResult.fullNameColumn) {
          const fullName = String(row[analysisResult.fullNameColumn] || "").trim();
          const { first, last } = splitFullName(fullName);
          record.first_name = first;
          record.last_name = last;
        }

        Object.entries(mappingLookup).forEach(([excelCol, dbField]) => {
          // Skip if already set by full name split
          if ((dbField === "first_name" || dbField === "last_name") && analysisResult.fullNameColumn) return;

          let value = row[excelCol];
          if (value === null || value === undefined) {
            record[dbField] = null;
            return;
          }

          let strVal = String(value).trim();

          if (dbField === "email" && strVal) {
            strVal = normalizeEmail(strVal);
          } else if (dbField === "phone" && strVal) {
            strVal = normalizePhone(strVal);
          } else if (dbField === "hire_date" && strVal) {
            const dateVal = value instanceof Date ? value : new Date(strVal);
            record[dbField] = isNaN(dateVal.getTime()) ? null : dateVal.toISOString().split("T")[0];
            return;
          }

          record[dbField] = strVal || null;
        });

        return record;
      })
      // Remove rows with no name
      .filter(r => {
        const fn = String(r.first_name || "").trim();
        const ln = String(r.last_name || "").trim();
        return fn || ln;
      })
      // Deduplicate by email
      .filter(r => {
        if (!emailCol) return true;
        const email = String(r.email || "").trim().toLowerCase();
        if (!email) return true;
        if (seenEmails.has(email)) return false;
        seenEmails.add(email);
        return true;
      });
  }, []);

  // ─── File processing ────────────────────────────────────────────
  const processFile = async (selectedFile: File) => {
    setFileError(null);
    setIsProcessing(true);

    const validTypes = [".csv", ".xlsx", ".xls"];
    const fileExt = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
    if (!validTypes.includes(fileExt)) {
      setFileError("Unsupported file type. Please use CSV, XLSX, or XLS files.");
      setIsProcessing(false);
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      setFileError("File too large. Maximum size is 20MB.");
      setIsProcessing(false);
      return;
    }

    try {
      const { headers: parsedHeaders, rows } = await parseExcelFile(selectedFile);
      if (rows.length === 0) {
        setFileError("The file appears to be empty.");
        setIsProcessing(false);
        return;
      }

      setFile(selectedFile);
      setHeaders(parsedHeaders);
      setRawData(rows);

      // Auto-match columns
      const mappings: ColumnMapping[] = parsedHeaders.map(header => {
        // Skip full-name columns from standard mapping — handled separately
        if (isFullNameColumn(header)) {
          return { excelColumn: header, dbField: null, autoMatched: false };
        }
        const matched = autoMatchColumn(header);
        return { excelColumn: header, dbField: matched, autoMatched: matched !== null };
      });

      // If a full name column exists, remove first_name/last_name from mappings
      const fullNameCol = parsedHeaders.find(h => isFullNameColumn(h));
      if (fullNameCol) {
        mappings.forEach(m => {
          if (m.dbField === "first_name" || m.dbField === "last_name") {
            m.dbField = null;
            m.autoMatched = false;
          }
        });
      }

      setColumnMappings(mappings);

      // Analyze
      const result = analyzeData(rows, parsedHeaders, mappings);
      setAnalysis(result);

      // Build cleaned data
      const cleaned = buildCleanedData(rows, mappings, result);
      setCleanedData(cleaned);

      setStep("review");
    } catch (error: any) {
      setFileError(`Error reading file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Recalculate when mappings change
  const recalculate = useCallback(() => {
    if (rawData.length === 0) return;
    const result = analyzeData(rawData, headers, columnMappings);
    setAnalysis(result);
    const cleaned = buildCleanedData(rawData, columnMappings, result);
    setCleanedData(cleaned);
  }, [rawData, headers, columnMappings, analyzeData, buildCleanedData]);

  const updateMapping = useCallback((excelColumn: string, dbField: string | null) => {
    setColumnMappings(prev => {
      const next = prev.map(m =>
        m.excelColumn === excelColumn
          ? { ...m, dbField, autoMatched: false }
          : m
      );
      return next;
    });
  }, []);

  // Recalculate on mapping changes (after review step entered)
  useEffect(() => {
    if (step === "review") recalculate();
  }, [columnMappings]);

  const mappedCount = columnMappings.filter(m => m.dbField).length;
  const requiredFieldsMapped = TEAM_FIELDS
    .filter(f => f.required)
    .every(f => columnMappings.some(m => m.dbField === f.value) || (analysis?.fullNameColumn && (f.value === "first_name" || f.value === "last_name")));

  // ─── Import ─────────────────────────────────────────────────────
  const handleImport = async () => {
    setIsProcessing(true);
    setImportProgress(0);
    setStep("importing");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({ title: "Authentication Required", description: "Please log in to import team members", variant: "destructive" });
        setIsProcessing(false);
        setStep("review");
        return;
      }
      const userId = sessionData.session.user.id;

      const [{ data: deptRows }, { data: statusRows }] = await Promise.all([
        supabase.from("departments").select("id, name").eq("user_id", userId),
        supabase.from("employee_statuses").select("id, name").eq("user_id", userId),
      ]);

      const deptMap = new Map((deptRows ?? []).map(d => [d.name.toLowerCase(), d.id]));
      const statusMap = new Map((statusRows ?? []).map(s => [s.name.toLowerCase(), s.id]));

      const records = cleanedData.map(row => {
        const record: Record<string, unknown> = { user_id: userId };

        Object.entries(row).forEach(([key, value]) => {
          if (key === "department" && value) {
            record.department_id = deptMap.get(String(value).trim().toLowerCase()) ?? null;
          } else if (key === "status" && value) {
            record.employee_status_id = statusMap.get(String(value).trim().toLowerCase()) ?? null;
          } else {
            record[key] = value;
          }
        });

        // Ensure first_name and last_name are present
        if (!record.first_name) record.first_name = "Unknown";
        if (!record.last_name) record.last_name = "";

        return record;
      });

      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase.from("employees").insert(batch as any);
        if (error) throw error;
        imported += batch.length;
        setImportProgress(Math.round((imported / records.length) * 100));
      }

      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      setImportedCount(records.length);
      setImportComplete(true);

      toast({
        title: "Import successful!",
        description: `Imported ${records.length} team members`,
      });

      onImported?.();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message || "An error occurred", variant: "destructive" });
      setStep("review");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Template download ──────────────────────────────────────────
  const downloadTemplate = async (format: "csv" | "excel") => {
    const sampleData = [
      { "First Name": "John", "Last Name": "Doe", "Email": "john.doe@example.com", "Phone": "(555) 123-4567", "Position": "Technician", "Department": "Operations", "Employee ID": "EMP-001", "Location": "Main Office", "Hire Date": "2024-01-15", "Status": "Active" },
      { "First Name": "Jane", "Last Name": "Smith", "Email": "jane.smith@example.com", "Phone": "(555) 987-6543", "Position": "Team Lead", "Department": "Management", "Employee ID": "EMP-002", "Location": "Field Office", "Hire Date": "2023-06-01", "Status": "Active" },
    ];
    try {
      if (format === "excel") await createExcelFile(sampleData, "team_import_template.xlsx", "Team Members");
      else createCsvFile(sampleData, "team_import_template.csv");
      toast({ title: "Template downloaded", description: `Saved as ${format.toUpperCase()}` });
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

  // ─── Reset ──────────────────────────────────────────────────────
  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setFileError(null);
    setRawData([]);
    setHeaders([]);
    setColumnMappings([]);
    setAnalysis(null);
    setCleanedData([]);
    setImportProgress(0);
    setIsProcessing(false);
    setShowMapping(false);
    setShowPreview(false);
    setImportComplete(false);
    setImportedCount(0);
    onOpenChange(false);
  };

  // ─── Confidence badge ──────────────────────────────────────────
  const ConfidenceBadge = ({ level }: { level: "high" | "medium" | "low" }) => {
    const config = {
      high: { label: "High confidence", className: "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800" },
      medium: { label: "Medium confidence", className: "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800" },
      low: { label: "Low confidence", className: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800" },
    };
    const c = config[level];
    return <Badge variant="outline" className={`${c.className} text-xs`}>{c.label}</Badge>;
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title={
        <>
          <FileSpreadsheet className="h-5 w-5" />
          Import Team Members
        </>
      }
      description={step === "upload" ? "Drop in your spreadsheet — we'll handle the rest" : undefined}
    >
      <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
        {/* ─── UPLOAD STEP ─────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-5 py-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer hover:border-primary hover:bg-primary/5 ${
                fileError ? "border-destructive bg-destructive/5" : "border-muted"
              }`}
              onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && processFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("team-file-input")?.click()}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing your file...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-1">Drop your spreadsheet here</p>
                  <p className="text-sm text-muted-foreground">CSV, XLSX, XLS — any format, any columns</p>
                </>
              )}
              <input
                id="team-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                className="hidden"
              />
            </div>

            {fileError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Download className="h-4 w-4 flex-shrink-0" />
              <span>Need a template?</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => downloadTemplate("excel")}>Excel</Button>
              <span>or</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => downloadTemplate("csv")}>CSV</Button>
            </div>
          </div>
        )}

        {/* ─── REVIEW / CONFIDENCE STEP ────────────────────────── */}
        {step === "review" && analysis && (
          <div className="space-y-4 py-4">
            {/* Hero status */}
            <div className={`rounded-xl p-5 text-center ${
              analysis.confidence === "high"
                ? "bg-green-500/5 border border-green-200 dark:border-green-800"
                : analysis.confidence === "medium"
                  ? "bg-yellow-500/5 border border-yellow-200 dark:border-yellow-800"
                  : "bg-red-500/5 border border-red-200 dark:border-red-800"
            }`}>
              {analysis.confidence === "high" ? (
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
              ) : analysis.confidence === "medium" ? (
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
              )}

              <h3 className="text-lg font-semibold mb-1">
                {analysis.confidence === "high" ? "Ready to Import" :
                  analysis.confidence === "medium" ? "Almost Ready" : "Needs Attention"}
              </h3>
              <ConfidenceBadge level={analysis.confidence} />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{cleanedData.length}</div>
                <div className="text-[10px] text-muted-foreground">Ready</div>
              </Card>
              <Card className="p-3 text-center">
                <Zap className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{analysis.fieldsRecognized}</div>
                <div className="text-[10px] text-muted-foreground">Fields Matched</div>
              </Card>
              <Card className="p-3 text-center">
                <Shield className="h-4 w-4 mx-auto mb-1 text-primary" />
                <div className="text-xl font-bold">{analysis.autoFixes.length}</div>
                <div className="text-[10px] text-muted-foreground">Auto-Fixes</div>
              </Card>
            </div>

            {/* Status checklist */}
            <Card className="p-4 space-y-2.5">
              {/* Recognized columns */}
              <div className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>{analysis.fieldsRecognized} of {analysis.totalFields} columns auto-detected</span>
              </div>

              {/* Full name split */}
              {analysis.fullNameColumn && (
                <div className="flex items-start gap-2.5 text-sm">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>"{analysis.fullNameColumn}" → split into First + Last name</span>
                </div>
              )}

              {/* Auto fixes */}
              {analysis.autoFixes.filter(f => f.type !== "trim").map((fix, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{fix.description}</span>
                </div>
              ))}

              {/* Issues */}
              {analysis.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  {issue.severity === "error" ? (
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{issue.message}{issue.autoFixable ? " — auto-fixed" : ""}</span>
                </div>
              ))}

              {analysis.issues.length === 0 && analysis.autoFixes.length <= 1 && (
                <div className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span>No issues detected</span>
                </div>
              )}
            </Card>

            {/* Collapsible mapping editor */}
            <Collapsible open={showMapping} onOpenChange={setShowMapping}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {showMapping ? "Hide" : "Review"} Column Mapping
                  </span>
                  {showMapping ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {columnMappings.map((mapping) => {
                    const sampleValue = rawData[0]?.[mapping.excelColumn];
                    const isMapped = !!mapping.dbField;
                    return (
                      <div
                        key={mapping.excelColumn}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                          isMapped ? "bg-card border-border" : "bg-muted/30 border-dashed border-muted-foreground/20"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">{mapping.excelColumn}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {String(sampleValue ?? "—").substring(0, 30)}
                          </div>
                        </div>
                        <ArrowRight className={`h-3 w-3 flex-shrink-0 ${isMapped ? "text-primary" : "text-muted-foreground/30"}`} />
                        <Select
                          value={mapping.dbField || "skip"}
                          onValueChange={(v) => updateMapping(mapping.excelColumn, v === "skip" ? null : v)}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip"><span className="text-muted-foreground italic">Skip</span></SelectItem>
                            {TEAM_FIELDS.map((field) => {
                              const taken = columnMappings.some(m => m.dbField === field.value && m.excelColumn !== mapping.excelColumn);
                              return (
                                <SelectItem key={field.value} value={field.value} disabled={taken}>
                                  {field.label}{field.required ? " *" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible data preview */}
            <Collapsible open={showPreview} onOpenChange={setShowPreview}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {showPreview ? "Hide" : "Preview"} Data ({cleanedData.length} rows)
                  </span>
                  {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg border overflow-hidden">
                  <ScrollArea className="max-h-52">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs w-8">#</TableHead>
                          <TableHead className="text-xs">First Name</TableHead>
                          <TableHead className="text-xs">Last Name</TableHead>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Phone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleanedData.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground py-1.5">{i + 1}</TableCell>
                            <TableCell className="text-xs py-1.5">{String(row.first_name || "—")}</TableCell>
                            <TableCell className="text-xs py-1.5">{String(row.last_name || "—")}</TableCell>
                            <TableCell className="text-xs py-1.5">{String(row.email || "—")}</TableCell>
                            <TableCell className="text-xs py-1.5">{String(row.phone || "—")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
                {cleanedData.length > 10 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    Showing 10 of {cleanedData.length} cleaned rows
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* ─── IMPORTING / COMPLETE STEP ───────────────────────── */}
        {step === "importing" && (
          <div className="space-y-6 py-8">
            {importComplete ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Import Complete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {importedCount} team members added successfully
                  </p>
                </div>
                <Button onClick={handleClose} className="w-full sm:w-auto">
                  Done
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                <div>
                  <h3 className="text-base font-medium">Importing team members...</h3>
                  <p className="text-sm text-muted-foreground mt-1">{importProgress}% complete</p>
                </div>
                <Progress value={importProgress} className="max-w-xs mx-auto" />
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* ─── Footer ────────────────────────────────────────────── */}
      {step !== "importing" && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === "review") {
                setStep("upload");
                setFile(null);
                setRawData([]);
                setAnalysis(null);
                setCleanedData([]);
              } else {
                handleClose();
              }
            }}
            disabled={isProcessing}
            className="h-11 sm:h-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === "upload" ? "Cancel" : "Back"}
          </Button>

          {step === "review" && (
            <Button
              onClick={handleImport}
              disabled={!requiredFieldsMapped || cleanedData.length === 0 || isProcessing}
              className="h-11 sm:h-10 gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Import {cleanedData.length}
            </Button>
          )}
        </div>
      )}
    </ResponsiveDialog>
  );
};
