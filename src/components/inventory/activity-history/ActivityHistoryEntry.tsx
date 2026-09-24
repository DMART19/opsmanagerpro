import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  User,
  Calendar,
  Pencil,
  X,
  Check,
  Clock,
  AlertTriangle,
  Lock,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutHistoryRecord } from "@/hooks/use-item-checkout-history";
import { getActivityStatus, EditableFields } from "./types";
import { toast } from "sonner";

interface ActivityHistoryEntryProps {
  record: CheckoutHistoryRecord;
  onUpdate: (id: string, fields: Partial<EditableFields>) => Promise<boolean>;
}

const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor", "Damaged"];

export const ActivityHistoryEntry = ({ record, onUpdate }: ActivityHistoryEntryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable field state
  const [editValues, setEditValues] = useState<EditableFields>({
    checkin_notes: record.checkin_notes,
    return_condition: record.return_condition,
    expected_return_at: record.expected_return_at,
    checkout_notes: record.checkout_notes,
  });

  const statusInfo = getActivityStatus(record);
  const isReturned = !!record.checked_in_at;
  const employeeName = record.employee
    ? `${record.employee.first_name} ${record.employee.last_name}`
    : "Unknown";

  // Can only edit due date if not yet returned
  const canEditDueDate = !isReturned;
  // Can always edit notes and condition (for corrections)
  const canEdit = true;

  const handleStartEdit = () => {
    setEditValues({
      checkin_notes: record.checkin_notes,
      return_condition: record.return_condition,
      expected_return_at: record.expected_return_at,
      checkout_notes: record.checkout_notes,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValues({
      checkin_notes: record.checkin_notes,
      return_condition: record.return_condition,
      expected_return_at: record.expected_return_at,
      checkout_notes: record.checkout_notes,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate(record.id, editValues);
    setIsSaving(false);
    
    if (success) {
      setIsEditing(false);
      toast.success("History updated");
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          "rounded-xl border bg-card transition-all duration-200",
          "hover:shadow-sm",
          statusInfo.status === 'overdue' && "border-destructive/30 bg-destructive/5",
          isExpanded && "shadow-sm"
        )}
      >
        {/* Primary Section - Always Visible */}
        <CollapsibleTrigger asChild>
          <button
            className="w-full p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Left: Icon + Primary Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Action Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 rounded-full p-2.5 mt-0.5",
                    isReturned
                      ? "bg-muted text-muted-foreground"
                      : statusInfo.status === 'overdue'
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {isReturned ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>

                {/* Primary Content */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Action Type + Timestamp */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {isReturned ? "Checked In" : "Checked Out"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(record.checked_out_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Secondary: Team Member + Quantity */}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{employeeName}</span>
                    </div>
                    <span className="text-muted-foreground/50">·</span>
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      <span>Qty: {record.checked_out_quantity}</span>
                    </div>
                  </div>

                  {/* Overdue Warning */}
                  {statusInfo.status === 'overdue' && record.expected_return_at && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      <span>
                        Overdue since {format(new Date(record.expected_return_at), "MMM d")}
                      </span>
                    </div>
                  )}

                  {/* Due Date for active checkouts */}
                  {!isReturned && record.expected_return_at && statusInfo.status !== 'overdue' && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due {format(new Date(record.expected_return_at), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Status Badge + Expand Icon */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={statusInfo.variant} className="text-xs">
                  {statusInfo.label}
                </Badge>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded Section - Tertiary Details */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t pt-4 space-y-4">
              {/* Return Details (if returned) */}
              {isReturned && record.checked_in_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>
                    Returned {format(new Date(record.checked_in_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              )}

              {/* View Mode */}
              {!isEditing && (
                <div className="space-y-3">
                  {/* Condition */}
                  {record.return_condition && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[80px]">Condition:</span>
                      <span className="font-medium">{record.return_condition}</span>
                    </div>
                  )}

                  {/* Checkout Notes */}
                  {record.checkout_notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[80px]">Checkout note:</span>
                      <span className="italic text-muted-foreground">"{record.checkout_notes}"</span>
                    </div>
                  )}

                  {/* Return Notes */}
                  {record.checkin_notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[80px]">Return note:</span>
                      <span className="italic text-muted-foreground">"{record.checkin_notes}"</span>
                    </div>
                  )}

                  {/* Performed By */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Clock className="h-3 w-3" />
                    <span>
                      Performed by system user
                      {record.created_at && ` · Created ${format(new Date(record.created_at), "MMM d, yyyy")}`}
                    </span>
                  </div>

                  {/* Edit Button */}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit();
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit details
                    </Button>
                  )}
                </div>
              )}

              {/* Edit Mode */}
              {isEditing && (
                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  {/* Due Date (only if not returned) */}
                  {canEditDueDate && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Due Date</Label>
                      <Input
                        type="date"
                        value={editValues.expected_return_at?.split('T')[0] || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            expected_return_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {/* Return Condition */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Return Condition</Label>
                    <Select
                      value={editValues.return_condition || ''}
                      onValueChange={(value) =>
                        setEditValues({ ...editValues, return_condition: value || null })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkout Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Checkout Note</Label>
                    <Textarea
                      value={editValues.checkout_notes || ''}
                      onChange={(e) =>
                        setEditValues({ ...editValues, checkout_notes: e.target.value || null })
                      }
                      placeholder="Add checkout note..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>

                  {/* Return Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Return Note</Label>
                    <Textarea
                      value={editValues.checkin_notes || ''}
                      onChange={(e) =>
                        setEditValues({ ...editValues, checkin_notes: e.target.value || null })
                      }
                      placeholder="Add return note..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>

                  {/* Immutable Fields Notice */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                          <Lock className="h-3 w-3" />
                          <span>Some fields are locked for audit accuracy</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        <p className="text-xs">
                          Core history fields (who, when, quantity) can't be changed for audit accuracy.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Save/Cancel Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Check className="h-3 w-3" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
