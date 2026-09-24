/**
 * Schedule Renewal From Alert Dialog
 * 
 * Simple one-step renewal flow for expiring/expired credentials.
 * Pre-fills dates based on renewal cycle for a frictionless experience.
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle2, 
  RefreshCw,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { GuardrailAlert } from "@/types/alerts";

interface ScheduleRenewalFromAlertProps {
  alert: GuardrailAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ScheduleRenewalFromAlert = ({
  alert,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleRenewalFromAlertProps) => {
  const [renewalDate, setRenewalDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const employee = alert?.metadata?.employee;
  const credential = alert?.metadata?.expiringRequirement;

  // Auto-set renewal date to today on open
  useEffect(() => {
    if (open) {
      setRenewalDate(new Date());
      setNotes("");
    }
  }, [open]);

  // Auto-calculate new expiration from renewal date + cycle
  const newExpireDate = useMemo(() => {
    if (renewalDate && credential?.renewalCycleMonths) {
      return addMonths(renewalDate, credential.renewalCycleMonths);
    }
    return undefined;
  }, [renewalDate, credential?.renewalCycleMonths]);

  const handleRenew = async () => {
    if (!credential || !employee || !renewalDate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .update({
          status: "Compliant",
          issue_date: format(renewalDate, "yyyy-MM-dd"),
          expire_date: newExpireDate ? format(newExpireDate, "yyyy-MM-dd") : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", credential.employeeRequirementId);

      if (error) throw error;

      toast.success("Credential renewed", {
        description: `${credential.title} for ${employee.firstName} ${employee.lastName} is now compliant.`,
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error renewing credential:", error);
      toast.error(error.message || "Failed to renew credential");
    } finally {
      setSaving(false);
    }
  };

  if (!alert || !employee || !credential) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`;
  const isExpired = alert.type === "credential_expired";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {isExpired ? "Renew Credential" : "Schedule Renewal"}
          </DialogTitle>
          <DialogDescription>
            {isExpired 
              ? "This credential has expired. Renew it to restore compliance."
              : "Update the issue date to extend this credential."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Context card */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-2.5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {employee.position || employee.email || "Team Member"}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{credential.title}</span>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  isExpired 
                    ? "border-destructive/50 bg-destructive/10 text-destructive" 
                    : "border-warning/50 bg-warning/10 text-warning"
                )}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {isExpired ? "Expired" : "Expiring"}
              </Badge>
            </div>

            {credential.currentExpireDate && (
              <p className="text-xs text-muted-foreground">
                {isExpired ? "Expired" : "Expires"}: {format(new Date(credential.currentExpireDate), "PPP")}
              </p>
            )}
          </div>

          {/* Renewal Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              New Issue Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-11",
                    !renewalDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {renewalDate ? format(renewalDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={renewalDate}
                  onSelect={setRenewalDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Auto-calculated new expiration */}
          {newExpireDate && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">New Expiration</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{format(newExpireDate, "PPP")}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {credential.renewalCycleMonths} mo cycle
                </Badge>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Renewed via online course..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenew}
            disabled={saving || !renewalDate}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Renewing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isExpired ? "Renew Now" : "Confirm Renewal"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
