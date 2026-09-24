import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MobileSectionHeaderProps {
  title: string;
  count?: number;
  actionLabel?: string;
  actionRoute?: string;
}

export const MobileSectionHeader = ({
  title,
  count,
  actionLabel,
  actionRoute,
}: MobileSectionHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
            {count}
          </span>
        )}
      </div>
      {actionLabel && actionRoute && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground -mr-2"
          onClick={() => navigate(actionRoute)}
        >
          {actionLabel}
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      )}
    </div>
  );
};
