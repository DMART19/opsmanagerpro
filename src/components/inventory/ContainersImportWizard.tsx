import { useState, useCallback, useMemo } from "react";
import { 
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2, 
  ArrowRight, ArrowLeft, Download, X, Info, AlertTriangle,
  FileText, Table2, CheckCheck, Loader2, HelpCircle
} from "lucide-react";
import { parseExcelFile, createExcelFile, createCsvFile } from "@/lib/excel-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

// Container field definitions with user-friendly labels
const CONTAINER_FIELDS = [
  { value: "box_number", label: "Container Number", required: true, hint: "Primary identifier for the container" },
  { value: "box_number_alt", label: "Alt Number", required: false, hint: "Alternative or secondary number" },
  { value: "cache_box_type", label: "Container Type", required: false, hint: "Type/category (e.g., Pelican, Road Case)" },
  { value: "box_description", label: "Description", required: false, hint: "Description of container contents" },
  { value: "barcode", label: "Barcode", required: false, hint: "Container barcode or QR code" },
  { value: "status_cache_box", label: "Status", required: false, hint: "Current status (Available, Checked Out, etc.)" },
  { value: "x_group_display", label: "Group", required: false, hint: "Assigned group or team" },
];

// Common column name synonyms for auto-matching
const COLUMN_SYNONYMS: Record<string, string[]> = {
  box_number: ["number", "container number", "container id", "box id", "case id", "case number", "id", "box #", "container #"],
  box_number_alt: ["alt number", "alt", "alternative", "secondary", "other number", "alt id"],
  cache_box_type: ["type", "container type", "box type", "case type", "category", "kind"],
  box_description: ["description", "desc", "contents", "notes", "details", "what's inside"],
  barcode: ["barcode", "bar code", "code", "scan code", "upc", "sku", "qr"],
  status_cache_box: ["status", "state", "condition", "availability"],
  x_group_display: ["group", "team", "assigned to", "owner", "dept", "department"],
};

interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  autoMatched: boolean;
}

interface RowValidation {
  rowIndex: number;
  issues: { field: string; message: string; severity: "error" | "warning" }[];
  data: Record<string, unknown>;
}

type WizardStep = "upload" | "headers" | "mapping" | "validation" | "confirm";

interface ContainersImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

