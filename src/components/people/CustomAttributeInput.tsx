import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TeamMemberAttribute } from "@/hooks/use-team-member-attributes";

interface CustomAttributeInputProps {
  attribute: TeamMemberAttribute;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export const CustomAttributeInput = ({
  attribute,
  value,
  onChange,
  error,
  onDelete,
  isDeleting,
}: CustomAttributeInputProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete?.(attribute.id);
    setShowDeleteConfirm(false);
  };

  const renderInput = () => {
    switch (attribute.type) {
      case "text":
        return (
          <Input
            id={attribute.id}
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className={cn("mt-1.5", error && "border-destructive")}
          />
        );

      case "number":
        return (
          <Input
            id={attribute.id}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className={cn("mt-1.5", error && "border-destructive")}
          />
        );

      case "date":
        const dateValue = value ? new Date(value) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-1.5",
                  !dateValue && "text-muted-foreground",
                  error && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id={attribute.id}
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            />
            <label 
              htmlFor={attribute.id} 
              className="text-sm font-normal cursor-pointer"
            >
              Yes
            </label>
          </div>
        );

      case "select":
        return (
          <Select
            value={value || "none"}
            onValueChange={(val) => onChange(val === "none" ? null : val)}
          >
            <SelectTrigger 
              id={attribute.id}
              className={cn("mt-1.5", error && "border-destructive")}
            >
              <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {(attribute.options || []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="group relative">
        <div className="flex items-center justify-between">
          <Label 
            htmlFor={attribute.id} 
            className="text-sm flex items-center gap-1"
          >
            {attribute.name}
            {attribute.required && <span className="text-destructive">*</span>}
          </Label>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
        {renderInput()}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{attribute.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom attribute and remove all saved values from team members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Attribute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
