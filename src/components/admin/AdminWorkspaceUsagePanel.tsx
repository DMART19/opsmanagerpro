import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, Users, Package, CalendarDays, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useAdminWorkspaceUsage, type WorkspaceUsageSummary } from "@/hooks/use-workspace-analytics";

const PLAN_COLORS: Record<string, string> = {
  inventory: "bg-primary/10 text-primary border-primary/20",
  operations: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  enterprise: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export const AdminWorkspaceUsagePanel = () => {
  const { data: workspaces, isLoading, refetch } = useAdminWorkspaceUsage();

  const totalWorkspaces = workspaces?.length || 0;
  const activeLast7 = workspaces?.filter(w => {
    if (!w.lastActivity) return false;
    return new Date(w.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Total Workspaces</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-2xl font-bold">{totalWorkspaces}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Active (7d)</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-2xl font-bold">{activeLast7}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Inactive (7d+)</p>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-2xl font-bold">{totalWorkspaces - activeLast7}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workspace Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Workspace Usage</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : !workspaces?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No workspaces found
                    </TableCell>
                  </TableRow>
                ) : (
                  workspaces.map(ws => (
                    <TableRow key={ws.userId}>
                      <TableCell className="font-medium text-sm">
                        {ws.workspaceName || "Unnamed"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ws.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PLAN_COLORS[ws.plan || ""] || "bg-muted text-muted-foreground"}>
                          {ws.plan || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ws.lastActivity
                          ? formatDistanceToNow(new Date(ws.lastActivity), { addSuffix: true })
                          : "—"
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {workspaces && (
            <p className="text-xs text-muted-foreground mt-3">
              Showing {workspaces.length} workspaces
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
