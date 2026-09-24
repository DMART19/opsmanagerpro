import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Settings2, RotateCcw, LayoutGrid, Layers, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "dashboard-customization";

// Metadata for sections - badges and descriptions
const SECTION_META: Record<string, { badge?: string; badgeVariant?: "outline" | "secondary"; description?: string }> = {
  "insights": {
    description: "System health overview with actionable insights"
  },
  "stat-cards": {
    description: "Key performance metric cards"
  },
  "tasks": { 
    description: "Your scheduled tasks and deadlines for today"
  },
  "checkouts": { 
    description: "Assets currently checked out or in active use"
  },
  "asset-status": { 
    description: "Overview of asset availability and conditions"
  },
  "activity-alerts": { 
    description: "Recent changes and items needing attention"
  },
};

export interface DashboardConfig {
  sections: {
    id: string;
    label: string;
    visible: boolean;
    order: number;
  }[];
  metrics: {
    id: string;
    label: string;
    visible: boolean;
  }[];
  showWhenEmpty: Record<string, boolean>;
}

const AUTO_HIDE_SECTIONS = ["activity-alerts", "tasks", "checkouts"] as const;
type AutoHideSectionId = typeof AUTO_HIDE_SECTIONS[number];

const SHOW_WHEN_EMPTY_LABELS: Record<string, { label: string; emptyMessage: string }> = {
  "activity-alerts": { label: "Show Empty Alerts Card", emptyMessage: "No active alerts. You're all clear." },
  "tasks": { label: "Show Empty Tasks Card", emptyMessage: "No tasks scheduled for today." },
  "checkouts": { label: "Show Empty In-Use Card", emptyMessage: "No assets currently assigned." },
};

const DEFAULT_CONFIG: DashboardConfig = {
  sections: [
    { id: "insights", label: "System Health", visible: true, order: 0 },
    { id: "stat-cards", label: "Metric Cards", visible: true, order: 1 },
    { id: "tasks", label: "Today's Tasks", visible: true, order: 2 },
    { id: "checkouts", label: "Currently In Use", visible: true, order: 3 },
    { id: "asset-status", label: "Asset Status", visible: true, order: 4 },
    { id: "activity-alerts", label: "Activity & Alerts", visible: true, order: 5 },
  ],
  metrics: [
    { id: "total-assets", label: "Total Assets", visible: true },
    { id: "team-members", label: "Team Members", visible: true },
    { id: "under-review", label: "Under Review", visible: true },
    { id: "credentials-due", label: "Credentials Due", visible: true },
  ],
  showWhenEmpty: {
    "activity-alerts": false,
    "tasks": false,
    "checkouts": false,
  },
};

// Migrate old configs: remove phantom sections, ensure all current sections exist
const migrateConfig = (stored: DashboardConfig): DashboardConfig => {
  const validIds = DEFAULT_CONFIG.sections.map(s => s.id);
  
  // Remove sections that no longer exist (e.g. "demo-indicator", "getting-started")
  const filtered = stored.sections.filter(s => validIds.includes(s.id));
  
  // Add any new sections that are missing
  const existingIds = filtered.map(s => s.id);
  const missing = DEFAULT_CONFIG.sections.filter(s => !existingIds.includes(s.id));
  
  // Ensure showWhenEmpty has all keys
  const showWhenEmpty = { ...DEFAULT_CONFIG.showWhenEmpty, ...(stored.showWhenEmpty || {}) };

  return {
    ...stored,
    sections: [...filtered, ...missing],
    metrics: stored.metrics?.length ? stored.metrics : DEFAULT_CONFIG.metrics,
    showWhenEmpty,
  };
};

// ---- Context-based shared state ----

interface DashboardConfigContextValue {
  config: DashboardConfig;
  updateSectionVisibility: (id: string, visible: boolean) => void;
  updateMetricVisibility: (id: string, visible: boolean) => void;
  updateShowWhenEmpty: (id: string, show: boolean) => void;
  resetToDefault: () => void;
  isSectionVisible: (id: string) => boolean;
  isMetricVisible: (id: string) => boolean;
  shouldShowWhenEmpty: (id: string) => boolean;
}

const DashboardConfigContext = createContext<DashboardConfigContextValue | null>(null);

