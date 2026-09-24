import { Skeleton } from "@/components/ui/skeleton";

interface TableLoadingSkeletonProps {
  rows?: number;
}

export const TableLoadingSkeleton = ({ rows = 8 }: TableLoadingSkeletonProps) => {
  return (
    <div className="space-y-4 p-6">
      {/* Toolbar skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      
      {/* Filter bar skeleton */}
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[130px]" />
        <Skeleton className="h-10 w-20" />
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 px-4 py-3 flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1 max-w-[200px]" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
          <div 
            key={i} 
            className="px-4 py-4 border-t flex items-center gap-4"
            style={{ opacity: 1 - (i * 0.08) }}
          >
            <Skeleton className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 max-w-[250px]" />
              <Skeleton className="h-3 w-1/2 max-w-[180px]" />
            </div>
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};
