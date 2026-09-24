import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  className?: string;
}

/**
 * Page Loader — Skeleton-first
 * 
 * Shows a generic page skeleton instead of a spinner.
 * Matches common page structure for zero-blank-state feel.
 */
export const PageLoader = ({ className }: PageLoaderProps) => {
  return (
    <div className={cn(
      "max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 animate-fade-in",
      className
    )}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-7 w-14 mb-2" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>

      {/* Content skeleton */}
      <Card className="p-6 mb-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/** Minimal inline loader for smaller transitions */
export const InlineLoader = ({ className }: PageLoaderProps) => {
  return (
    <div className={cn(
      "flex items-center justify-center py-8",
      className
    )}>
      <div className="relative">
        <div className="h-6 w-6 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  );
};
