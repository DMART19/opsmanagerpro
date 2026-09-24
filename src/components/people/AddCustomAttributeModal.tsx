import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Type, Hash, Calendar, ToggleLeft, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttributeType, CreateAttributeInput } from "@/hooks/use-team-member-attributes";

interface AddCustomAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateAttributeInput) => Promise<void>;
  isLoading?: boolean;
}

const TYPE_OPTIONS: { value: AttributeType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", description: "Single line of text", icon: <Type className="h-4 w-4" /> },
  { value: "number", label: "Number", description: "Numeric value", icon: <Hash className="h-4 w-4" /> },
  { value: "date", label: "Date", description: "Calendar date", icon: <Calendar className="h-4 w-4" /> },
  { value: "boolean", label: "Yes / No", description: "True or false", icon: <ToggleLeft className="h-4 w-4" /> },
  { value: "select", label: "Dropdown", description: "Choose from options", icon: <List className="h-4 w-4" /> },
];

export const AddCustomAttributeModal = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddCustomAttributeModalProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<AttributeType>("text");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setType("text");
    setOptions([]);
    setNewOption("");
    setRequired(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (options.includes(trimmed)) {
      setError("Option already exists");
      return;
    }
    setOptions([...options, trimmed]);
    setNewOption("");
    setError(null);
  };

  const handleRemoveOption = (option: string) => {
    setOptions(options.filter(o => o !== option));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError("Attribute name is required");
      return;
    }

    if (type === "select" && options.length < 2) {
      setError("Dropdown needs at least 2 options");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        type,
        options: type === "select" ? options : undefined,
        required,
      });
      handleClose();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Attribute</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Attribute Name */}
          <div>
            <Label htmlFor="attr_name" className="text-sm font-medium">
              Attribute Name
            </Label>
            <Input
              id="attr_name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Shirt Size, License Number, Height"
              className="mt-1.5"
              autoFocus
            />
          </div>

          {/* Attribute Type */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Attribute Type
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                    type === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className={cn(
                    "mb-1",
                    type === opt.value ? "text-primary" : "text-muted-foreground"
                  )}>
                    {opt.icon}
                  </span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {TYPE_OPTIONS.find(o => o.value === type)?.description}
            </p>
          </div>

          {/* Dropdown Options - only show for select type */}
          {type === "select" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Dropdown Options
              </Label>
              
              <div className="flex gap-2 mb-3">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add an option..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="icon"
                  onClick={handleAddOption}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <Badge
                      key={option}
                      variant="secondary"
                      className="gap-1 py-1"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {options.length < 2 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Add at least 2 options for the dropdown
                </p>
              )}
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="required" className="text-sm font-medium">
                Required
              </Label>
              <p className="text-xs text-muted-foreground">
                Must be filled when adding a team member
              </p>
            </div>
            <Switch
              id="required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Attribute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
