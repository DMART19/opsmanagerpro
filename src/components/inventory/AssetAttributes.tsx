import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { useAssetAttributes, AssetAttribute } from "@/hooks/use-asset-attributes";
import { AssetAttributeInput } from "./AssetAttributeInput";
import { InlineFieldCreator } from "./InlineFieldCreator";

interface AssetAttributesProps {
  values: Record<string, string | null>;
  onChange: (values: Record<string, string | null>) => void;
  errors?: Record<string, string>;
  className?: string;
  /** When true, allows clearing individual field values (per-asset). Never deletes definitions. */
  allowClearValues?: boolean;
}

export const AssetAttributes = ({
  values,
  onChange,
  errors = {},
  className,
  allowClearValues = false,
}: AssetAttributesProps) => {
  const { attributes, isLoading, deleteAttribute } = useAssetAttributes();

  const handleValueChange = (attributeId: string, value: string | null) => {
    onChange({
      ...values,
      [attributeId]: value,
    });
  };

  const handleClearValue = (attributeId: string) => {
    const newValues = { ...values };
    delete newValues[attributeId];
    onChange(newValues);
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
          <h3 className="font-medium text-sm">Custom Fields</h3>
          <p className="text-xs text-muted-foreground">
            {attributes.length === 0
              ? "Add fields to track additional item information"
              : "Custom fields specific to this asset"}
          </p>
        </div>
      </div>

      {attributes.length === 0 ? (
        <div className="text-center py-6 border rounded-lg bg-muted/10">
          <Sparkles className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-1">No custom fields yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Add fields to track additional item information.
          </p>
          <InlineFieldCreator />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attributes.map((attr) => (
              <AssetAttributeInput
                key={attr.id}
                attribute={attr}
                value={values[attr.id] ?? null}
                onChange={(value) => handleValueChange(attr.id, value)}
                error={errors[attr.id]}
                onClearValue={allowClearValues ? () => handleClearValue(attr.id) : undefined}
                onDeleteField={() => deleteAttribute(attr.id)}
              />
            ))}
          </div>
          <InlineFieldCreator />
        </div>
      )}
    </div>
  );
};

// Helper function to validate asset attributes
export const validateAssetAttributes = (
  attributes: AssetAttribute[],
  values: Record<string, string | null>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  for (const attr of attributes) {
    const value = values[attr.id];

    if (attr.required && (!value || value.trim() === "")) {
      errors[attr.id] = `${attr.name} is required`;
      continue;
    }

    if (!value || value.trim() === "") continue;

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
