import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { RequirementAttribute } from "@/hooks/use-requirement-attributes";

interface RequirementAttributeFieldsProps {
  attributes: RequirementAttribute[];
  values: Record<string, string | null>;
  onChange: (attributeId: string, value: string | null) => void;
}

export const RequirementAttributeFields = ({
  attributes,
  values,
  onChange,
}: RequirementAttributeFieldsProps) => {
  if (attributes.length === 0) return null;

  const renderField = (attr: RequirementAttribute) => {
    const value = values[attr.id] ?? "";

    switch (attr.type) {
      case "text":
        return (
          <Input
            id={attr.id}
            value={value}
            onChange={(e) => onChange(attr.id, e.target.value || null)}
            placeholder={`Enter ${attr.name.toLowerCase()}`}
          />
        );

      case "number":
        return (
          <Input
            id={attr.id}
            type="number"
            value={value}
            onChange={(e) => onChange(attr.id, e.target.value || null)}
            placeholder={`Enter ${attr.name.toLowerCase()}`}
          />
        );

      case "date":
        const dateValue = value ? parseISO(value) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : `Select ${attr.name.toLowerCase()}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => onChange(attr.id, date ? format(date, "yyyy-MM-dd") : null)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2 h-10">
            <Switch
              id={attr.id}
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(attr.id, checked ? "true" : "false")}
            />
            <span className="text-sm text-muted-foreground">
              {value === "true" ? "Yes" : "No"}
            </span>
          </div>
        );

      case "select":
        return (
          <Select
            value={value || "none"}
            onValueChange={(v) => onChange(attr.id, v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="none">-- Select --</SelectItem>
              {attr.options?.map((opt) => (
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {attributes.map((attr) => (
        <div key={attr.id}>
          <Label htmlFor={attr.id} className="text-sm">
            {attr.name}
            {attr.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="mt-1.5">
            {renderField(attr)}
          </div>
        </div>
      ))}
    </div>
  );
};
