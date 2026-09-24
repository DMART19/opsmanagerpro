import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Layers, Users, Building2, ChevronDown, ChevronUp,
  Lightbulb, Wrench, Tag, Clock, Calendar, Eye, Search as SearchIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { diagnoseError, getCategoryLabel, getCategoryColor } from "@/lib/error-diagnostics";
import { motion, AnimatePresence } from "framer-motion";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface ErrorGroup {
  hash: string;
  message: string;
  route: string | null;
  severity: string;
  occurrences: number;
  totalHits: number;
  firstDetected: string;
  lastDetected: string;
  affectedUsers: Set<string>;
  affectedWorkspaces: Set<string>;
  errors: ErrorLog[];
  likelyCause: string;
  suggestedFix: string;
  category: string;
}

interface ErrorGroupingTableProps {
  errors: ErrorLog[];
  isLoading: boolean;
  onSelectError: (error: ErrorLog) => void;
}

export const ErrorGroupingTable = ({ errors, isLoading, onSelectError }: ErrorGroupingTableProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"occurrences" | "lastDetected" | "users">("occurrences");

  const groups = useMemo(() => {
    if (!errors?.length) return [];

    const map = new Map<string, ErrorGroup>();

    errors.forEach((err) => {
      const key = err.error_hash || err.message.slice(0, 100);
      const existing = map.get(key);

      if (existing) {
        existing.occurrences += 1;
        existing.totalHits += err.hit_count;
        if (err.created_at < existing.firstDetected) existing.firstDetected = err.created_at;
        if (err.last_seen_at > existing.lastDetected) existing.lastDetected = err.last_seen_at;
        if (err.user_id) existing.affectedUsers.add(err.user_id);
        if (err.workspace_id) existing.affectedWorkspaces.add(err.workspace_id);
        existing.errors.push(err);
      } else {
        const diag = diagnoseError(err.message, err.stack_trace);
        map.set(key, {
          hash: key,
          message: err.message,
          route: err.page_route,
          severity: err.severity,
          occurrences: 1,
          totalHits: err.hit_count,
          firstDetected: err.created_at,
          lastDetected: err.last_seen_at,
          affectedUsers: new Set(err.user_id ? [err.user_id] : []),
          affectedWorkspaces: new Set(err.workspace_id ? [err.workspace_id] : []),
          errors: [err],
          likelyCause: diag.likelyCause,
          suggestedFix: diag.suggestedFix,
          category: diag.category,
        });
      }
    });

    const arr = Array.from(map.values());

    if (sortBy === "occurrences") arr.sort((a, b) => b.totalHits - a.totalHits);
    else if (sortBy === "lastDetected") arr.sort((a, b) => new Date(b.lastDetected).getTime() - new Date(a.lastDetected).getTime());
    else arr.sort((a, b) => b.affectedUsers.size - a.affectedUsers.size);

    return arr;
  }, [errors, sortBy]);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-4.5 w-4.5" />
            Error Groups
            <Badge variant="secondary" className="tabular-nums">{groups.length}</Badge>
          </CardTitle>
          <div className="flex gap-1">
            {(["occurrences", "lastDetected", "users"] as const).map((s) => (
              <Button
                key={s}
                variant={sortBy === s ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSortBy(s)}
              >
                {s === "occurrences" ? "Hits" : s === "lastDetected" ? "Recent" : "Users"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No grouped errors</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {groups.slice(0, 50).map((group, idx) => {
                const isExpanded = expanded === group.hash;
                const isCritical = group.severity === "critical";

                return (
                  <motion.div
                    key={group.hash}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                    className={cn(
                      "border rounded-xl overflow-hidden transition-all duration-200",
                      isCritical && "border-destructive/20 shadow-[0_0_12px_-6px_hsl(var(--destructive)/0.15)]",
                      !isCritical && "border-border/60",
                      isExpanded && "ring-1 ring-primary/10"
                    )}
                  >
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        "hover:bg-muted/40",
                        isCritical && "bg-destructive/[0.02]"
                      )}
                      onClick={() => setExpanded(isExpanded ? null : group.hash)}
                    >
                      {/* Severity indicator */}
                      <div className={cn(
                        "w-1 h-8 rounded-full shrink-0",
                        isCritical ? "bg-destructive" :
                        group.severity === "error" ? "bg-warning" :
                        group.severity === "warn" ? "bg-warning/60" : "bg-primary/40"
                      )} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getCategoryColor(group.category as any))}>
                            {getCategoryLabel(group.category as any)}
                          </Badge>
                          {group.route && (
                            <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[100px]">
                              {group.route}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{group.message}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(group.firstDetected), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(group.lastDetected), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs gap-1 tabular-nums">
                          {group.totalHits} hits
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          {group.affectedUsers.size}
                        </Badge>
                        {group.affectedWorkspaces.size > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" />
                            {group.affectedWorkspaces.size}
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t bg-muted/10 px-4 py-4">
                            {/* Diagnostics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div className="bg-card rounded-xl border border-border/50 p-3.5">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                  <Lightbulb className="h-3.5 w-3.5 text-warning" />
                                  Likely Cause
                                </p>
                                <p className="text-sm font-medium">{group.likelyCause}</p>
                              </div>
                              <div className="bg-card rounded-xl border border-border/50 p-3.5">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                  <Wrench className="h-3.5 w-3.5 text-primary" />
                                  Suggested Fix
                                </p>
                                <p className="text-sm font-medium">{group.suggestedFix}</p>
                              </div>
                            </div>

                            {/* Impact Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              {[
                                { label: "Occurrences", value: group.occurrences },
                                { label: "Users Affected", value: group.affectedUsers.size },
                                { label: "Workspaces", value: group.affectedWorkspaces.size },
                                { label: "Total Hits", value: group.totalHits },
                              ].map((m) => (
                                <div key={m.label} className="bg-card rounded-xl border border-border/50 p-3 text-center">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</span>
                                  <p className="font-bold text-lg tabular-nums">{m.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Timeline */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 px-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                First: {format(new Date(group.firstDetected), "MMM d, h:mm a")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last: {format(new Date(group.lastDetected), "MMM d, h:mm a")}
                              </span>
                            </div>

                            {/* Error instances */}
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {group.errors.slice(0, 10).map((err) => (
                                <button
                                  key={err.id}
                                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-muted/50 transition-colors group"
                                  onClick={() => onSelectError(err)}
                                >
                                  <span className="text-muted-foreground whitespace-nowrap">
                                    {format(new Date(err.created_at), "MMM d, h:mm a")}
                                  </span>
                                  <span className="truncate flex-1 font-mono">
                                    {err.user_email || err.user_id?.slice(0, 8) || "anon"}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] tabular-nums">{err.hit_count}x</Badge>
                                  <Eye className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                                </button>
                              ))}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5"
                                onClick={() => onSelectError(group.errors[0])}
                              >
                                <Eye className="h-3 w-3" /> View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1.5"
                                onClick={() => onSelectError(group.errors[0])}
                              >
                                <SearchIcon className="h-3 w-3" /> Investigate
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
