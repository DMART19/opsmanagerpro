import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Layers, Trash2 } from "lucide-react";
import { useCustomFields, type CustomField } from "@/hooks/use-custom-fields";
import { cn } from "@/lib/utils";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "toggle", label: "Toggle" },
] as const;

const SUGGESTIONS = [
  "Badge Number", "Supervisor", "Emergency Contact", "License Number",
  "Clearance Level", "T-Shirt Size", "Blood Type", "Vehicle Assignment",
];

interface TeamCustomFieldsSectionProps {
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

export const TeamCustomFieldsSection = ({ values, onChange }: TeamCustomFieldsSectionProps) => {
  const { customFields, createField, deleteField, isCreating } = useCustomFields("employees");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([""]);

  const updateValue = (fieldName: string, value: any) => {
    onChange({ ...values, [fieldName]: value });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const fieldName = newName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    createField({
      field_name: fieldName,
      field_label: newName.trim(),
      field_type: newType,
      is_required: false,
      sort_order: customFields.length + 1,
      storage_type: "custom_data",
      category: "general",
      validation_rules: newType === "select"
        ? { options: dropdownOptions.filter(o => o.trim()) }
        : null,
    });

    setAdding(false);
    setNewName("");
    setNewType("text");
    setDropdownOptions([""]);
  };

  const renderFieldInput = (field: CustomField) => {
    const val = values[field.field_name];
    switch (field.field_type) {
      case "number":
        return (
          <Input
            type="number"
            inputMode="numeric"
            value={val ?? ""}
            onChange={e => updateValue(field.field_name, e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
            className="h-9"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={val ?? ""}
            onChange={e => updateValue(field.field_name, e.target.value)}
            className="h-9"
          />
        );
      case "select": {
        const options = field.validation_rules?.options || [];
        return (
          <Select value={val ?? ""} onValueChange={v => updateValue(field.field_name, v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "toggle":
        return (
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={!!val}
              onCheckedChange={v => updateValue(field.field_name, v)}
            />
            <span className="text-xs text-muted-foreground">{val ? "Yes" : "No"}</span>
          </div>
        );
      default:
        return (
          <Input
            value={val ?? ""}
            onChange={e => updateValue(field.field_name, e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}`}
            className="h-9"
          />
        );
    }
  };

  // Filter suggestions to those not already created
  const existingNames = new Set(customFields.map(f => f.field_label.toLowerCase()));
  const availableSuggestions = SUGGESTIONS.filter(s => !existingNames.has(s.toLowerCase()));

  return (
    <div className="space-y-3 border-t pt-4 mt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Custom Fields</span>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary hover:text-primary"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Add Field
          </Button>
        )}
      </div>

      {/* Existing fields */}
      {customFields.map(field => (
        <div key={field.id} className="group">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">{field.field_label}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => deleteField(field.id)}
              title="Delete this field from workspace"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {renderFieldInput(field)}
        </div>
      ))}

      {/* Empty state */}
      {customFields.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No custom fields yet. Add fields to track additional info.
        </p>
      )}

      {/* Inline creator */}
      {adding && (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
          <div>
            <Label className="text-xs">Field Name</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Badge Number"
              className="h-9"
              autoFocus
            />
            {/* Quick suggestions */}
            {!newName && availableSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {availableSuggestions.slice(0, 4).map(s => (
                  <button
                    key={s}
                    type="button"
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => setNewName(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Field Type</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown options */}
          {newType === "select" && (
            <div className="space-y-2">
              <Label className="text-xs">Options</Label>
              {dropdownOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={e => {
                      const next = [...dropdownOptions];
                      next[i] = e.target.value;
                      setDropdownOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="h-8 text-sm"
                  />
                  {dropdownOptions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setDropdownOptions(dropdownOptions.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDropdownOptions([...dropdownOptions, ""])}
              >
                + Add option
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setAdding(false); setNewName(""); setNewType("text"); setDropdownOptions([""]); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCreate}
              disabled={!newName.trim() || isCreating}
            >
              Add Field
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
