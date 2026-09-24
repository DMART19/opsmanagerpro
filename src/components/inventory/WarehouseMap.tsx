import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Grid3x3, AlertTriangle, Plus, Filter } from "lucide-react";
import { useWarehouseSections, WarehouseSection } from "@/hooks/use-warehouse-sections";
import { SectionDetailDrawer } from "./SectionDetailDrawer";
import { AddWarehouseSectionModal } from "./AddWarehouseSectionModal";
import { OperationalSectionManager } from "./OperationalSectionManager";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewMode = "cards" | "grid" | "heatmap";
type DensityFilter = "all" | "high" | "medium" | "low";

export const WarehouseMap = () => {
  const { sections, loading, alerts, loadSectionWithSlots, refetch } = useWarehouseSections();
  const [selectedSection, setSelectedSection] = useState<WarehouseSection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [densityFilter, setDensityFilter] = useState<DensityFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const handleSectionClick = (section: WarehouseSection) => {
    setSelectedSection(section);
    setFullViewOpen(true);
  };

  const getDensityLevel = (section: WarehouseSection): DensityFilter => {
    const density = (section.current_capacity / section.max_capacity) * 100;
    if (density >= 80) return "high";
    if (density >= 60) return "medium";
    return "low";
  };

  const getDensityColor = (section: WarehouseSection) => {
    const level = getDensityLevel(section);
    switch (level) {
      case "high":
        return "bg-[#2F5FFF]";
      case "medium":
        return "bg-blue-400";
      case "low":
        return "bg-green-500";
      default:
        return "bg-muted";
    }
  };

  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const matchesDensity =
        densityFilter === "all" || getDensityLevel(section) === densityFilter;
      const matchesSection =
        sectionFilter === "all" || section.section_code === sectionFilter;
      return matchesDensity && matchesSection;
    });
  }, [sections, densityFilter, sectionFilter]);

  const stats = useMemo(() => {
    const totalCapacity = sections.reduce((acc, s) => acc + s.max_capacity, 0);
    const totalOccupied = sections.reduce((acc, s) => acc + s.current_capacity, 0);
    const avgDensity = sections.length > 0 
      ? sections.reduce((acc, s) => acc + (s.current_capacity / s.max_capacity) * 100, 0) / sections.length
      : 0;

    return {
      sections: sections.length,
      totalCapacity,
      totalOccupied,
      avgDensity: Math.round(avgDensity),
    };
  }, [sections]);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#2F5FFF]" />
              Location Layout
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time capacity and pallet density monitoring
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Capacity Alerts</p>
                <p className="text-sm">
                  {alerts.map((s) => `Section ${s.section_code}`).join(", ")} over 90% capacity
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-[#F6F8FB] rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#0D1321]" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.section_code}>
                  Section {s.section_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={densityFilter} onValueChange={(v) => setDensityFilter(v as DensityFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Density" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="high">🟢 High (80%+)</SelectItem>
              <SelectItem value="medium">🔵 Medium (60-79%)</SelectItem>
              <SelectItem value="low">🟣 Low (&lt;60%)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">Cards</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="heatmap">Heatmap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 mb-6 p-4 bg-muted/30 rounded-lg border border-[#0D1321]/10">
          <button
            onClick={() => setDensityFilter("high")}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
          >
            <div className="w-3 h-3 rounded bg-[#2F5FFF]" />
            <span className="text-sm">🟢 High (80%+)</span>
          </button>
          <button
            onClick={() => setDensityFilter("medium")}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
          >
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-sm">🔵 Medium (60-79%)</span>
          </button>
          <button
            onClick={() => setDensityFilter("low")}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
          >
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-sm">🟣 Low (&lt;60%)</span>
          </button>
        </div>

        {/* Content */}
        {filteredSections.length === 0 ? (
          <div className="text-center py-16 border border-border/50 rounded-lg bg-muted/20">
            <Grid3x3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sections Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {sections.length === 0
                ? "Get started by adding your first section"
                : "No sections match the current filters"}
            </p>
            <Button variant="outline" className="gap-2" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add First Section
            </Button>
          </div>
        ) : (
          <>
            {/* Cards View */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSections.map((section) => {
                  const density = (section.current_capacity / section.max_capacity) * 100;
                  return (
                    <TooltipProvider key={section.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => handleSectionClick(section)}
                            className="relative p-6 border-2 rounded-lg bg-card hover:border-[#2F5FFF] transition-all cursor-pointer group shadow-sm hover:shadow-md"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-2xl font-bold text-[#0D1321]">
                                  Section {section.section_code}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {section.section_name}
                                </p>
                                <Badge variant="outline" className="gap-1 mt-2">
                                  <Grid3x3 className="h-3 w-3" />
                                  {section.current_capacity}/{section.max_capacity} pallets
                                </Badge>
                              </div>
                              <div className={`w-5 h-5 rounded-full ${getDensityColor(section)}`} />
                            </div>

                            {/* Density Bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Density</span>
                                <span className="font-semibold">{density.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full ${getDensityColor(section)} transition-all`}
                                  style={{ width: `${density}%` }}
                                />
                              </div>
                            </div>

                            {/* Mini Slot Grid */}
                            <div className="mt-4 grid grid-cols-8 gap-1">
                              {Array.from({ length: section.max_capacity }).map((_, index) => (
                                <div
                                  key={index}
                                  className={`aspect-square rounded ${
                                    index < section.current_capacity
                                      ? getDensityColor(section) + " opacity-40"
                                      : "bg-muted"
                                  }`}
                                />
                              ))}
                            </div>

                            {density > 90 && (
                              <div className="mt-3 flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Over 90% capacity</span>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {section.current_capacity} / {section.max_capacity} pallets used — {density.toFixed(1)}%
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && (
              <div className="border-2 rounded-lg p-8 bg-[#F6F8FB]">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {filteredSections.map((section) => {
                    const density = (section.current_capacity / section.max_capacity) * 100;
                    return (
                      <TooltipProvider key={section.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => handleSectionClick(section)}
                              className={`aspect-square rounded-lg ${getDensityColor(
                                section
                              )} hover:scale-110 transition-all cursor-pointer flex flex-col items-center justify-center text-white shadow-md`}
                            >
                              <span className="text-lg font-bold">{section.section_code}</span>
                              <span className="text-xs">{density.toFixed(0)}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Section {section.section_code}: {section.current_capacity} / {section.max_capacity} pallets
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Heatmap View */}
            {viewMode === "heatmap" && (
              <div className="border-2 rounded-lg p-8 bg-[#0D1321]">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {filteredSections.map((section) => {
                    const density = (section.current_capacity / section.max_capacity) * 100;
                    const opacity = Math.max(0.2, density / 100);
                    return (
                      <TooltipProvider key={section.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => handleSectionClick(section)}
                              className={`aspect-square rounded ${getDensityColor(
                                section
                              )} hover:scale-110 transition-all cursor-pointer flex items-center justify-center text-white font-bold text-sm`}
                              style={{ opacity }}
                            >
                              {section.section_code}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {section.section_code}: {density.toFixed(1)}% density
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-4 bg-[#F6F8FB] rounded-lg border border-[#0D1321]/10">
            <p className="text-2xl font-bold text-[#0D1321]">{stats.sections}</p>
            <p className="text-sm text-muted-foreground">Sections</p>
          </div>
          <div className="text-center p-4 bg-[#F6F8FB] rounded-lg border border-[#0D1321]/10">
            <p className="text-2xl font-bold text-[#0D1321]">{stats.totalOccupied}</p>
            <p className="text-sm text-muted-foreground">Occupied Pallets</p>
          </div>
          <div className="text-center p-4 bg-[#F6F8FB] rounded-lg border border-[#0D1321]/10">
            <p className="text-2xl font-bold text-[#2F5FFF]">{stats.totalCapacity}</p>
            <p className="text-sm text-muted-foreground">Total Capacity</p>
          </div>
          <div className="text-center p-4 bg-[#F6F8FB] rounded-lg border border-[#0D1321]/10">
            <p className="text-2xl font-bold text-[#0D1321]">{stats.avgDensity}%</p>
            <p className="text-sm text-muted-foreground">Avg Density</p>
          </div>
        </div>
      </Card>

      {/* Detail Drawer */}
      <SectionDetailDrawer
        section={selectedSection}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLoadSlots={loadSectionWithSlots}
        onSectionUpdated={refetch}
        onOpenFullView={(section) => {
          setDrawerOpen(false);
          setSelectedSection(section);
          setFullViewOpen(true);
        }}
      />

      {/* Full Operational View */}
      {selectedSection && fullViewOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <OperationalSectionManager
            section={selectedSection}
            onBack={() => {
              setFullViewOpen(false);
              setSelectedSection(null);
            }}
            onSuccess={() => {
              refetch();
              setFullViewOpen(false);
              setSelectedSection(null);
            }}
          />
        </div>
      )}

      {/* Add Section Modal */}
      <AddWarehouseSectionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={refetch}
      />
    </>
  );
};
