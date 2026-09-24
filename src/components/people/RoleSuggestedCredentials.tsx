/**
 * RoleSuggestedCredentials – shows credentials commonly held by peers
 * in the same role/department, but not yet assigned to this employee.
 */

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Lightbulb,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { REQUIREMENTS_QUERY_KEY } from "@/hooks/use-requirements";
import { EMPLOYEES_QUERY_KEY } from "@/hooks/use-employees";

interface RoleSuggestedCredentialsProps {
  employeeId: string;
  roleId: string | null;
  departmentId: string | null;
  roleName: string | null;
  alreadyAssignedIds: string[];
  onSuccess: () => void;
}

interface Suggestion {
  id: string;
  title: string;
  typeName: string | null;
  peerCount: number;
  totalPeers: number;
}

export const RoleSuggestedCredentials = ({
  employeeId,
  roleId,
  departmentId,
  roleName,
  alreadyAssignedIds,
  onSuccess,
}: RoleSuggestedCredentialsProps) => {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Only load when we have a role or department
  const hasContext = Boolean(roleId || departmentId);

  useEffect(() => {
    if (hasContext && !loaded) {
      loadSuggestions();
    }
  }, [roleId, departmentId, employeeId, alreadyAssignedIds.length]);

  const loadSuggestions = async () => {
    if (!roleId && !departmentId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find peer employees with same role or department
      let peerQuery = supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .neq("id", employeeId);

      if (roleId) {
        peerQuery = peerQuery.eq("role_id", roleId);
      } else if (departmentId) {
        peerQuery = peerQuery.eq("department_id", departmentId);
      }

      const { data: peers } = await peerQuery;
      if (!peers || peers.length === 0) {
        setSuggestions([]);
        setLoaded(true);
        setLoading(false);
        return;
      }

      const peerIds = peers.map((p) => p.id);
      const totalPeers = peerIds.length;

      // Get credentials assigned to peers
      const { data: peerReqs } = await supabase
        .from("employee_requirements")
        .select("requirement_id")
        .in("employee_id", peerIds);

      if (!peerReqs || peerReqs.length === 0) {
        setSuggestions([]);
        setLoaded(true);
        setLoading(false);
        return;
      }

      // Count frequency per credential
      const freq = new Map<string, number>();
      for (const r of peerReqs) {
        if (r.requirement_id) {
          freq.set(r.requirement_id, (freq.get(r.requirement_id) || 0) + 1);
        }
      }

      // Filter out already-assigned
      const alreadySet = new Set(alreadyAssignedIds);
      const candidates = Array.from(freq.entries())
        .filter(([id]) => !alreadySet.has(id))
        .filter(([, count]) => count >= Math.max(1, Math.ceil(totalPeers * 0.3))) // at least 30% of peers
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      if (candidates.length === 0) {
        setSuggestions([]);
        setLoaded(true);
        setLoading(false);
        return;
      }

      // Fetch credential details
      const credIds = candidates.map(([id]) => id);
      const { data: credDetails } = await supabase
        .from("requirement_definitions")
        .select("id, title, requirement_type_id, requirement_type_ref:requirement_type_id(name)")
        .in("id", credIds)
        .eq("is_active", true);

      const detailMap = new Map(
        (credDetails || []).map((d: any) => [
          d.id,
          { title: d.title, typeName: d.requirement_type_ref?.name || null },
        ])
      );

      const results: Suggestion[] = candidates
        .filter(([id]) => detailMap.has(id))
        .map(([id, count]) => ({
          id,
          title: detailMap.get(id)!.title,
          typeName: detailMap.get(id)!.typeName,
          peerCount: count,
          totalPeers,
        }));

      setSuggestions(results);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load role suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssignSelected = async (ids: string[]) => {
    if (ids.length === 0) return;
    setAssigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inserts = ids.map((reqId) => ({
        employee_id: employeeId,
        requirement_id: reqId,
        user_id: user.id,
        status: "Assigned",
      }));

      const { error } = await supabase.from("employee_requirements").upsert(inserts, { onConflict: "employee_id,requirement_id" });
      if (error) throw error;

      toast.success(`Assigned ${ids.length} credential${ids.length > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
      setSelectedIds(new Set());
      setSuggestions((prev) => prev.filter((s) => !ids.includes(s.id)));
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  if (!hasContext || (loaded && suggestions.length === 0)) return null;

  const displayLabel = roleName || "this role";

  return (
    <div className="rounded-lg border border-primary/15 bg-primary/[0.03] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-primary/[0.04] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-foreground flex-1">
          Suggested for {displayLabel}
        </span>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary">
                {suggestions.length}
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="px-3 py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Analyzing peer assignments…</p>
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-[200px]">
                  <div className="px-1 pb-1">
                    {suggestions.map((s) => (
                      <label
                        key={s.id}
                        className={cn(
                          "flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer transition-colors",
                          selectedIds.has(s.id)
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          className="h-3.5 w-3.5"
                        />
                        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{s.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {Math.round((s.peerCount / s.totalPeers) * 100)}% of peers
                            {s.typeName ? ` · ${s.typeName}` : ""}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                {/* Action bar */}
                <div className="flex items-center gap-2 px-3 py-2 border-t border-primary/10 bg-primary/[0.02]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 flex-1"
                    disabled={selectedIds.size === 0 || assigning}
                    onClick={() => handleAssignSelected(Array.from(selectedIds))}
                  >
                    {assigning ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3 w-3" />
                    )}
                    Assign Selected ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-[11px] gap-1 flex-1"
                    disabled={assigning}
                    onClick={() =>
                      handleAssignSelected(suggestions.map((s) => s.id))
                    }
                  >
                    <CheckCheck className="h-3 w-3" />
                    Assign All ({suggestions.length})
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
