import { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowRight, Plus, Settings } from "lucide-react";
import { parseExcelFile } from "@/lib/excel-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCustomFields } from "@/hooks/use-custom-fields";

interface ColumnMapping {
  excelColumn: string;
  dbField: string | null;
  isNewField: boolean;
  dataType: "text" | "number" | "date" | "boolean";
  sampleValues: string[];
}

interface ValidationIssue {
  row: number;
  column: string;
  issue: string;
  suggestedFix?: string;
}

interface FlexibleBoxUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}

export const FlexibleBoxUpload = ({ open, onOpenChange, onUploaded }: FlexibleBoxUploadProps) => {
  const [step, setStep] = useState<"upload" | "mapping" | "validation" | "confirm">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  
  const [flexibleMode, setFlexibleMode] = useState(true);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  
  const { customFields, createField, refetch: refetchFields } = useCustomFields("cache_boxes");

  // Core box fields (always present)
  const coreFields = [
    { value: "box_number", label: "Box Number", required: false },
    { value: "box_number_alt", label: "Alt Number", required: false },
    { value: "cache_box_type", label: "Box Type", required: false },
    { value: "box_description", label: "Description", required: false },
    { value: "barcode", label: "Barcode", required: false },
    { value: "status_cache_box", label: "Status", required: false },
    { value: "x_group_display", label: "Group", required: false },
  ];

  const allDbFields = [
    ...coreFields,
    ...customFields.map(cf => ({
      value: cf.field_name,
      label: cf.field_label,
      required: cf.is_required,
    }))
  ];

  const detectDataType = (values: any[]): "text" | "number" | "date" | "boolean" => {
    const nonNullValues = values.filter(v => v != null && v !== "");
    if (nonNullValues.length === 0) return "text";

    const numericCount = nonNullValues.filter(v => !isNaN(Number(v))).length;
    const booleanCount = nonNullValues.filter(v => 
      v === true || v === false || 
      String(v).toLowerCase() === "true" || 
      String(v).toLowerCase() === "false" ||
      v === 1 || v === 0
    ).length;
    
    const dateCount = nonNullValues.filter(v => {
      const date = new Date(v);
      return !isNaN(date.getTime()) && String(v).match(/\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/);
    }).length;

    const total = nonNullValues.length;
    if (booleanCount / total > 0.8) return "boolean";
    if (numericCount / total > 0.8) return "number";
    if (dateCount / total > 0.8) return "date";
    return "text";
  };

  const fuzzyMatch = (excelCol: string, dbField: string, dbLabel: string): number => {
    const normalize = (str: string) => str.toLowerCase().replace(/[_\-\s]+/g, "");
    const excelNorm = normalize(excelCol);
    const fieldNorm = normalize(dbField);
    const labelNorm = normalize(dbLabel);

    if (excelNorm === fieldNorm || excelNorm === labelNorm) return 100;
    if (excelNorm.includes(fieldNorm) || fieldNorm.includes(excelNorm)) return 80;
    if (excelNorm.includes(labelNorm) || labelNorm.includes(excelNorm)) return 70;
    
    // Common variations
    const variations: Record<string, string[]> = {
      "number": ["num", "no", "#", "nbr"],
      "type": ["typ", "category"],
      "status": ["stat", "state"],
      "description": ["desc"],
    };

    for (const [full, abbrs] of Object.entries(variations)) {
      if ((labelNorm.includes(full) || fieldNorm.includes(full)) && 
          abbrs.some(abbr => excelNorm.includes(abbr))) {
        return 60;
      }
    }

    return 0;
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
      const { headers, rows: jsonData } = await parseExcelFile(file);
      
      if (jsonData.length === 0) {
        toast({ title: "Error", description: "File is empty", variant: "destructive" });
        return;
      }

      setExcelHeaders(headers);
      setExcelData(jsonData);
      setPreviewRows(jsonData.slice(0, 5));

      // Auto-detect mappings
      const mappings: ColumnMapping[] = headers.map(header => {
        const values = jsonData.slice(0, 20).map(row => row[header]);
        const sampleValues = values.filter(v => v != null && v !== "").slice(0, 3).map(String);
        const dataType = detectDataType(values);

        let bestMatch: string | null = null;
        let bestScore = 0;

        for (const field of allDbFields) {
          const score = fuzzyMatch(header, field.value, field.label);
          if (score > bestScore && score >= 60) {
            bestScore = score;
            bestMatch = field.value;
          }
        }

        return {
          excelColumn: header,
          dbField: bestMatch,
          isNewField: !bestMatch,
          dataType,
          sampleValues,
        };
      });

      setColumnMappings(mappings);
      setStep("mapping");

      toast({
        title: "File loaded",
        description: `Found ${headers.length} columns and ${jsonData.length} rows`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateMapping = (excelColumn: string, dbField: string | null) => {
    setColumnMappings(prev =>
      prev.map(m =>
        m.excelColumn === excelColumn 
          ? { ...m, dbField, isNewField: dbField === "__new__" }
          : m
      )
    );
  };

  const createNewFieldFromColumn = async (excelColumn: string, dataType: string) => {
    const fieldName = excelColumn.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    
    try {
      // Use the mutation returned by the hook
      createField({
        table_name: "cache_boxes",
        field_name: fieldName,
        field_label: excelColumn,
        field_type: dataType,
        storage_type: "custom_data",
        is_required: false,
        category: "imported",
      });

      // Wait a bit for the field to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      await refetchFields();

      // Update mapping to use the new field
      setColumnMappings(prev =>
        prev.map(m =>
          m.excelColumn === excelColumn
            ? { ...m, dbField: fieldName, isNewField: false }
            : m
        )
      );

      toast({
        title: "Field created",
        description: `Created new field: ${excelColumn}`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const validateData = () => {
    const issues: ValidationIssue[] = [];
    
    excelData.forEach((row, index) => {
      columnMappings.forEach(mapping => {
        if (!mapping.dbField) return;
        
        const value = row[mapping.excelColumn];
        if (value == null || value === "") return;

        // Type validation
        if (mapping.dataType === "number" && isNaN(Number(value))) {
          issues.push({
            row: index + 2,
            column: mapping.excelColumn,
            issue: `Expected number, got "${value}"`,
            suggestedFix: `Convert to ${Math.floor(Number(value))} or set as text`,
          });
        }
      });
    });

    setValidationIssues(issues);
    setStep("validation");
  };

  const handleConfirm = () => {
    setStep("confirm");
  };

  const handleImport = async () => {
    setUploading(true);
    setProgress(0);

    try {
      // Create any new fields first
      if (flexibleMode) {
        const newFields = columnMappings.filter(m => m.isNewField && m.dbField === null);
        for (const mapping of newFields) {
          await createNewFieldFromColumn(mapping.excelColumn, mapping.dataType);
        }
      }

      // Prepare records
      const records = excelData.map(row => {
        const record: any = { custom_data: {} };

        columnMappings.forEach(mapping => {
          if (!mapping.dbField) return;

          const value = row[mapping.excelColumn];
          const isCore = coreFields.some(f => f.value === mapping.dbField);

          if (isCore) {
            // Core fields
            if (mapping.dbField === "box_number" && !value) {
              record[mapping.dbField] = `BOX-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            } else if (mapping.dbField === "status_cache_box" && !value) {
              record[mapping.dbField] = "IN";
            } else if (mapping.dbField === "cache_box_type" && !value) {
              record[mapping.dbField] = "Standard";
            } else {
              record[mapping.dbField] = value || null;
            }
          } else {
            // Custom fields in custom_data
            record.custom_data[mapping.dbField] = value || null;
          }
        });

        return record;
      });

      // Batch insert
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
        description: `Imported ${records.length} boxes`,
      });

      onUploaded?.();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setStep("upload");
    setExcelData([]);
    setExcelHeaders([]);
    setColumnMappings([]);
    setPreviewRows([]);
    setValidationIssues([]);
    setProgress(0);
  };

  const mappedCount = columnMappings.filter(m => m.dbField).length;
  const newFieldsCount = columnMappings.filter(m => m.isNewField).length;

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Step 1: Upload Excel File"}
            {step === "mapping" && "Step 2: Map Columns"}
            {step === "validation" && "Step 3: Validation"}
            {step === "confirm" && "Step 4: Confirm Import"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Select your cache box inventory Excel file"}
            {step === "mapping" && "Map Excel columns to database fields or create new ones"}
            {step === "validation" && "Review and fix data validation issues"}
            {step === "confirm" && "Review your import summary"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-4 px-1">
            {/* Step 1: Upload */}
            {step === "upload" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Settings className="h-5 w-5" />
                  <div className="flex-1">
                    <Label htmlFor="flexible-mode" className="font-semibold">
                      Flexible Schema Mode
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-create new fields from Excel columns
                    </p>
                  </div>
                  <Switch
                    id="flexible-mode"
                    checked={flexibleMode}
                    onCheckedChange={setFlexibleMode}
                  />
                </div>

                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {!file ? (
                  <Button
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="w-full h-32"
                    size="lg"
                    variant="outline"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8" />
                      <span>Select Excel or CSV File</span>
                      <span className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv</span>
                    </div>
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <Badge variant="secondary">{excelData.length} rows</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Mapping */}
            {step === "mapping" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="text-sm font-medium">Mapped</div>
                    <div className="text-2xl font-bold text-primary">{mappedCount}</div>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <div className="text-sm font-medium">New Fields</div>
                    <div className="text-2xl font-bold text-green-600">{newFieldsCount}</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium">Total Rows</div>
                    <div className="text-2xl font-bold">{excelData.length}</div>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Excel Column</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[300px]">Sample Values</TableHead>
                        <TableHead className="w-[250px]">Map To Field</TableHead>
                        <TableHead className="w-[150px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columnMappings.map((mapping, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{mapping.excelColumn}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{mapping.dataType}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {mapping.sampleValues.slice(0, 2).join(", ")}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={mapping.dbField || "skip"}
                              onValueChange={(value) => updateMapping(mapping.excelColumn, value === "skip" ? null : value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">Skip Column</SelectItem>
                                {allDbFields.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {flexibleMode && !mapping.dbField && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => createNewFieldFromColumn(mapping.excelColumn, mapping.dataType)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Create Field
                              </Button>
                            )}
                            {mapping.dbField && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Step 3: Validation */}
            {step === "validation" && (
              <div className="space-y-4">
                {validationIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                    <h3 className="text-lg font-semibold">All Data Valid!</h3>
                    <p className="text-sm text-muted-foreground">No validation issues found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-semibold">{validationIssues.length} issues found</span>
                    </div>
                    {validationIssues.slice(0, 10).map((issue, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="text-sm font-medium">Row {issue.row}, Column: {issue.column}</div>
                        <div className="text-sm text-muted-foreground">{issue.issue}</div>
                        {issue.suggestedFix && (
                          <div className="text-xs text-green-600 mt-1">Suggested: {issue.suggestedFix}</div>
                        )}
                      </div>
                    ))}
                    {validationIssues.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {validationIssues.length - 10} more issues
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h3 className="font-semibold">Import Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Total Boxes:</span>
                      <span className="font-bold">{excelData.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mapped Fields:</span>
                      <span className="font-bold">{mappedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Fields Created:</span>
                      <span className="font-bold text-green-600">{newFieldsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Validation Issues:</span>
                      <span className={`font-bold ${validationIssues.length > 0 ? "text-amber-600" : "text-green-600"}`}>
                        {validationIssues.length}
                      </span>
                    </div>
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-center text-muted-foreground">{progress}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === "mapping" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={validateData}>
                  Next: Validate <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            {step === "validation" && (
              <>
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Back
                </Button>
                <Button onClick={handleConfirm}>
                  Next: Confirm <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            {step === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setStep("validation")} disabled={uploading}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={uploading}>
                  {uploading ? "Importing..." : "Import Boxes"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
