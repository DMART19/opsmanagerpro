/**
 * AdminGuidanceControls — Admin panel for managing the guidance system
 * 
 * Allows super_admins to reset hints, preview states, and toggle guidance globally.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RotateCcw, Eye, Settings2, Loader2, Lightbulb } from "lucide-react";

const LOCAL_PREFIX = "omp_guidance_";

const GUIDANCE_IDS = [
  { id: "assets_add_hint", label: "Assets: Add Items vs Containers", route: "/inventory" },
  { id: "move_item_intro", label: "Move Item Modal", route: "/inventory" },
  { id: "team_empty_hint", label: "Team Empty State", route: "/people" },
  { id: "pallet_builder_intro", label: "Pallet Builder Intro", route: "/pallet-builder" },
  { id: "ops_center_intro", label: "Ops Center Intro", route: "/admin/ops-center" },
  { id: "assets_empty_hint", label: "Assets Empty State", route: "/inventory" },
  { id: "move_item_help", label: "Move Item Help Icon", route: "/inventory" },
  { id: "friction_validation", label: "Friction: Validation Errors", route: "global" },
  { id: "friction_abandoned", label: "Friction: Abandoned Workflows", route: "global" },
];

export const AdminGuidanceControls = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      // Clear all localStorage guidance keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(LOCAL_PREFIX)) {
          localStorage.removeItem(key);
        }
      });

      // Clear all server records for current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_guidance_progress")
          .delete()
          .eq("user_id", user.id);
      }

      toast({
        title: "All guidance hints reset",
        description: "All hints will reappear on next page load.",
      });
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetSingle = async (guidanceId: string) => {
    setResetTarget(guidanceId);
    try {
      localStorage.removeItem(`${LOCAL_PREFIX}${guidanceId}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_guidance_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("guidance_id", guidanceId);
      }

      toast({ title: `Reset: ${guidanceId}` });
    } catch {
      // Non-critical
    } finally {
      setResetTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Guidance System Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            disabled={isResetting}
            className="gap-2"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset All Hints
          </Button>
        </div>

        {/* Individual guidance items */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Registered Guidance Points
          </p>
          <div className="divide-y divide-border rounded-lg border">
            {GUIDANCE_IDS.map((g) => {
              const isCompleted = localStorage.getItem(`${LOCAL_PREFIX}${g.id}`) === "1";
              return (
                <div key={g.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">{g.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                      {g.route}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                        completed
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleResetSingle(g.id)}
                    disabled={resetTarget === g.id}
                  >
                    {resetTarget === g.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Reset
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
