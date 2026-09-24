import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Info, Sparkles, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** "Show Example" or "Load Sample Data" action */
  showExampleLabel?: string;
  onShowExample?: () => void;
  reassuranceText?: string;
  /** Helpful tips for the user */
  tips?: string[];
  className?: string;
  children?: ReactNode;
}

/**
 * Reusable empty state component for lists, tables, and other data displays.
 * Apple-inspired calm, centered design with purposeful illustrations.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showExampleLabel,
  onShowExample,
  reassuranceText,
  tips,
  className,
  children,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 sm:py-16",
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-5">
          <Icon className="h-7 w-7 text-primary/60" strokeWidth={1.5} />
        </div>
      )}
      
      <h3 className="text-base font-semibold mb-1.5 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[320px] leading-relaxed">{description}</p>
      
      {/* Tips Section - more subtle */}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-sm mb-6 p-4 bg-muted/30 rounded-xl text-left">
          <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">
            Quick Tips
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary/50 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Actions - primary CTA prominent, secondary subtle */}
      <div className="flex flex-col items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2 shadow-sm">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        
        {/* Secondary actions as text links */}
        <div className="flex items-center gap-4">
          {secondaryActionLabel && onSecondaryAction && (
            <button 
              onClick={onSecondaryAction}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryActionLabel}
            </button>
          )}
          {showExampleLabel && onShowExample && (
            <button 
              onClick={onShowExample}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {showExampleLabel}
            </button>
          )}
        </div>
      </div>
      
      {reassuranceText && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-4">
          <Info className="h-3 w-3" />
          <span>{reassuranceText}</span>
        </div>
      )}
      
      {children}
    </div>
  );
};

/**
 * EmptyStateIllustration - Simple, calm SVG illustrations for empty states
 */
interface EmptyStateIllustrationProps {
  type: "assets" | "team" | "tasks" | "credentials" | "general";
  className?: string;
}

export const EmptyStateIllustration = ({ type, className }: EmptyStateIllustrationProps) => {
  const baseClass = cn("w-full h-full", className);

  switch (type) {
    case "assets":
      return (
        <svg className={baseClass} viewBox="0 0 120 100" fill="none">
          <rect x="25" y="45" width="35" height="30" rx="3" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5"/>
          <rect x="35" y="35" width="35" height="30" rx="3" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5"/>
          <rect x="45" y="25" width="35" height="30" rx="3" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.5"/>
          <path d="M50 30 L55 30 L55 35" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <circle cx="90" cy="35" r="2" fill="hsl(var(--primary) / 0.3)"/>
          <circle cx="95" cy="50" r="1.5" fill="hsl(var(--primary) / 0.2)"/>
        </svg>
      );

    case "team":
      return (
        <svg className={baseClass} viewBox="0 0 120 100" fill="none">
          <circle cx="45" cy="45" r="12" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5"/>
          <circle cx="45" cy="41" r="4" fill="hsl(var(--primary) / 0.3)"/>
          <path d="M38 52 Q45 56 52 52" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <circle cx="70" cy="45" r="12" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1.5" strokeDasharray="3 2"/>
          <path d="M67 45 L73 45 M70 42 L70 48" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );

    case "tasks":
      return (
        <svg className={baseClass} viewBox="0 0 120 100" fill="none">
          <rect x="35" y="20" width="50" height="65" rx="4" fill="hsl(var(--muted) / 0.5)" stroke="hsl(var(--border))" strokeWidth="1.5"/>
          <rect x="45" y="15" width="30" height="10" rx="2" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1"/>
          <rect x="42" y="35" width="36" height="3" rx="1.5" fill="hsl(var(--primary) / 0.2)"/>
          <rect x="42" y="45" width="28" height="3" rx="1.5" fill="hsl(var(--muted-foreground) / 0.15)"/>
          <rect x="42" y="55" width="32" height="3" rx="1.5" fill="hsl(var(--muted-foreground) / 0.15)"/>
          <path d="M90 30 L95 35 L105 25" stroke="hsl(var(--success) / 0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    case "credentials":
      return (
        <svg className={baseClass} viewBox="0 0 120 100" fill="none">
          <rect x="30" y="25" width="60" height="45" rx="4" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5"/>
          <circle cx="60" cy="42" r="10" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5"/>
          <path d="M55 42 L58 45 L66 37" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <rect x="40" y="58" width="40" height="3" rx="1.5" fill="hsl(var(--muted-foreground) / 0.2)"/>
          <path d="M50 70 L55 82 L60 75 L65 82 L70 70" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1"/>
        </svg>
      );

    default:
      return (
        <svg className={baseClass} viewBox="0 0 120 100" fill="none">
          <circle cx="60" cy="50" r="25" fill="hsl(var(--muted) / 0.3)" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3"/>
          <path d="M60 40 L60 60 M50 50 L70 50" stroke="hsl(var(--muted-foreground) / 0.3)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="85" cy="30" r="3" fill="hsl(var(--primary) / 0.3)"/>
        </svg>
      );
  }
};