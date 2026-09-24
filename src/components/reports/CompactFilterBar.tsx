import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CalendarIcon, 
  Filter, 
  RotateCcw, 
  Check, 
  X, 
  FileCheck, 
  Table, 
  ChevronDown,
  Clock,
  Calendar as CalendarRange
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { SavedViewsDropdown } from "./SavedViewsDropdown";
import { ExportPreviewModal } from "./ExportPreviewModal";

const locations = ["Main Office", "Storage Room", "IT Closet", "Conference Room"];
const assetTypes = ["Electronics", "Furniture", "Office Equipment", "AV Equipment", "Supplies"];

// Quick date presets for faster selection
const datePresets = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last 3 months", getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
];

interface ActiveFilter {
  type: 'date' | 'location' | 'asset' | 'archived';
  label: string;
  value: string;
}

export const CompactFilterBar = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'csv'>('pdf');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const { checkRestriction } = useTourMode();

  // Generate active filter chips
  const activeFilters = useMemo((): ActiveFilter[] => {
    if (!filtersApplied) return [];
    const filters: ActiveFilter[] = [];
    
    if (dateFrom && dateTo) {
      filters.push({
        type: 'date',
        label: `${format(dateFrom, "MMM d")} – ${format(dateTo, "MMM d")}`,
        value: 'dateRange'
      });
    } else if (dateFrom) {
      filters.push({ type: 'date', label: `From ${format(dateFrom, "MMM d")}`, value: 'dateFrom' });
    } else if (dateTo) {
      filters.push({ type: 'date', label: `Until ${format(dateTo, "MMM d")}`, value: 'dateTo' });
    }
    
    selectedLocations.forEach(loc => {
      filters.push({ type: 'location', label: loc, value: loc });
    });
    
    selectedAssetTypes.forEach(type => {
      filters.push({ type: 'asset', label: type, value: type });
    });
    
    if (includeArchived) {
      filters.push({ type: 'archived', label: 'Including Inactive', value: 'archived' });
    }
    
    return filters;
  }, [filtersApplied, dateFrom, dateTo, selectedLocations, selectedAssetTypes, includeArchived]);

  const activeFilterLabels = useMemo(() => activeFilters.map(f => f.label), [activeFilters]);
  const hasAnyFilters = dateFrom || dateTo || selectedLocations.length > 0 || selectedAssetTypes.length > 0 || includeArchived;

  const applyPreset = (preset: typeof datePresets[0]) => {
    const { from, to } = preset.getValue();
    setDateFrom(from);
    setDateTo(to);
    setFiltersApplied(true);
    toast({
      title: "Date Range Applied",
      description: `Showing data for ${preset.label.toLowerCase()}.`
    });
  };

  const handleApplyFilters = () => {
    setFiltersApplied(true);
    setMobileSheetOpen(false);
    toast({
      title: "Filters Applied",
      description: "All reports updated with your selected filters."
    });
  };

  const handleResetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedLocations([]);
    setSelectedAssetTypes([]);
    setIncludeArchived(false);
    setFiltersApplied(false);
    toast({
      title: "Filters Reset",
      description: "Showing all data."
    });
  };

  const removeFilter = (filter: ActiveFilter) => {
    if (filter.type === 'date') {
      setDateFrom(undefined);
      setDateTo(undefined);
    } else if (filter.type === 'location') {
      setSelectedLocations(prev => prev.filter(l => l !== filter.value));
    } else if (filter.type === 'asset') {
      setSelectedAssetTypes(prev => prev.filter(t => t !== filter.value));
    } else if (filter.type === 'archived') {
      setIncludeArchived(false);
    }
    setTimeout(() => setFiltersApplied(true), 0);
  };

  const handleExportCSV = () => {
    if (checkRestriction('export')) return;
    setExportType('csv');
    setExportModalOpen(true);
  };

  const handleExportPDF = () => {
    if (checkRestriction('export')) return;
    setExportType('pdf');
    setExportModalOpen(true);
  };

  const handleConfirmExport = () => {
    toast({
      title: exportType === 'pdf' ? "Audit Report Generated" : "Data Export Ready",
      description: exportType === 'pdf' 
        ? "Your formatted PDF report has been generated."
        : "Your CSV file is downloading."
    });
  };

  const toggleLocation = (location: string) => {
    setFiltersApplied(false);
    setSelectedLocations(prev => prev.includes(location) ? prev.filter(w => w !== location) : [...prev, location]);
  };

  const toggleAssetType = (type: string) => {
    setFiltersApplied(false);
    setSelectedAssetTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <>
      <Card className="p-3 sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        {/* Desktop View - Compact Single Row */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {/* Saved Views */}
          <SavedViewsDropdown />
          
          <div className="h-5 w-px bg-border" />
          
          {/* Quick Date Presets */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <Clock className="h-3.5 w-3.5" />
                {dateFrom && dateTo 
                  ? `${format(dateFrom, "MMM d")} – ${format(dateTo, "MMM d")}` 
                  : "Date Range"}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Quick Select</p>
                <div className="grid grid-cols-2 gap-1">
                  {datePresets.map(preset => (
                    <Button 
                      key={preset.label} 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start text-xs h-7"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Custom Range</p>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {dateFrom ? format(dateFrom, "MMM d") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={dateFrom} 
                        onSelect={(d) => { setDateFrom(d); setFiltersApplied(false); }} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-sm self-center">–</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {dateTo ? format(dateTo, "MMM d") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={dateTo} 
                        onSelect={(d) => { setDateTo(d); setFiltersApplied(false); }} 
                        initialFocus 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Locations Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                {selectedLocations.length > 0 
                  ? <Badge variant="secondary" className="h-4 px-1 text-[10px]">{selectedLocations.length}</Badge>
                  : null}
                Locations
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-2">
              {locations.map(location => (
                <div key={location} className="flex items-center space-x-2 py-1.5">
                  <Checkbox 
                    id={location} 
                    checked={selectedLocations.includes(location)} 
                    onCheckedChange={() => toggleLocation(location)} 
                  />
                  <label htmlFor={location} className="text-sm cursor-pointer flex-1">
                    {location}
                  </label>
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {/* Resource Types Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                {selectedAssetTypes.length > 0 
                  ? <Badge variant="secondary" className="h-4 px-1 text-[10px]">{selectedAssetTypes.length}</Badge>
                  : null}
                Types
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-2">
              {assetTypes.map(type => (
                <div key={type} className="flex items-center space-x-2 py-1.5">
                  <Checkbox 
                    id={type} 
                    checked={selectedAssetTypes.includes(type)} 
                    onCheckedChange={() => toggleAssetType(type)} 
                  />
                  <label htmlFor={type} className="text-sm cursor-pointer flex-1">
                    {type}
                  </label>
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {/* Include Inactive Toggle */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/30">
            <Switch 
              id="archived-compact" 
              checked={includeArchived} 
              onCheckedChange={(checked) => { setIncludeArchived(checked); setFiltersApplied(false); }}
              className="scale-75"
            />
            <Label htmlFor="archived-compact" className="text-xs cursor-pointer whitespace-nowrap">
              Inactive
            </Label>
          </div>

          {/* Apply/Reset */}
          {hasAnyFilters && !filtersApplied && (
            <Button size="sm" onClick={handleApplyFilters} className="h-8 gap-1">
              <Check className="h-3.5 w-3.5" />
              Apply
            </Button>
          )}
          
          {(filtersApplied || hasAnyFilters) && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          <div className="flex-1" />

          {/* Export Actions */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-1.5">
              <Table className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">CSV</span>
            </Button>
            <Button variant="default" size="sm" onClick={handleExportPDF} className="h-8 gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center gap-2">
            <SavedViewsDropdown />
            
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Filter Reports</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-5 overflow-y-auto">
                  {/* Quick Date Presets */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quick Date Range</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {datePresets.map(preset => (
                        <Button 
                          key={preset.label} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7"
                          onClick={() => { 
                            const { from, to } = preset.getValue();
                            setDateFrom(from);
                            setDateTo(to);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Locations</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {locations.map(location => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`mobile-${location}`} 
                            checked={selectedLocations.includes(location)} 
                            onCheckedChange={() => toggleLocation(location)} 
                          />
                          <label htmlFor={`mobile-${location}`} className="text-sm cursor-pointer">
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Types */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Resource Types</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {assetTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`mobile-type-${type}`} 
                            checked={selectedAssetTypes.includes(type)} 
                            onCheckedChange={() => toggleAssetType(type)} 
                          />
                          <label htmlFor={`mobile-type-${type}`} className="text-sm cursor-pointer">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Include Inactive */}
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                    <Switch id="archived-mobile" checked={includeArchived} onCheckedChange={setIncludeArchived} />
                    <Label htmlFor="archived-mobile" className="cursor-pointer text-sm">
                      Include Inactive Resources
                    </Label>
                  </div>

                  {/* Apply / Reset */}
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={handleApplyFilters}>
                      <Check className="h-4 w-4 mr-1" />
                      Apply
                    </Button>
                    <Button variant="outline" onClick={handleResetFilters}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
              <Table className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={handleExportPDF} className="gap-1">
              <FileCheck className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="mt-2 pt-2 border-t flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active:</span>
            {activeFilters.map((filter, idx) => (
              <Badge 
                key={`${filter.type}-${idx}`}
                variant="secondary" 
                className="gap-1 pl-2 pr-1 py-0.5 text-xs bg-primary/10 text-primary border-0 hover:bg-primary/20"
              >
                {filter.label}
                <button 
                  onClick={() => removeFilter(filter)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <button 
              onClick={handleResetFilters}
              className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      <ExportPreviewModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        exportType={exportType}
        activeFilters={activeFilterLabels}
        onConfirm={handleConfirmExport}
      />
    </>
  );
};
