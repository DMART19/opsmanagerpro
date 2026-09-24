/**
 * Resolve Credential From Alert Dialog
 * 
 * Opens when user clicks "Resolve Credential" from an alert.
 * Shows the missing credentials and allows resolving them one by one.
 */

import { useState, useMemo, useEffect } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Shield,
  RefreshCw,
  Info,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { GuardrailAlert } from "@/types/alerts";

interface ResolveCredentialFromAlertProps {
  alert: GuardrailAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CredentialToResolve {
  requirementId: string;
  employeeRequirementId: string;
  title: string;
  hasExpiration?: boolean;
  renewalCycleMonths?: number | null;
}

export const ResolveCredentialFromAlert = ({
  alert,
  open,
  onOpenChange,
  onSuccess,
}: ResolveCredentialFromAlertProps) => {
  const [selectedCredential, setSelectedCredential] = useState<CredentialToResolve | null>(null);
  const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [expireDate, setExpireDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const employee = alert?.metadata?.employee;
  const missingCredentials = alert?.metadata?.missingRequirements || [];

  // Auto-select first credential if only one
  useEffect(() => {
    if (open && missingCredentials.length === 1) {
      setSelectedCredential(missingCredentials[0]);
    } else if (open && missingCredentials.length > 1) {
      setSelectedCredential(null);
    }
    // Reset form state when opening
    if (open) {
      setIssueDate(undefined);
      setExpireDate(undefined);
      setNotes("");
    }
  }, [open, missingCredentials]);

  // Auto-calculate expiration date
  const autoCalculatedExpireDate = useMemo(() => {
    if (issueDate && selectedCredential?.renewalCycleMonths) {
      return addMonths(issueDate, selectedCredential.renewalCycleMonths);
    }
    return undefined;
  }, [issueDate, selectedCredential?.renewalCycleMonths]);

  const effectiveExpireDate = selectedCredential?.hasExpiration 
    ? (autoCalculatedExpireDate || expireDate) 
    : undefined;

  const handleSaveAndResolve = async () => {
    if (!selectedCredential || !employee) return;

    // Require issue date for credentials that expire
    if (selectedCredential.hasExpiration && !issueDate) {
      toast.error("Issue date is required to mark this credential as valid");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .update({
          status: "Compliant",
          issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          expire_date: effectiveExpireDate ? format(effectiveExpireDate, "yyyy-MM-dd") : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCredential.employeeRequirementId);

      if (error) throw error;

      toast.success("Credential resolved", {
        description: `${selectedCredential.title} for ${employee.firstName} is now compliant.`,
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
      });

      // If there are more credentials to resolve, go back to list
      if (missingCredentials.length > 1) {
        const remaining = missingCredentials.filter(
          c => c.employeeRequirementId !== selectedCredential.employeeRequirementId
        );
        if (remaining.length > 0) {
          // Reset form and go back to selection
          setSelectedCredential(null);
          setIssueDate(undefined);
          setExpireDate(undefined);
          setNotes("");
          onSuccess(); // Trigger refresh
          return;
        }
      }

      // All done - close dialog
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error resolving credential:", error);
      toast.error(error.message || "Failed to resolve credential");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedCredential || !employee) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .update({
          status: "Compliant",
          issue_date: format(new Date(), "yyyy-MM-dd"),
          expire_date: null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCredential.employeeRequirementId);

      if (error) throw error;

      toast.success("Credential completed", {
        description: `${selectedCredential.title} for ${employee.firstName} is now compliant.`,
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
      });

      // If there are more credentials to resolve, go back to list
      if (missingCredentials.length > 1) {
        const remaining = missingCredentials.filter(
          c => c.employeeRequirementId !== selectedCredential.employeeRequirementId
        );
        if (remaining.length > 0) {
          setSelectedCredential(null);
          setNotes("");
          onSuccess();
          return;
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error completing credential:", error);
      toast.error(error.message || "Failed to complete credential");
    } finally {
      setSaving(false);
    }
  };

  if (!alert || !employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`;

  // Credential selection view
  if (!selectedCredential && missingCredentials.length > 1) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Resolve Missing Credentials
            </DialogTitle>
            <DialogDescription>
              {fullName} is missing {missingCredentials.length} required credentials. Select one to resolve.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Employee context */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {employee.position || employee.email || "Team Member"}
                </p>
              </div>
            </div>

            {/* Credential list */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {missingCredentials.map((cred) => (
                  <button
                    key={cred.employeeRequirementId}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border text-left",
                      "hover:bg-accent hover:border-primary/30 transition-all",
                      "active:scale-[0.99]"
                    )}
                    onClick={() => setSelectedCredential(cred)}
                  >
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Shield className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cred.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {cred.hasExpiration 
                          ? `Expires every ${cred.renewalCycleMonths} month${cred.renewalCycleMonths !== 1 ? 's' : ''}`
                          : "Does not expire"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Resolution form view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Resolve Required Credential
          </DialogTitle>
          <DialogDescription>
            Complete this credential assignment to mark it as valid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Section 1: Context (Read-only) */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{fullName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {employee.position || employee.email || "Team Member"}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedCredential?.title}</span>
              </div>
              <Badge 
                variant="outline" 
                className="border-warning/50 bg-warning/10 text-warning text-xs"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Not completed
              </Badge>
            </div>

            {/* Show back button if multiple credentials */}
            {missingCredentials.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => setSelectedCredential(null)}
              >
                ← Back to credential list ({missingCredentials.length - 1} more)
              </Button>
            )}
          </div>

          {/* Section 2: Resolution Action */}
          {selectedCredential?.hasExpiration ? (
            <div className="space-y-4">
              {/* Helpful context */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Add the issue date to mark this credential as valid.
                  {selectedCredential.renewalCycleMonths && (
                    <span className="block mt-1 text-foreground font-medium">
                      <RefreshCw className="h-3 w-3 inline mr-1" />
                      This credential expires every {selectedCredential.renewalCycleMonths} month{selectedCredential.renewalCycleMonths !== 1 ? "s" : ""}.
                    </span>
                  )}
                </p>
              </div>

              {/* Issue Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Issue Date <span className="text-destructive">*</span>
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
                      {issueDate ? format(issueDate, "PPP") : "Select issue date"}
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

              {/* Expiration Date (auto-calculated or manual) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Expiration Date</Label>
                {selectedCredential.renewalCycleMonths && issueDate ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(autoCalculatedExpireDate!, "PPP")}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Auto-calculated
                    </Badge>
                  </div>
                ) : (
                  <EnhancedDatePicker
                    date={expireDate}
                    onDateChange={setExpireDate}
                    placeholder="Select expiration date (optional)"
                    minDate={issueDate}
                  />
                )}
              </div>

              {/* Notes */}
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
            </div>
          ) : (
            <div className="space-y-4">
              {/* No expiration - simple completion */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-success/5 border border-success/10">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  This credential does not expire. Click below to mark it as completed.
                </p>
              </div>

              {/* Notes */}
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
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {selectedCredential?.hasExpiration ? (
            <Button 
              onClick={handleSaveAndResolve} 
              disabled={saving || !issueDate}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Resolve
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleMarkCompleted} 
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Completed
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
