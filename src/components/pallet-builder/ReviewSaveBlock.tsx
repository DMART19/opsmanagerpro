import { Button } from "@/components/ui/button";
import { Save, LayoutGrid, FileDown, Trash2, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationItem {
  label: string;
  pass: boolean;
}

interface Props {
  hasItems: boolean;
  canSave: boolean;
  isDirty: boolean;
  activeBuildName?: string | null;
  onSaveClick: () => void;
  onOverwrite?: () => void;
  onSmartLayout?: () => void;
  onExport?: () => void;
  onClearAll?: () => void;
  validation?: ValidationItem[];
  /** Visual variant — "compact" matches the in-sidebar Step 3 styling */
  variant?: "compact" | "mobile";
  /** Step number for the heading. Defaults to 3 (matches desktop). */
  step?: number;
  /** Step header label. */
  title?: string;
  step3Complete?: boolean;
}

/**
 * Shared "Review & Save" block used by both the desktop sidebar Step 3
 * and the mobile Build Pallets stack. Presentational only — all logic
 * lives in the parent's handlers.
 */
export const ReviewSaveBlock = ({
  hasItems,
  canSave,
  isDirty,
  activeBuildName,
  onSaveClick,
  onOverwrite,
  onSmartLayout,
  onExport,
  onClearAll,
  validation = [],
  variant = "compact",
  step = 3,
  title = "Review & Save",
  step3Complete,
}: Props) => {
  const isMobile = variant === "mobile";

  return (
    <div className={cn("space-y-2.5", isMobile && "p-4 rounded-xl border bg-card")}>
      {/* Section label */}
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200",
            step3Complete
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : hasItems
              ? "bg-primary/15 text-primary ring-1.5 ring-primary/30"
              : "bg-muted text-muted-foreground/40"
          )}
        >
          {step3Complete ? <Check className="h-3 w-3" /> : step}
        </div>
        <span
          className={cn(
            "text-[13px] font-semibold transition-colors",
            !hasItems ? "text-muted-foreground/60" : "text-foreground"
          )}
        >
          {title}
        </span>
      </div>

      {!hasItems ? (
        <p className="text-xs text-muted-foreground pl-8">
          Add items to enable saving.
        </p>
      ) : (
        validation.length > 0 && (
          <ul className="space-y-1 pl-8 pb-1">
            {validation.slice(0, 4).map((v) => (
              <li key={v.label} className="flex items-center gap-1.5 text-[11.5px]">
                {v.pass ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className={v.pass ? "text-foreground/90" : "text-muted-foreground"}>
                  {v.label}
                </span>
              </li>
            ))}
          </ul>
        )
      )}

      {/* Auto Arrange */}
      {onSmartLayout && (
        <Button
          variant="outline"
          size="sm"
          disabled={!hasItems}
          className={cn(
            "w-full justify-start gap-2",
            isMobile ? "h-11" : "h-9"
          )}
          onClick={onSmartLayout}
        >
          <LayoutGrid className="h-4 w-4" />
          Auto Arrange
        </Button>
      )}

      {/* Save */}
      {activeBuildName && onOverwrite ? (
        <Button
          size="sm"
          className={cn(
            "w-full justify-center gap-2 font-semibold",
            isMobile ? "h-12 text-sm" : "h-9"
          )}
          disabled={!canSave || !isDirty}
          onClick={onOverwrite}
        >
          <Save className="h-4 w-4" />
          Save "{activeBuildName}"
        </Button>
      ) : (
        <Button
          size="sm"
          className={cn(
            "w-full justify-center gap-2 font-semibold",
            isMobile ? "h-12 text-sm" : "h-9"
          )}
          disabled={!canSave}
          onClick={onSaveClick}
        >
          <Save className="h-4 w-4" />
          Save Build
        </Button>
      )}

      {/* Export & Clear row */}
      <div className="flex items-center gap-2">
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 justify-center gap-1.5",
              isMobile ? "h-10 text-sm" : "h-8 text-xs"
            )}
            disabled={!canSave}
            onClick={onExport}
          >
            <FileDown className="h-3.5 w-3.5" />
            Export
          </Button>
        )}
        {hasItems && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 justify-center gap-1.5 text-muted-foreground hover:text-destructive",
              isMobile ? "h-10 text-sm" : "h-8 text-xs"
            )}
            onClick={onClearAll}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};