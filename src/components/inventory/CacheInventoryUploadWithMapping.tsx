import { useState } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { RowValidationError, validateQuantityFields } from "@/lib/excel-utils";

const DATABASE_FIELDS = [
  { value: "id_cache_fema", label: "Item ID", required: false },
  { value: "id_cache_tf", label: "Reference ID", required: false },
  { value: "barcode", label: "Barcode", required: false },
  { value: "section", label: "Location / Section", required: false },
  { value: "subcategory", label: "Category", required: false },
  { value: "description", label: "Description", required: false },
  { value: "manufacturer", label: "Manufacturer", required: false },
  { value: "model_part_num", label: "Model / Part #", required: false },
  { value: "serial_number", label: "Serial Number", required: false },
  { value: "date_expire", label: "Expiration Date", required: false },
  { value: "quantity_out", label: "Quantity Out", required: false },
  { value: "quantity_available", label: "Quantity Available", required: false },
  { value: "status_item", label: "Status", required: false },
  { value: "group_abbv", label: "Group", required: false },
  { value: "is_internal", label: "Internal", required: false },
  { value: "group_year", label: "Year", required: false },
] as const;

// Fields that require quantity validation
const QUANTITY_FIELDS = ['quantity_out', 'quantity_available'];

interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
}

interface CacheInventoryUploadWithMappingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

