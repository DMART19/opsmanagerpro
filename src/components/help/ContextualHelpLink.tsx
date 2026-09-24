/**
 * ContextualHelpLink — Small inline help icon that links to a specific article in the Help Center.
 * Use near important actions (Add Asset, Move Item, etc.)
 */

import { HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDemoPath } from "@/hooks/use-demo-path";

interface ContextualHelpLinkProps {
  articleId: string;
  tooltip: string;
  className?: string;
}

export const ContextualHelpLink = ({ articleId, tooltip, className }: ContextualHelpLinkProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(getPath(`/help?article=${articleId}`));
          }}
          className={cn(
            "inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors",
            className
          )}
          aria-label={`Help: ${tooltip}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};
