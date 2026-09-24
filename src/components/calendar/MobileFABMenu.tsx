import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, ClipboardList, Calendar, Bell, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MobileFABMenuProps {
  onAddTask: () => void;
  selectedDate?: Date;
}

export const MobileFABMenu = ({ onAddTask, selectedDate }: MobileFABMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: "Task", icon: ClipboardList, color: "bg-primary" },
    { label: "Event", icon: Calendar, color: "bg-emerald-500" },
    { label: "Reminder", icon: Bell, color: "bg-purple-500" },
  ];

  const handleMenuItemClick = () => {
    onAddTask();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu Items */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                onClick={handleMenuItemClick}
                className={cn(
                  "flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full shadow-lg",
                  "bg-card border text-foreground",
                  "active:scale-95 transition-transform"
                )}
              >
                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", item.color)}>
                  <item.icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.div
        className="fixed bottom-20 right-4 z-50"
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
            isOpen && "rotate-45 bg-muted text-muted-foreground hover:bg-muted"
          )}
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </motion.div>
    </>
  );
};
