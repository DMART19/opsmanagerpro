import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { MobileTeamSelectableCard } from "./MobileTeamSelectableCard";
import { MobileTeamSkeleton } from "./MobileTeamSkeleton";
import { TeamEmptyState } from "../TeamEmptyState";

interface MobileTeamListProps {
  employees: any[];
  loading: boolean;
  onViewEmployee: (employee: any) => void;
  onRefresh: () => void;
  hasEmployees: boolean;
  onAddMember: () => void;
  onClearFilters: () => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
  
  onAddCredential?: (employee: any) => void;
  onEditMember?: (employee: any) => void;
  onDeactivateMember?: (employee: any) => void;
}

export const MobileTeamList = ({
  employees,
  loading,
  onViewEmployee,
  onRefresh,
  hasEmployees,
  onAddMember,
  onClearFilters,
  selectedIds = new Set(),
  onToggleSelect,
  selectionMode = false,
  
  onAddCredential,
  onEditMember,
  onDeactivateMember,
}: MobileTeamListProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const shouldVirtualize = employees.length > 40;

  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: employees.length,
    estimateSize: () => 92,
    overscan: 10,
    scrollMargin,
  });

  // Pull to refresh handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(diff * 0.5, 80));
      }
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 50 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, refreshing, onRefresh]);

  const handleToggleSelect = useCallback(
    (id: string) => {
      onToggleSelect?.(id);
    },
    [onToggleSelect]
  );

  if (loading) {
    return <MobileTeamSkeleton />;
  }

  // Empty states
  if (!hasEmployees) {
    return <TeamEmptyState type="no-members" onAddMember={onAddMember} />;
  }

  if (employees.length === 0) {
    return <TeamEmptyState type="no-results" onClearFilters={onClearFilters} />;
  }

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-2 flex items-center justify-center transition-opacity"
          style={{
            height: pullDistance,
            opacity: Math.min(pullDistance / 50, 1),
          }}
        >
          <div
            className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{
              transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)`,
            }}
          />
        </div>
      )}

      {/* Selection mode hint */}
      {selectionMode && employees.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mb-3">
          Tap members to select them for deletion
        </p>
      )}

      {/* Member Cards */}
      <div
        ref={listRef}
        className="relative"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.2s ease-out" : "none",
        }}
      >
        {shouldVirtualize ? (
          <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((v) => {
              const employee = employees[v.index];
              if (!employee) return null;

              return (
                <div
                  key={employee.id}
                  data-index={v.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${v.start - scrollMargin}px)` }}
                >
                  <div className="pb-2">
                    <MobileTeamSelectableCard
                      employee={employee}
                      onView={onViewEmployee}
                      isSelected={selectedIds.has(employee.id)}
                      onToggleSelect={handleToggleSelect}
                      selectionMode={selectionMode}
                      onAddCredential={onAddCredential}
                      onEditMember={onEditMember}
                      onDeactivateMember={onDeactivateMember}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(index * 0.04, 0.4),
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <MobileTeamSelectableCard
                  employee={employee}
                  onView={onViewEmployee}
                  isSelected={selectedIds.has(employee.id)}
                  onToggleSelect={handleToggleSelect}
                  selectionMode={selectionMode}
                  
                  onAddCredential={onAddCredential}
                  onEditMember={onEditMember}
                  onDeactivateMember={onDeactivateMember}
                />
              </motion.div>
            ))}

            {/* Reassurance at bottom of list */}
            {employees.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Showing {employees.length} team members
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
