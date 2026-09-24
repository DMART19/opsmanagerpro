import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, AlertTriangle, CheckCircle2, Wand2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/excel-utils";
import { supabase } from "@/integrations/supabase/client";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { cn } from "@/lib/utils";

interface FlexibleRequirementsUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type MappingAction = "map-core" | "map-custom" | "create-new" | "skip";
type FieldType = "text" | "number" | "date" | "boolean" | "select";

interface FieldMapping {
  excelColumn: string;
  targetField: string;
  fieldType: FieldType;
  action: MappingAction;
  customFieldId?: string;
}

interface MissingFieldIssue {
  field: string;
  label: string;
  resolution: "column" | "default" | "skip" | null;
  selectedColumn?: string;
  defaultValue?: string;
}

interface ImportResults {
  success: number;
  errors: number;
  created: number;
}

const CORE_FIELDS = [
  { value: "title", label: "Title", required: true, defaultFallback: "Warehouse Worker" },
  { value: "requirement_type", label: "Requirement Type", required: true, defaultFallback: "General" },
  { value: "sort_key", label: "Sort Key", required: false },
  { value: "is_general", label: "Is General Requirement", required: false },
  { value: "description", label: "Description", required: false },
  { value: "renewal_cycle_months", label: "Renewal Interval (Months)", required: false },
  { value: "has_expiration", label: "Has Expiration", required: false },
  { value: "is_active", label: "Active Status", required: false },
] as const;

const SMART_DEFAULTS: Record<string, string> = {
  title: "Warehouse Worker",
  requirement_type: "General",
  is_active: "true",
};

const FIELD_ALIASES: Record<string, string[]> = {
  title: ["title", "name", "certificationname", "certname", "credentialname", "credential", "certification", "cert", "qualification", "course", "coursename", "trainingname", "training"],
  requirement_type: ["requirementtype", "type", "category", "certificationtype", "certtype", "credentialtype", "kind", "class", "classification", "group"],
  description: ["description", "desc", "details", "notes", "comments", "summary", "info", "information", "remark", "remarks"],
  renewal_cycle_months: ["renewalcyclemonths", "renewalinterval", "renewalintervalmonths", "renewal", "expirationperiod", "expirationperiodmonths", "validityperiod", "validperiod", "duration", "durationmonths", "months", "cycle", "interval"],
  has_expiration: ["hasexpiration", "expires", "expirable", "hasexpiry", "doesexpire", "expiration"],
  is_active: ["isactive", "active", "enabled", "status", "activestatus"],
  is_general: ["isgeneral", "general", "required", "requiredyesno", "mandatory", "isrequired", "ismandatory"],
  sort_key: ["sortkey", "sort", "order", "sortorder", "priority", "rank", "sequence"],
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeTextValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
};

const parseBooleanValue = (value: unknown): boolean | null => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "active", "required", "mandatory"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "inactive", "optional", "notrequired"].includes(normalized)) return false;
  return null;
};

const parseIntegerValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
};

const detectDataType = (values: unknown[]): FieldType => {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonEmpty.length === 0) return "text";
  const booleanCount = nonEmpty.filter((v) => parseBooleanValue(v) !== null).length;
  if (booleanCount / nonEmpty.length > 0.8) return "boolean";
  const numericCount = nonEmpty.filter((v) => parseIntegerValue(v) !== null).length;
  if (numericCount / nonEmpty.length > 0.8) return "number";
  return "text";
};

const fuzzyMatch = (excelCol: string, targetField: string): number => {
  const col = normalizeKey(excelCol);
  const field = normalizeKey(targetField);
  if (col === field) return 1;

  for (const [coreValue, aliases] of Object.entries(FIELD_ALIASES)) {
    const fieldLabel = CORE_FIELDS.find((item) => item.value === targetField)?.label ?? "";
    if (coreValue === targetField || field === normalizeKey(fieldLabel)) {
      if (aliases.includes(col)) return 0.95;
    }
  }

  if (col.includes(field) || field.includes(col)) return 0.8;
  const colWords = excelCol.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const fieldWords = targetField.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const matches = colWords.filter((word) => fieldWords.some((fieldWord) => fieldWord.includes(word) || word.includes(fieldWord))).length;
  if (matches === 0) return 0;
  return matches / Math.max(colWords.length, fieldWords.length);
};

