import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Plus, Settings2, ChevronDown, Loader2, CalendarIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRequirementAttributes, useRequirementAttributeValues } from "@/hooks/use-requirement-attributes";
import { RequirementAttributeFields } from "./RequirementAttributeFields";
import { AddRequirementAttributeModal } from "./AddRequirementAttributeModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTourMode } from "@/contexts/TourModeContext";
import { format, addMonths, addYears } from "date-fns";

interface AddRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingRequirement?: any;
  /** Pre-fill the title field when creating a new credential */
  prefillTitle?: string;
  /** Called with the new requirement ID after successful creation */
  onCreatedId?: (id: string) => void;
}

export const AddRequirementModal = ({
  open,
  onOpenChange,
  onSuccess,
  editingRequirement,
  prefillTitle,
  onCreatedId,
}: AddRequirementModalProps) => {
  const [loading, setLoading] = useState(false);
  const [requirementTypes, setRequirementTypes] = useState<{id: string; name: string}[]>([]);
  const [customType, setCustomType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);
  const isMobile = useIsMobile();
  const { isTourMode } = useTourMode();
  
  const { attributes, createAttribute, isCreating } = useRequirementAttributes();
  const { valuesMap: existingAttrValues } = useRequirementAttributeValues(editingRequirement?.id || null);
  // Core form data
  const [formData, setFormData] = useState({
    title: "",
    requirement_type: "",
    is_general: false,
    sort_key: "",
    description: "",
    document_hint: "",
    has_expiration: false,
    renewal_cycle_months: "",
  });

  const [attributeValues, setAttributeValues] = useState<Record<string, string | null>>({});
  
  // Collapsible sections state
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Expiration configuration state
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [useDurationMode, setUseDurationMode] = useState(false);
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState<"days" | "months" | "years">("years");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isEditMode = !!editingRequirement;

  useEffect(() => {
    loadRequirementTypes();
  }, []);

  // Reset form when opening
  const resetForm = () => {
    setFormData({
      title: "",
      requirement_type: "",
      is_general: false,
      sort_key: "",
      description: "",
      document_hint: "",
      has_expiration: false,
      renewal_cycle_months: "",
    });
    setFile(null);
    setCustomType("");
    setAttributeValues({});
    setCustomFieldsOpen(false);
    setAdvancedOpen(false);
    setExpirationDate(undefined);
    setUseDurationMode(false);
    setDurationValue("1");
    setDurationUnit("years");
    setValidationError(null);
  };

  // Compute calculated expiration date from duration + today as base
  const getCalculatedExpirationDate = (): Date | undefined => {
    const base = new Date();
    const num = parseInt(durationValue);
    if (isNaN(num) || num < 1) return undefined;
    if (durationUnit === "days") return new Date(base.getTime() + num * 86400000);
    if (durationUnit === "months") return addMonths(base, num);
    return addYears(base, num);
  };

  // Initialize form data when editing or opening
  useEffect(() => {
    if (editingRequirement) {
      const renewalMonths = editingRequirement.renewal_cycle_months?.toString() || "";
      const typeName = editingRequirement.requirement_type_ref?.name || editingRequirement.requirement_type || "";
      setFormData({
        title: editingRequirement.title || "",
        requirement_type: typeName,
        is_general: editingRequirement.is_general || false,
        sort_key: editingRequirement.sort_key?.toString() || "",
        description: editingRequirement.description || "",
        document_hint: editingRequirement.document_hint || "",
        has_expiration: editingRequirement.has_expiration || false,
        renewal_cycle_months: renewalMonths,
      });

      // Reset expiration UI state for simplicity
      setExpirationDate(undefined);
      setUseDurationMode(false);
      setDurationValue("1");
      setDurationUnit("years");
      setValidationError(null);

      // Auto-expand sections with data
      if (editingRequirement.description || editingRequirement.document_hint || editingRequirement.sort_key) {
        setAdvancedOpen(true);
      }
    } else if (prefillTitle) {
      resetForm();
      setFormData(prev => ({ ...prev, title: prefillTitle }));
    } else {
      resetForm();
    }
  }, [editingRequirement?.id, open, prefillTitle]);

  // Initialize attribute values when editing
  useEffect(() => {
    if (editingRequirement?.id && Object.keys(existingAttrValues).length > 0) {
      setAttributeValues(existingAttrValues);
      setCustomFieldsOpen(true);
    }
  }, [editingRequirement?.id, existingAttrValues]);

  const loadRequirementTypes = async () => {
    const { data } = await supabase
      .from("requirement_types")
      .select("id, name")
      .order("name");

    if (data) {
      setRequirementTypes(data.filter((r: any) => r.name));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `requirements/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("requirement-documents")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("requirement-documents")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAttributeChange = (attributeId: string, value: string | null) => {
    setAttributeValues(prev => ({ ...prev, [attributeId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Credential title is required");
      return;
    }

    // Validate expiration fields
    if (formData.has_expiration) {
      if (!useDurationMode && !expirationDate) {
        toast.error("Please select an expiration date");
        return;
      }
      if (useDurationMode) {
        const num = parseInt(durationValue);
        if (isNaN(num) || num < 1) {
          setValidationError("Enter a valid duration (1 or more)");
          return;
        }
      }
    }

    // Validate required attributes
    const missingRequired = attributes.filter(attr => 
      attr.required && !attributeValues[attr.id]
    );
    if (missingRequired.length > 0) {
      toast.error(`Missing required fields: ${missingRequired.map(a => a.name).join(", ")}`);
      return;
    }

    // Demo mode guard
    if (isTourMode) {
      toast.success(editingRequirement ? "Credential updated (demo)" : "Credential added (demo)", {
        description: "Saved temporarily — changes reset when the demo ends.",
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
      return;
    }

    setLoading(true);

    try {
      let attachmentUrl = editingRequirement?.attachment_url;
      
      if (file) {
        attachmentUrl = await uploadFile();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save credentials");
        setLoading(false);
        return;
      }

      // Resolve requirement_type_id from the selected type name or custom type
      let resolvedTypeId: string | null = null;
      const typeName = customType || formData.requirement_type;
      if (typeName && typeName !== "__custom__") {
        const found = requirementTypes.find(t => t.name === typeName);
        if (found) {
          resolvedTypeId = found.id;
        } else if (typeName.trim()) {
          // Create new type on the fly
          const { data: newType } = await supabase
            .from("requirement_types")
            .insert({ name: typeName.trim(), user_id: user.id })
            .select("id")
            .single();
          if (newType) resolvedTypeId = newType.id;
        }
      }

      // Compute renewal_cycle_months from duration mode for backend compatibility
      let renewalCycleMonths: number | null = null;
      if (formData.has_expiration) {
        if (useDurationMode) {
          const num = parseInt(durationValue);
          if (durationUnit === "days") renewalCycleMonths = Math.round(num / 30);
          else if (durationUnit === "months") renewalCycleMonths = num;
          else renewalCycleMonths = num * 12;
        }
        // If date mode, we don't compute renewal_cycle_months (it stays null)
      }

      const requirementData = {
        title: formData.title.trim(),
        requirement_type_id: resolvedTypeId,
        is_general: formData.is_general,
        sort_key: formData.sort_key ? parseInt(formData.sort_key) : null,
        description: formData.description || null,
        document_hint: formData.document_hint || null,
        has_expiration: formData.has_expiration,
        renewal_cycle_months: renewalCycleMonths,
        attachment_url: attachmentUrl,
        is_active: true,
        user_id: user.id,
      };

      let requirementId = editingRequirement?.id;

      if (editingRequirement) {
        const { error } = await supabase
          .from("requirement_definitions")
          .update(requirementData)
          .eq("id", editingRequirement.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("requirement_definitions")
          .insert(requirementData)
          .select()
          .single();

        if (error) throw error;
        requirementId = data.id;
      }

      // Save attribute values
      if (requirementId && Object.keys(attributeValues).length > 0) {
        const upserts = Object.entries(attributeValues)
          .filter(([_, value]) => value !== null && value !== "")
          .map(([attributeId, value]) => ({
            requirement_id: requirementId,
            attribute_id: attributeId,
            value: value,
          }));

        if (upserts.length > 0) {
          const { error: attrError } = await supabase
            .from("requirement_attribute_values")
            .upsert(upserts, { onConflict: "requirement_id,attribute_id" });

          if (attrError) {
            console.error("Error saving attribute values:", attrError);
          }
        }
      }

      toast.success(editingRequirement ? "Credential updated" : "Credential added");
      if (!editingRequirement && requirementId) {
        onCreatedId?.(requirementId);
      }
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(`Failed to save credential: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto space-y-6 px-1 -mx-1 min-h-0">
        {/* === ALWAYS VISIBLE: Core Fields === */}
        <div className="space-y-4">
          {/* Credential Title - Only Required Field */}
          <div className="space-y-2">
            <Label htmlFor="title">Credential Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., CPR Certification, PMP, Teaching License"
              className="h-11"
              autoFocus
            />
          </div>

          {/* Category - Optional */}
          <div className="space-y-2">
            <Label htmlFor="requirement_type">Category</Label>
            <Select
              value={formData.requirement_type || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setFormData({ ...formData, requirement_type: "" });
                } else {
                  setFormData({ ...formData, requirement_type: value });
                  setCustomType("");
                }
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">-- No Category --</SelectItem>
                {requirementTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">+ Add Custom Category</SelectItem>
              </SelectContent>
            </Select>
            {formData.requirement_type === "__custom__" && (
              <Input
                className="mt-2 h-11"
                placeholder="Enter custom category"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* === APPLICABILITY MODULE === */}
        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="is_general" className="cursor-pointer text-sm font-medium">
              Required for All Team Members
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, this credential applies to everyone
            </p>
          </div>
          <Switch
            id="is_general"
            checked={formData.is_general}
            onCheckedChange={(checked) => setFormData({ ...formData, is_general: checked })}
          />
        </div>

        {/* === EXPIRATION SECTION === */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/20">
          <div className="flex items-center justify-between">
            <Label htmlFor="has_expiration" className="cursor-pointer text-sm font-medium">
              This credential expires
            </Label>
            <Switch
              id="has_expiration"
              checked={formData.has_expiration}
              onCheckedChange={(checked) => {
                setFormData({ ...formData, has_expiration: checked, renewal_cycle_months: "" });
                if (!checked) {
                  setExpirationDate(undefined);
                  setUseDurationMode(false);
                  setValidationError(null);
                }
              }}
            />
          </div>

          {formData.has_expiration && (
            <div className="space-y-3 animate-in fade-in-0 duration-200">
              {!useDurationMode ? (
                /* ── PRIMARY: Date picker ── */
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Expiration Date</Label>
                  <EnhancedDatePicker
                    date={expirationDate}
                    onDateChange={setExpirationDate}
                    placeholder="Select expiration date"
                    minDate={new Date()}
                  />
                  <p className="text-xs text-muted-foreground">
                    This credential will automatically be marked as expired after this date.
                  </p>
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline mt-0.5"
                    onClick={() => { setUseDurationMode(true); setExpirationDate(undefined); setValidationError(null); }}
                  >
                    Use duration instead
                  </button>
                </div>
              ) : (
                /* ── SECONDARY: Duration mode ── */
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Valid For</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => {
                        setDurationValue(e.target.value);
                        setValidationError(null);
                      }}
                      className="h-11 w-24 text-center"
                      placeholder="1"
                    />
                    <Select
                      value={durationUnit}
                      onValueChange={(v: "days" | "months" | "years") => {
                        setDurationUnit(v);
                        setValidationError(null);
                      }}
                    >
                      <SelectTrigger className="h-11 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="days">
                          {parseInt(durationValue) === 1 ? "day" : "days"}
                        </SelectItem>
                        <SelectItem value="months">
                          {parseInt(durationValue) === 1 ? "month" : "months"}
                        </SelectItem>
                        <SelectItem value="years">
                          {parseInt(durationValue) === 1 ? "year" : "years"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(() => {
                    const calc = getCalculatedExpirationDate();
                    return calc ? (
                      <p className="text-xs text-muted-foreground">
                        Expires on: <span className="font-medium text-foreground">{format(calc, "PPP")}</span>
                      </p>
                    ) : null;
                  })()}
                  {validationError && <p className="text-xs text-destructive">{validationError}</p>}
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => { setUseDurationMode(false); setDurationValue("1"); setDurationUnit("years"); setValidationError(null); }}
                  >
                    Use a specific date instead
                  </button>
                </div>
              )}
            </div>
          )}
        </div>


        {attributes.length > 0 ? (
          <Collapsible open={customFieldsOpen} onOpenChange={setCustomFieldsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-4 h-auto border rounded-xl hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium">Custom Attributes</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {attributes.length} field{attributes.length !== 1 ? "s" : ""} defined
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  customFieldsOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                <RequirementAttributeFields
                  attributes={attributes}
                  values={attributeValues}
                  onChange={handleAttributeChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAttributeModal(true)}
                  className="w-full border-dashed gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Attribute
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddAttributeModal(true)}
            className="w-full border-dashed h-auto py-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Attribute
          </Button>
        )}

        {/* === ADVANCED OPTIONS === */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full justify-between p-4 h-auto text-muted-foreground hover:text-foreground"
            >
              <span>Advanced Options</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                advancedOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of this credential..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_hint">Document Hint</Label>
              <Input
                id="document_hint"
                value={formData.document_hint}
                onChange={(e) => setFormData({ ...formData, document_hint: e.target.value })}
                placeholder="e.g., Upload signed certificate"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_key">Sort Order</Label>
              <Input
                id="sort_key"
                type="number"
                value={formData.sort_key}
                onChange={(e) => setFormData({ ...formData, sort_key: e.target.value })}
                placeholder="e.g., 1"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Attach File (Optional)</Label>
              <div className="mt-2">
                {file ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/40 hover:border-primary transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload PDF or image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* === ACTION BUTTONS === */}
      <div className="flex gap-3 pt-4 mt-4 border-t shrink-0 bg-background">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            isEditMode ? "Update Credential" : "Add Credential"
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => handleClose(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  // Mobile uses Sheet, Desktop uses Dialog
  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={handleClose}>
          <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl flex flex-col p-6">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="text-xl font-bold">
                {isEditMode ? "Edit Credential" : "Add Credential"}
              </SheetTitle>
            </SheetHeader>
            {formContent}
          </SheetContent>
        </Sheet>

        <AddRequirementAttributeModal
          open={showAddAttributeModal}
          onOpenChange={setShowAddAttributeModal}
          onSubmit={createAttribute}
          isLoading={isCreating}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditMode ? "Edit Credential" : "Add Credential"}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <AddRequirementAttributeModal
        open={showAddAttributeModal}
        onOpenChange={setShowAddAttributeModal}
        onSubmit={createAttribute}
        isLoading={isCreating}
      />
    </>
  );
};
