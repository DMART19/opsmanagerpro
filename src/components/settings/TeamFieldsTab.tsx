import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Trash2,
  Loader2,
  Settings2,
  GripVertical,
  Users,
  Palette,
  Star,
  Edit2,
} from "lucide-react";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useTeamRoles, TeamRole } from "@/hooks/use-team-roles";
import { cn } from "@/lib/utils";

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type, description: "Short text input" },
  { value: "number", label: "Number", icon: Hash, description: "Numeric value" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { value: "checkbox", label: "Yes/No", icon: ToggleLeft, description: "Boolean toggle" },
  { value: "dropdown", label: "Dropdown", icon: List, description: "Select from options" },
];

const ROLE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export const TeamFieldsTab = () => {
  const { customFields, isLoading: fieldsLoading, createField, deleteField, isCreating, isDeleting } = useCustomFields("employees");
  const { roles, loading: rolesLoading, createRole, updateRole, deleteRole, setDefaultRole } = useTeamRoles();
  
  const [activeTab, setActiveTab] = useState("roles");
  
  // Role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TeamRole | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", color: "#6366f1" });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"role" | "field">("role");
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Field dialog state
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [newField, setNewField] = useState({
    field_label: "",
    field_type: "text",
    dropdown_options: "",
    is_required: false,
    role_ids: [] as string[],
  });

  const loading = fieldsLoading || rolesLoading;

  // Role handlers
  const handleOpenRoleDialog = (role?: TeamRole) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description || "", color: role.color });
    } else {
      setEditingRole(null);
      setRoleForm({ name: "", description: "", color: ROLE_COLORS[roles.length % ROLE_COLORS.length] });
    }
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) return;
    setRoleSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
          color: roleForm.color,
        });
      } else {
        await createRole({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
          color: roleForm.color,
        });
      }
      setRoleDialogOpen(false);
    } finally {
      setRoleSubmitting(false);
    }
  };

  const confirmDeleteRole = (roleId: string) => {
    setDeleteType("role");
    setItemToDelete(roleId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteField = (fieldId: string) => {
    setDeleteType("field");
    setItemToDelete(fieldId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (deleteType === "role") {
      await deleteRole(itemToDelete);
    } else {
      deleteField(itemToDelete);
    }
    setItemToDelete(null);
    setDeleteDialogOpen(false);
  };

  // Field handlers
  const handleCreateField = () => {
    if (!newField.field_label.trim()) return;

    const fieldName = newField.field_label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    const fieldData: any = {
      field_name: fieldName,
      field_label: newField.field_label.trim(),
      field_type: newField.field_type,
      is_required: newField.is_required,
      role_ids: newField.role_ids.length > 0 ? newField.role_ids : null,
    };

    if (newField.field_type === "dropdown" && newField.dropdown_options.trim()) {
      const options = newField.dropdown_options
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean);
      fieldData.validation_rules = { options };
    }

    createField(fieldData);
    setNewField({ field_label: "", field_type: "text", dropdown_options: "", is_required: false, role_ids: [] });
    setFieldDialogOpen(false);
  };

  const getFieldIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find((f) => f.value === type);
    return fieldType?.icon || Type;
  };

  const getRoleNamesForField = (roleIds: string[] | null) => {
    if (!roleIds || roleIds.length === 0) return "All roles";
    return roleIds
      .map((id) => roles.find((r) => r.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Team Structure</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Define roles and custom attributes for your team members.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="roles">
            <Users className="h-4 w-4 mr-1.5" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="fields">
            <Settings2 className="h-4 w-4 mr-1.5" />
            Attributes
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Create roles like "Staff", "Contractor", or "Manager" to organize your team.
            </p>
            <Button onClick={() => handleOpenRoleDialog()} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Role
            </Button>
          </div>

          {roles.length === 0 ? (
            <Card className="p-8 text-center bg-muted/30">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium text-foreground mb-1">No roles defined</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create roles to organize your team (e.g., "Employee", "Contractor", "Manager").
              </p>
              <Button onClick={() => handleOpenRoleDialog()} variant="outline">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Role
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <Card
                  key={role.id}
                  className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${role.color}20` }}
                  >
                    <Users className="h-5 w-5" style={{ color: role.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{role.name}</p>
                      {role.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!role.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultRole(role.id)}
                        className="text-xs text-muted-foreground"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenRoleDialog(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => confirmDeleteRole(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="fields" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Add custom attributes like "License Number", "Badge ID", or "Clearance Level".
            </p>
            <Button onClick={() => setFieldDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Attribute
            </Button>
          </div>

          {customFields.length === 0 ? (
            <Card className="p-8 text-center bg-muted/30">
              <Settings2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium text-foreground mb-1">No custom attributes yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create attributes like "License Number", "Badge ID", or "Shift" to capture team-specific data.
              </p>
              <Button onClick={() => setFieldDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Your First Attribute
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {customFields.map((field) => {
                const Icon = getFieldIcon(field.field_type);
                return (
                  <Card
                    key={field.id}
                    className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{field.field_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {FIELD_TYPES.find((f) => f.value === field.field_type)?.label || field.field_type}
                        {field.field_type === "dropdown" &&
                          field.validation_rules?.options && (
                            <span className="ml-1">
                              ({(field.validation_rules.options as string[]).length} options)
                            </span>
                          )}
                        <span className="mx-1.5">·</span>
                        <span className="text-primary/70">{getRoleNamesForField(field.role_ids)}</span>
                      </p>
                    </div>
                    <Badge variant={field.is_required ? "default" : "secondary"} className="shrink-0 text-xs">
                      {field.is_required ? "Required" : "Optional"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => confirmDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              Roles help you organize team members and assign role-specific attributes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="role_name">Role Name</Label>
              <Input
                id="role_name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="e.g., Staff, Contractor, Manager"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="role_description">Description (optional)</Label>
              <Textarea
                id="role_description"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Brief description of this role..."
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {ROLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setRoleForm({ ...roleForm, color })}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      roleForm.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={!roleForm.name.trim() || roleSubmitting}
            >
              {roleSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom Attribute</DialogTitle>
            <DialogDescription>
              Create a new field to capture additional team member information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="field_label">Attribute Name</Label>
              <Input
                id="field_label"
                value={newField.field_label}
                onChange={(e) =>
                  setNewField({ ...newField, field_label: e.target.value })
                }
                placeholder="e.g., License Number, Badge ID, Shift"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Field Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                {FIELD_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = newField.field_type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setNewField({ ...newField, field_type: type.value })
                      }
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 mb-1.5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {newField.field_type === "dropdown" && (
              <div>
                <Label htmlFor="dropdown_options">Options (comma-separated)</Label>
                <Input
                  id="dropdown_options"
                  value={newField.dropdown_options}
                  onChange={(e) =>
                    setNewField({ ...newField, dropdown_options: e.target.value })
                  }
                  placeholder="Option 1, Option 2, Option 3"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate each option with a comma
                </p>
              </div>
            )}

            {roles.length > 0 && (
              <div>
                <Label>Applies to Roles</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Leave empty to apply to all roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const isSelected = newField.role_ids.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          const newRoleIds = isSelected
                            ? newField.role_ids.filter((id) => id !== role.id)
                            : [...newField.role_ids, role.id];
                          setNewField({ ...newField, role_ids: newRoleIds });
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_required"
                checked={newField.is_required}
                onCheckedChange={(checked) =>
                  setNewField({ ...newField, is_required: checked as boolean })
                }
              />
              <Label htmlFor="is_required" className="text-sm font-normal cursor-pointer">
                Make this field required
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateField}
              disabled={!newField.field_label.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Add Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteType === "role" ? "Role" : "Attribute"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "role"
                ? "This will remove the role. Team members with this role will have no role assigned."
                : "This will remove the field from all team members. Existing data in this field will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