export const CacheInventoryUploadWithMapping = ({ open, onOpenChange, onUploaded }: CacheInventoryUploadWithMappingProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "confirm">("upload");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<RowValidationError[]>([]);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const autoMatchColumn = (excelCol: string): string | null => {
    const normalized = excelCol.toLowerCase().trim();
    
    for (const field of DATABASE_FIELDS) {
      const fieldLabel = field.label.toLowerCase();
      const fieldValue = field.value.toLowerCase();
      
      if (normalized === fieldLabel || normalized === fieldValue) {
        return field.value;
      }
      
      if (normalized.includes(fieldLabel) || fieldLabel.includes(normalized)) {
        return field.value;
      }
    }
    
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      await processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    try {
      const { parseExcelFile } = await import("@/lib/excel-utils");
      const { headers, rows: jsonData } = await parseExcelFile(file);
      
      if (jsonData.length === 0) {
        setValidationErrors(["File is empty"]);
        return;
      }

      setExcelHeaders(headers);
      setExcelData(jsonData);
      setPreviewRows(jsonData.slice(0, 10));

      const mappings = headers.map(header => ({
        excelColumn: header,
        dbField: autoMatchColumn(header),
      }));
      setColumnMappings(mappings);

      setStep("mapping");
      toast({
        title: "File loaded",
        description: `Preview showing ${Math.min(10, jsonData.length)} of ${jsonData.length} rows`,
      });
    } catch (error: any) {
      setValidationErrors([`Error reading file: ${error.message}`]);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateMapping = (excelColumn: string, dbField: string) => {
    setColumnMappings(prev =>
      prev.map(m =>
        m.excelColumn === excelColumn ? { ...m, dbField } : m
      )
    );
  };

  const validateMappings = () => {
    const errors: string[] = [];
    const mappedFields = columnMappings
      .filter(m => m.dbField)
      .map(m => m.dbField);

    const duplicates = mappedFields.filter(
      (field, index) => mappedFields.indexOf(field) !== index
    );

    if (duplicates.length > 0) {
      errors.push(`Duplicate mappings detected: ${[...new Set(duplicates)].join(", ")}`);
    }

    return errors;
  };

  // Validate data before confirming import
  const validateData = (): RowValidationError[] => {
    // Build mapping from excel columns to db fields
    const mappingObj = columnMappings.reduce((acc, mapping) => {
      if (mapping.dbField) {
        acc[mapping.excelColumn] = mapping.dbField;
      }
      return acc;
    }, {} as Record<string, string>);

    // Transform data to use db field names for validation
    const transformedRows = excelData.map((row: any) => {
      const record: Record<string, unknown> = {};
      Object.entries(mappingObj).forEach(([excelCol, dbField]) => {
        record[dbField] = row[excelCol];
      });
      return record;
    });

    // Validate quantity fields
    return validateQuantityFields(transformedRows, QUANTITY_FIELDS);
  };

  const handleConfirm = () => {
    const mappingErrors = validateMappings();
    if (mappingErrors.length > 0) {
      setValidationErrors(mappingErrors);
      return;
    }

    // Validate row data
    const dataErrors = validateData();
    if (dataErrors.length > 0) {
      setRowErrors(dataErrors);
      setValidationErrors([`${dataErrors.length} row(s) have invalid data`]);
      setStep("confirm"); // Still go to confirm to show errors
      return;
    }

    setValidationErrors([]);
    setRowErrors([]);
    setStep("confirm");
  };

  const handleImport = async () => {
    // Block import if there are validation errors
    if (rowErrors.length > 0) {
      toast({
        title: "Cannot import",
        description: "Please fix validation errors before importing",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const mappingObj = columnMappings.reduce((acc, mapping) => {
        if (mapping.dbField) {
          acc[mapping.excelColumn] = mapping.dbField;
        }
        return acc;
      }, {} as Record<string, string>);

      const records = excelData.map((row: any) => {
        const record: any = {};
        
        Object.entries(mappingObj).forEach(([excelCol, dbField]) => {
          const value = row[excelCol];
          
          if (dbField === "quantity_out" || dbField === "quantity_available" || dbField === "group_year") {
            record[dbField] = value ? parseInt(value) : 0;
          } else if (dbField === "is_internal") {
            record[dbField] = value === true || value === "true" || value === "TRUE" || value === 1;
          } else if (dbField === "date_expire") {
            record[dbField] = value || null;
          } else {
            record[dbField] = value || null;
          }
        });

        return record;
      });

      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from("cache_inventory")
          .insert(batch);
        
        if (error) throw error;

        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      toast({
        title: "Import successful",
        description: `Successfully imported ${records.length} items`,
      });

      onUploaded?.();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setStep("upload");
    setValidationErrors([]);
    setRowErrors([]);
    setProgress(0);
    setExcelData([]);
    setExcelHeaders([]);
    setColumnMappings([]);
    setPreviewRows([]);
  };

  const mappedCount = columnMappings.filter(m => m.dbField).length;
  const unmappedCount = columnMappings.length - mappedCount;

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Upload Excel File"}
            {step === "mapping" && "Map Columns to Database Fields"}
            {step === "confirm" && "Confirm Import"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Select an Excel (.xlsx) or CSV file to upload"}
            {step === "mapping" && "Match each column in your file to the correct database field"}
            {step === "confirm" && `Ready to import ${excelData.length} rows`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {step === "upload" && (
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border rounded-lg p-8 bg-muted/30 hover:border-primary hover:bg-primary/5 transition-colors text-center">
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                        <span className="font-medium">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            resetState();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to select or drag and drop your Excel or CSV file
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </Label>
              </div>
            )}

            {step === "mapping" && (
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium">Mapped Columns</div>
                    <div className="text-2xl font-bold text-primary">{mappedCount}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Unmapped Columns</div>
                    <div className="text-2xl font-bold text-muted-foreground">{unmappedCount}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Total Rows</div>
                    <div className="text-2xl font-bold">{excelData.length}</div>
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {excelHeaders.map((header, index) => (
                          <TableHead key={index} className="min-w-[200px]">
                            <div className="space-y-2">
                              <div className="font-semibold text-xs">{header}</div>
              <Select
                value={columnMappings[index]?.dbField || "skip"}
                onValueChange={(value) => updateMapping(header, value === "skip" ? null : value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Skip column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip column</SelectItem>
                  {DATABASE_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                      {field.required && <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                              {columnMappings[index]?.dbField && (
                                <div className="flex items-center gap-1 text-xs text-success">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Mapped</span>
                                </div>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {excelHeaders.map((header, colIndex) => (
                            <TableCell key={colIndex} className="font-mono text-xs">
                              {String(row[header] || "—").substring(0, 50)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {previewRows.length < excelData.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    Showing first {previewRows.length} of {excelData.length} rows
                  </p>
                )}
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-3">Import Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total rows to import:</span>
                      <span className="font-bold">{excelData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mapped fields:</span>
                      <span className="font-bold">{mappedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unmapped fields:</span>
                      <span className="font-bold text-muted-foreground">{unmappedCount} (will be ignored)</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm">Field Mappings</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {columnMappings
                      .filter(m => m.dbField)
                      .map((mapping, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <span className="font-mono">{mapping.excelColumn}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{mapping.dbField}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Row-level validation errors */}
                {rowErrors.length > 0 && (
                  <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-destructive">Row Validation Errors</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Fix these errors in your file and re-upload, or remove the invalid rows.
                        </p>
                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                          {rowErrors.map((error, i) => (
                            <div 
                              key={i} 
                              className="flex items-center gap-2 p-2 bg-background/50 rounded text-sm"
                            >
                              <Badge variant="destructive" className="flex-shrink-0">
                                Row {error.rowIndex}
                              </Badge>
                              <span className="font-mono text-xs text-muted-foreground">
                                {error.field}
                              </span>
                              <span className="text-destructive">
                                "{String(error.value)}" — {error.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* General validation errors */}
                {validationErrors.length > 0 && rowErrors.length === 0 && (
                  <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-destructive">Validation Errors</h4>
                        <ul className="text-sm space-y-1 mt-2">
                          {validationErrors.map((error, i) => (
                            <li key={i} className="text-destructive">• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">{progress}% Complete</p>
              </div>
            )}

            {validationErrors.length > 0 && step === "mapping" && (
              <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-destructive">Validation Errors</h4>
                    <ul className="text-sm space-y-1 mt-2">
                      {validationErrors.map((error, i) => (
                        <li key={i} className="text-destructive">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => {
              if (step === "mapping") {
                setStep("upload");
                resetState();
              } else if (step === "confirm") {
                setStep("mapping");
                setValidationErrors([]);
                setRowErrors([]);
              } else {
                onOpenChange(false);
              }
            }}
            disabled={uploading}
          >
            {step === "upload" ? "Cancel" : "Back"}
          </Button>
          
          {step === "mapping" && (
            <Button onClick={handleConfirm} disabled={mappedCount === 0}>
              Continue to Confirmation
            </Button>
          )}
          
          {step === "confirm" && (
            <Button 
              onClick={handleImport} 
              disabled={uploading || rowErrors.length > 0}
              variant={rowErrors.length > 0 ? "outline" : "default"}
            >
              {uploading ? "Importing..." : rowErrors.length > 0 ? "Fix Errors to Import" : "Import to Inventory"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
