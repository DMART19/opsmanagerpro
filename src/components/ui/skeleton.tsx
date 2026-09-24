import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add shimmer effect for more premium feel */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "rounded-lg bg-muted/60",
        shimmer && "skeleton-shimmer",
        !shimmer && "animate-pulse",
        className
      )} 
      {...props} 
    />
  );
}

export { Skeleton };