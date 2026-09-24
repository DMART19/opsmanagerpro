import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, AlertCircle, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AssetAttribute } from "@/hooks/use-asset-attributes";

interface AssetAttributeInputProps {
  attribute: AssetAttribute;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  /** Clears the value for this asset only. Does NOT delete the global field definition. */
  onClearValue?: () => void;
  /** Deletes the field definition from the workspace schema. */
  onDeleteField?: () => void;
}

export const AssetAttributeInput = ({
  attribute,
  value,
  onChange,
  error,
  onClearValue,
  onDeleteField,
}: AssetAttributeInputProps) => {

  const renderInput = () => {
    switch (attribute.type) {
      case "text":
        return (
          <Input
            id={attribute.id}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className={cn(error && "border-destructive")}
          />
        );

      case "number":
        return (
          <Input
            id={attribute.id}
            type="number"
            inputMode="decimal"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className={cn(error && "border-destructive")}
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
                  "w-full justify-start text-left font-normal",
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
                onSelect={(date) =>
                  onChange(date ? format(date, "yyyy-MM-dd") : null)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id={attribute.id}
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            />
            <Label htmlFor={attribute.id} className="text-sm font-normal cursor-pointer">
              Yes
            </Label>
          </div>
        );

      case "select":
        const options = attribute.options || [];
        return (
          <Select
            value={value || "none"}
            onValueChange={(val) => onChange(val === "none" ? null : val)}
          >
            <SelectTrigger id={attribute.id} className={cn(error && "border-destructive")}>
              <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
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
    <div className="space-y-1.5 group relative">
      <div className="flex items-center justify-between">
        <Label htmlFor={attribute.id} className="text-sm">
          {attribute.name}
          {attribute.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-0.5">
          {onClearValue && value != null && value !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={onClearValue}
              title="Clear value for this asset"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDeleteField && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={onDeleteField}
              title="Delete this field from workspace"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {renderInput()}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};
