import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DroppableDayCellProps {
  dateKey: string;
  children: ReactNode;
  className?: string;
  isCurrentMonth: boolean;
  [key: string]: any;
}

export const DroppableDayCell = ({ dateKey, children, className, isCurrentMonth, ...rest }: DroppableDayCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    disabled: !isCurrentMonth,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && isCurrentMonth && "ring-2 ring-primary/40 bg-primary/[0.08] scale-[1.01]"
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
