import { useState } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";

const REQUIRED_HEADERS = [
  "Item ID",
  "Reference ID",
  "Barcode",
  "Location",
  "Category",
  "Description",
  "Manufacturer",
  "Model / Part #",
  "Serial Number",
  "Expiration Date",
  "Quantity Out",
  "Quantity Available",
  "Status",
  "Group",
  "Internal",
  "Year"
];

interface CacheInventoryUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CacheInventoryUpload = ({ open, onOpenChange }: CacheInventoryUploadProps) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"add" | "update" | "replace">("add");
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      validateFile(selectedFile);
    }
  };

  const validateFile = async (file: File) => {
    setValidating(true);
    setValidationErrors([]);
    setValidationSuccess(false);

    try {
      const { parseExcelFile } = await import("@/lib/excel-utils");
      const { headers, rows } = await parseExcelFile(file);
      
      if (rows.length === 0) {
        setValidationErrors(["File is empty"]);
        return;
      }
      const errors: string[] = [];

      // Check for missing headers
      REQUIRED_HEADERS.forEach(required => {
        if (!headers.includes(required)) {
          errors.push(`Missing header: ${required}`);
        }
      });

      // Check for duplicate headers
      const headerSet = new Set(headers);
      if (headerSet.size !== headers.length) {
        errors.push("Duplicate headers detected");
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
      } else {
        setValidationSuccess(true);
        toast({
          title: "Validation successful",
          description: `File contains ${rows.length} rows ready to import`,
        });
      }
    } catch (error: any) {
      setValidationErrors([`Error reading file: ${error.message}`]);
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !validationSuccess) return;

    setUploading(true);
    setProgress(0);

    try {
      // Get current user for RLS
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to upload inventory",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
      const userId = sessionData.session.user.id;

      const { parseExcelFile } = await import("@/lib/excel-utils");
      const { rows: jsonData } = await parseExcelFile(file);

      if (uploadMode === "replace") {
        const { error: deleteError } = await supabase
          .from("cache_inventory")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        
        if (deleteError) throw deleteError;
      }

      // Map uploaded data to database columns - include user_id for RLS
      const records = jsonData.map((row: any) => ({
        user_id: userId,
        id_cache_fema: row["Item ID"] || row.idCacheFEMA || null,
        id_cache_tf: row["Reference ID"] || row.idCacheTF || null,
        barcode: row["Barcode"] || row.barcode || null,
        section: row["Location"] || row.Section || null,
        subcategory: row["Category"] || row.subcategory || null,
        description: row["Description"] || row.description || null,
        manufacturer: row["Manufacturer"] || row.manufacturer || null,
        model_part_num: row["Model / Part #"] || row.modelPartNum || null,
        serial_number: row["Serial Number"] || row.serialNumber || null,
        date_expire: row["Expiration Date"] || row.dateExpire || null,
        quantity_out: parseInt(row["Quantity Out"] || row.quantityOut) || 0,
        quantity_available: parseInt(row["Quantity Available"] || row.quantityAvailable) || 0,
        status_item: row["Status"] || row.statusItem || null,
        group_abbv: row["Group"] || row["cacheItem_CacheMaster::GroupAbbv"] || null,
        is_internal: row["Internal"] === true || row["Internal"] === "true" || row["Internal"] === "Yes" || 
                     row["cacheItem_CacheMaster::isInternal"] === true || row["cacheItem_CacheMaster::isInternal"] === "true",
        group_year: parseInt(row["Year"] || row["cacheItem_CacheMaster::GroupYear"]) || null,
      }));

      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        if (uploadMode === "update") {
          for (const record of batch) {
            await supabase
              .from("cache_inventory")
              .upsert(record, { onConflict: "barcode" });
          }
        } else {
          const { error } = await supabase
            .from("cache_inventory")
            .insert(batch);
          
          if (error) throw error;
        }

        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      // Invalidate cache to update dashboard and all consumers
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });

      toast({
        title: "Import successful",
        description: `Successfully imported ${records.length} items`,
      });

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
    setValidationErrors([]);
    setValidationSuccess(false);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Excel Inventory</DialogTitle>
          <DialogDescription>
            Upload an Excel file with the required cache inventory columns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-border/50 rounded-lg p-8 hover:border-primary transition-colors text-center bg-muted/10">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <span className="font-medium">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
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
                      Click to select or drag and drop your Excel file
                    </p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="sr-only"
              />
            </Label>
          </div>

          {validating && (
            <div className="text-center text-sm text-muted-foreground">
              Validating file...
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive">Validation Errors</h4>
                  <ScrollArea className="max-h-32 mt-2">
                    <ul className="text-sm space-y-1">
                      {validationErrors.map((error, i) => (
                        <li key={i} className="text-destructive">• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {validationSuccess && (
            <div className="border border-success/50 bg-success/10 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-semibold text-success">File validated successfully</span>
              </div>
            </div>
          )}

          {validationSuccess && (
            <div>
              <Label className="mb-3 block">Import Mode</Label>
              <RadioGroup value={uploadMode} onValueChange={(v: any) => setUploadMode(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="font-normal">
                    Add Only - Insert new records without modifying existing ones
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="font-normal">
                    Update Matching Records - Update existing records by barcode
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="font-normal text-destructive">
                    Replace All Data - Delete all existing records and import new ones
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">{progress}% Complete</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!validationSuccess || uploading}
            >
              {uploading ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
