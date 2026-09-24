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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { useQueryClient } from "@tanstack/react-query";
import { CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";
import { useIsMobile } from "@/hooks/use-mobile";

// Asset field definitions with user-friendly labels
// These map to actual cache_inventory columns or are handled specially during import
const ASSET_FIELDS = [
  { value: "description", label: "Asset Name / Description", required: true, hint: "Primary name or description of the asset" },
  { value: "section", label: "Location / Section", required: false, hint: "Where the asset is stored or assigned" },
  { value: "serial_number", label: "Serial Number", required: false, hint: "Manufacturer serial number" },
  { value: "barcode", label: "Barcode", required: false, hint: "Asset barcode or QR code" },
  { value: "id_cache_fema", label: "Asset ID", required: false, hint: "Your internal asset identifier" },
  { value: "id_cache_tf", label: "Reference ID", required: false, hint: "Secondary reference number" },
  { value: "model_part_num", label: "Model / Part Number", required: false, hint: "Model number or part number" },
  { value: "date_expire", label: "Expiration Date", required: false, hint: "Date format: YYYY-MM-DD" },
  { value: "quantity_available", label: "Quantity", required: false, hint: "Number of items (defaults to 1)" },
  { value: "quantity_out", label: "Quantity Out", required: false, hint: "Number currently checked out" },
  { value: "box_number", label: "Box / Container Number", required: false, hint: "Container or box identifier" },
  { value: "is_internal", label: "Internal Use Only", required: false, hint: "Yes/No or True/False" },
  { value: "group_year", label: "Year", required: false, hint: "Acquisition or group year" },
  // These are stored in custom_data since they're text values (the DB uses foreign key IDs)
  { value: "_category", label: "Category", required: false, hint: "Type or category (e.g., Technology, Furniture)" },
  { value: "_status", label: "Status", required: false, hint: "Current status (Available, In Use, etc.)" },
  { value: "_manufacturer", label: "Manufacturer / Brand", required: false, hint: "Brand or manufacturer name" },
  { value: "_group", label: "Group / Team", required: false, hint: "Assigned group or team" },
];

// Common column name synonyms for auto-matching
const COLUMN_SYNONYMS: Record<string, string[]> = {
  description: ["name", "asset name", "asset_name", "item", "item name", "title", "product", "description", "desc"],
  _category: ["category", "type", "asset type", "class", "classification", "group type", "subcategory"],
  section: ["location", "loc", "department", "dept", "area", "zone", "warehouse", "room", "section"],
  _status: ["status", "state", "condition", "availability", "status_item"],
  serial_number: ["serial", "serial no", "serial #", "sn", "serial number"],
  barcode: ["barcode", "bar code", "code", "scan code", "upc", "sku"],
  id_cache_fema: ["id", "asset id", "asset_id", "item id", "item_id", "inventory id"],
  id_cache_tf: ["ref", "reference", "ref id", "reference id", "alt id", "secondary id"],
  _manufacturer: ["manufacturer", "mfg", "brand", "vendor", "make", "company"],
  model_part_num: ["model", "part", "part number", "part #", "model number", "model #", "pn"],
  date_expire: ["expiration", "expires", "expiry", "exp date", "expire date", "best by", "use by"],
  quantity_available: ["quantity", "qty", "count", "amount", "stock", "on hand", "available"],
  quantity_out: ["qty out", "checked out", "deployed", "in use count"],
  _group: ["group", "team", "assigned to", "owner", "custodian", "assignee"],
  box_number: ["box", "box number", "container", "container number", "bin"],
  is_internal: ["internal", "is internal", "internal only", "private"],
  group_year: ["year", "acquisition year", "purchase year", "fy"],
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

interface AssetsImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

export const AssetsImportWizard = ({ 
  open, 
  onOpenChange, 
  onImported 
}: AssetsImportWizardProps) => {
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
    
    for (const field of ASSET_FIELDS) {
      const synonyms = COLUMN_SYNONYMS[field.value] || [];
      const allMatches = [field.value, field.label.toLowerCase(), ...synonyms];
      
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
  const requiredFieldsMapped = ASSET_FIELDS
    .filter(f => f.required)
    .every(f => columnMappings.some(m => m.dbField === f.value));

  // ===== VALIDATION LOGIC =====
  const validateData = useCallback(() => {
    const validations: RowValidation[] = [];
    const mappingLookup = columnMappings.reduce((acc, m) => {
      if (m.dbField) acc[m.excelColumn] = m.dbField;
      return acc;
    }, {} as Record<string, string>);

    rawData.forEach((row, index) => {
      const issues: { field: string; message: string; severity: "error" | "warning" }[] = [];
      
      // Check required fields
      ASSET_FIELDS.filter(f => f.required).forEach(field => {
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
        }
      });

      // Validate date format
      const dateCol = columnMappings.find(m => m.dbField === "date_expire")?.excelColumn;
      if (dateCol && row[dateCol]) {
        const dateVal = String(row[dateCol]);
        // Accept various date formats, but flag clearly invalid ones
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal) && isNaN(Date.parse(dateVal))) {
          issues.push({
            field: "Expiration Date",
            message: `Invalid date format: "${dateVal}"`,
            severity: "warning",
          });
        }
      }

      // Validate quantities
      ["quantity_available", "quantity_out", "group_year"].forEach(field => {
        const col = columnMappings.find(m => m.dbField === field)?.excelColumn;
        if (col && row[col]) {
          const val = row[col];
          if (typeof val !== "number" && isNaN(Number(val))) {
            const fieldLabel = ASSET_FIELDS.find(f => f.value === field)?.label || field;
            issues.push({
              field: fieldLabel,
              message: `Should be a number: "${val}"`,
              severity: "warning",
            });
          }
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
          description: "Please log in to import assets",
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
        const record: Record<string, unknown> = {
          user_id: userId,
        };
        const customData: Record<string, unknown> = {};
        
        Object.entries(mappingLookup).forEach(([excelCol, dbField]) => {
          const value = validation.data[excelCol];
          
          // Fields prefixed with _ are stored in custom_data JSON
          if (dbField.startsWith("_")) {
            const key = dbField.slice(1); // remove underscore
            const strVal = typeof value === "string" ? value.trim() : (value ? String(value) : null);
            if (strVal) customData[key] = strVal;
            return;
          }
          
          // Type coercion based on field
          if (dbField === "quantity_out" || dbField === "quantity_available" || dbField === "group_year") {
            record[dbField] = value ? parseInt(String(value)) || 0 : 0;
          } else if (dbField === "is_internal") {
            const strVal = String(value || "").toLowerCase();
            record[dbField] = strVal === "true" || strVal === "yes" || strVal === "1";
          } else if (dbField === "date_expire" && value) {
            const dateVal = value instanceof Date ? value : new Date(String(value));
            record[dbField] = isNaN(dateVal.getTime()) ? null : dateVal.toISOString().split("T")[0];
          } else {
            const strVal = typeof value === "string" ? value.trim() : value;
            record[dbField] = strVal || null;
          }
        });

        // Store text-based relational data in custom_data
        if (Object.keys(customData).length > 0) {
          record.custom_data = customData;
        }

        // Set defaults
        if (!record.quantity_available) record.quantity_available = 1;
        if (!record.quantity_out) record.quantity_out = 0;

        return record;
      });

      // Batch insert
      const batchSize = 50;
      let imported = 0;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from("cache_inventory")
          .insert(batch);
        
        if (error) throw error;
        
        imported += batch.length;
        setImportProgress(Math.round((imported / records.length) * 100));
      }

      // Invalidate cache to update dashboard and all consumers
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });

      toast({
        title: "Import successful!",
        description: `Successfully imported ${records.length} assets`,
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
        "Asset Name": "Laptop - Dell XPS 15",
        "Category": "Technology",
        "Location": "Office A",
        "Status": "Available",
        "Serial Number": "SN-12345",
        "Barcode": "BC-001",
        "Asset ID": "ASSET-001",
        "Manufacturer": "Dell",
        "Model / Part Number": "XPS 15 9520",
        "Quantity": 1,
        "Box Number": "BOX-A1",
      },
      {
        "Asset Name": "Office Chair - Ergonomic",
        "Category": "Furniture",
        "Location": "Office B",
        "Status": "In Use",
        "Serial Number": "SN-67890",
        "Barcode": "BC-002",
        "Asset ID": "ASSET-002",
        "Manufacturer": "Herman Miller",
        "Model / Part Number": "Aeron",
        "Quantity": 5,
        "Box Number": "BOX-B2",
      },
    ];

    try {
      if (format === "excel") {
        await createExcelFile(sampleData, "asset_import_template.xlsx", "Assets");
      } else {
        createCsvFile(sampleData, "asset_import_template.csv");
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
          Import Assets
        </>
      }
      description="Upload a CSV or Excel file to import assets."
    >

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
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

        <ScrollArea className="flex-1 pr-4">
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
                  onClick={() => document.getElementById("asset-file-input")?.click()}
                >
                  <input
                    id="asset-file-input"
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
                {/* Stats summary - compact and informative */}
                <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{mappedCount}</div>
                    <div className="text-xs text-muted-foreground">Mapped</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{headers.length - mappedCount}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold">{rawData.length}</div>
                    <div className="text-xs text-muted-foreground">Rows</div>
                  </div>
                  <div className="flex-1" />
                  {requiredFieldsMapped ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Ready to continue
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Map required field
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <p className="text-sm text-muted-foreground">
                  Match your spreadsheet columns to asset fields. We've auto-matched what we could—review and adjust as needed.
                </p>

                {/* Mapping cards - cleaner layout */}
                <div className="space-y-3">
                  {columnMappings.map((mapping) => {
                    const sampleValue = previewRows[0]?.[mapping.excelColumn];
                    const mappedField = mapping.dbField ? ASSET_FIELDS.find(f => f.value === mapping.dbField) : null;
                    const isRequired = mappedField?.required;
                    const isMapped = !!mapping.dbField;
                    
                    return (
                      <div 
                        key={mapping.excelColumn}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
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
                                Auto-matched
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Sample: <span className="text-foreground/70">{String(sampleValue ?? "—").substring(0, 50)}</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className={`h-4 w-4 flex-shrink-0 ${isMapped ? "text-primary" : "text-muted-foreground/40"}`} />

                        {/* Target field selector */}
                        <div className="w-56 flex-shrink-0">
                          <Select
                            value={mapping.dbField || "_skip"}
                            onValueChange={(val) => updateMapping(mapping.excelColumn, val === "_skip" ? null : val)}
                          >
                            <SelectTrigger className={`w-full ${!isMapped ? "border-dashed" : ""}`}>
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
                              {ASSET_FIELDS.filter(f => f.required).map((field) => {
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
                              {ASSET_FIELDS.filter(f => !f.required).map((field) => {
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
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center border-green-500/30 bg-green-500/5">
                    <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                    <div className="text-sm text-muted-foreground">Valid Rows</div>
                  </Card>
                  <Card className="p-4 text-center border-yellow-500/30 bg-yellow-500/5">
                    <div className="text-2xl font-bold text-yellow-600">{warningRows.length}</div>
                    <div className="text-sm text-muted-foreground">With Warnings</div>
                  </Card>
                  <Card className="p-4 text-center border-red-500/30 bg-red-500/5">
                    <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
                    <div className="text-sm text-muted-foreground">With Errors</div>
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
                        {skipInvalidRows 
                          ? `${rowsToImport.length} rows will be imported` 
                          : "Import will fail if any row has errors"}
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
                {(errorRows.length > 0 || warningRows.length > 0) && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Issues Found</h4>
                    <ScrollArea className="max-h-[250px]">
                      <div className="space-y-2">
                        {[...errorRows, ...warningRows].slice(0, 20).map((validation) => (
                          <div 
                            key={validation.rowIndex}
                            className={`p-3 rounded-lg border ${
                              validation.issues.some(i => i.severity === "error")
                                ? "border-red-500/30 bg-red-500/5"
                                : "border-yellow-500/30 bg-yellow-500/5"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {validation.issues.some(i => i.severity === "error") 
                                ? <AlertCircle className="h-4 w-4 text-red-500" />
                                : <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              }
                              <span className="font-medium text-sm">Row {validation.rowIndex}</span>
                            </div>
                            <ul className="text-sm text-muted-foreground pl-6 space-y-0.5">
                              {validation.issues.map((issue, i) => (
                                <li key={i}>• {issue.field}: {issue.message}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {(errorRows.length + warningRows.length) > 20 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Showing 20 of {errorRows.length + warningRows.length} rows with issues
                      </p>
                    )}
                  </div>
                )}

                {/* All good message */}
                {errorRows.length === 0 && warningRows.length === 0 && (
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">All rows validated successfully!</AlertTitle>
                    <AlertDescription>
                      Your data looks great. You're ready to import.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* ===== STEP 5: CONFIRM ===== */}
            {step === "confirm" && (
              <div className="space-y-6">
                {/* Final summary */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Ready to import</AlertTitle>
                  <AlertDescription>
                    This will add <strong>{rowsToImport.length} assets</strong> to your inventory.
                    {isTourMode && " You can undo this import from the Actions menu."}
                  </AlertDescription>
                </Alert>

                {/* Import details */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-medium">Import Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File:</span>
                      <span className="font-medium">{file?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total rows:</span>
                      <span className="font-medium">{rawData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rows to import:</span>
                      <span className="font-medium text-green-600">{rowsToImport.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rows skipped:</span>
                      <span className="font-medium text-muted-foreground">{rawData.length - rowsToImport.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fields mapped:</span>
                      <span className="font-medium">{mappedCount}</span>
                    </div>
                  </div>
                </Card>

                {/* Field mappings preview */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Field Mappings</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {columnMappings.filter(m => m.dbField).map((mapping) => {
                      const fieldLabel = ASSET_FIELDS.find(f => f.value === mapping.dbField)?.label || mapping.dbField;
                      return (
                        <div key={mapping.excelColumn} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <span className="text-muted-foreground truncate">{mapping.excelColumn}</span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium truncate">{fieldLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Progress bar during import */}
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      Importing... {importProgress}%
                    </p>
                  </div>
                )}

                {/* Reassurance */}
                <p className="text-xs text-muted-foreground text-center">
                  You can edit or delete imported assets anytime
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step === "upload") {
                handleClose();
              } else {
                const prevIndex = currentStepIndex - 1;
                if (prevIndex >= 0) {
                  setStep(steps[prevIndex].key);
                }
              }
            }}
            disabled={isProcessing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === "upload" ? "Cancel" : "Back"}
          </Button>

          <div className="flex gap-2">
            {step === "confirm" ? (
              <Button 
                onClick={handleImport} 
                disabled={isProcessing || rowsToImport.length === 0}
                className="min-w-[140px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Import {rowsToImport.length} Assets
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const nextIndex = currentStepIndex + 1;
                  if (nextIndex < steps.length) {
                    goToStep(steps[nextIndex].key);
                  }
                }}
                disabled={
                  (step === "mapping" && !requiredFieldsMapped) ||
                  isProcessing
                }
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </ResponsiveDialog>
  );
};
