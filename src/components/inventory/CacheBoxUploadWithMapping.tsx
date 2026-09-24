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

const DATABASE_FIELDS = [
  { value: "box_number", label: "Box Number", required: true },
  { value: "box_number_alt", label: "Alt Number", required: false },
  { value: "cache_box_type", label: "Box Type", required: true },
  { value: "box_description", label: "Description", required: false },
  { value: "barcode", label: "Barcode", required: false },
  { value: "status_cache_box", label: "Status", required: false },
  { value: "x_group_display", label: "Group", required: false },
] as const;

interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
}

interface CacheBoxUploadWithMappingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

export const CacheBoxUploadWithMapping = ({ open, onOpenChange, onUploaded }: CacheBoxUploadWithMappingProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "confirm">("upload");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
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

    // Check for required fields
    const requiredFields = DATABASE_FIELDS.filter(f => f.required).map(f => f.value);
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingRequired.length > 0) {
      errors.push(`Missing required fields: ${missingRequired.join(", ")}`);
    }

    return errors;
  };

  const handleConfirm = () => {
    const errors = validateMappings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setStep("confirm");
  };

  const handleImport = async () => {
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
          record[dbField] = value || null;
        });

        // Set default values for required fields if not provided
        if (!record.status_cache_box) {
          record.status_cache_box = "Available";
        }
        if (!record.cache_box_type && !mappingObj["cache_box_type"]) {
          record.cache_box_type = "Standard";
        }

        return record;
      });

      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from("cache_boxes")
          .insert(batch);
        
        if (error) throw error;

        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      toast({
        title: "Import successful",
        description: `Successfully imported ${records.length} boxes`,
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
            {step === "confirm" && `Ready to import ${excelData.length} boxes`}
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
                      <span>Total boxes to import:</span>
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

                {validationErrors.length > 0 && (
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
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleConfirm}>
                Continue to Confirm
              </Button>
            </>
          )}
          
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={uploading || validationErrors.length > 0}>
                {uploading ? "Importing..." : "Import Boxes"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
