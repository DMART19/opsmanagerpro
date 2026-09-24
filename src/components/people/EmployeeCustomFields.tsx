import { useCustomFields, CustomField } from "@/hooks/use-custom-fields";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmployeeCustomFieldsProps {
  customData: Record<string, any>;
  onChange: (customData: Record<string, any>) => void;
  className?: string;
  /** Optional pre-filtered fields. If not provided, loads all active fields for employees table */
  fields?: CustomField[];
}

export const EmployeeCustomFields = ({
  customData,
  onChange,
  className,
  fields: externalFields,
}: EmployeeCustomFieldsProps) => {
  const { customFields: hookFields, isLoading } = useCustomFields("employees");
  
  // Use provided fields or fallback to hook fields
  const customFields = externalFields ?? hookFields;

  const updateField = (fieldName: string, value: any) => {
    onChange({
      ...customData,
      [fieldName]: value,
    });
  };

  if (!externalFields && isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {customFields.map((field) => {
        const value = customData[field.field_name] ?? field.default_value ?? "";

        switch (field.field_type) {
          case "text":
            return (
              <div key={field.id}>
                <Label htmlFor={field.field_name} className="text-sm">
                  {field.field_label}
                </Label>
                <Input
                  id={field.field_name}
                  value={value}
                  onChange={(e) => updateField(field.field_name, e.target.value)}
                  placeholder={`Enter ${field.field_label.toLowerCase()}`}
                  className="mt-1"
                />
              </div>
            );

          case "number":
            return (
              <div key={field.id}>
                <Label htmlFor={field.field_name} className="text-sm">
                  {field.field_label}
                </Label>
                <Input
                  id={field.field_name}
                  type="number"
                  value={value}
                  onChange={(e) => updateField(field.field_name, e.target.value)}
                  className="mt-1"
                />
              </div>
            );

          case "date":
            const dateValue = value ? new Date(value) : undefined;
            return (
              <div key={field.id}>
                <Label className="text-sm">{field.field_label}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !dateValue && "text-muted-foreground"
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
                        updateField(field.field_name, date ? format(date, "yyyy-MM-dd") : "")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            );

          case "checkbox":
            return (
              <div key={field.id} className="flex items-center gap-2">
                <Checkbox
                  id={field.field_name}
                  checked={Boolean(value)}
                  onCheckedChange={(checked) => updateField(field.field_name, checked)}
                />
                <Label htmlFor={field.field_name} className="text-sm font-normal cursor-pointer">
                  {field.field_label}
                </Label>
              </div>
            );

          case "dropdown":
            const options = (field.validation_rules as any)?.options || [];
            return (
              <div key={field.id}>
                <Label htmlFor={field.field_name} className="text-sm">
                  {field.field_label}
                </Label>
                <Select
                  value={value || "none"}
                  onValueChange={(val) => updateField(field.field_name, val === "none" ? "" : val)}
                >
                  <SelectTrigger id={field.field_name} className="mt-1">
                    <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {options.map((opt: string) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
