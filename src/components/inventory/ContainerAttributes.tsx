import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles, Trash2, MoreHorizontal, ShieldOff } from "lucide-react";
import { useContainerAttributes, ContainerAttribute } from "@/hooks/use-container-attributes";
import { ContainerAttributeInput } from "./ContainerAttributeInput";
import { AddContainerAttributeModal } from "./AddContainerAttributeModal";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ContainerAttributesProps {
  values: Record<string, string | null>;
  onChange: (values: Record<string, string | null>) => void;
  errors?: Record<string, string>;
  className?: string;
}

export const ContainerAttributes = ({
  values,
  onChange,
  errors = {},
  className,
}: ContainerAttributesProps) => {
  const { attributes, isLoading, deleteAttribute, updateAttribute } = useContainerAttributes();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContainerAttribute | null>(null);

  const handleValueChange = (attributeId: string, value: string | null) => {
    onChange({
      ...values,
      [attributeId]: value,
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAttribute.mutate(deleteTarget.id);
    // Remove from local values
    const updated = { ...values };
    delete updated[deleteTarget.id];
    onChange(updated);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm">Custom Attributes</h3>
          <p className="text-xs text-muted-foreground">
            {attributes.length === 0 
              ? "Add fields for tracking additional info"
              : `${attributes.length} attribute${attributes.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={() => setAddModalOpen(true)}
          className="h-8 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {attributes.length === 0 ? (
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="w-full py-6 border border-dashed rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-center"
        >
          <Sparkles className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Add custom attributes
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Track project codes, owners, or any custom data
          </p>
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attributes.map((attr) => (
            <div key={attr.id} className="relative group">
              <ContainerAttributeInput
                attribute={attr}
                value={values[attr.id] ?? null}
                onChange={(value) => handleValueChange(attr.id, value)}
                error={errors[attr.id]}
              />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {attr.required && (
                    <DropdownMenuItem
                      onClick={() => updateAttribute.mutate({ id: attr.id, required: false })}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-2" />
                      Make Optional
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(attr)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete Field
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <AddContainerAttributeModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the "{deleteTarget?.name}" field from all containers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Helper function to validate container attributes
export const validateContainerAttributes = (
  attributes: ContainerAttribute[],
  values: Record<string, string | null>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  for (const attr of attributes) {
    const value = values[attr.id];
    
    // Check required fields
    if (attr.required && (!value || value.trim() === "")) {
      errors[attr.id] = `${attr.name} is required`;
      continue;
    }

    // Skip validation for empty non-required fields
    if (!value || value.trim() === "") continue;

    // Type-specific validation
    switch (attr.type) {
      case "number":
        if (isNaN(Number(value))) {
          errors[attr.id] = `${attr.name} must be a number`;
        }
        break;
      case "select":
        if (attr.options && !attr.options.includes(value)) {
          errors[attr.id] = `${attr.name} must be one of the available options`;
        }
        break;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
