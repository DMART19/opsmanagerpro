import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, Camera, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTeamRoles } from "@/hooks/use-team-roles";
import { useQueryClient } from "@tanstack/react-query";
import { EMPLOYEES_QUERY_KEY } from "@/hooks/use-employees";
import { cn } from "@/lib/utils";
import { TeamCustomFieldsSection } from "./TeamCustomFieldsSection";

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddTeamMemberModal = ({ open, onOpenChange, onSuccess }: AddTeamMemberModalProps) => {
  const [loading, setLoading] = useState(false);
  const { roles } = useTeamRoles();
  const queryClient = useQueryClient();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    role_id: "",
    department_id: "",
    email: "",
    phone: "",
    // More details
    employee_id: "",
    hire_date: "",
    position: "",
    employee_status_id: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load departments
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      if (data) setDepartments(data);
    })();
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      const defaultRole = roles.find(r => r.is_default);
      setForm({
        first_name: "", last_name: "", role_id: defaultRole?.id || "",
        department_id: "", email: "", phone: "",
        employee_id: "", hire_date: "", position: "",
        employee_status_id: "", notes: "",
      });
      setErrors({});
      setMoreDetailsOpen(false);
      setAvatarPreview(null);
      setAvatarFile(null);
      setCustomFieldValues({});
    }
  }, [open, roles]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.first_name.trim()) newErrors.first_name = "First name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email format";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large", { description: "Maximum file size is 5MB." });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!validate() || loading) return;
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.user) {
        toast.error("Please sign in to add team members.");
        return;
      }

      const userId = sessionData.session.user.id;
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();

      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `avatars/${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("employee-avatars").upload(path, avatarFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("employee-avatars").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      // Build custom_data from filled custom field values
      const customData: Record<string, any> = {};
      for (const [key, val] of Object.entries(customFieldValues)) {
        if (val !== "" && val !== null && val !== undefined) customData[key] = val;
      }

      const { data: newEmployee, error } = await supabase
        .from("employees")
        .insert({
          user_id: userId,
          employee_id: form.employee_id.trim() || `EMP-${timestamp}-${random}`,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          role_id: form.role_id || null,
          department_id: form.department_id || null,
          position: form.position.trim() || null,
          hire_date: form.hire_date || null,
          employee_status_id: form.employee_status_id || null,
          notes: form.notes.trim() || null,
          avatar_url: avatarUrl,
          created_by: userId,
          custom_data: Object.keys(customData).length > 0 ? customData : null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "42501" || error.message?.toLowerCase().includes("policy")) {
          toast.error("Permission denied", { description: "You need Manager or Admin role." });
        } else if (error.code === "23505") {
          toast.error("Duplicate entry", { description: "A member with this info already exists." });
        } else {
          toast.error("Failed to add member", { description: error.message });
        }
        return;
      }

      if (!newEmployee) {
        toast.error("Permission denied", { description: "You need Manager or Admin role." });
        return;
      }

      // Auto-assign requirements (non-blocking)
      try {
        const { data: activeRequirements } = await supabase
          .from("requirement_definitions")
          .select("id")
          .eq("is_active", true);
        if (activeRequirements?.length) {
          await supabase.from("employee_requirements").insert(
            (activeRequirements as any[]).map(req => ({
              employee_id: newEmployee.id,
              requirement_id: req.id,
              status: "Missing",
            }))
          );
        }
      } catch {}

      // Track event
      import("@/lib/track-event").then(m => m.trackEvent("team_member_added", {
        object_id: newEmployee?.id,
        object_name: `${form.first_name} ${form.last_name}`.trim(),
      }));

      toast.success("Team member added", { description: `${form.first_name} ${form.last_name || ""} has been added.`.trim() });
      // Invalidate employees cache so /people and dashboard stay in sync
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Unexpected error", { description: err.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const initials = `${form.first_name?.[0] || ""}${form.last_name?.[0] || ""}`.toUpperCase() || "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Add a new member to your team. Fill in the basics and save — you can add more details later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          {/* Full Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="add-first-name" className="text-xs">First Name *</Label>
              <Input
                id="add-first-name"
                value={form.first_name}
                onChange={e => updateField("first_name", e.target.value)}
                placeholder="First name"
                className={cn("h-9", errors.first_name && "border-destructive")}
                autoFocus
              />
              {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <Label htmlFor="add-last-name" className="text-xs">Last Name</Label>
              <Input
                id="add-last-name"
                value={form.last_name}
                onChange={e => updateField("last_name", e.target.value)}
                placeholder="Last name"
                className="h-9"
              />
            </div>
          </div>

          {/* Role */}
          {roles.length > 0 && (
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={form.role_id} onValueChange={v => updateField("role_id", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Department */}
          {departments.length > 0 && (
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={form.department_id} onValueChange={v => updateField("department_id", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="add-email" className="text-xs">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={form.email}
                onChange={e => updateField("email", e.target.value)}
                placeholder="email@company.com"
                className={cn("h-9", errors.email && "border-destructive")}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="add-phone" className="text-xs">Phone</Label>
              <Input
                id="add-phone"
                type="tel"
                value={form.phone}
                onChange={e => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
                className="h-9"
              />
            </div>
          </div>

          {/* More Details – Collapsible */}
          <Collapsible open={moreDetailsOpen} onOpenChange={setMoreDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground px-2 h-8">
                <span className="text-xs font-medium">More Details</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", moreDetailsOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3 border-t mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-emp-id" className="text-xs">Employee ID</Label>
                  <Input
                    id="add-emp-id"
                    value={form.employee_id}
                    onChange={e => updateField("employee_id", e.target.value)}
                    placeholder="Auto-generated"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="add-hire-date" className="text-xs">Hire Date</Label>
                  <Input
                    id="add-hire-date"
                    type="date"
                    value={form.hire_date}
                    onChange={e => updateField("hire_date", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="add-position" className="text-xs">Position / Title</Label>
                <Input
                  id="add-position"
                  value={form.position}
                  onChange={e => updateField("position", e.target.value)}
                  placeholder="e.g. Field Technician"
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="add-notes" className="text-xs">Notes</Label>
                <Textarea
                  id="add-notes"
                  value={form.notes}
                  onChange={e => updateField("notes", e.target.value)}
                  placeholder="Internal notes about this team member..."
                  className="min-h-[60px] resize-none text-sm"
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Custom Fields */}
          <TeamCustomFieldsSection values={customFieldValues} onChange={setCustomFieldValues} />
        </div>

        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
