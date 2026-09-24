/**
 * SourcesSection — Powered by the extraction engine.
 * Shows modules with real detection data, confidence scores, generated requirements, and sync status.
 */
import { useMemo } from "react";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";
import type { ExtractionResult, GeneratedRequirement } from "@/lib/extraction-engine";
import { getModuleConfidence } from "@/lib/extraction-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Box,
  Calendar,
  Check,
  Container,
  Eye,
  Loader2,
  RefreshCw,
  Scan,
  Truck,
  Users,
} from "lucide-react";

const MODULES = [
  { id: "assets", label: "Assets", icon: Box, color: "text-primary" },
  { id: "calendar", label: "Calendar", icon: Calendar, color: "text-warning" },
  { id: "team", label: "Team", icon: Users, color: "text-success" },
  { id: "pallet", label: "Pallet", icon: Container, color: "text-accent-foreground" },
  { id: "trailer", label: "Trailer", icon: Truck, color: "text-muted-foreground" },
] as const;

interface SourcesSectionProps {
  configs: RequirementConfig[];
  extraction: ExtractionResult;
  isScanning: boolean;
  onScan: () => void;
  onRegenerate: () => void;
  syncStatus: {
    newActions: { id: string }[];
    preservedManualIds: string[];
  };
  generatedRequirements: GeneratedRequirement[];
}

export function SourcesSection({
  configs,
  extraction,
  isScanning,
  onScan,
  onRegenerate,
  syncStatus,
  generatedRequirements,
}: SourcesSectionProps) {
  const moduleStats = useMemo(() => {
    return MODULES.map((mod) => {
      const elements = extraction.elementRegistry[mod.id] || [];
      const moduleConfigs = configs.filter(c => c.group === mod.id);
      const confidence = getModuleConfidence(extraction.confidenceMap, extraction.elementRegistry, mod.id);
      const pageSchema = extraction.pageSchemas.find(p => p.module === mod.id);
      const moduleGenerated = generatedRequirements.filter(g => g.group === mod.id);
      const needsReviewCount = moduleGenerated.filter(g => g.needs_review).length;

      const hasManualOverrides = moduleConfigs.some(
        c => !elements.find(e => e.id === c.resolve)
      );

      const source: "Auto" | "Manual" | "Mixed" | "—" =
        elements.length === 0 && moduleConfigs.length === 0 ? "—" :
        hasManualOverrides && elements.length > 0 ? "Mixed" :
        hasManualOverrides ? "Manual" :
        "Auto";

      const lastSynced = moduleConfigs.length > 0
        ? moduleConfigs.reduce((latest, c) => {
            const d = new Date(c.updated_at).getTime();
            return d > latest ? d : latest;
          }, 0)
        : null;

      return {
        ...mod,
        source,
        elementsDetected: elements.length,
        configCount: moduleConfigs.length,
        generatedCount: moduleGenerated.length,
        needsReviewCount,
        confidence,
        lastSynced,
        pagePath: pageSchema?.page ?? null,
      };
    });
  }, [configs, extraction, generatedRequirements]);

  const totalDetected = moduleStats.reduce((s, m) => s + m.elementsDetected, 0);
  const activeModules = moduleStats.filter(m => m.elementsDetected > 0 || m.configCount > 0).length;
  const totalNeedsReview = generatedRequirements.filter(g => g.needs_review).length;
  const totalAutoEnabled = generatedRequirements.filter(g => g.enabled && !g.needs_review).length;

  return (
    <div className="space-y-4">
      {/* Summary + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{totalDetected} actions · {activeModules} modules</span>
          {totalAutoEnabled > 0 && (
            <Badge variant="default" className="text-[10px] h-4 gap-0.5">
              <Check className="h-2.5 w-2.5" />
              {totalAutoEnabled} auto
            </Badge>
          )}
          {totalNeedsReview > 0 && (
            <Badge variant="warning" className="text-[10px] h-4 gap-0.5">
              <Eye className="h-2.5 w-2.5" />
              {totalNeedsReview} review
            </Badge>
          )}
          {syncStatus.newActions.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-4">
              {syncStatus.newActions.length} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={onScan}
            disabled={isScanning}
          >
            {isScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Scan className="h-3 w-3" />}
            Scan
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={onRegenerate}
            disabled={isScanning}
          >
            <RefreshCw className={cn("h-3 w-3", isScanning && "animate-spin")} />
            Generate
          </Button>
        </div>
      </div>

      {/* Module cards */}
      <div className="grid gap-2">
        {moduleStats.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.id}
              className={cn(
                "px-4 py-3",
                mod.elementsDetected === 0 && mod.configCount === 0 && "opacity-40"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("shrink-0", mod.color)}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{mod.label}</span>
                    <Badge
                      variant={
                        mod.source === "Auto" ? "default" :
                        mod.source === "Mixed" ? "warning" :
                        mod.source === "Manual" ? "secondary" :
                        "outline"
                      }
                      className="text-[10px] h-4"
                    >
                      {mod.source}
                    </Badge>
                    {mod.needsReviewCount > 0 && (
                      <Badge variant="warning" className="text-[10px] h-4 gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {mod.needsReviewCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{mod.elementsDetected} detected</span>
                    <span>{mod.generatedCount} generated</span>
                    {mod.pagePath && (
                      <span className="font-mono">{mod.pagePath}</span>
                    )}
                    {mod.lastSynced && (
                      <span>synced {formatTimeAgo(mod.lastSynced)}</span>
                    )}
                  </div>
                </div>

                {/* Confidence */}
                <div className="shrink-0 flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        mod.confidence >= 80 ? "bg-primary" :
                        mod.confidence >= 50 ? "bg-warning" :
                        "bg-destructive"
                      )}
                      style={{ width: `${mod.confidence}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-mono tabular-nums w-8 text-right",
                    mod.confidence >= 80 ? "text-primary" :
                    mod.confidence >= 50 ? "text-warning" :
                    "text-destructive"
                  )}>
                    {mod.confidence}%
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Dependency graph */}
      {extraction.dependencies.length > 0 && (
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Inferred Dependencies</p>
          <div className="flex flex-wrap gap-1.5">
            {extraction.dependencies.map((dep, i) => (
              <Badge key={i} variant="outline" className="text-[10px] h-4 font-mono font-normal">
                {dep.from} → {dep.to}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
