import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskAttribute } from "@/hooks/use-task-attributes";

interface TaskAttributeFieldsProps {
  attributes: TaskAttribute[];
  values: Record<string, string>;
  onChange: (attributeId: string, value: string) => void;
}

export const TaskAttributeFields = ({ attributes, values, onChange }: TaskAttributeFieldsProps) => {
  if (attributes.length === 0) {
    return null;
  }

  const renderField = (attr: TaskAttribute) => {
    const value = values[attr.id] || "";

    switch (attr.type) {
      case "text":
        return (
          <Input
            id={`attr-${attr.id}`}
            value={value}
            onChange={(e) => onChange(attr.id, e.target.value)}
            placeholder={`Enter ${attr.name.toLowerCase()}`}
          />
        );

      case "number":
        return (
          <Input
            id={`attr-${attr.id}`}
            type="number"
            value={value}
            onChange={(e) => onChange(attr.id, e.target.value)}
            placeholder="0"
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
                onSelect={(date) => onChange(attr.id, date ? format(date, "yyyy-MM-dd") : "")}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id={`attr-${attr.id}`}
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(attr.id, checked ? "true" : "false")}
            />
            <Label htmlFor={`attr-${attr.id}`} className="text-sm text-muted-foreground">
              {value === "true" ? "Yes" : "No"}
            </Label>
          </div>
        );

      case "select":
        return (
          <Select value={value || "none"} onValueChange={(v) => onChange(attr.id, v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Select --</SelectItem>
              {attr.options?.map((option) => (
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
    <div className="space-y-4">
      {attributes.map((attr) => (
        <div key={attr.id} className="space-y-2">
          <Label htmlFor={`attr-${attr.id}`}>
            {attr.name}
            {attr.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {renderField(attr)}
        </div>
      ))}
    </div>
  );
};
