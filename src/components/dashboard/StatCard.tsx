import { LucideIcon, ArrowRight, Lightbulb, ChevronRight, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  total: number;
  tooltip?: string;
  breakdown?: {
    label: string;
    value: number;
    color: "success" | "warning" | "destructive" | "primary";
    filterParam?: string; // URL filter parameter for navigation
  }[];
  icon: LucideIcon;
  link?: string;
  loading?: boolean;
  emptyMessage?: string;
  optionalFeatureHint?: string;
  helperText?: string; // NEW: Explanatory microcopy
}

const colorClasses = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
};

const dotColorClasses = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
};

const bgColorClasses = {
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
  primary: "bg-primary/10",
};

export const StatCard = ({ 
  title, 
  total, 
  tooltip,
  breakdown, 
  icon: Icon, 
  link, 
  loading, 
  emptyMessage,
  optionalFeatureHint,
  helperText,
}: StatCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (link && !loading) {
      navigate(link);
    }
  };

  const handleBreakdownClick = (e: React.MouseEvent, filterParam?: string) => {
    if (filterParam && link) {
      e.stopPropagation();
      navigate(`${link}?status=${filterParam}`);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 bg-card">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
        <div className="space-y-2.5 pt-4 border-t border-border/40">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const isEmpty = total === 0;

  return (
    <Card 
      className={cn(
        "group relative transition-all duration-250 ease-apple animate-fade-in",
        link && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]"
      )}
      onClick={handleClick}
    >
      {/* Subtle gradient overlay on hover */}
      {link && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/[0.02] to-primary/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {tooltip && (
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      aria-label={`Help for ${title}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* Helper text for clarity */}
            {helperText && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed max-w-[200px]">
                {helperText}
              </p>
            )}
          </div>
          <div className="p-3 bg-primary/8 rounded-2xl transition-all duration-250 ease-apple group-hover:bg-primary/12 group-hover:scale-105">
            <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
        </div>
        
        <div className="flex items-baseline gap-2 mt-3 mb-4">
          <p className="text-4xl font-bold tracking-tight">{total}</p>
        </div>
        
        {isEmpty && emptyMessage ? (
          <div className="pt-4 border-t border-border/40">
            {optionalFeatureHint ? (
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/50" />
                <span className="text-xs leading-relaxed">{optionalFeatureHint}</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">{emptyMessage}</p>
                {link && (
                  <button className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:gap-2.5 transition-all">
                    Get started <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        ) : breakdown && breakdown.length > 0 ? (
          <div className="pt-4 border-t border-border/40">
            <div className="space-y-2.5">
              {breakdown.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between group/item ${
                    item.filterParam ? "cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors" : ""
                  }`}
                  onClick={(e) => handleBreakdownClick(e, item.filterParam)}
                >
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dotColorClasses[item.color]} ring-2 ring-offset-2 ring-offset-card ${bgColorClasses[item.color].replace('/10', '/20')}`} />
                    {item.label}
                    {item.filterParam && (
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    )}
                  </span>
                  <span className={`font-semibold tabular-nums text-sm ${colorClasses[item.color]}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : total > 0 && link ? (
          <div className="pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
              View details
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
};
