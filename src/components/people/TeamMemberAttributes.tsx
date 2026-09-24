import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles } from "lucide-react";
import { useTeamMemberAttributes } from "@/hooks/use-team-member-attributes";
import { CustomAttributeInput } from "./CustomAttributeInput";
import { AddCustomAttributeModal } from "./AddCustomAttributeModal";
import { cn } from "@/lib/utils";

interface TeamMemberAttributesProps {
  /** Current values keyed by attribute ID */
  values: Record<string, string | null>;
  /** Called when any value changes */
  onChange: (values: Record<string, string | null>) => void;
  /** Validation errors keyed by attribute ID */
  errors?: Record<string, string>;
  /** Additional CSS classes */
  className?: string;
}

export const TeamMemberAttributes = ({
  values,
  onChange,
  errors = {},
  className,
}: TeamMemberAttributesProps) => {
  const { attributes, isLoading, createAttribute, deleteAttribute, isCreating, isDeleting } = useTeamMemberAttributes();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleValueChange = useCallback((attributeId: string, value: string | null) => {
    onChange({
      ...values,
      [attributeId]: value,
    });
  }, [values, onChange]);

  const handleCreateAttribute = async (input: Parameters<typeof createAttribute>[0]) => {
    const newAttr = await createAttribute(input);
    // Initialize the new attribute's value if needed
    if (newAttr && !values[newAttr.id]) {
      onChange({
        ...values,
        [newAttr.id]: null,
      });
    }
  };

  const handleDeleteAttribute = useCallback((id: string) => {
    deleteAttribute(id);
    // Remove the value from the local state
    const newValues = { ...values };
    delete newValues[id];
    onChange(newValues);
  }, [deleteAttribute, values, onChange]);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Custom Attributes
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Attribute
        </Button>
      </div>

      {/* Attribute Fields */}
      {attributes.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            No custom attributes yet
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Add attributes like Height, Shirt Size, or License Number
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Attribute
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {attributes.map((attr) => (
            <CustomAttributeInput
              key={attr.id}
              attribute={attr}
              value={values[attr.id] ?? null}
              onChange={(value) => handleValueChange(attr.id, value)}
              error={errors[attr.id]}
              onDelete={handleDeleteAttribute}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Add Attribute Modal */}
      <AddCustomAttributeModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={handleCreateAttribute}
        isLoading={isCreating}
      />
    </div>
  );
};
