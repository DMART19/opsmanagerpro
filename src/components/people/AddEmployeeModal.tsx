import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTeamRoles } from "@/hooks/use-team-roles";

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddEmployeeModal = ({ open, onOpenChange, onSuccess }: AddEmployeeModalProps) => {
  const [loading, setLoading] = useState(false);
  const { roles } = useTeamRoles();

  const [formData, setFormData] = useState({
    email: "",
    role_id: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const defaultRole = roles.find(r => r.is_default);
      setFormData({
        email: "",
        role_id: defaultRole?.id || "",
      });
      setErrors({});
    }
  }, [open, roles]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const handleCreate = async () => {
    if (!validate() || loading) return;
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.user) {
        toast.error("Please sign in to invite members.");
        return;
      }

      const userId = sessionData.session.user.id;
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();

      // Derive a placeholder name from the email
      const emailPrefix = formData.email.split("@")[0] || "New";
      const firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

      const { data: newEmployee, error } = await supabase
        .from("employees")
        .insert({
          user_id: userId,
          employee_id: `EMP-${timestamp}-${random}`,
          first_name: firstName,
          last_name: "",
          email: formData.email.trim(),
          role_id: formData.role_id || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
          toast.error("Permission denied", { description: "You need Manager or Admin role." });
        } else if (error.code === '23505') {
          toast.error("Duplicate entry", { description: "A member with this email already exists." });
        } else {
          toast.error("Failed to invite member", { description: error.message });
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
          import("@/lib/track-event").then(m => {
            for (const _req of activeRequirements) {
              m.trackEvent("credential_added", { object_name: "Credential" });
            }
          });
        }
      } catch {}

      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => m.trackEvent("team_member_added", {
        object_id: newEmployee?.id,
        object_name: formData.email,
      }));

      toast.success("Invite sent", { description: `${formData.email} has been added to your team.` });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Unexpected error", { description: err.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Add a member by email and assign their role. They can complete their profile after joining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="colleague@company.com"
              className={errors.email ? "border-destructive" : ""}
              autoFocus
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          {roles.length > 0 && (
            <div>
              <Label>Role</Label>
              <Select value={formData.role_id} onValueChange={(v) => updateField("role_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Determines what this member can access.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
