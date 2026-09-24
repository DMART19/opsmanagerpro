import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ContextualHelpIconProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
}

/**
 * A small help icon that shows a tooltip with contextual information.
 * Use this to explain features, fields, or concepts inline.
 * 
 * @example
 * <ContextualHelpIcon 
 *   content="This field is used to uniquely identify each item in your inventory." 
 * />
 */
export const ContextualHelpIcon = ({
  content,
  side = "top",
  className,
  iconClassName,
}: ContextualHelpIconProps) => {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full",
            className
          )}
          aria-label="Help"
        >
          <HelpCircle className={cn("h-4 w-4", iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side={side} 
        className="max-w-xs text-sm"
        sideOffset={5}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * A styled section header with an optional help icon.
 * Use this for page sections or card headers that need explanation.
 */
interface SectionWithHelpProps {
  title: string;
  helpText?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export const SectionWithHelp = ({
  title,
  helpText,
  description,
  className,
  children,
}: SectionWithHelpProps) => {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {helpText && <ContextualHelpIcon content={helpText} />}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
};
