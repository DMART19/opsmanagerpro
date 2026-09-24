import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, Tag, FileText, Camera, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { TaxonomyCombobox } from "@/components/ui/taxonomy-combobox";
import { TagInput } from "./TagInput";
import { TeamMemberAttributes } from "./TeamMemberAttributes";
import { useTeamMemberAttributes, useEmployeeAttributeValues } from "@/hooks/use-team-member-attributes";

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess: () => void;
}

export const EditEmployeeModal = ({ open, onOpenChange, employee, onSuccess }: EditEmployeeModalProps) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const { attributes } = useTeamMemberAttributes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { valuesMap: existingAttrValues, isLoading: loadingAttrValues } = useEmployeeAttributeValues(
    open && employee?.id ? employee.id : null
  );

  const [attributeValues, setAttributeValues] = useState<Record<string, string | null>>({});
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    notes: "",
    tags: [] as string[],
    avatar_url: "" as string | null,
  });
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [employeeStatusId, setEmployeeStatusId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("employee_statuses").select("id, name").order("sort_order").then(({ data }) => {
        if (data) setStatuses(data);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && employee) {
      const hasTags = employee.tags && employee.tags.length > 0;
      const hasNotes = employee.notes?.trim();

      setFormData({
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position || "",
        notes: employee.notes || "",
        tags: employee.tags || [],
        avatar_url: employee.avatar_url || null,
      });
      setDepartmentId(employee.department_id || null);
      setEmployeeStatusId(employee.employee_status_id || null);
      setAttributeValues({});
      setIsInitialized(false);
      setIsDirty(false);
      setMoreOpen(hasTags || hasNotes);
    }
  }, [open, employee?.id]);

  useEffect(() => {
    if (open && !loadingAttrValues && existingAttrValues && !isInitialized) {
      setAttributeValues(existingAttrValues);
      setIsInitialized(true);
      if (Object.keys(existingAttrValues).length > 0) setMoreOpen(true);
    }
  }, [open, loadingAttrValues, existingAttrValues, isInitialized]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleDepartmentChange = (val: string | null) => { setDepartmentId(val); setIsDirty(true); };
  const handleStatusChange = (val: string) => { setEmployeeStatusId(val); setIsDirty(true); };
  const handleAttributeChange = (vals: Record<string, string | null>) => { setAttributeValues(vals); setIsDirty(true); };

  // ── Avatar Upload ──
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${employee.id}/${Date.now()}.${ext}`;

      // Delete old avatar if exists
      if (formData.avatar_url) {
        const oldPath = formData.avatar_url.split("/avatars/")[1];
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      updateField("avatar_url", urlData.publicUrl);
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (formData.avatar_url) {
      const oldPath = formData.avatar_url.split("/avatars/")[1];
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    }
    updateField("avatar_url", null);
  };

  // ── Validation ──
  const validateForm = (): boolean => {
    const newAttrErrors: Record<string, string> = {};
    attributes.forEach(attr => {
      if (attr.required) {
        const value = attributeValues[attr.id];
        if (!value || value.trim() === "") newAttrErrors[attr.id] = `${attr.name} is required`;
      }
      if (attr.type === "number" && attributeValues[attr.id]) {
        if (isNaN(Number(attributeValues[attr.id]))) newAttrErrors[attr.id] = "Must be a valid number";
      }
    });
    setAttributeErrors(newAttrErrors);
    return Object.keys(newAttrErrors).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    if (loading) return;
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) { toast.error("Please sign in"); return; }

      const { error } = await supabase.from("employees").update({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        position: formData.position?.trim() || null,
        department_id: departmentId || null,
        employee_status_id: employeeStatusId || null,
        notes: formData.notes?.trim() || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        avatar_url: formData.avatar_url || null,
        updated_at: new Date().toISOString(),
      }).eq("id", employee.id);

      if (error) {
        if (error.code === "42501") {
          toast.error("Permission denied", { description: "You need Manager or Admin role." });
        } else {
          toast.error("Failed to update", { description: error.message });
        }
        return;
      }

      // Save attributes
      try {
        const valuesToSave = Object.entries(attributeValues).filter(([_, v]) => v !== null);
        if (valuesToSave.length > 0) {
          const upserts = valuesToSave.map(([attrId, value]) => ({
            employee_id: employee.id,
            attribute_id: attrId,
            value: value,
          }));
          await supabase.from("team_member_attribute_values").upsert(upserts, { onConflict: "employee_id,attribute_id" });
        }
      } catch (attrErr) {
        console.error("Failed to save attributes:", attrErr);
      }

      toast.success("Changes saved");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to update team member");
    } finally {
      setLoading(false);
    }
  };

  const initials = `${employee?.first_name?.[0] || ""}${employee?.last_name?.[0] || ""}`.toUpperCase();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
      e.preventDefault();
      handleSave();
    }
  };

  const ic = "mt-0.5 h-9 text-sm border-border/40 hover:border-border/70 focus-visible:ring-primary/20 focus-visible:ring-2 focus-visible:border-primary/40 transition-colors";

  // ── Status color map ──
  const getStatusColor = (name: string) => {
    const n = name.toLowerCase();
    const map: Record<string, { dot: string; selected: string }> = {
      active: { dot: "bg-emerald-500", selected: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
      inactive: { dot: "bg-muted-foreground/40", selected: "border-muted-foreground/50 bg-muted text-muted-foreground" },
      "on leave": { dot: "bg-amber-500", selected: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
      "on-leave": { dot: "bg-amber-500", selected: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
      onboarding: { dot: "bg-sky-500", selected: "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-400" },
      training: { dot: "bg-violet-500", selected: "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400" },
      terminated: { dot: "bg-destructive", selected: "border-destructive bg-destructive/10 text-destructive" },
    };
    return map[n] || { dot: "bg-primary", selected: "border-primary bg-primary/10 text-primary" };
  };

  const formContent = (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* ── Avatar + Name Header ── */}
      <div className="flex items-center gap-4">
        {/* Clickable Avatar */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={avatarUploading}
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center overflow-hidden",
              "border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              formData.avatar_url && "border-solid border-transparent"
            )}
          >
            {avatarUploading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
            )}
            {/* Camera overlay */}
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </button>
          {formData.avatar_url && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* Name fields inline with avatar */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="edit_first_name" className="text-xs text-muted-foreground">First Name *</Label>
            <Input
              id="edit_first_name"
              value={formData.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              placeholder="First"
              className={ic}
            />
          </div>
          <div>
            <Label htmlFor="edit_last_name" className="text-xs text-muted-foreground">Last Name *</Label>
            <Input
              id="edit_last_name"
              value={formData.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              placeholder="Last"
              className={ic}
            />
          </div>
        </div>
      </div>

      {/* ── Contact Fields ── */}
      <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div>
          <Label htmlFor="edit_email" className="text-xs text-muted-foreground">Email</Label>
          <Input
            id="edit_email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="email@example.com"
            className={ic}
          />
        </div>
        <div>
          <Label htmlFor="edit_phone" className="text-xs text-muted-foreground">Phone</Label>
          <Input
            id="edit_phone"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="(555) 000-0000"
            className={ic}
          />
        </div>
      </div>

      {/* ── Role Fields ── */}
      <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <div>
          <Label htmlFor="edit_position" className="text-xs text-muted-foreground">Title / Position</Label>
          <Input
            id="edit_position"
            value={formData.position}
            onChange={(e) => updateField("position", e.target.value)}
            placeholder="e.g. Forklift Operator"
            className={ic}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Department</Label>
          <div className="mt-0.5">
            <TaxonomyCombobox
              table="departments"
              value={departmentId}
              onChange={handleDepartmentChange}
              placeholder="Select department"
            />
          </div>
        </div>
      </div>


      {/* ── More Details (collapsed) ── */}
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-border/30 hover:bg-muted/40 transition-colors text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">More Details</span>
              {!moreOpen && (formData.notes || formData.tags.length > 0) && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
              moreOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 pt-3">
            <div>
              <Label htmlFor="edit_notes" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                Notes
              </Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={2}
                className="mt-0.5 text-sm border-border/40 hover:border-border/70 focus-visible:ring-primary/20 focus-visible:ring-2 transition-colors"
                placeholder="Any additional notes..."
              />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Tag className="h-3 w-3" />
                Tags
              </Label>
              <TagInput
                tags={formData.tags}
                onChange={(tags) => updateField("tags", tags)}
                placeholder="Add tag..."
              />
            </div>
            <TeamMemberAttributes
              values={attributeValues}
              onChange={handleAttributeChange}
              errors={attributeErrors}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  const actionButtons = (
    <div className="flex gap-2.5 pt-3">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={loading}
        className="flex-1 h-9 text-sm"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={loading || !isDirty}
        className="flex-1 h-9 text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] flex flex-col p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <SheetTitle className="text-sm">Edit Team Member</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {formContent}
          </div>
          <div className="shrink-0 px-4 pb-6 border-t bg-background">
            {actionButtons}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Edit Team Member</DialogTitle>
        </DialogHeader>
        <div className="py-1">
          {formContent}
        </div>
        <div className="border-t border-border/30">
          {actionButtons}
        </div>
      </DialogContent>
    </Dialog>
  );
};
