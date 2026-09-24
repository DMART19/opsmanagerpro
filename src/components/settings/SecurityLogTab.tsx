import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WORKSPACE_ROLE_LABELS,
  type WorkspaceRole,
} from "@/lib/workspace-permissions";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  changed_by: string;
  target_user_id: string;
  previous_role: string;
  new_role: string;
  created_at: string;
  changer_profile?: { display_name: string | null; email: string | null };
  target_profile?: { display_name: string | null; email: string | null };
}

export const SecurityLogTab = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("permission_audit_logs")
        .select("*")
        .eq("workspace_owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data?.length) {
        setEntries([]);
        return;
      }

      // Fetch profiles for changers and targets
      const userIds = [...new Set(data.flatMap(d => [d.changed_by, d.target_user_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p])
      );

      setEntries(
        data.map(d => ({
          ...d,
          changer_profile: profileMap.get(d.changed_by) || null,
          target_profile: profileMap.get(d.target_user_id) || null,
        }))
      );
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (role: string) =>
    WORKSPACE_ROLE_LABELS[role as WorkspaceRole] || role;

  const userName = (profile?: { display_name: string | null; email: string | null } | null) =>
    profile?.display_name || profile?.email || "Unknown";

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <ScrollText className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-foreground">Security Log</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track role and permission changes across your workspace
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Previous Role</TableHead>
              <TableHead>New Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                  Loading audit log…
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No permission changes recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {userName(entry.changer_profile)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {userName(entry.target_profile)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                      {roleLabel(entry.previous_role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {roleLabel(entry.new_role)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
