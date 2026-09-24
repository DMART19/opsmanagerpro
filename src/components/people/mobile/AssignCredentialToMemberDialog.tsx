import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import { 
  Search, 
  Shield, 
  Loader2, 
  Plus, 
  CalendarIcon,
  Check 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AddRequirementModal } from "../AddRequirementModal";

interface AssignCredentialToMemberDialogProps {
  employeeId: string;
  employeeName: string;
  alreadyAssignedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Credential {
  id: string;
  title: string;
  requirement_type: string;
  has_expiration: boolean | null;
  renewal_cycle_months: number | null;
}

interface SelectedCredential {
  id: string;
  expireDate?: Date;
}

export const AssignCredentialToMemberDialog = ({
  employeeId,
  employeeName,
  alreadyAssignedIds,
  open,
  onOpenChange,
  onSuccess,
}: AssignCredentialToMemberDialogProps) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, SelectedCredential>>(new Map());
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [createPrefillTitle, setCreatePrefillTitle] = useState("");
  useEffect(() => {
    if (open) {
      loadCredentials();
      setSelected(new Map());
      setSearchQuery("");
    }
  }, [open]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("requirement_definitions")
        .select("id, title, has_expiration, renewal_cycle_months, requirement_type_ref:requirement_type_id(name)")
        .eq("is_active", true)
        .eq("user_id", user.id)
        .order("title");

      if (error) throw error;
      setCredentials((data || []).map((d: any) => ({
        ...d,
        requirement_type: d.requirement_type_ref?.name ?? "Uncategorized",
      })));
    } catch (error: any) {
      console.error("Error loading credentials:", error);
      toast.error("Failed to load credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (cred: Credential) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(cred.id)) {
        next.delete(cred.id);
      } else {
        next.set(cred.id, { id: cred.id });
      }
      return next;
    });
  };

  const handleSetExpiry = (credId: string, date: Date | undefined) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(credId);
      if (existing) {
        next.set(credId, { ...existing, expireDate: date });
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inserts = Array.from(selected.values()).map((sel) => ({
        employee_id: employeeId,
        requirement_id: sel.id,
        user_id: user.id,
        status: "Assigned" as string,
        expire_date: sel.expireDate ? sel.expireDate.toISOString().split("T")[0] : null,
        issue_date: sel.expireDate ? new Date().toISOString().split("T")[0] : null,
      }));

      const { error } = await supabase
        .from("employee_requirements")
        .insert(inserts);

      if (error) throw error;
      
      // Fire-and-forget event tracking
      import("@/lib/track-event").then(m => {
        for (let i = 0; i < inserts.length; i++) m.trackEvent("credential_added", { object_name: employeeName });
      });

      toast.success(
        `Assigned ${selected.size} credential${selected.size > 1 ? "s" : ""} to ${employeeName}`,
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error assigning credentials:", error);
      toast.error(error.message || "Failed to assign credentials");
    } finally {
      setSaving(false);
    }
  };

  const available = credentials.filter((c) => {
    if (alreadyAssignedIds.includes(c.id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.requirement_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Assign Credentials
            </DrawerTitle>
            <p className="text-sm text-muted-foreground">
              Select credentials to assign to {employeeName}
            </p>
          </DrawerHeader>

          <div className="px-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Credential List */}
            <ScrollArea className="h-[40vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : available.length === 0 ? (
                <div className="py-8 text-center px-4">
                  {searchQuery ? (
                    <>
                      <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Credential not found
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        No credential named "{searchQuery}" exists.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCreatePrefillTitle(searchQuery);
                          setShowCreateNew(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create "{searchQuery}"
                      </Button>
                    </>
                  ) : (
                    <>
                      <Shield className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {credentials.length > 0 && credentials.length === alreadyAssignedIds.length
                          ? "All credentials already assigned"
                          : "No credentials defined yet"}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setCreatePrefillTitle("");
                          setShowCreateNew(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create New Credential
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pb-2">
                  {available.map((cred) => {
                    const isSelected = selected.has(cred.id);
                    const selectedData = selected.get(cred.id);

                    return (
                      <div key={cred.id} className="rounded-xl overflow-hidden">
                        <label
                          className={cn(
                            "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                            isSelected ? "bg-primary/5" : "hover:bg-accent"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(cred)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{cred.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {cred.requirement_type || "General"}
                            </p>
                          </div>
                          {cred.has_expiration && (
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              Expires
                            </Badge>
                          )}
                        </label>

                        {/* Inline expiry date picker when selected and has expiration */}
                        {isSelected && cred.has_expiration && (
                          <div className="px-3 pb-3 pl-12">
                            <EnhancedDatePicker
                              date={selectedData?.expireDate}
                              onDateChange={(date) => handleSetExpiry(cred.id, date)}
                              placeholder="Set expiration date (optional)"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Create new inline */}
            {available.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setCreatePrefillTitle("");
                  setShowCreateNew(true);
                }}
                type="button"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create New Credential
              </Button>
            )}
          </div>

          {/* Sticky footer */}
          <div className="p-4 border-t mt-2">
            {selected.size > 0 && (
              <p className="text-xs text-muted-foreground mb-2 text-center">
                {selected.size} credential{selected.size > 1 ? "s" : ""} selected
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={saving || selected.size === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Assign {selected.size > 0 ? `(${selected.size})` : ""}
                </>
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Create New Credential inline */}
      <AddRequirementModal
        open={showCreateNew}
        onOpenChange={setShowCreateNew}
        prefillTitle={createPrefillTitle}
        onCreatedId={async (newId) => {
          // Auto-assign the newly created credential to the member
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
              .from("employee_requirements")
              .insert({
                employee_id: employeeId,
                requirement_id: newId,
                user_id: user.id,
                status: "Assigned",
              });

            if (error) throw error;

            toast.success(
              `Credential created and assigned to ${employeeName}`,
              { description: "Click on the credential to complete details." }
            );
            onSuccess();
            onOpenChange(false);
          } catch (err: any) {
            console.error("Auto-assign failed:", err);
            // Still reload credentials so user can manually assign
          }
        }}
        onSuccess={() => {
          loadCredentials();
          setShowCreateNew(false);
          setSearchQuery("");
        }}
      />
    </>
  );
};
