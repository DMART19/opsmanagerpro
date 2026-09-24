import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { REQUIREMENTS_QUERY_KEY } from "@/hooks/use-requirements";
import { EMPLOYEES_QUERY_KEY } from "@/hooks/use-employees";

interface InlineAssignCredentialPopoverProps {
  employeeId: string;
  employeeName: string;
  alreadyAssignedIds: string[];
  onSuccess: () => void;
  children: React.ReactNode;
}

interface Credential {
  id: string;
  title: string;
  requirement_type: string;
  has_expiration: boolean | null;
}

export const InlineAssignCredentialPopover = ({
  employeeId,
  employeeName,
  alreadyAssignedIds,
  onSuccess,
  children,
}: InlineAssignCredentialPopoverProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadCredentials();
      setSearchQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("requirement_definitions")
        .select("id, title, has_expiration, requirement_type_ref:requirement_type_id(name)")
        .eq("is_active", true)
        .eq("user_id", user.id)
        .order("title");

      if (error) throw error;
      setCredentials((data || []).map((d: any) => ({
        ...d,
        requirement_type: d.requirement_type_ref?.name ?? "General",
      })));
    } catch (error: any) {
      console.error("Error loading credentials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (cred: Credential) => {
    setAssigning(cred.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("employee_requirements").upsert({
        employee_id: employeeId,
        requirement_id: cred.id,
        user_id: user.id,
        status: "Assigned",
      }, { onConflict: "employee_id,requirement_id" });

      if (error) throw error;

      toast.success(`Assigned "${cred.title}" to ${employeeName}`);
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      console.error("Error assigning credential:", error);
      toast.error(error.message || "Failed to assign credential");
    } finally {
      setAssigning(null);
    }
  };

  const available = credentials.filter((c) => {
    if (alreadyAssignedIds.includes(c.id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.requirement_type?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search credentials..."
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
              <Shield className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1.5" />
              <p className="text-xs text-muted-foreground">
                {credentials.length > 0 && credentials.length === alreadyAssignedIds.length
                  ? "All credentials assigned"
                  : searchQuery ? "No matches" : "No credentials available"}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {available.map((cred) => {
                const isAssigning = assigning === cred.id;
                return (
                  <button
                    key={cred.id}
                    type="button"
                    disabled={!!assigning}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                      "hover:bg-accent disabled:opacity-50"
                    )}
                    onClick={() => handleAssign(cred)}
                  >
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {isAssigning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cred.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{cred.requirement_type}</p>
                    </div>
                    {cred.has_expiration && (
                      <Badge variant="outline" className="text-[9px] flex-shrink-0">Expires</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
