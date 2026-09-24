/**
 * ContextualHelpIcon — Small (?) icon that shows a tooltip on hover
 * 
 * For inline help beside complex controls. Non-blocking, always available.
 */

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ContextualHelpIconProps {
  /** Tooltip text to display on hover */
  content: string;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

export const ContextualHelpIcon = ({
  content,
  size = "sm",
  className,
}: ContextualHelpIconProps) => {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "text-muted-foreground/50 hover:text-muted-foreground transition-colors",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] text-xs leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
