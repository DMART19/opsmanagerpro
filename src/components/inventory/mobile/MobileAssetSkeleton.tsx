import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileAssetSkeletonProps {
  count?: number;
}

export const MobileAssetSkeleton = ({ count = 6 }: MobileAssetSkeletonProps) => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon skeleton */}
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            
            {/* Arrow skeleton */}
            <Skeleton className="h-5 w-5 flex-shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
};
