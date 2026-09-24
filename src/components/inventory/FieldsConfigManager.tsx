import React, { useState } from "react";
import { useCustomFields, CustomField } from "@/hooks/use-custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit2,
  Trash2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Settings2,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FieldsConfigManagerProps {
  tableName: string;
  tableLabel: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type, description: "Short text like names or codes" },
  { value: "number", label: "Number", icon: Hash, description: "Numeric values" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { value: "boolean", label: "Yes/No", icon: ToggleLeft, description: "Toggle switch" },
];

const FieldTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  const fieldType = FIELD_TYPES.find(f => f.value === type);
  const Icon = fieldType?.icon || Type;
  return <Icon className={className} />;
};

export const FieldsConfigManager: React.FC<FieldsConfigManagerProps> = ({
  tableName,
  tableLabel,
}) => {
  const {
    customFields,
    isLoading,
    createField,
    updateField,
    deleteField,
  } = useCustomFields(tableName);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  
  const [newField, setNewField] = useState({
    field_label: "",
    field_type: "text",
    is_required: false,
    default_value: "",
  });

  const resetNewField = () => {
    setNewField({
      field_label: "",
      field_type: "text",
      is_required: false,
      default_value: "",
    });
  };

  const handleCreate = () => {
    if (!newField.field_label.trim()) {
      toast({
        title: "Field name required",
        description: "Please enter a name for your custom field",
        variant: "destructive",
      });
      return;
    }

    const fieldName = newField.field_label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    createField({
      field_name: fieldName,
      field_label: newField.field_label.trim(),
      field_type: newField.field_type,
      is_required: newField.is_required,
      default_value: newField.default_value || null,
      storage_type: "custom_data",
      category: "custom",
      sort_order: customFields.length + 1,
    });
    
    setCreateModalOpen(false);
    resetNewField();
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingField) return;

    updateField({
      id: editingField.id,
      updates: {
        field_label: editingField.field_label,
        field_type: editingField.field_type,
        is_required: editingField.is_required,
        default_value: editingField.default_value,
      },
    });
    
    setEditModalOpen(false);
    setEditingField(null);
  };

  const handleDelete = (id: string) => {
    setFieldToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fieldToDelete) {
      deleteField(fieldToDelete);
      setDeleteDialogOpen(false);
      setFieldToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{tableLabel} Fields</CardTitle>
            </div>
            <Button onClick={() => setCreateModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Field
            </Button>
          </div>
          <CardDescription>
            Add custom fields to track additional information for your {tableLabel.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <h4 className="font-medium mb-1">No custom fields yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Create fields to capture data specific to your workflow
              </p>
              <Button variant="outline" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Field
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <FieldTypeIcon type={field.field_type} className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.field_label}</span>
                        {field.is_required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {FIELD_TYPES.find(f => f.value === field.field_type)?.label || field.field_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(field)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(field.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Field Modal */}
      <Dialog open={createModalOpen} onOpenChange={(open) => { setCreateModalOpen(open); if (!open) resetNewField(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
            <DialogDescription>
              Create a new field to track additional data for your {tableLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Field Name</Label>
              <Input
                id="field-label"
                placeholder="e.g., Warranty Expiration"
                value={newField.field_label}
                onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Field Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewField({ ...newField, field_type: type.value })}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                      newField.field_type === type.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <type.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="required-toggle" className="cursor-pointer">Required Field</Label>
                <p className="text-xs text-muted-foreground">Must be filled when creating records</p>
              </div>
              <Switch
                id="required-toggle"
                checked={newField.is_required}
                onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-value">Default Value (optional)</Label>
              <Input
                id="default-value"
                placeholder="Leave empty for no default"
                value={newField.default_value}
                onChange={(e) => setNewField({ ...newField, default_value: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>
              Update the configuration for this custom field.
            </DialogDescription>
          </DialogHeader>
          
          {editingField && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-field-label">Field Name</Label>
                <Input
                  id="edit-field-label"
                  value={editingField.field_label}
                  onChange={(e) => setEditingField({ ...editingField, field_label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-field-type">Field Type</Label>
                <Select
                  value={editingField.field_type}
                  onValueChange={(value) => setEditingField({ ...editingField, field_type: value })}
                >
                  <SelectTrigger id="edit-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label htmlFor="edit-required-toggle" className="cursor-pointer">Required Field</Label>
                  <p className="text-xs text-muted-foreground">Must be filled when creating records</p>
                </div>
                <Switch
                  id="edit-required-toggle"
                  checked={editingField.is_required}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, is_required: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-default-value">Default Value</Label>
                <Input
                  id="edit-default-value"
                  placeholder="Leave empty for no default"
                  value={editingField.default_value || ""}
                  onChange={(e) => setEditingField({ ...editingField, default_value: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the field from your schema. Existing data stored in this field will be preserved but won't be visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
