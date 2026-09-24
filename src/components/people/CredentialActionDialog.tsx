import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Shield,
  RefreshCw,
  XCircle,
  Trash2,
  Info,
  Upload,
  FileText,
  Clock,
  ChevronDown,
  Bell,
  ShieldAlert,
  ShieldCheck,
  Download,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface CredentialActionDialogProps {
  assignment: {
    id: string;
    employee_id: string;
    status: string;
    issue_date: string | null;
    expire_date: string | null;
    notes: string | null;
    attachment_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    verified_at?: string | null;
    requirement?: {
      id: string;
      title: string;
      requirement_type?: string;
      has_expiration?: boolean;
      renewal_cycle_months?: number | null;
      is_general?: boolean;
    };
  } | null;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CredentialActionDialog = ({
  assignment,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: CredentialActionDialogProps) => {
  const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [expireDate, setExpireDate] = useState<Date | undefined>();
  const [noExpiration, setNoExpiration] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renewalMonths = assignment?.requirement?.renewal_cycle_months;
  const credentialTitle = assignment?.requirement?.title || "Credential";
  const credentialType = assignment?.requirement?.requirement_type;
  const isGeneral = assignment?.requirement?.is_general ?? false;

  // Auto-calculate expiration from issue date + renewal cycle
  const autoCalculatedExpireDate = useMemo(() => {
    if (issueDate && renewalMonths && !noExpiration) {
      return addMonths(issueDate, renewalMonths);
    }
    return undefined;
  }, [issueDate, renewalMonths, noExpiration]);

  const effectiveExpireDate = noExpiration ? undefined : (autoCalculatedExpireDate || expireDate);

  // Auto-calculate status from data
  const computedStatus = useMemo(() => {
    if (isVerified || (issueDate && noExpiration)) {
      return { key: "Compliant", label: "Valid", severity: "success" as const };
    }
    if (effectiveExpireDate) {
      const days = differenceInDays(effectiveExpireDate, new Date());
      if (days < 0) return { key: "Expired", label: "Expired", severity: "critical" as const };
      if (days <= 30) return { key: "Compliant", label: "Expiring Soon", severity: "warning" as const };
      return { key: "Compliant", label: "Valid", severity: "success" as const };
    }
    if (issueDate) {
      return { key: "Compliant", label: "Valid", severity: "success" as const };
    }
    return { key: "Assigned", label: "Assigned", severity: "muted" as const };
  }, [issueDate, effectiveExpireDate, noExpiration, isVerified]);

  // Expiration intelligence
  const expirationInfo = useMemo(() => {
    if (!effectiveExpireDate) return null;
    return { date: effectiveExpireDate, daysRemaining: differenceInDays(effectiveExpireDate, new Date()) };
  }, [effectiveExpireDate]);

  useEffect(() => {
    if (assignment && open) {
      setIssueDate(assignment.issue_date ? new Date(assignment.issue_date) : undefined);
      setExpireDate(assignment.expire_date ? new Date(assignment.expire_date) : undefined);
      setNoExpiration(!assignment.expire_date && (assignment.status === "Compliant" || !!assignment.verified_at));
      setIsVerified(!!assignment.verified_at || assignment.status === "Compliant");
      setNotes(assignment.notes || "");
      setAttachmentUrl(assignment.attachment_url || null);
      setHistoryOpen(false);
    }
  }, [assignment, open]);

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assignment) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 10MB." });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${assignment.employee_id}/${assignment.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("requirement-documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("requirement-documents")
        .getPublicUrl(filePath);
      await supabase
        .from("employee_requirements")
        .update({ attachment_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", assignment.id);
      setAttachmentUrl(urlData.publicUrl);
      toast.success("Document uploaded");
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = async () => {
    if (!assignment) return;
    try {
      await supabase
        .from("employee_requirements")
        .update({ attachment_url: null, updated_at: new Date().toISOString() })
        .eq("id", assignment.id);
      setAttachmentUrl(null);
      toast.success("Document removed");
    } catch {
      toast.error("Failed to remove document");
    }
  };

  const handleSave = async () => {
    if (!assignment) return;
    setSaving(true);
    try {
      const finalStatus = computedStatus.key;
      const { error } = await supabase
        .from("employee_requirements")
        .update({
          status: finalStatus,
          issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : null,
          expire_date: effectiveExpireDate ? format(effectiveExpireDate, "yyyy-MM-dd") : null,
          notes: notes.trim() || null,
          verified_at: isVerified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);
      if (error) throw error;
      toast.success(`${credentialTitle} updated`, {
        description: `Status: ${computedStatus.label}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update credential");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCredential = async () => {
    if (!assignment) return;
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .delete()
        .eq("id", assignment.id);
      if (error) throw error;
      toast.success(`${credentialTitle} removed`, {
        description: `Credential unassigned from ${employeeName}.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove credential");
    }
  };

  if (!assignment) return null;

  const isAssignedOnly = computedStatus.severity === "muted";

  // Build history timeline
  const historyItems = [
    assignment.created_at && { label: "Assigned", date: assignment.created_at },
    assignment.issue_date && { label: "Issued", date: assignment.issue_date },
    assignment.verified_at && { label: "Verified", date: assignment.verified_at },
    assignment.updated_at && assignment.updated_at !== assignment.created_at && { label: "Last Updated", date: assignment.updated_at },
  ].filter(Boolean) as { label: string; date: string }[];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {credentialTitle}
            </DialogTitle>
            <DialogDescription>
              Manage this credential for {employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Status Summary */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{credentialTitle}</p>
                  {credentialType && (
                    <p className="text-sm text-muted-foreground">{credentialType}</p>
                  )}
                </div>
                <Badge 
                  variant={
                    computedStatus.severity === "critical" ? "destructive" 
                    : computedStatus.severity === "warning" ? "warning" 
                    : computedStatus.severity === "success" ? "secondary"
                    : "secondary"
                  }
                  className={cn(
                    "text-xs gap-1",
                    computedStatus.severity === "success" && "bg-success/10 text-success border-success/20",
                  )}
                >
                  {computedStatus.severity === "critical" ? <XCircle className="h-3 w-3" /> :
                   computedStatus.severity === "warning" ? <AlertCircle className="h-3 w-3" /> :
                   computedStatus.severity === "success" ? <CheckCircle2 className="h-3 w-3" /> :
                   <Clock className="h-3 w-3" />}
                  {computedStatus.label}
                </Badge>
              </div>

              {expirationInfo && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <p className={cn(
                      "text-muted-foreground",
                      expirationInfo.daysRemaining < 0 && "text-destructive font-medium",
                      expirationInfo.daysRemaining >= 0 && expirationInfo.daysRemaining <= 30 && "text-warning font-medium",
                    )}>
                      {expirationInfo.daysRemaining < 0 ? "Expired: " : "Expires: "}
                      {format(expirationInfo.date, "PPP")}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs tabular-nums",
                        expirationInfo.daysRemaining < 0 && "border-destructive/30 text-destructive",
                        expirationInfo.daysRemaining >= 0 && expirationInfo.daysRemaining <= 30 && "border-warning/30 text-warning",
                        expirationInfo.daysRemaining > 30 && "border-success/30 text-success",
                      )}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {expirationInfo.daysRemaining < 0 
                        ? `${Math.abs(expirationInfo.daysRemaining)}d overdue` 
                        : `${expirationInfo.daysRemaining}d remaining`}
                    </Badge>
                  </div>
                </>
              )}

              {/* Compliance tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {isGeneral ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Required for role
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1 border-muted-foreground/20">
                    <ShieldCheck className="h-3 w-3" />
                    Optional Credential
                  </Badge>
                )}
              </div>
            </div>

            {isAssignedOnly && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  This credential is assigned but not yet configured. Fill in the details below.
                </p>
              </div>
            )}

            {/* ── Assigned / Issue Date ── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Assigned / Issue Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !issueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? format(issueDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={setIssueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ── Expiration Date ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Expiration Date</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="no-expiration" className="text-xs text-muted-foreground cursor-pointer">
                    No expiration
                  </Label>
                  <Switch
                    id="no-expiration"
                    checked={noExpiration}
                    onCheckedChange={(checked) => {
                      setNoExpiration(checked);
                      if (checked) setExpireDate(undefined);
                    }}
                  />
                </div>
              </div>
              {!noExpiration && (
                <>
                  {renewalMonths && issueDate ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(autoCalculatedExpireDate!, "PPP")}
                      </span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Auto-calculated ({renewalMonths}mo cycle)
                      </Badge>
                    </div>
                  ) : (
                     <EnhancedDatePicker
                        date={expireDate}
                        onDateChange={setExpireDate}
                        placeholder="Select expiration date"
                        minDate={issueDate}
                      />
                  )}
                </>
              )}
            </div>

            {/* ── Verification ── */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
              <Checkbox
                id="verified"
                checked={isVerified}
                onCheckedChange={(checked) => setIsVerified(!!checked)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="verified" className="text-sm font-medium cursor-pointer">
                  Mark as Completed / Verified
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sets this credential as valid and compliant
                </p>
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this credential..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* ── Documentation ── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Documentation (optional)</Label>
              {attachmentUrl ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachmentUrl.split('/').pop() || "Document"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(attachmentUrl!, "_blank")}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleRemoveFile}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 h-11 text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4" />Upload Document</>
                  )}
                </Button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileUpload} />
              {attachmentUrl && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <RefreshCw className="h-3 w-3" />Replace file
                </Button>
              )}
            </div>

            {/* ── Renewal alerts info ── */}
            {!noExpiration && effectiveExpireDate && (
              <div className="p-3 rounded-lg bg-accent/50 border border-border/40 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Bell className="h-4 w-4 text-primary" />
                  Renewal Alerts
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pl-6">
                  <p>• 30 days before expiration</p>
                  <p>• 14 days before expiration</p>
                  <p>• 7 days before expiration</p>
                </div>
              </div>
            )}

            {/* ── History ── */}
            {historyItems.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", historyOpen && "rotate-180")} />
                  History
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="pl-3 border-l-2 border-muted space-y-3">
                    {historyItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="text-foreground tabular-nums">
                          {format(new Date(item.date), "PPP")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Action Buttons */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 sm:mr-auto"
              onClick={() => setRemoveDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" />Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove Credential"
        description={`Are you sure you want to remove "${credentialTitle}" from ${employeeName}? This will unassign the credential.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveCredential}
        variant="destructive"
      />
    </>
  );
};