export const DashboardConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return migrateConfig(parsed);
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateSectionVisibility = (id: string, visible: boolean) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === id ? { ...s, visible } : s
      ),
    }));
  };

  const updateMetricVisibility = (id: string, visible: boolean) => {
    setConfig((prev) => ({
      ...prev,
      metrics: prev.metrics.map((m) =>
        m.id === id ? { ...m, visible } : m
      ),
    }));
  };

  const updateShowWhenEmpty = (id: string, show: boolean) => {
    setConfig((prev) => ({
      ...prev,
      showWhenEmpty: { ...prev.showWhenEmpty, [id]: show },
    }));
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const isSectionVisible = (id: string) => {
    return config.sections.find((s) => s.id === id)?.visible ?? true;
  };

  const isMetricVisible = (id: string) => {
    return config.metrics.find((m) => m.id === id)?.visible ?? true;
  };

  const shouldShowWhenEmpty = (id: string) => {
    return config.showWhenEmpty?.[id] ?? false;
  };

  return (
    <DashboardConfigContext.Provider value={{
      config,
      updateSectionVisibility,
      updateMetricVisibility,
      updateShowWhenEmpty,
      resetToDefault,
      isSectionVisible,
      isMetricVisible,
      shouldShowWhenEmpty,
    }}>
      {children}
    </DashboardConfigContext.Provider>
  );
};

export const useDashboardConfig = (): DashboardConfigContextValue => {
  const ctx = useContext(DashboardConfigContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (shouldn't happen on dashboard)
    // Return a static default so the app doesn't crash
    return {
      config: DEFAULT_CONFIG,
      updateSectionVisibility: () => {},
      updateMetricVisibility: () => {},
      updateShowWhenEmpty: () => {},
      resetToDefault: () => {},
      isSectionVisible: () => true,
      isMetricVisible: () => true,
      shouldShowWhenEmpty: () => false,
    };
  }
  return ctx;
};

interface DashboardCustomizationProps {
  config: DashboardConfig;
  onSectionToggle: (id: string, visible: boolean) => void;
  onMetricToggle: (id: string, visible: boolean) => void;
  onShowWhenEmptyToggle: (id: string, show: boolean) => void;
  onReset: () => void;
}

export const DashboardCustomization = ({
  config,
  onSectionToggle,
  onMetricToggle,
  onShowWhenEmptyToggle,
  onReset,
}: DashboardCustomizationProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px] flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Show or hide sections to personalize your view
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 flex-1 overflow-y-auto pb-6">
          {/* Metric Cards */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              Metric Cards
            </h4>
            <div className="space-y-2">
              {config.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Label htmlFor={`metric-${metric.id}`} className="text-sm cursor-pointer">
                    {metric.label}
                  </Label>
                  <Switch
                    id={`metric-${metric.id}`}
                    checked={metric.visible}
                    onCheckedChange={(checked) => onMetricToggle(metric.id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Dashboard Sections */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Dashboard Sections
            </h4>
            <div className="space-y-2">
              {config.sections.map((section) => {
                const meta = SECTION_META[section.id];
                return (
                  <div
                    key={section.id}
                    className="flex items-start justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor={`section-${section.id}`} className="text-sm cursor-pointer">
                          {section.label}
                        </Label>
                        {meta?.badge && (
                          <Badge 
                            variant={meta.badgeVariant || "outline"} 
                            className="text-[10px] px-1.5 py-0 h-4 font-normal"
                          >
                            {meta.badge}
                          </Badge>
                        )}
                      </div>
                      {meta?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      id={`section-${section.id}`}
                      checked={section.visible}
                      onCheckedChange={(checked) => onSectionToggle(section.id, checked)}
                      className="flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Show When Empty */}
          <div>
            <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Empty Card Visibility
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Cards auto-hide when empty. Toggle ON to always show.
            </p>
            <div className="space-y-2">
              {Object.entries(SHOW_WHEN_EMPTY_LABELS).map(([id, meta]) => (
                <div
                  key={id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Label htmlFor={`empty-${id}`} className="text-sm cursor-pointer">
                    {meta.label}
                  </Label>
                  <Switch
                    id={`empty-${id}`}
                    checked={config.showWhenEmpty?.[id] ?? false}
                    onCheckedChange={(checked) => onShowWhenEmptyToggle(id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Reset Button */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