export const ContainersImportWizard = ({ 
  open, 
  onOpenChange, 
  onImported 
}: ContainersImportWizardProps) => {
  const isMobile = useIsMobile();
  const { isTourMode } = useTourMode();
  const queryClient = useQueryClient();
  
  // Wizard state
  const [step, setStep] = useState<WizardStep>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Header detection
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  
  // Mapping state
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  
  // Validation state
  const [rowValidations, setRowValidations] = useState<RowValidation[]>([]);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);
  
  // Preview data
  const previewRows = useMemo(() => rawData.slice(0, 10), [rawData]);

  // ===== AUTO-MATCHING LOGIC =====
  const autoMatchColumn = useCallback((columnName: string): string | null => {
    const normalized = columnName.toLowerCase().trim().replace(/[_\-\s]+/g, " ");
    
    for (const field of CONTAINER_FIELDS) {
      const synonyms = COLUMN_SYNONYMS[field.value] || [];
      const allMatches = [field.value.replace(/_/g, " "), field.label.toLowerCase(), ...synonyms];
      
      for (const match of allMatches) {
        const normalizedMatch = match.toLowerCase().replace(/[_\-\s]+/g, " ");
        if (normalized === normalizedMatch || 
            normalized.includes(normalizedMatch) || 
            normalizedMatch.includes(normalized)) {
          return field.value;
        }
      }
    }
    return null;
  }, []);

  // ===== FILE HANDLING =====
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, []);

  const processFile = async (selectedFile: File) => {
    setFileError(null);
    setIsProcessing(true);
    
    // Validate file type
    const validTypes = [".csv", ".xlsx", ".xls"];
    const fileExt = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
    if (!validTypes.includes(fileExt)) {
      setFileError(`Unsupported file type. Please use CSV, XLSX, or XLS files.`);
      setIsProcessing(false);
      return;
    }
    
    // Validate file size (20MB max)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setFileError(`File too large. Maximum size is 20MB.`);
      setIsProcessing(false);
      return;
    }

    try {
      const { headers: parsedHeaders, rows } = await parseExcelFile(selectedFile);
      
      if (rows.length === 0) {
        setFileError("The file appears to be empty. Please check and try again.");
        setIsProcessing(false);
        return;
      }

      setFile(selectedFile);
      setHeaders(parsedHeaders);
      setRawData(rows);
      
      // Initialize mappings with auto-matching
      const mappings: ColumnMapping[] = parsedHeaders.map(header => {
        const matched = autoMatchColumn(header);
        return {
          excelColumn: header,
          dbField: matched,
          autoMatched: matched !== null,
        };
      });
      setColumnMappings(mappings);
      
      // Move to headers step
      setStep("headers");
      
      toast({
        title: "File loaded successfully",
        description: `Found ${rows.length} rows and ${parsedHeaders.length} columns`,
      });
    } catch (error: any) {
      setFileError(`Error reading file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== MAPPING LOGIC =====
  const updateMapping = useCallback((excelColumn: string, dbField: string | null) => {
    setColumnMappings(prev => prev.map(m => 
      m.excelColumn === excelColumn 
        ? { ...m, dbField, autoMatched: false }
        : m
    ));
  }, []);

  const mappedCount = columnMappings.filter(m => m.dbField).length;
  const requiredFieldsMapped = CONTAINER_FIELDS
    .filter(f => f.required)
    .every(f => columnMappings.some(m => m.dbField === f.value));

  // ===== VALIDATION LOGIC =====
  const validateData = useCallback(() => {
    const validations: RowValidation[] = [];

    rawData.forEach((row, index) => {
      const issues: { field: string; message: string; severity: "error" | "warning" }[] = [];
      
      // Check required fields
      CONTAINER_FIELDS.filter(f => f.required).forEach(field => {
        const mappedCol = columnMappings.find(m => m.dbField === field.value)?.excelColumn;
        if (mappedCol) {
          const value = row[mappedCol];
          if (!value || (typeof value === "string" && !value.trim())) {
            issues.push({
              field: field.label,
              message: `${field.label} is required`,
              severity: "error",
            });
          }
        } else {
          // Required field not mapped at all
          issues.push({
            field: field.label,
            message: `${field.label} is required but not mapped`,
            severity: "error",
          });
        }
      });

      validations.push({
        rowIndex: index + 1,
        issues,
        data: row,
      });
    });

    setRowValidations(validations);
    return validations;
  }, [rawData, columnMappings]);

  const errorRows = rowValidations.filter(v => v.issues.some(i => i.severity === "error"));
  const warningRows = rowValidations.filter(v => v.issues.some(i => i.severity === "warning") && !v.issues.some(i => i.severity === "error"));
  const validRows = rowValidations.filter(v => v.issues.length === 0);
  const rowsToImport = skipInvalidRows 
    ? rowValidations.filter(v => !v.issues.some(i => i.severity === "error"))
    : rowValidations;

  // ===== IMPORT LOGIC =====
  const handleImport = async () => {
    setIsProcessing(true);
    setImportProgress(0);

    try {
      // Get current user for RLS
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to import containers",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      const userId = sessionData.session.user.id;

      // Build mapping lookup
      const mappingLookup = columnMappings.reduce((acc, m) => {
        if (m.dbField) acc[m.excelColumn] = m.dbField;
        return acc;
      }, {} as Record<string, string>);

      // Prepare records - include user_id for RLS
      const records = rowsToImport.map(validation => {
        // Start with defaults for required fields
        let boxNumber = `BOX-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        let cacheBoxType = "Standard";
        let statusCacheBox = "Available";
        let boxNumberAlt: string | null = null;
        let boxDescription: string | null = null;
        let barcode: string | null = null;
        let xGroupDisplay: string | null = null;
        
        Object.entries(mappingLookup).forEach(([excelCol, dbField]) => {
          const value = validation.data[excelCol];
          const strVal = typeof value === "string" ? value.trim() : String(value || "");
          
          if (dbField === "box_number" && strVal) boxNumber = strVal;
          if (dbField === "cache_box_type" && strVal) cacheBoxType = strVal;
          if (dbField === "status_cache_box" && strVal) statusCacheBox = strVal;
          if (dbField === "box_number_alt") boxNumberAlt = strVal || null;
          if (dbField === "box_description") boxDescription = strVal || null;
          if (dbField === "barcode") barcode = strVal || null;
          if (dbField === "x_group_display") xGroupDisplay = strVal || null;
        });

        return {
          user_id: userId,
          box_number: boxNumber,
          cache_box_type: cacheBoxType,
          status_cache_box: statusCacheBox,
          box_number_alt: boxNumberAlt,
          box_description: boxDescription,
          barcode: barcode,
          x_group_display: xGroupDisplay,
        };
      });

      // Batch insert
      const batchSize = 50;
      let imported = 0;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from("cache_boxes")
          .insert(batch);
        
        if (error) throw error;
        
        imported += batch.length;
        setImportProgress(Math.round((imported / records.length) * 100));
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: ["boxes"] });

      toast({
        title: "Import successful!",
        description: `Successfully imported ${records.length} containers`,
      });

      onImported?.();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== TEMPLATE DOWNLOAD =====
  const downloadTemplate = async (format: "csv" | "excel") => {
    const sampleData = [
      {
        "Container Number": "CASE-001",
        "Alt Number": "ALT-001",
        "Container Type": "Pelican Case",
        "Description": "Camera equipment",
        "Barcode": "BC-001",
        "Status": "Available",
        "Group": "Production",
      },
      {
        "Container Number": "CASE-002",
        "Alt Number": "ALT-002",
        "Container Type": "Road Case",
        "Description": "Audio gear",
        "Barcode": "BC-002",
        "Status": "Checked Out",
        "Group": "Audio Team",
      },
    ];

    try {
      if (format === "excel") {
        await createExcelFile(sampleData, "container_import_template.xlsx", "Containers");
      } else {
        createCsvFile(sampleData, "container_import_template.csv");
      }
      toast({
        title: "Template downloaded",
        description: `Sample template saved as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ===== NAVIGATION =====
  const goToStep = (targetStep: WizardStep) => {
    if (targetStep === "validation") {
      validateData();
    }
    setStep(targetStep);
  };

  const handleClose = () => {
    // Reset state
    setStep("upload");
    setFile(null);
    setFileError(null);
    setRawData([]);
    setHeaders([]);
    setColumnMappings([]);
    setRowValidations([]);
    setImportProgress(0);
    setIsProcessing(false);
    onOpenChange(false);
  };

  // ===== STEP INDICATOR =====
  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { key: "headers", label: "Preview", icon: <Table2 className="h-4 w-4" /> },
    { key: "mapping", label: "Map Fields", icon: <ArrowRight className="h-4 w-4" /> },
    { key: "validation", label: "Validate", icon: <CheckCheck className="h-4 w-4" /> },
    { key: "confirm", label: "Import", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title={
        <>
          <FileSpreadsheet className="h-5 w-5" />
          Import Containers
        </>
      }
      description="Upload a CSV or Excel file to import containers."
    >

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b flex-shrink-0">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                i === currentStepIndex 
                  ? "bg-primary text-primary-foreground" 
                  : i < currentStepIndex
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
          <div className="py-4 space-y-6">
            {/* ===== STEP 1: UPLOAD ===== */}
            {step === "upload" && (
              <div className="space-y-6">
                {/* Demo reassurance */}
                {isTourMode && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Demo data resets automatically. Imports won't affect real data.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Drop zone */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={`border rounded-lg p-12 text-center transition-colors cursor-pointer hover:border-primary hover:bg-primary/5 ${
                    fileError ? "border-destructive bg-destructive/5" : "border-border bg-muted/30"
                  }`}
                  onClick={() => document.getElementById("container-file-input")?.click()}
                >
                  <input
                    id="container-file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {isProcessing ? (
                    <div className="space-y-3">
                      <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Processing file...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">
                        Drag and drop your file here
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse
                      </p>
                      <div className="flex justify-center gap-2">
                        <Badge variant="secondary">.CSV</Badge>
                        <Badge variant="secondary">.XLSX</Badge>
                        <Badge variant="secondary">.XLS</Badge>
                      </div>
                    </>
                  )}
                </div>

                {fileError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{fileError}</AlertDescription>
                  </Alert>
                )}

                {/* Template download */}
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Need a template?</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Download a sample template with the correct column headers.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate("csv")}>
                          <FileText className="h-4 w-4 mr-2" />
                          CSV Template
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadTemplate("excel")}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Excel Template
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ===== STEP 2: HEADER DETECTION ===== */}
            {step === "headers" && (
              <div className="space-y-6">
                {/* File info */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <span className="font-medium">{file?.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({rawData.length} rows, {headers.length} columns)
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Header toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="header-toggle" className="font-medium">
                      First row contains column headers
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Turn this off if your data starts in the first row
                    </p>
                  </div>
                  <Switch
                    id="header-toggle"
                    checked={firstRowIsHeader}
                    onCheckedChange={setFirstRowIsHeader}
                  />
                </div>

                {/* Preview table */}
                <div>
                  <h4 className="font-medium mb-3">Preview (first 10 rows)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            {headers.map((header, i) => (
                              <TableHead key={i} className="font-semibold whitespace-nowrap">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewRows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {headers.map((header, colIndex) => (
                                <TableCell key={colIndex} className="text-sm whitespace-nowrap max-w-[200px] truncate">
                                  {String(row[header] ?? "—")}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                  {rawData.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Showing 10 of {rawData.length} rows
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP 3: FIELD MAPPING ===== */}
            {step === "mapping" && (
              <div className="space-y-6">
                {/* Stats summary - responsive */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-3 sm:p-4 bg-muted/50 rounded-xl">
                  <div className="text-center min-w-[50px]">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{mappedCount}</div>
                    <div className="text-xs text-muted-foreground">Mapped</div>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div className="text-center min-w-[50px]">
                    <div className="text-xl sm:text-2xl font-bold text-muted-foreground">{headers.length - mappedCount}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div className="text-center min-w-[50px]">
                    <div className="text-xl sm:text-2xl font-bold">{rawData.length}</div>
                    <div className="text-xs text-muted-foreground">Rows</div>
                  </div>
                  <div className="flex-1" />
                  {requiredFieldsMapped ? (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Ready to continue</span>
                      <span className="sm:hidden">Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Map required field</span>
                      <span className="sm:hidden">Required</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <p className="text-sm text-muted-foreground">
                  Match your spreadsheet columns to container fields. We've auto-matched what we could—review and adjust as needed.
                </p>

                {/* Mapping cards - cleaner layout */}
                <div className="space-y-3">
                  {columnMappings.map((mapping) => {
                    const sampleValue = previewRows[0]?.[mapping.excelColumn];
                    const mappedField = mapping.dbField ? CONTAINER_FIELDS.find(f => f.value === mapping.dbField) : null;
                    const isRequired = mappedField?.required;
                    const isMapped = !!mapping.dbField;
                    
                    return (
                      <div 
                        key={mapping.excelColumn}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-colors ${
                          isMapped 
                            ? isRequired 
                              ? "bg-primary/5 border-primary/20" 
                              : "bg-card border-border"
                            : "bg-muted/30 border-dashed border-muted-foreground/20"
                        }`}
                      >
                        {/* Source column info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{mapping.excelColumn}</span>
                            {mapping.autoMatched && mapping.dbField && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Sample: <span className="text-foreground/70">{String(sampleValue ?? "—").substring(0, 40)}</span>
                          </div>
                        </div>

                        {/* Arrow - hidden on mobile */}
                        <ArrowRight className={`h-4 w-4 flex-shrink-0 hidden sm:block ${isMapped ? "text-primary" : "text-muted-foreground/40"}`} />

                        {/* Target field selector - full width on mobile */}
                        <div className="w-full sm:w-56 flex-shrink-0">
                          <Select
                            value={mapping.dbField || "_skip"}
                            onValueChange={(val) => updateMapping(mapping.excelColumn, val === "_skip" ? null : val)}
                          >
                            <SelectTrigger className={`w-full h-11 sm:h-10 ${!isMapped ? "border-dashed" : ""}`}>
                              <SelectValue placeholder="Skip this column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_skip">
                                <span className="text-muted-foreground italic">Skip column</span>
                              </SelectItem>
                              
                              {/* Required fields first */}
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                Required
                              </div>
                              {CONTAINER_FIELDS.filter(f => f.required).map((field) => {
                                const alreadyMapped = columnMappings.some(
                                  m => m.dbField === field.value && m.excelColumn !== mapping.excelColumn
                                );
                                return (
                                  <SelectItem 
                                    key={field.value} 
                                    value={field.value}
                                    disabled={alreadyMapped}
                                  >
                                    <span className="flex items-center gap-2">
                                      {field.label}
                                      {alreadyMapped && (
                                        <span className="text-[10px] text-muted-foreground">(mapped)</span>
                                      )}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                              
                              {/* Optional fields */}
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                                Optional
                              </div>
                              {CONTAINER_FIELDS.filter(f => !f.required).map((field) => {
                                const alreadyMapped = columnMappings.some(
                                  m => m.dbField === field.value && m.excelColumn !== mapping.excelColumn
                                );
                                return (
                                  <SelectItem 
                                    key={field.value} 
                                    value={field.value}
                                    disabled={alreadyMapped}
                                  >
                                    <span className="flex items-center gap-2">
                                      {field.label}
                                      {alreadyMapped && (
                                        <span className="text-[10px] text-muted-foreground">(mapped)</span>
                                      )}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== STEP 4: VALIDATION ===== */}
            {step === "validation" && (
              <div className="space-y-6">
                {/* Summary cards - responsive grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Card className="p-2 sm:p-4 text-center">
                    <CheckCircle2 className="h-5 sm:h-6 w-5 sm:w-6 mx-auto text-green-600 mb-1 sm:mb-2" />
                    <div className="text-lg sm:text-2xl font-bold text-green-600">{validRows.length}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Valid</div>
                  </Card>
                  <Card className="p-2 sm:p-4 text-center">
                    <AlertTriangle className="h-5 sm:h-6 w-5 sm:w-6 mx-auto text-yellow-600 mb-1 sm:mb-2" />
                    <div className="text-lg sm:text-2xl font-bold text-yellow-600">{warningRows.length}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Warnings</div>
                  </Card>
                  <Card className="p-2 sm:p-4 text-center">
                    <AlertCircle className="h-5 sm:h-6 w-5 sm:w-6 mx-auto text-destructive mb-1 sm:mb-2" />
                    <div className="text-lg sm:text-2xl font-bold text-destructive">{errorRows.length}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Errors</div>
                  </Card>
                </div>

                {/* Skip invalid toggle */}
                {errorRows.length > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="skip-invalid" className="font-medium">
                        Skip rows with errors
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Import only valid rows, skipping {errorRows.length} rows with errors
                      </p>
                    </div>
                    <Switch
                      id="skip-invalid"
                      checked={skipInvalidRows}
                      onCheckedChange={setSkipInvalidRows}
                    />
                  </div>
                )}

                {/* Issues list */}
                {errorRows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-destructive">Rows with errors</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {errorRows.slice(0, 10).map((validation) => (
                        <div key={validation.rowIndex} className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                          <div className="text-sm font-medium">Row {validation.rowIndex}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {validation.issues.map((issue, i) => (
                              <span key={i}>{issue.message}{i < validation.issues.length - 1 ? " · " : ""}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {errorRows.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          ...and {errorRows.length - 10} more rows with errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {errorRows.length === 0 && warningRows.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                    <h3 className="text-lg font-semibold">All Data Valid!</h3>
                    <p className="text-sm text-muted-foreground">No validation issues found. Ready to import.</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 5: CONFIRM ===== */}
            {step === "confirm" && (
              <div className="space-y-6">
                <div className="p-6 bg-muted/50 rounded-xl space-y-4">
                  <h3 className="font-semibold text-lg">Import Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Total Rows</span>
                      <span className="font-bold">{rawData.length}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Rows to Import</span>
                      <span className="font-bold text-green-600">{rowsToImport.length}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Mapped Fields</span>
                      <span className="font-bold">{mappedCount}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Skipped Rows</span>
                      <span className="font-bold text-muted-foreground">{rawData.length - rowsToImport.length}</span>
                    </div>
                  </div>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-sm text-center text-muted-foreground">
                      Importing... {importProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - responsive button layout */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing} className="w-full sm:w-auto h-11 sm:h-10">
            Cancel
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
            {step === "headers" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")} className="w-full sm:w-auto h-11 sm:h-10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => goToStep("mapping")} className="w-full sm:w-auto h-11 sm:h-10">
                  Map Fields
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            {step === "mapping" && (
              <>
                <Button variant="outline" onClick={() => setStep("headers")} className="w-full sm:w-auto h-11 sm:h-10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => goToStep("validation")} disabled={!requiredFieldsMapped} className="w-full sm:w-auto h-11 sm:h-10">
                  Validate
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            {step === "validation" && (
              <>
                <Button variant="outline" onClick={() => setStep("mapping")} className="w-full sm:w-auto h-11 sm:h-10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep("confirm")} disabled={rowsToImport.length === 0} className="w-full sm:w-auto h-11 sm:h-10">
                  Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            {step === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setStep("validation")} disabled={isProcessing} className="w-full sm:w-auto h-11 sm:h-10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleImport} disabled={isProcessing || rowsToImport.length === 0} className="w-full sm:w-auto h-11 sm:h-10">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import {rowsToImport.length}
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </ResponsiveDialog>
  );
};
