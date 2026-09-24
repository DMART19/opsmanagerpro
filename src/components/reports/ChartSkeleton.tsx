import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  type?: 'bar' | 'pie' | 'list';
  height?: number;
}

export const ChartSkeleton = ({ type = 'bar', height = 300 }: ChartSkeletonProps) => {
  if (type === 'pie') {
    return (
      <Card className="p-6 animate-pulse">
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center justify-center" style={{ height }}>
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          {[1, 2, 3].map(i => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (type === 'list') {
    return (
      <Card className="p-6 animate-pulse">
        <div className="mb-6">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 animate-pulse">
      <div className="mb-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <Skeleton 
              className="w-full rounded-t-sm" 
              style={{ height: `${Math.random() * 60 + 20}%` }} 
            />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-4">
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  );
};
