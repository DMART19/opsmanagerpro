import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateCustomFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  suggestedFieldName?: string;
  onFieldCreated?: () => void;
}

export const CreateCustomFieldModal = ({
  open,
  onOpenChange,
  tableName,
  suggestedFieldName = "",
  onFieldCreated,
}: CreateCustomFieldModalProps) => {
  const [fieldName, setFieldName] = useState(suggestedFieldName);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!fieldName.trim() || !fieldLabel.trim()) {
      toast({
        title: "Validation error",
        description: "Field name and label are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create custom field
      const { error } = await supabase
        .from("custom_fields")
        .insert({
          table_name: tableName,
          field_name: fieldName.toLowerCase().replace(/\s+/g, "_"),
          field_label: fieldLabel,
          field_type: fieldType,
          is_required: isRequired,
          default_value: defaultValue || null,
          storage_type: "custom_data",
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Field created",
        description: `Custom field "${fieldLabel}" has been created`,
      });

      onFieldCreated?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Failed to create field",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFieldName("");
    setFieldLabel("");
    setFieldType("text");
    setIsRequired(false);
    setDefaultValue("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Field</DialogTitle>
          <DialogDescription>
            Add a new field to store additional data for {tableName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name</Label>
            <Input
              id="field-name"
              placeholder="e.g., expiration_date"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used internally (lowercase, no spaces)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              placeholder="e.g., Expiration Date"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Display name shown to users
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Data Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="boolean">Yes/No</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-value">Default Value (Optional)</Label>
            <Input
              id="default-value"
              placeholder="Default value for new records"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked as boolean)}
            />
            <Label htmlFor="required" className="cursor-pointer">
              This field is required
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            {creating ? "Creating..." : "Create Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
