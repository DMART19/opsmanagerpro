import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileAssetFABProps {
  onAddItem: () => void;
  onAddContainer: () => void;
  className?: string;
  mode?: "item" | "container";
}

export const MobileAssetFAB = ({ onAddItem, onAddContainer, className }: MobileAssetFABProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("fixed bottom-6 right-4 z-50 md:hidden", className)}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.3 }}
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-xl p-0"
            onClick={() => setOpen(true)}
          >
            <motion.div
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Plus className="h-6 w-6" />
            </motion.div>
          </Button>
        </motion.div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="pb-3">
            <SheetTitle>Add to Inventory</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pb-4">
            <button
              onClick={() => { setOpen(false); onAddItem(); }}
              className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 active:scale-[0.97] transition-all"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Add Item</span>
              <span className="text-[11px] text-muted-foreground leading-tight text-center">
                Track a new asset
              </span>
            </button>
            <button
              onClick={() => { setOpen(false); onAddContainer(); }}
              className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 active:scale-[0.97] transition-all"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Box className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Add Container</span>
              <span className="text-[11px] text-muted-foreground leading-tight text-center">
                Group items together
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
