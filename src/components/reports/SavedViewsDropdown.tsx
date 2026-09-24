import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  LayoutGrid, 
  ShieldCheck, 
  Wrench, 
  BarChart3,
  Star,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedView {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  isDefault?: boolean;
}

const savedViews: SavedView[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level KPIs and trends',
    icon: LayoutGrid,
    isDefault: true,
  },
  {
    id: 'compliance',
    name: 'Compliance Review',
    description: 'Focus on certification status',
    icon: ShieldCheck,
  },
  {
    id: 'operations',
    name: 'Operations Deep Dive',
    description: 'Task completion and resources',
    icon: Wrench,
  },
  {
    id: 'performance',
    name: 'Performance Metrics',
    description: 'Utilization and efficiency',
    icon: BarChart3,
  },
];

interface SavedViewsDropdownProps {
  onViewChange?: (viewId: string) => void;
}

export const SavedViewsDropdown = ({ onViewChange }: SavedViewsDropdownProps) => {
  const [selectedView, setSelectedView] = useState<SavedView>(savedViews[0]);

  const handleViewSelect = (view: SavedView) => {
    setSelectedView(view);
    onViewChange?.(view.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <selectedView.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedView.name}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Saved Views
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {savedViews.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => handleViewSelect(view)}
            className={cn(
              "flex items-start gap-3 p-3 cursor-pointer",
              selectedView.id === view.id && "bg-accent"
            )}
          >
            <view.icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{view.name}</span>
                {view.isDefault && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    <Star className="h-2.5 w-2.5 mr-0.5" />
                    Default
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {view.description}
              </p>
            </div>
            {selectedView.id === view.id && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
