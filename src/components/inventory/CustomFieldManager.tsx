import { useState } from "react";
import { Plus, Trash2, Edit, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useCustomFields } from "@/hooks/use-custom-fields";
import { CreateCustomFieldModal } from "./CreateCustomFieldModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomFieldManagerProps {
  tableName: string;
  tableLabel: string;
}

export const CustomFieldManager = ({ tableName, tableLabel }: CustomFieldManagerProps) => {
  const { customFields, isLoading, refetch } = useCustomFields(tableName);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!fieldToDelete) return;

    try {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", fieldToDelete);

      if (error) throw error;

      toast({
        title: "Field deleted",
        description: "Custom field has been removed",
      });

      setDeleteDialogOpen(false);
      setFieldToDelete(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Failed to delete field",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFieldCreated = () => {
    refetch();
  };

  const openDeleteDialog = (fieldId: string) => {
    setFieldToDelete(fieldId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Custom Fields for {tableLabel}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add custom fields to track additional data beyond the default schema
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Field
          </Button>
        </div>

        {customFields.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="font-semibold mb-2">No custom fields yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create custom fields to store additional data that doesn't fit the default schema
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Custom Field
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Label</TableHead>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Default Value</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.field_label}</TableCell>
                    <TableCell className="font-mono text-sm">{field.field_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{field.field_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {field.is_required ? (
                        <Badge variant="destructive">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {field.default_value || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={field.storage_type === "column" ? "default" : "secondary"}>
                        {field.storage_type === "column" ? "Column" : "Custom Data"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteDialog(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <CreateCustomFieldModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        tableName={tableName}
        onFieldCreated={handleFieldCreated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom field? This action cannot be undone.
              Existing data in this field will not be deleted, but the field will no longer be available for new records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
