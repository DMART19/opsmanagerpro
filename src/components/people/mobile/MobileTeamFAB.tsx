import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface MobileTeamFABProps {
  label: string;
  onAction: () => void;
}

export const MobileTeamFAB = ({ label, onAction }: MobileTeamFABProps) => {
  return (
    <div className="fixed bottom-6 right-4 z-50 md:hidden">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.3 }}
      >
        <Button
          size="lg"
          className="h-12 rounded-full shadow-xl pl-4 pr-5 gap-2"
          onClick={onAction}
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-semibold">{label}</span>
        </Button>
      </motion.div>
    </div>
  );
};
