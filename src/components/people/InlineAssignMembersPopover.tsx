import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, Loader2, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { REQUIREMENTS_QUERY_KEY } from "@/hooks/use-requirements";
import { EMPLOYEES_QUERY_KEY } from "@/hooks/use-employees";

interface InlineAssignMembersPopoverProps {
  credential: { id: string; title: string };
  alreadyAssignedIds: string[];
  onSuccess: () => void;
  children: React.ReactNode;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  department: string | null;
}

export const InlineAssignMembersPopover = ({
  credential,
  alreadyAssignedIds,
  onSuccess,
  children,
}: InlineAssignMembersPopoverProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadEmployees();
      setSelectedIds(new Set());
      setSearchQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, position, department_ref:department_id(name)")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("first_name");

      if (error) throw error;
      setEmployees((data || []).map((e: any) => ({
        ...e,
        department: e.department_ref?.name ?? null,
      })));
    } catch (error: any) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inserts = Array.from(selectedIds).map((employeeId) => ({
        employee_id: employeeId,
        requirement_id: credential.id,
        user_id: user.id,
        status: "Assigned",
      }));

      const { error } = await supabase.from("employee_requirements").upsert(inserts, { onConflict: "employee_id,requirement_id" });
      if (error) throw error;

      toast.success(`Assigned ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""} to ${credential.title}`);
      // Invalidate caches immediately for instant UI updates
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      console.error("Error assigning members:", error);
      toast.error(error.message || "Failed to assign members");
    } finally {
      setSaving(false);
    }
  };

  const available = employees.filter((emp) => {
    if (alreadyAssignedIds.includes(emp.id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      return fullName.includes(q) || emp.email?.toLowerCase().includes(q) || emp.position?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[240px]">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : available.length === 0 ? (
            <div className="py-6 text-center px-3">
              <Users className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1.5" />
              <p className="text-xs text-muted-foreground">
                {employees.length > 0 && employees.length === alreadyAssignedIds.length
                  ? "All members assigned"
                  : searchQuery ? "No matches" : "No members available"}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {available.map((emp) => {
                const isSelected = selectedIds.has(emp.id);
                const initials = `${emp.first_name[0]}${emp.last_name[0]}`;
                return (
                  <label
                    key={emp.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-accent"
                    )}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => handleToggle(emp.id)} />
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {emp.position || emp.department || emp.email || "Team Member"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedIds.size > 0 && (
          <div className="p-2.5 border-t border-border/40">
            <Button
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleAssign}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Assign {selectedIds.size} member{selectedIds.size > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
