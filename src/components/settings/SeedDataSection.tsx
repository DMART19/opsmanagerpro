/**
 * SeedDataSection — Workspace Settings section for managing demo/seed data.
 * 
 * Shows "Generate Example Data" or "Clear Demo Data" based on current state.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSeedWorkspace } from "@/hooks/use-seed-workspace";
import { supabase } from "@/integrations/supabase/client";

export const SeedDataSection = () => {
  const { seedWorkspace, clearSeedData, seeding, clearing } = useSeedWorkspace();
  const [hasSeedData, setHasSeedData] = useState<boolean | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data } = await (supabase as any)
        .from("workspace_settings")
        .select("has_seed_data")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setHasSeedData(data?.has_seed_data ?? false);
    };
    fetchStatus();
  }, []);

  const handleSeed = async () => {
    const success = await seedWorkspace();
    if (success) setHasSeedData(true);
  };

  const handleClear = async () => {
    setConfirmClearOpen(false);
    const success = await clearSeedData();
    if (success) setHasSeedData(false);
  };

  if (hasSeedData === null) return null;

  return (
    <Card className="p-4 mt-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">Example Data</h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {hasSeedData
              ? "Your workspace contains example data (assets, team members, tasks). Remove it when you're ready to use your own."
              : "Generate realistic example data to see how the system works — assets, containers, team members, and more."}
          </p>

          <div className="mt-3">
            {hasSeedData ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClearOpen(true)}
                disabled={clearing}
                className="gap-2 text-destructive hover:text-destructive"
              >
                {clearing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {clearing ? "Clearing…" : "Clear Demo Data"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
                className="gap-2"
              >
                {seeding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {seeding ? "Generating…" : "Generate Example Data"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all example data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all seed data including example assets,
              containers, team members, credentials, tasks, and pallet layouts.
              Your own data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
