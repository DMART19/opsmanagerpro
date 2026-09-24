import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Users, ShieldAlert } from "lucide-react";
import { isAfter, subHours, subMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { diagnoseError } from "@/lib/error-diagnostics";
import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface SystemHealthSummaryProps {
  errors: ErrorLog[];
  isLoading: boolean;
}

type HealthLevel = "healthy" | "degraded" | "critical";

interface HealthInsight {
  icon: React.ElementType;
  message: string;
  level: "info" | "warn" | "critical";
}

export const SystemHealthSummary = ({ errors, isLoading }: SystemHealthSummaryProps) => {
  const analysis = useMemo(() => {
    if (!errors?.length) {
      return {
        level: "healthy" as HealthLevel,
        headline: "System Stable",
        subtext: "No errors detected",
        insights: [] as HealthInsight[],
        score: 100
      };
    }

    const now = new Date();
    const last1h = subHours(now, 1);
    const last15m = subMinutes(now, 15);
    const last24h = subHours(now, 24);

    const errorsLast1h = errors.filter((e) => isAfter(new Date(e.last_seen_at), last1h) && e.status === "unresolved");
    const errorsLast15m = errors.filter((e) => isAfter(new Date(e.last_seen_at), last15m) && e.status === "unresolved");
    const criticalUnresolved = errors.filter((e) => e.severity === "critical" && e.status === "unresolved");
    const totalUnresolved = errors.filter((e) => e.status === "unresolved").length;
    const uniqueUsersAffected = new Set(errors.filter((e) => e.user_id && e.status === "unresolved" && isAfter(new Date(e.last_seen_at), last24h)).map((e) => e.user_id)).size;

    const insights: HealthInsight[] = [];

    if (errorsLast1h.length > 0) {
      insights.push({
        icon: AlertTriangle,
        message: `${errorsLast1h.length} new error${errorsLast1h.length > 1 ? "s" : ""} in the last hour`,
        level: errorsLast1h.length >= 10 ? "critical" : "warn"
      });
    }

    if (criticalUnresolved.length > 0) {
      insights.push({
        icon: ShieldAlert,
        message: `${criticalUnresolved.length} unresolved critical error${criticalUnresolved.length > 1 ? "s" : ""}`,
        level: "critical"
      });
    }

    if (errorsLast15m.length >= 5) {
      insights.push({
        icon: TrendingUp,
        message: `Error spike: ${errorsLast15m.length} errors in the last 15 minutes`,
        level: "critical"
      });
    }

    if (uniqueUsersAffected >= 3) {
      insights.push({
        icon: Users,
        message: `${uniqueUsersAffected} users affected by errors in the last 24h`,
        level: uniqueUsersAffected >= 10 ? "critical" : "warn"
      });
    }

    const categoryMap = new Map<string, number>();
    errorsLast1h.forEach((e) => {
      const d = diagnoseError(e.message, e.stack_trace);
      categoryMap.set(d.likelyCause, (categoryMap.get(d.likelyCause) || 0) + 1);
    });
    const topCause = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCause && topCause[1] >= 2) {
      insights.push({
        icon: Activity,
        message: `Top issue: ${topCause[0]} (${topCause[1]} occurrences)`,
        level: "warn"
      });
    }

    let level: HealthLevel = "healthy";
    let headline = "System Stable";
    let subtext = `${totalUnresolved} unresolved error${totalUnresolved !== 1 ? "s" : ""} total`;
    let score = 100;

    if (criticalUnresolved.length > 0 || errorsLast15m.length >= 5) {
      level = "critical";
      headline = "System Degraded";
      subtext = "Critical issues require attention";
      score = Math.max(10, 100 - criticalUnresolved.length * 15 - errorsLast15m.length * 5);
    } else if (errorsLast1h.length > 0) {
      level = "degraded";
      headline = "Minor Issues Detected";
      subtext = `${errorsLast1h.length} recent error${errorsLast1h.length > 1 ? "s" : ""} under monitoring`;
      score = Math.max(40, 100 - errorsLast1h.length * 8);
    }

    return { level, headline, subtext, insights, score };
  }, [errors]);

  if (isLoading) return null;

  const levelConfig = {
    healthy: { color: "text-success", bg: "bg-success/5 border-success/20", pulse: "bg-success", ring: "border-success/40" },
    degraded: { color: "text-warning", bg: "bg-warning/5 border-warning/20", pulse: "bg-warning", ring: "border-warning/40" },
    critical: { color: "text-destructive", bg: "bg-destructive/5 border-destructive/20", pulse: "bg-destructive", ring: "border-destructive/40" }
  };

  const cfg = levelConfig[analysis.level];

  // Calculate circle stroke
  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference - analysis.score / 100 * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      
      
















































































      
    </motion.div>);

};