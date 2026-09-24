import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Info, ExternalLink, ArrowRight, Sparkles } from "lucide-react";

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  illustration?: "boxes" | "people" | "shipment" | "calendar" | "chart";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** "Show Example" or "Load Sample Data" action for demo purposes */
  showExampleLabel?: string;
  onShowExample?: () => void;
  learnMoreUrl?: string;
  tips?: string[];
  reassuranceText?: string;
  className?: string;
  children?: ReactNode;
}

// SVG illustrations for different empty states
const illustrations = {
  boxes: (
    <svg className="w-32 h-32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="50" width="40" height="40" rx="4" className="fill-muted stroke-primary/50" strokeWidth="2" />
      <rect x="68" y="50" width="40" height="40" rx="4" className="fill-muted stroke-primary/30" strokeWidth="2" />
      <rect x="44" y="26" width="40" height="40" rx="4" className="fill-primary/10 stroke-primary" strokeWidth="2" />
      <path d="M64 36L64 56" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 46H74" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  people: (
    <svg className="w-32 h-32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="40" r="20" className="fill-primary/10 stroke-primary" strokeWidth="2" />
      <path d="M32 100C32 78 46 66 64 66C82 66 96 78 96 100" className="fill-muted stroke-primary" strokeWidth="2" />
      <circle cx="100" cy="45" r="12" className="fill-muted stroke-primary/30" strokeWidth="2" />
      <circle cx="28" cy="45" r="12" className="fill-muted stroke-primary/30" strokeWidth="2" />
    </svg>
  ),
  shipment: (
    <svg className="w-32 h-32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="40" width="60" height="50" rx="4" className="fill-muted stroke-primary/50" strokeWidth="2" />
      <path d="M80 65H108L100 90H80V65Z" className="fill-primary/10 stroke-primary" strokeWidth="2" />
      <circle cx="35" cy="95" r="10" className="fill-muted stroke-primary" strokeWidth="2" />
      <circle cx="65" cy="95" r="10" className="fill-muted stroke-primary" strokeWidth="2" />
      <path d="M90 95H100" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg className="w-32 h-32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="32" width="80" height="70" rx="8" className="fill-muted stroke-primary" strokeWidth="2" />
      <path d="M24 52H104" className="stroke-primary/50" strokeWidth="2" />
      <circle cx="44" cy="72" r="6" className="fill-primary/20" />
      <circle cx="64" cy="72" r="6" className="fill-primary" />
      <circle cx="84" cy="72" r="6" className="fill-primary/20" />
      <path d="M40 24V40M88 24V40" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  chart: (
    <svg className="w-32 h-32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="80" width="20" height="30" rx="2" className="fill-primary/30" />
      <rect x="54" y="50" width="20" height="60" rx="2" className="fill-primary/50" />
      <rect x="88" y="30" width="20" height="80" rx="2" className="fill-primary" />
      <path d="M30 70L64 40L98 20" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
    </svg>
  ),
};

/**
 * Enhanced empty state component with illustrations and rich CTAs.
 * Designed to guide users and reduce anxiety about empty data states.
 */
export const EnhancedEmptyState = ({
  icon: Icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showExampleLabel,
  onShowExample,
  learnMoreUrl,
  tips,
  reassuranceText,
  className,
  children,
}: EnhancedEmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-gradient-to-b from-muted/30 to-transparent rounded-xl border border-border/50",
        className
      )}
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-6 opacity-80">
          {illustrations[illustration]}
        </div>
      ) : Icon ? (
        <div className="p-6 bg-muted rounded-full mb-6">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
      ) : null}

      {/* Title and Description */}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>

      {/* Tips Section */}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-sm mb-6 p-4 bg-primary/5 border border-primary/10 rounded-lg text-left">
          <p className="text-sm font-medium mb-2 text-primary">💡 Quick Tips</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      {(actionLabel || secondaryActionLabel || showExampleLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="lg" className="gap-2">
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="lg" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {showExampleLabel && onShowExample && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={onShowExample}
              className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4" />
              {showExampleLabel}
            </Button>
          )}
        </div>
      )}

      {/* Learn More Link */}
      {learnMoreUrl && (
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
        >
          Learn more
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Reassurance Text */}
      {reassuranceText && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-2">
          <Info className="h-3 w-3" />
          <span>{reassuranceText}</span>
        </div>
      )}

      {children}
    </div>
  );
};
