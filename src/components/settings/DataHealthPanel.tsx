import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Wand2,
  Check,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useDataCorrections, DataCorrection } from "@/hooks/use-data-corrections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface DataHealthPanelProps {
  /** Compact mode for inline banner */
  compact?: boolean;
}

export const DataHealthPanel = ({ compact = false }: DataHealthPanelProps) => {
  const { corrections, isLoading, totalAffected } = useDataCorrections();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === corrections.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(corrections.map(c => c.id)));
    }
  };

  const applyCorrection = async (correction: DataCorrection) => {
    setApplying(correction.id);
    try {
      if (correction.targetField === "manufacturer" && correction.taxonomyId) {
        const { error } = await supabase
          .from("cache_inventory")
          .update({ manufacturer_id: correction.taxonomyId })
          .in("id", correction.affectedItemIds);
        if (error) throw error;
      } else if (correction.targetField === "model_part_num") {
        // For model/part num, set the value on each item
        const { error } = await supabase
          .from("cache_inventory")
          .update({ model_part_num: correction.detectedValue })
          .in("id", correction.affectedItemIds);
        if (error) throw error;
      }

      setApplied(prev => new Set(prev).add(correction.id));
      queryClient.invalidateQueries({ queryKey: ["cache-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["data-corrections-scan"] });

      toast({
        title: "Correction applied",
        description: `Updated ${correction.affectedCount} items — set ${correction.targetField === "manufacturer" ? "Manufacturer" : "Model/Part #"} to "${correction.detectedValue}"`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to apply correction",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  const applySelected = async () => {
    const toApply = corrections.filter(c => selected.has(c.id) && !applied.has(c.id));
    for (const c of toApply) {
      await applyCorrection(c);
    }
    setSelected(new Set());
  };

  if (isLoading) {
    if (compact) return null;
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pending = corrections.filter(c => !applied.has(c.id));

  if (pending.length === 0) {
    if (compact) return null;
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">Data looks clean</p>
          <p className="text-xs text-muted-foreground mt-1">No misplaced data detected</p>
        </CardContent>
      </Card>
    );
  }

  // Compact banner for Assets page
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
          <span className="font-medium">{totalAffected} items</span> have data that may belong in a different field.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-xs border-amber-500/30 hover:bg-amber-500/10"
          onClick={() => {
            // Navigate to settings data health tab
            window.location.href = "/settings?tab=data-health";
          }}
        >
          Review
        </Button>
      </div>
    );
  }

  // Full panel for Settings
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Data Corrections
            <Badge variant="secondary" className="text-xs">
              {pending.length} suggestion{pending.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          {selected.size > 0 && (
            <Button
              size="sm"
              onClick={applySelected}
              disabled={!!applying}
              className="gap-1.5"
            >
              {applying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Apply {selected.size} selected
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          We detected values in descriptions that may belong in other fields. Review and apply corrections below.
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Select all */}
        <div className="flex items-center gap-2 px-3 py-2 mb-2 border-b">
          <Checkbox
            checked={selected.size === pending.length && pending.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {pending.map((correction) => (
              <CorrectionCard
                key={correction.id}
                correction={correction}
                isSelected={selected.has(correction.id)}
                onToggleSelect={() => toggleSelect(correction.id)}
                onApply={() => applyCorrection(correction)}
                isApplying={applying === correction.id}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const CorrectionCard = ({
  correction,
  isSelected,
  onToggleSelect,
  onApply,
  isApplying,
}: {
  correction: DataCorrection;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApply: () => void;
  isApplying: boolean;
}) => {
  const targetLabel = correction.targetField === "manufacturer" ? "Manufacturer" : "Model / Part #";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">"{correction.detectedValue}"</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <Badge variant="outline" className="text-xs">
            {targetLabel}
          </Badge>
          {correction.confidence === "high" ? (
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
              High Confidence
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              Review
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Found in <span className="font-medium text-foreground">{correction.affectedCount}</span> item descriptions without a {targetLabel.toLowerCase()} set
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onApply}
        disabled={isApplying}
        className="shrink-0 text-xs"
      >
        {isApplying ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          "Apply"
        )}
      </Button>
    </div>
  );
};
