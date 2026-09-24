import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { MobileContainerCard } from "./MobileContainerCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Box, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileContainerListProps {
  boxes: Array<{
    id: string;
    box_number: string;
    box_number_alt?: string | null;
    cache_box_type: string;
    box_description?: string | null;
    status_cache_box: string;
    x_group_display?: string | null;
    barcode?: string | null;
  }>;
  isLoading: boolean;
  onView: (box: any) => void;
  onAddNew: () => void;
}

const MobileContainerSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i} className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ onAddNew }: { onAddNew: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="p-5 rounded-2xl bg-primary/10 mb-6">
      <Package className="h-10 w-10 text-primary" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">No containers created</h3>
    <p className="text-sm text-muted-foreground max-w-sm mb-6">
      Containers help organize assets into pallets, storage locations, or kits.
    </p>
    <Button onClick={onAddNew} className="gap-2" size="lg">
      <Box className="h-4 w-4" />
      Create Container
    </Button>
  </div>
);

export const MobileContainerList = ({
  boxes,
  isLoading,
  onView,
  onAddNew,
}: MobileContainerListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const shouldVirtualize = boxes.length > 40;

  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: boxes.length,
    estimateSize: () => 88,
    overscan: 10,
    scrollMargin,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const totalSize = useMemo(() => rowVirtualizer.getTotalSize(), [rowVirtualizer]);

  if (isLoading) {
    return <MobileContainerSkeleton />;
  }

  if (boxes.length === 0) {
    return <EmptyState onAddNew={onAddNew} />;
  }

  return (
    <div className="pb-24">
      <p className="text-sm text-muted-foreground px-1">
        {boxes.length} container{boxes.length !== 1 ? "s" : ""}
      </p>

      <div ref={listRef} className="relative mt-3">
        {shouldVirtualize ? (
          <div className="relative" style={{ height: totalSize }}>
            {virtualItems.map((v) => {
              const box = boxes[v.index];
              return (
                <div
                  key={box.id}
                  data-index={v.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    transform: `translateY(${v.start - scrollMargin}px)`,
                  }}
                >
                  <div className="pb-3">
                    <MobileContainerCard box={box} onView={onView} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {boxes.map((box) => (
              <MobileContainerCard key={box.id} box={box} onView={onView} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
