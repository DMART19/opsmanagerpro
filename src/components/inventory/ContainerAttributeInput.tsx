import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContainerAttribute } from "@/hooks/use-container-attributes";
import { cn } from "@/lib/utils";

interface ContainerAttributeInputProps {
  attribute: ContainerAttribute;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
}

export const ContainerAttributeInput = ({
  attribute,
  value,
  onChange,
  error,
}: ContainerAttributeInputProps) => {
  const renderInput = () => {
    switch (attribute.type) {
      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value === "true"}
              onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            />
            <span className="text-sm text-muted-foreground">
              {value === "true" ? "Yes" : "No"}
            </span>
          </div>
        );

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={(v) => onChange(v || null)}
          >
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {attribute.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={cn(error && "border-destructive")}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className={cn(error && "border-destructive")}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className={cn(error && "border-destructive")}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {attribute.name}
        {attribute.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
