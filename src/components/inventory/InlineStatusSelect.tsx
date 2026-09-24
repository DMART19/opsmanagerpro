import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, UserCheck, Wrench, Archive, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InlineStatusSelectProps {
  itemId: string;
  currentStatus: string | null;
  onStatusChange?: () => void;
}

// Status options for the dropdown
const STATUS_OPTIONS = [
  { 
    value: 'Available', 
    label: 'Available', 
    icon: Package,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
  },
  { 
    value: 'In Use', 
    label: 'In Use', 
    icon: UserCheck,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800'
  },
  { 
    value: 'Under Service', 
    label: 'Service', 
    icon: Wrench,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
  },
  { 
    value: 'Retired', 
    label: 'Retired', 
    icon: Archive,
    className: 'bg-muted text-muted-foreground border-muted'
  },
] as const;

// Map legacy status values to new ones
const normalizeStatus = (status: string | null): string => {
  if (!status) return 'Available';
  const statusMap: Record<string, string> = {
    'IN': 'Available',
    'OUT': 'In Use',
    'MAINT': 'Under Service',
    'RETIRED': 'Retired',
  };
  return statusMap[status] || status;
};

const getStatusConfig = (status: string | null) => {
  const normalized = normalizeStatus(status);
  return STATUS_OPTIONS.find(s => s.value === normalized) || STATUS_OPTIONS[0];
};

export const InlineStatusSelect = ({
  itemId,
  currentStatus,
  onStatusChange,
}: InlineStatusSelectProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);
  
  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === normalizeStatus(currentStatus)) {
      setOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      // Need to find the asset_status_id for the new status name
      // For now, update by looking up the status ID first
      const { data: statusData } = await supabase
        .from("asset_statuses")
        .select("id")
        .eq("name", newStatus)
        .limit(1)
        .maybeSingle();
      
      const { error } = await supabase
        .from("cache_inventory")
        .update({ asset_status_id: statusData?.id || null })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Item status changed to ${newStatus}`,
      });
      
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setOpen(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={isUpdating}>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all",
            "hover:ring-2 hover:ring-primary/20 hover:border-primary/50 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-primary/30",
            statusConfig.className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <StatusIcon className="h-3 w-3" />
          )}
          {statusConfig.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-40"
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === normalizeStatus(currentStatus);
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={cn(
                "gap-2 cursor-pointer",
                isSelected && "bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{option.label}</span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
