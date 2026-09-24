import { useState, useCallback, useEffect } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Save, Trash2, Plus, X, CheckCircle, ArrowRight, FolderOpen } from "lucide-react";
import { parseExcelFile } from "@/lib/excel-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMappingTemplates } from "@/hooks/use-mapping-templates";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { CreateCustomFieldModal } from "./CreateCustomFieldModal";

type FieldConfig = Array<{ value: string; label: string; required: boolean }>;

// No more static FIELD_CONFIGS - everything is dynamic from custom_fields table

interface ColumnMapping {
  dbField: string;
  excelColumn: string | null;
}

interface ValidationIssue {
  type: "error" | "warning";
  message: string;
}

interface EnhancedExcelUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
  tableName: string;
  tableLabel: string;
}

export const EnhancedExcelUpload = ({ 
  open, 
  onOpenChange, 
  onUploaded,
  tableName,
  tableLabel 
}: EnhancedExcelUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "template" | "mapping" | "confirm">("upload");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
  const [pendingFieldName, setPendingFieldName] = useState("");

  const { customFields, isLoading: isLoadingFields, refetch: refetchFields } = useCustomFields(tableName);
  const { templates, saveTemplate, deleteTemplate } = useMappingTemplates(tableName);

  // Refresh fields when modal opens or fields change
  useEffect(() => {
    if (open) {
      refetchFields();
    }
  }, [open, refetchFields]);

  // Use ONLY custom fields from database - fully dynamic schema
  const allFields = customFields.map(cf => ({
    value: cf.field_name,
    label: cf.field_label,
    required: cf.is_required,
    type: cf.field_type,
    storageType: cf.storage_type,
  }));

  const autoMatchColumn = (dbField: string, dbLabel: string): string | null => {
    const normalizedLabel = dbLabel.toLowerCase().trim();
    const normalizedField = dbField.toLowerCase().trim();
    
    // Remove common separators for fuzzy matching
    const cleanLabel = normalizedLabel.replace(/[_\-\s]+/g, '');
    const cleanField = normalizedField.replace(/[_\-\s]+/g, '');
    
    let bestMatch: string | null = null;
    let highestScore = 0;
    
    for (const header of excelHeaders) {
      const normalizedHeader = header.toLowerCase().trim();
      const cleanHeader = normalizedHeader.replace(/[_\-\s]+/g, '');
      
      let score = 0;
      
      // Exact match - highest priority
      if (normalizedHeader === normalizedLabel || normalizedHeader === normalizedField) {
        return header;
      }
      
      // Clean match (ignoring separators)
      if (cleanHeader === cleanLabel || cleanHeader === cleanField) {
        score = 90;
      }
      // Contains match
      else if (normalizedHeader.includes(normalizedLabel) || normalizedLabel.includes(normalizedHeader)) {
        score = 70;
      }
      else if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
        score = 60;
      }
      // Fuzzy partial match
      else if (cleanHeader.includes(cleanLabel) || cleanLabel.includes(cleanHeader)) {
        score = 50;
      }
      else if (cleanHeader.includes(cleanField) || cleanField.includes(cleanHeader)) {
        score = 40;
      }
      // Common abbreviations and variations
      else {
        const abbreviations: Record<string, string[]> = {
          'number': ['num', 'no', '#', 'nbr'],
          'quantity': ['qty', 'qnty', 'count'],
          'description': ['desc', 'descr'],
          'type': ['typ', 'category', 'cat'],
          'status': ['stat', 'state'],
          'barcode': ['bc', 'code'],
        };
        
        for (const [full, abbrevs] of Object.entries(abbreviations)) {
          if ((cleanLabel.includes(full) || cleanField.includes(full)) && 
              abbrevs.some(abbr => cleanHeader.includes(abbr))) {
            score = 30;
            break;
          }
        }
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = header;
      }
    }
    
    // Only return matches with reasonable confidence
    return highestScore >= 30 ? bestMatch : null;
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
        setValidationIssues([{ type: "error", message: "File is empty" }]);
        return;
      }

      setExcelHeaders(headers);
      setExcelData(jsonData);
      setPreviewRows(jsonData.slice(0, 10));

      // Initialize mappings: one row per database field
      const mappings = allFields.map(field => ({
        dbField: field.value,
        excelColumn: autoMatchColumn(field.value, field.label),
      }));
      setColumnMappings(mappings);

      // Check if we have templates
      if (templates.length > 0) {
        setStep("template");
      } else {
        setStep("mapping");
      }

      toast({
        title: "File loaded",
        description: `Preview showing ${Math.min(10, jsonData.length)} of ${jsonData.length} rows`,
      });
    } catch (error: any) {
      setValidationIssues([{ type: "error", message: `Error reading file: ${error.message}` }]);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Template stores dbField -> excelColumn mappings
    const newMappings = allFields.map(field => ({
      dbField: field.value,
      excelColumn: template.field_mappings[field.value] || null,
    }));
    
    setColumnMappings(newMappings);
    setStep("mapping");
    
    toast({
      title: "Template loaded",
      description: `Applied mapping from "${template.name}"`,
    });
  };

  const updateMapping = (dbField: string, excelColumn: string | null) => {
    setColumnMappings(prev =>
      prev.map(m =>
        m.dbField === dbField ? { ...m, excelColumn } : m
      )
    );
  };

  const handleCreateNewField = (suggestedName: string) => {
    setPendingFieldName(suggestedName);
    setCreateFieldModalOpen(true);
  };

  const handleFieldCreated = () => {
    // Refresh fields to show the newly created field
    refetchFields();
    toast({
      title: "Field created",
      description: "You can now map columns to the new field",
    });
  };

  const validateMappings = () => {
    const issues: ValidationIssue[] = [];
    const mappedExcelColumns = columnMappings
      .filter(m => m.excelColumn)
      .map(m => m.excelColumn);

    // Warning for duplicate Excel column assignments
    const duplicates = mappedExcelColumns.filter(
      (col, index) => mappedExcelColumns.indexOf(col) !== index
    );

    if (duplicates.length > 0) {
      issues.push({
        type: "warning",
        message: `Excel columns mapped multiple times: ${[...new Set(duplicates)].join(", ")} - last mapping will be used`
      });
    }

    // No required field validation - all fields are optional

    // Warnings for unmapped database fields
    const unmappedDbFields = columnMappings.filter(m => !m.excelColumn);
    if (unmappedDbFields.length > 0) {
      const fieldLabels = unmappedDbFields
        .map(m => allFields.find(f => f.value === m.dbField)?.label || m.dbField)
        .slice(0, 5);
      issues.push({
        type: "warning",
        message: `${unmappedDbFields.length} database fields not mapped (will use defaults): ${fieldLabels.join(", ")}${unmappedDbFields.length > 5 ? "..." : ""}`
      });
    }

    // Warnings for unmapped Excel columns
    const mappedExcelColumnsSet = new Set(mappedExcelColumns);
    const unmappedExcelColumns = excelHeaders.filter(h => !mappedExcelColumnsSet.has(h));
    if (unmappedExcelColumns.length > 0) {
      issues.push({
        type: "warning",
        message: `${unmappedExcelColumns.length} Excel columns will be ignored: ${unmappedExcelColumns.slice(0, 5).join(", ")}${unmappedExcelColumns.length > 5 ? "..." : ""}`
      });
    }

    return issues;
  };

  const handleConfirm = () => {
    const issues = validateMappings();
    setValidationIssues(issues);
    
    // No blocking - always allow to proceed to confirm
    setStep("confirm");
  };

  const handleImport = async () => {
    setUploading(true);
    setProgress(0);

    try {
      // Save template if requested (dbField -> excelColumn)
      if (saveAsTemplate && templateName) {
        const mappingObj = columnMappings.reduce((acc, mapping) => {
          if (mapping.excelColumn) {
            acc[mapping.dbField] = mapping.excelColumn;
          }
          return acc;
        }, {} as Record<string, string>);

        saveTemplate({
          name: templateName,
          description: templateDescription,
          fieldMappings: mappingObj,
        });
      }

      // Prepare records (create reverse mapping: excelColumn -> dbField)
      const reverseMapping = columnMappings.reduce((acc, mapping) => {
        if (mapping.excelColumn) {
          acc[mapping.excelColumn] = mapping.dbField;
        }
        return acc;
      }, {} as Record<string, string>);

      const records = excelData.map((row: any) => {
        const record: any = { custom_data: {} };
        
        Object.entries(reverseMapping).forEach(([excelCol, dbField]) => {
          const value = row[excelCol];
          
          // Check if this is a custom field
          const customField = customFields.find(cf => cf.field_name === dbField);
          const isCustomField = customField && customField.storage_type === 'custom_data';
          
          if (isCustomField) {
            // Store in custom_data JSONB
            record.custom_data[dbField] = value || null;
          } else {
            // Type conversion for standard fields based on table
            if (tableName === "cache_inventory") {
              if (dbField === "quantity_out" || dbField === "quantity_available" || dbField === "group_year") {
                record[dbField] = value ? parseInt(value) : 0;
              } else if (dbField === "is_internal") {
                record[dbField] = value === true || value === "true" || value === "TRUE" || value === 1;
              } else if (dbField === "date_expire") {
                record[dbField] = value || null;
              } else {
                record[dbField] = value || null;
              }
            } else if (tableName === "cache_boxes") {
              // Box-specific handling with sensible defaults
              if (dbField === "status_cache_box") {
                record[dbField] = value || "Available";
              } else if (dbField === "cache_box_type") {
                record[dbField] = value || "Standard";
              } else if (dbField === "box_number") {
                // Generate box number if not provided
                record[dbField] = value || `BOX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              } else {
                record[dbField] = value || null;
              }
            } else {
              record[dbField] = value || null;
            }
          }
        });

        return record;
      });

      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(tableName as any)
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
    setValidationIssues([]);
    setProgress(0);
    setExcelData([]);
    setExcelHeaders([]);
    setColumnMappings([]);
    setPreviewRows([]);
    setTemplateName("");
    setTemplateDescription("");
    setSaveAsTemplate(false);
  };

  const mappedCount = columnMappings.filter(m => m.excelColumn).length;
  const unmappedDbFieldsCount = columnMappings.filter(m => !m.excelColumn).length;
  const unmappedExcelColumns = (() => {
    const mapped = new Set(columnMappings.filter(m => m.excelColumn).map(m => m.excelColumn));
    return excelHeaders.filter(h => !mapped.has(h));
  })();
  const unmappedExcelColumnsCount = unmappedExcelColumns.length;
  const errors = validationIssues.filter(i => i.type === "error");
  const warnings = validationIssues.filter(i => i.type === "warning");

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && `Upload ${tableLabel} Excel File`}
            {step === "template" && "Load Saved Template"}
            {step === "mapping" && "Map Columns to Database Fields"}
            {step === "confirm" && "Confirm Import"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Select an Excel (.xlsx) or CSV file to upload"}
            {step === "template" && "Choose a saved mapping template or create a new one"}
            {step === "mapping" && "Match each database field to a column from your Excel file"}
            {step === "confirm" && "Review your import settings before proceeding"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="space-y-4 px-1">
            {/* Upload Step */}
            {step === "upload" && (
              <div className="space-y-4">
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  onClick={() => document.getElementById("excel-upload")?.click()}
                  disabled={uploading}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Processing..." : "Choose Excel File"}
                </Button>
                
                {file && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm font-medium">{file.name}</span>
                    <Badge variant="secondary">{(file.size / 1024).toFixed(0)} KB</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Template Selection Step */}
            {step === "template" && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  We found saved templates for {tableLabel}. Choose one to apply, or skip to create a new mapping.
                </div>

                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 cursor-pointer"
                      onClick={() => loadTemplate(template.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {Object.keys(template.field_mappings).length} fields mapped
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this template?")) {
                              deleteTemplate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" onClick={() => loadTemplate(template.id)}>
                          <FolderOpen className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("mapping")}
                >
                  Skip - Create New Mapping
                </Button>
              </div>
            )}

            {/* Mapping Step */}
            {step === "mapping" && (
              <div className="space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{mappedCount}</p>
                    <p className="text-xs text-muted-foreground">Fields Mapped</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{unmappedDbFieldsCount}</p>
                    <p className="text-xs text-muted-foreground">Unmapped Fields</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{excelHeaders.length}</p>
                    <p className="text-xs text-muted-foreground">Excel Columns</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{excelData.length}</p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Database Field</TableHead>
                        <TableHead className="w-[300px]">Maps to Excel Column</TableHead>
                        <TableHead>Sample Data Preview</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columnMappings.map((mapping) => {
                        const field = allFields.find(f => f.value === mapping.dbField);
                        const customField = customFields.find(cf => cf.field_name === mapping.dbField);
                        const sampleValues = mapping.excelColumn 
                          ? previewRows.slice(0, 5).map(row => row[mapping.excelColumn!]).filter(v => v !== undefined && v !== null && v !== '')
                          : [];
                        
                        return (
                          <TableRow key={mapping.dbField}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-semibold flex items-center gap-2">
                                  {field?.label || customField?.field_label || mapping.dbField}
                                  {customField && <Badge variant="outline" className="text-xs">Custom</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">{mapping.dbField}</div>
                                {field?.required && (
                                  <Badge variant="secondary" className="text-xs">Optional</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={mapping.excelColumn || "skip"}
                                onValueChange={(value) => updateMapping(mapping.dbField, value === "skip" ? null : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Don't import this field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">
                                    <span className="text-muted-foreground">Don't import this field</span>
                                  </SelectItem>
                                  {excelHeaders.map((header) => (
                                    <SelectItem key={header} value={header}>
                                      {header}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {sampleValues.length > 0 ? (
                                <div className="space-y-1">
                                  {sampleValues.slice(0, 3).map((val, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span className="text-xs truncate max-w-[200px]">
                                        {String(val)}
                                      </span>
                                    </div>
                                  ))}
                                  {sampleValues.length > 3 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      +{sampleValues.length - 3} more...
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not mapped</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Unmapped Excel Columns - Offer to Create Custom Fields */}
                {unmappedExcelColumnsCount > 0 && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-2">Unmapped Excel Columns</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          These columns from your Excel file aren't mapped yet. Create custom fields to use them:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unmappedExcelColumns.map((column) => (
                            <Button
                              key={column}
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateNewField(column.toLowerCase().replace(/\s+/g, "_"))}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Create "{column}"
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm">
                    Need a field that doesn't exist?
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateNewField("")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Field
                  </Button>
                </div>

                {previewRows.length < excelData.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    Showing first {previewRows.length} of {excelData.length} rows
                  </p>
                )}

                {/* Validation Issues */}
                {validationIssues.length > 0 && (
                  <div className="space-y-2">
                    {errors.map((issue, i) => (
                      <Alert key={`error-${i}`} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{issue.message}</AlertDescription>
                      </Alert>
                    ))}
                    {warnings.map((issue, i) => (
                      <Alert key={`warning-${i}`}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{issue.message}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Step */}
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
                      <span>Unmapped database fields:</span>
                      <span className="font-bold text-muted-foreground">{unmappedDbFieldsCount} (will be null)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unused Excel columns:</span>
                      <span className="font-bold text-muted-foreground">{unmappedExcelColumnsCount} (will be ignored)</span>
                    </div>
                  </div>
                </div>

                {/* Field Mappings Display */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm">Field Mappings</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {columnMappings
                      .filter(m => m.excelColumn)
                      .map((mapping, index) => {
                        const field = allFields.find(f => f.value === mapping.dbField);
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <span className="font-medium">{field?.label || mapping.dbField}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{mapping.excelColumn}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Save as Template */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="save-template"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="save-template" className="text-sm font-medium">
                      Save this mapping as a template for future use
                    </label>
                  </div>
                  
                  {saveAsTemplate && (
                    <div className="space-y-2 ml-6">
                      <Input
                        placeholder="Template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                      <Textarea
                        placeholder="Template description (optional)"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {/* Validation Issues */}
                {warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {warnings.map((issue, i) => (
                          <div key={i}>• {issue.message}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">{progress}% Complete</p>
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
          
          {step === "template" && (
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
          )}
          
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => templates.length > 0 ? setStep("template") : setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={errors.length > 0}>
                Continue to Confirm
              </Button>
            </>
          )}
          
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={uploading || (saveAsTemplate && !templateName)}>
                {uploading ? "Importing..." : "Import Data"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>

      <CreateCustomFieldModal
        open={createFieldModalOpen}
        onOpenChange={setCreateFieldModalOpen}
        tableName={tableName}
        suggestedFieldName={pendingFieldName}
        onFieldCreated={handleFieldCreated}
      />
    </Dialog>
  );
};