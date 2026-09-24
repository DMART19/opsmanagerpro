/**
 * Dashboard Loading Skeleton
 *
 * Live, system-aware loading state. Rotates short status microcopy,
 * shows a pulsing sync dot, and staggers shimmer reveal so the page
 * feels like it's wiring up data — not waiting on a spinner.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Syncing live inventory…",
  "Checking for updates…",
  "Loading today's tasks…",
  "Reconciling locations…",
];

const LiveSyncIndicator = ({ className = "" }: { className?: string }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span key={idx} className="animate-fade-in tabular-nums">
        {LOADING_MESSAGES[idx]}
      </span>
    </div>
  );
};

const stagger = (i: number) => ({
  animationDelay: `${i * 60}ms`,
  animationFillMode: "forwards" as const,
});

export const DashboardLoadingSkeleton = () => {
  return (
    <div className="animate-fade-in" style={{ animationDuration: '0.25s', animationFillMode: 'forwards' }}>
      {/* Header skeleton — with live sync hint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <LiveSyncIndicator />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Hero insight skeleton — primary focus, slightly emphasized */}
      <div className="mb-8 animate-fade-in opacity-0" style={stagger(0)}>
        <Skeleton className="h-[88px] w-full rounded-xl" />
      </div>

      {/* Secondary metrics skeleton - matches SecondaryMetrics layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card animate-fade-in opacity-0"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <div className="space-y-2 animate-fade-in opacity-0" style={stagger(1 + i)}>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Today's Tasks skeleton */}
      <div className="mb-8 animate-fade-in opacity-0" style={stagger(5)}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-in opacity-0" style={stagger(6)}>
        {/* Checkouts table skeleton */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Chart skeleton */}
        <div>
          <Card className="p-6 h-[280px]">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="flex items-center justify-center h-[200px]">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom row skeleton — secondary, slightly muted */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 animate-fade-in" style={stagger(7)}>
        {/* Recent activity skeleton */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Alerts skeleton */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

/**
 * Mobile Dashboard Loading Skeleton
 * Uses staggered animations for premium feel
 */
export const MobileDashboardLoadingSkeleton = () => {
  return (
    <div className="space-y-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <LiveSyncIndicator />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>

      {/* Hero insight */}
      <div className="animate-fade-in" style={{ animationDelay: '40ms', animationFillMode: 'forwards' }}>
        <Skeleton className="h-[72px] w-full rounded-xl" />
      </div>

      {/* 2x2 KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card 
            key={i} 
            className="p-4 animate-fade-in opacity-0"
            style={{ animationDelay: `${80 + i * 40}ms`, animationFillMode: 'forwards' }}
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </Card>
        ))}
      </div>

      {/* Attention section */}
      <Card className="p-4 animate-fade-in opacity-0" style={{ animationDelay: '280ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tasks section */}
      <Card className="p-4 animate-fade-in opacity-0" style={{ animationDelay: '320ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