const normalizeMappedValue = (field: string, value: unknown) => {
  if (field === "is_general" || field === "has_expiration" || field === "is_active") {
    return parseBooleanValue(value);
  }

  if (field === "renewal_cycle_months" || field === "sort_key") {
    return parseIntegerValue(value);
  }

  return normalizeTextValue(value);
};

export const FlexibleRequirementsUpload = ({
  open,
  onOpenChange,
  onImportComplete,
}: FlexibleRequirementsUploadProps) => {
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [missingIssues, setMissingIssues] = useState<MissingFieldIssue[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResults>({ success: 0, errors: 0, created: 0 });
  const [showAllMappings, setShowAllMappings] = useState(false);
  const [importFailureReason, setImportFailureReason] = useState<string | null>(null);

  const { customFields } = useCustomFields("requirement_definitions");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      void processExcelFile(selectedFile);
    }
  };

  const processExcelFile = async (selectedFile: File) => {
    try {
      const { headers: parsedHeaders, rows: jsonData } = await parseExcelFile(selectedFile);
      if (jsonData.length === 0) {
        toast.error("File is empty");
        return;
      }

      setExcelData(jsonData);
      setHeaders(parsedHeaders);
      setImportFailureReason(null);

      const usedCoreFields = new Set<string>();
      const autoMappings: FieldMapping[] = [];

      for (const colName of parsedHeaders) {
        const normalizedCol = normalizeKey(colName);
        let matched = false;

        for (const coreField of CORE_FIELDS) {
          if (usedCoreFields.has(coreField.value)) continue;
          const aliases = FIELD_ALIASES[coreField.value] || [];
          if (aliases.includes(normalizedCol)) {
            const samples = jsonData.slice(0, 5).map((row: any) => row[colName]);
            autoMappings.push({
              excelColumn: colName,
              targetField: coreField.value,
              fieldType: detectDataType(samples),
              action: "map-core",
            });
            usedCoreFields.add(coreField.value);
            matched = true;
            break;
          }
        }

        if (!matched) {
          for (const customField of customFields) {
            const customFieldKey = normalizeKey(customField.field_label);
            if (normalizedCol === customFieldKey || normalizedCol.includes(customFieldKey) || customFieldKey.includes(normalizedCol)) {
              const samples = jsonData.slice(0, 5).map((row: any) => row[colName]);
              autoMappings.push({
                excelColumn: colName,
                targetField: customField.id,
                fieldType: detectDataType(samples),
                action: "map-custom",
                customFieldId: customField.id,
              });
              matched = true;
              break;
            }
          }
        }

        if (!matched) {
          const samples = jsonData.slice(0, 5).map((row: any) => row[colName]);
          let bestMatch: { field: string; score: number; action: MappingAction } = { field: "", score: 0, action: "skip" };

          for (const coreField of CORE_FIELDS) {
            if (usedCoreFields.has(coreField.value)) continue;
            const score = fuzzyMatch(colName, coreField.label);
            if (score > bestMatch.score && score > 0.4) {
              bestMatch = { field: coreField.value, score, action: "map-core" };
            }
          }

          if (bestMatch.action === "map-core") {
            usedCoreFields.add(bestMatch.field);
            autoMappings.push({
              excelColumn: colName,
              targetField: bestMatch.field,
              fieldType: detectDataType(samples),
              action: "map-core",
            });
          } else {
            autoMappings.push({
              excelColumn: colName,
              targetField: colName,
              fieldType: detectDataType(samples),
              action: "create-new",
            });
          }
        }
      }

      setMappings(autoMappings);

      const mappedCoreFields = autoMappings.filter((mapping) => mapping.action === "map-core").map((mapping) => mapping.targetField);
      const issues: MissingFieldIssue[] = CORE_FIELDS
        .filter((field) => field.required && !mappedCoreFields.includes(field.value))
        .map((field) => ({
          field: field.value,
          label: field.label,
          resolution: null,
          defaultValue: SMART_DEFAULTS[field.value] || "",
        }));

      const resolvedIssues = issues.map((issue) => {
        const aliases = FIELD_ALIASES[issue.field] || [];
        for (const col of parsedHeaders) {
          const normalizedHeader = normalizeKey(col);
          if (aliases.some((alias) => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
            return { ...issue, resolution: "column" as const, selectedColumn: col };
          }
        }
        return issue;
      });

      setMissingIssues(resolvedIssues);
      setStep("review");
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
    }
  };

  const matchedMappings = useMemo(() => mappings.filter((mapping) => mapping.action === "map-core" || mapping.action === "map-custom"), [mappings]);
  const extraMappings = useMemo(() => mappings.filter((mapping) => mapping.action === "create-new"), [mappings]);
  const hasUnresolvedIssues = missingIssues.some((issue) => issue.resolution === null);

  const handleAutoFix = () => {
    setMissingIssues((previous) => previous.map((issue) => ({
      ...issue,
      resolution: "default",
      defaultValue: SMART_DEFAULTS[issue.field] || "General",
    })));
  };

  const updateIssueResolution = (field: string, resolution: "column" | "default" | "skip", extra?: { column?: string; defaultValue?: string }) => {
    setMissingIssues((previous) => previous.map((issue) => (
      issue.field === field
        ? { ...issue, resolution, selectedColumn: extra?.column, defaultValue: extra?.defaultValue ?? issue.defaultValue }
        : issue
    )));
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    setImportFailureReason(null);

    let successCount = 0;
    let errorCount = 0;
    const rowFailureReasons: string[] = [];

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        setImportFailureReason("You must be logged in to import credential types.");
        setResults({ success: 0, errors: excelData.length, created: 0 });
        setStep("done");
        return;
      }

      const { data: requirementTypesData, error: requirementTypesError } = await supabase
        .from("requirement_types")
        .select("id, name")
        .order("name");

      if (requirementTypesError) throw requirementTypesError;

      const requirementTypeMap = new Map(
        (requirementTypesData || []).map((type) => [normalizeKey(type.name), { id: type.id, name: type.name }])
      );

      const ensureRequirementTypeId = async (typeName: string | null) => {
        const normalizedName = normalizeTextValue(typeName);
        if (!normalizedName) return null;

        const existing = requirementTypeMap.get(normalizeKey(normalizedName));
        if (existing) return existing.id;

        const { data, error } = await supabase
          .from("requirement_types")
          .insert({ name: normalizedName, user_id: user.id })
          .select("id, name")
          .single();

        if (error) throw error;

        requirementTypeMap.set(normalizeKey(data.name), { id: data.id, name: data.name });
        return data.id;
      };

      const resolutionMap: Record<string, { type: "column" | "default"; column?: string; value?: string }> = {};
      missingIssues.forEach((issue) => {
        if (issue.resolution === "column" && issue.selectedColumn) {
          resolutionMap[issue.field] = { type: "column", column: issue.selectedColumn };
        } else if (issue.resolution === "default" && issue.defaultValue) {
          resolutionMap[issue.field] = { type: "default", value: issue.defaultValue };
        }
      });

      for (let index = 0; index < excelData.length; index += 1) {
        const row = excelData[index];
        setProgress(((index + 1) / excelData.length) * 100);

        try {
          const coreData: Record<string, unknown> = { is_active: true };
          const customData: Record<string, unknown> = {};
          let requirementTypeLabel: string | null = null;

          for (const mapping of mappings) {
            if (mapping.action === "skip") continue;

            const rawValue = row[mapping.excelColumn];
            if (rawValue === undefined || rawValue === null || rawValue === "") continue;

            if (mapping.action === "map-core") {
              const normalizedValue = normalizeMappedValue(mapping.targetField, rawValue);
              if (mapping.targetField === "requirement_type") {
                requirementTypeLabel = normalizeTextValue(rawValue);
              } else if (normalizedValue !== null) {
                coreData[mapping.targetField] = normalizedValue;
              }
              continue;
            }

            const customField = mapping.customFieldId
              ? customFields.find((field) => field.id === mapping.customFieldId)
              : undefined;
            const customFieldKey = customField?.field_name || mapping.excelColumn.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
            const normalizedCustomValue = mapping.fieldType === "boolean"
              ? parseBooleanValue(rawValue)
              : mapping.fieldType === "number"
                ? parseIntegerValue(rawValue)
                : normalizeTextValue(rawValue);

            if (normalizedCustomValue !== null) {
              customData[customFieldKey] = normalizedCustomValue;
            }
          }

          for (const [field, resolution] of Object.entries(resolutionMap)) {
            const currentValue = field === "requirement_type" ? requirementTypeLabel : coreData[field];
            if (currentValue !== undefined && currentValue !== null && currentValue !== "") continue;

            const resolvedRawValue = resolution.type === "column"
              ? row[resolution.column || ""]
              : resolution.value;

            if (field === "requirement_type") {
              requirementTypeLabel = normalizeTextValue(resolvedRawValue);
            } else {
              const resolvedValue = normalizeMappedValue(field, resolvedRawValue);
              if (resolvedValue !== null) {
                coreData[field] = resolvedValue;
              }
            }
          }

          if (!normalizeTextValue(coreData.title)) {
            coreData.title = SMART_DEFAULTS.title;
          }

          if (!requirementTypeLabel) {
            requirementTypeLabel = SMART_DEFAULTS.requirement_type;
          }

          const requirementTypeId = await ensureRequirementTypeId(requirementTypeLabel);
          if (!requirementTypeId) {
            throw new Error("Missing requirement type after mapping.");
          }

          const mappedRow = {
            title: normalizeTextValue(coreData.title),
            description: normalizeTextValue(coreData.description),
            sort_key: parseIntegerValue(coreData.sort_key),
            is_general: parseBooleanValue(coreData.is_general),
            has_expiration: parseBooleanValue(coreData.has_expiration),
            is_active: parseBooleanValue(coreData.is_active) ?? true,
            renewal_cycle_months: parseIntegerValue(coreData.renewal_cycle_months),
            requirement_type_id: requirementTypeId,
            user_id: user.id,
            custom_data: Object.keys(customData).length > 0 ? customData : null,
          };

          console.log("[FlexibleRequirementsUpload] mapped row", {
            rowIndex: index,
            source: row,
            mapped: mappedRow,
            requirementTypeLabel,
          });

          if (!mappedRow.title) {
            throw new Error("Missing title after mapping.");
          }

          const { error } = await supabase
            .from("requirement_definitions")
            .insert(mappedRow as any);

          if (error) throw error;
          successCount += 1;
        } catch (error) {
          errorCount += 1;
          const message = error instanceof Error ? error.message : "Row import failed";
          rowFailureReasons.push(`Row ${index + 1}: ${message}`);
          console.error("Error importing row:", { rowIndex: index, row, message, error });
        }
      }

      const failureReason = successCount === 0
        ? rowFailureReasons[0] || "No rows could be imported after mapping and validation."
        : null;

      setImportFailureReason(failureReason);
      setResults({ success: successCount, errors: errorCount, created: 0 });
      setStep("done");

      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import";
      console.error("Import error:", error);
      setImportFailureReason(message);
      setResults({ success: 0, errors: excelData.length || 0, created: 0 });
      setStep("done");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setExcelData([]);
    setHeaders([]);
    setMappings([]);
    setMissingIssues([]);
    setProgress(0);
    setResults({ success: 0, errors: 0, created: 0 });
    setShowAllMappings(false);
    setImportFailureReason(null);
    onOpenChange(false);
  };

  const canImport = !hasUnresolvedIssues && excelData.length > 0;
  const importSucceeded = step === "done" && results.success > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {step === "upload" && "Import Credential Types"}
            {step === "review" && "Review & Import"}
            {step === "done" && (importSucceeded ? "Import Complete" : "Import Failed")}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a spreadsheet — we'll handle the rest."}
            {step === "review" && `${excelData.length} rows detected. Review the mapping below.`}
            {step === "done" && (importSucceeded ? "Your credential types have been imported." : importFailureReason || "We couldn't insert any rows.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {step === "upload" && (
            <div className="space-y-4 pt-2">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="req-excel-upload"
              />
              <Label htmlFor="req-excel-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium text-foreground">Click to upload spreadsheet</p>
                  <p className="text-sm text-muted-foreground mt-1">XLSX, XLS, or CSV</p>
                </div>
              </Label>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4 pt-2">
              {missingIssues.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      {hasUnresolvedIssues ? "Issues to resolve" : "Issues resolved"}
                    </h3>
                    {hasUnresolvedIssues && (
                      <Button variant="outline" size="sm" onClick={handleAutoFix} className="gap-1.5 text-xs">
                        <Wand2 className="h-3.5 w-3.5" />
                        Auto Fix All
                      </Button>
                    )}
                  </div>

                  {missingIssues.map((issue) => (
                    <div
                      key={issue.field}
                      className={cn(
                        "rounded-lg border p-3 space-y-2 transition-colors",
                        issue.resolution === null ? "border-warning/40 bg-warning/5" : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {issue.resolution === null ? (
                            <span className="text-warning">⚠ Missing required field: {issue.label}</span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              {issue.label} — {issue.resolution === "default" ? `default "${issue.defaultValue}"` : issue.resolution === "column" ? `from "${issue.selectedColumn}"` : "skipped"}
                            </span>
                          )}
                        </p>
                      </div>

                      {issue.resolution === null && (
                        <div className="flex flex-wrap gap-2">
                          <Select onValueChange={(column) => updateIssueResolution(issue.field, "column", { column })}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue placeholder="Select a column" />
                            </SelectTrigger>
                            <SelectContent>
                              {headers.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => updateIssueResolution(issue.field, "default", { defaultValue: SMART_DEFAULTS[issue.field] || "General" })}
                          >
                            Use default: "{SMART_DEFAULTS[issue.field] || "General"}"
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={() => updateIssueResolution(issue.field, "skip")}
                          >
                            Skip
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {headers.length} column{headers.length !== 1 ? "s" : ""} detected
                  {matchedMappings.length > 0 && ` · ${matchedMappings.length} auto-mapped`}
                </h3>
                {matchedMappings.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 divide-y divide-border">
                    {matchedMappings.map((mapping) => {
                      const coreField = CORE_FIELDS.find((field) => field.value === mapping.targetField);
                      const customField = mapping.customFieldId
                        ? customFields.find((field) => field.id === mapping.customFieldId)
                        : undefined;

                      return (
                        <div key={mapping.excelColumn} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <span className="font-mono text-xs text-muted-foreground truncate flex-1">{mapping.excelColumn}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-foreground truncate flex-1">{coreField?.label || customField?.field_label || mapping.targetField}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {extraMappings.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowAllMappings(!showAllMappings)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAllMappings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {extraMappings.length} additional column{extraMappings.length !== 1 ? "s" : ""} — will be saved as custom data
                  </button>
                  {showAllMappings && (
                    <div className="mt-2 rounded-lg border bg-muted/10 divide-y divide-border">
                      {extraMappings.map((mapping) => (
                        <div key={mapping.excelColumn} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="font-mono text-xs text-muted-foreground">{mapping.excelColumn}</span>
                          <span className="text-xs text-primary">Custom data</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importing && (
                <div className="space-y-2 pt-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Importing... {Math.round(progress)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 pt-2">
              <div className={cn(
                "rounded-xl border p-6 text-center",
                importSucceeded
                  ? "bg-success/5 border-success/20"
                  : "bg-destructive/5 border-destructive/20"
              )}>
                <CheckCircle2 className={cn(
                  "h-10 w-10 mx-auto mb-3",
                  importSucceeded ? "text-success" : "text-destructive"
                )} />
                <p className="text-2xl font-bold text-foreground">{results.success}</p>
                <p className="text-sm text-muted-foreground">
                  {importSucceeded ? "credential types imported" : "rows imported"}
                </p>
                {!importSucceeded && importFailureReason && (
                  <p className="text-sm text-destructive mt-3">{importFailureReason}</p>
                )}
              </div>

              {(results.errors > 0 || results.created > 0) && (
                <div className="flex gap-3">
                  {results.created > 0 && (
                    <div className="flex-1 rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{results.created}</p>
                      <p className="text-xs text-muted-foreground">Custom fields created</p>
                    </div>
                  )}
                  {results.errors > 0 && (
                    <div className="flex-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                      <p className="text-lg font-bold text-destructive">{results.errors}</p>
                      <p className="text-xs text-muted-foreground">Rows skipped</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-3 justify-end pt-4 border-t">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === "review" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setExcelData([]);
                  setMappings([]);
                  setMissingIssues([]);
                  setImportFailureReason(null);
                }}
                disabled={importing}
              >
                Back
              </Button>
              <Button onClick={handleImport} disabled={!canImport || importing}>
                {importing ? "Importing..." : `Import ${excelData.length} Rows`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};