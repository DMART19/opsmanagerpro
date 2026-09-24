import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/excel-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ImportRequirementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface RequirementRow {
  title: string;
  Marker_GeneralReq?: number | string;
  requirementType?: string;
  sortKey?: number | string;
  description?: string;
}

export const ImportRequirementsModal = ({
  open,
  onOpenChange,
  onImportComplete,
}: ImportRequirementsModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ added: number; updated: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const processExcelFile = async (file: File): Promise<RequirementRow[]> => {
    const { rows } = await parseExcelFile(file);
    return rows as unknown as RequirementRow[];
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setImporting(true);
    setProgress(0);
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      // Parse Excel file
      const rows = await processExcelFile(file);
      setProgress(10);

      if (!rows || rows.length === 0) {
        throw new Error("No data found in Excel file");
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress(10 + (i / rows.length) * 80);

        if (!row.title || row.title.trim() === "") {
          errors.push(`Row ${i + 2}: Missing title`);
          continue;
        }

        try {
          // Check if requirement exists
          const { data: existing } = await supabase
            .from("requirement_definitions")
            .select("id")
            .eq("title", row.title)
            .maybeSingle();

          const requirementData: any = {
            title: row.title,
            is_general: row.Marker_GeneralReq === 1 || row.Marker_GeneralReq === "1",
            sort_key: row.sortKey ? Number(row.sortKey) : null,
            description: row.description || null,
            is_active: true,
          };

          if (existing) {
            // Update existing
            const { error } = await supabase
              .from("requirement_definitions")
              .update(requirementData)
              .eq("id", existing.id);

            if (error) throw error;
            updated++;
          } else {
            // Insert new
            const { error } = await supabase
              .from("requirement_definitions")
              .insert(requirementData);

            if (error) throw error;
            added++;
          }
        } catch (error: any) {
          errors.push(`Row ${i + 2} (${row.title}): ${error.message}`);
        }
      }

      setProgress(100);
      setResults({ added, updated, errors });

      if (errors.length === 0) {
        toast.success(`Import successful! ${added} added, ${updated} updated`);
        setTimeout(() => {
          onImportComplete();
          onOpenChange(false);
        }, 2000);
      } else {
        toast.warning(`Import completed with ${errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
      errors.push(error.message);
      setResults({ added, updated, errors });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setResults(null);
      setProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Requirements from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Upload an Excel file with columns: <strong>title</strong>, <strong>requirementType</strong>,{" "}
              <strong>Marker_GeneralReq</strong> (1 or 0), <strong>sortKey</strong>, and optional{" "}
              <strong>description</strong>
            </AlertDescription>
          </Alert>

          {!results && (
            <div className="border rounded-lg bg-muted/30 p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
                disabled={importing}
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  {file ? (
                    <>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Click to upload Excel file</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports .xlsx and .xls formats
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing requirements...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results && (
            <div className="space-y-3">
              <Alert className={results.errors.length > 0 ? "border-orange-500" : "border-green-500"}>
                {results.errors.length > 0 ? (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Import Complete</p>
                    <p className="text-sm">
                      {results.added} requirements added, {results.updated} updated
                    </p>
                    {results.errors.length > 0 && (
                      <p className="text-sm text-orange-600">{results.errors.length} errors occurred</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {results.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 text-xs bg-muted p-3 rounded">
                  {results.errors.map((error, idx) => (
                    <div key={idx} className="text-destructive">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              {results ? "Close" : "Cancel"}
            </Button>
            {!results && (
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? "Importing..." : "Import"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
