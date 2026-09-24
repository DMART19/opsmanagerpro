import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InlineEditableCellProps {
  value: string | number | boolean | null;
  onSave: (value: any) => Promise<void>;
  type?: "text" | "number" | "date" | "boolean" | "select";
  options?: { value: string; label: string }[];
  className?: string;
}

export const InlineEditableCell = ({
  value,
  onSave,
  type = "text",
  options = [],
  className = "",
}: InlineEditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const displayValue = () => {
    if (value === null || value === undefined) return "—";
    if (type === "boolean") return value ? "✓" : "—";
    if (type === "date" && value) return new Date(value as string).toLocaleDateString();
    return String(value);
  };

  if (!isEditing) {
    return (
      <div
        className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors ${className}`}
        onClick={() => setIsEditing(true)}
      >
        {displayValue()}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {type === "select" ? (
        <Select value={String(editValue || "")} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === "boolean" ? (
        <Select
          value={String(editValue)}
          onValueChange={(v) => setEditValue(v === "true")}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type}
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-8"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Check className="h-4 w-4 text-success" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={handleCancel}
        disabled={isSaving}
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};
