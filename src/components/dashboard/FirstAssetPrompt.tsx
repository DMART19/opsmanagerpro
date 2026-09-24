import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTourMode } from "@/contexts/TourModeContext";

const SESSION_KEY = "dismissedAddAsset";

interface FirstAssetPromptProps {
  onAddAsset: () => void;
}

export function FirstAssetPrompt({ onAddAsset }: FirstAssetPromptProps) {
  const [open, setOpen] = useState(false);
  const { isTourMode } = useTourMode();

  const { data: assetCount, isLoading } = useQuery({
    queryKey: ["asset-count-onboarding"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return -1;

      // Check cache_inventory
      const { count: invCount } = await supabase
        .from("cache_inventory")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .limit(1);

      // Check equipment
      const { count: eqCount } = await supabase
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .limit(1);

      return (invCount ?? 0) + (eqCount ?? 0);
    },
    staleTime: 1000 * 30,
    enabled: !isTourMode,
  });

  useEffect(() => {
    if (isLoading || assetCount === undefined || assetCount === -1) return;
    if (assetCount > 0) { setOpen(false); return; }
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (isTourMode) return;

    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [assetCount, isLoading, isTourMode]);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  const handleAdd = () => {
    dismiss();
    onAddAsset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="sm:max-w-sm gap-6">
        <DialogHeader className="items-center text-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <DialogTitle className="text-lg font-semibold">
            Add Your First Asset
          </DialogTitle>
          <DialogDescription className="text-sm">
            Start tracking equipment or inventory by adding your first asset.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button onClick={handleAdd} className="w-full">
            Add Asset
          </Button>
          <Button variant="ghost" onClick={dismiss} className="w-full text-muted-foreground">
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
