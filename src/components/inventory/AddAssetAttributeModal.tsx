import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Type, Hash, Calendar, ToggleLeft, List } from "lucide-react";
import { useAssetAttributes, AttributeType } from "@/hooks/use-asset-attributes";
import { toast } from "sonner";

interface AddAssetAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ATTRIBUTE_TYPES: { value: AttributeType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "text", label: "Text", icon: Type, description: "Short text like names or codes" },
  { value: "number", label: "Number", icon: Hash, description: "Numeric values" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { value: "boolean", label: "Yes / No", icon: ToggleLeft, description: "Toggle switch" },
  { value: "select", label: "Dropdown", icon: List, description: "Choose from options" },
];

export const AddAssetAttributeModal = ({ open, onOpenChange }: AddAssetAttributeModalProps) => {
  const { createAttribute, isCreating } = useAssetAttributes();
  
  const [name, setName] = useState("");
  const [type, setType] = useState<AttributeType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const resetForm = () => {
    setName("");
    setType("text");
    setRequired(false);
    setOptions([]);
    setNewOption("");
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (optionToRemove: string) => {
    setOptions(options.filter(opt => opt !== optionToRemove));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an attribute name");
      return;
    }

    if (type === "select" && options.length === 0) {
      toast.error("Please add at least one option for dropdown");
      return;
    }

    try {
      await createAttribute({
        name: name.trim(),
        type,
        required,
        options: type === "select" ? options : undefined,
      });
      
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Attribute</DialogTitle>
          <DialogDescription>
            Create a new attribute to track additional asset information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Attribute Name */}
          <div className="space-y-2">
            <Label htmlFor="attr-name">Attribute Name</Label>
            <Input
              id="attr-name"
              placeholder="e.g., Voltage, Height, Condition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Attribute Type */}
          <div className="space-y-2">
            <Label>Attribute Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ATTRIBUTE_TYPES.map((attrType) => (
                <button
                  key={attrType.value}
                  type="button"
                  onClick={() => setType(attrType.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                    type === attrType.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <attrType.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{attrType.label}</div>
                    <div className="text-xs text-muted-foreground">{attrType.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown Options */}
          {type === "select" && (
            <div className="space-y-2">
              <Label>Dropdown Options</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an option"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {options.map((opt) => (
                    <Badge key={opt} variant="secondary" className="gap-1">
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label htmlFor="required-toggle" className="cursor-pointer">Required</Label>
              <p className="text-xs text-muted-foreground">Must be filled when saving assets</p>
            </div>
            <Switch
              id="required-toggle"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Attribute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
