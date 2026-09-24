import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const MobileTeamSkeleton = () => {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar skeleton */}
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />

            <div className="flex-1 space-y-2">
              {/* Name */}
              <Skeleton className="h-5 w-32" />
              {/* Position */}
              <Skeleton className="h-3 w-48" />

              {/* Progress bar section */}
              <div className="pt-2 space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>

            {/* Status badge placeholder */}
            <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
};
