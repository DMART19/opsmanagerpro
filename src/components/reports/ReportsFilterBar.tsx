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
import { CalendarIcon, Filter, RotateCcw, Check, X, FileCheck, Table, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SavedViewsDropdown } from "./SavedViewsDropdown";
import { ExportPreviewModal } from "./ExportPreviewModal";

const locations = ["Main Office", "Storage Room", "IT Closet", "Conference Room"];
const assetTypes = ["Electronics", "Furniture", "Office Equipment", "AV Equipment", "Supplies"];

interface ActiveFilter {
  type: 'date' | 'location' | 'asset' | 'archived';
  label: string;
  value: string;
}

export const ReportsFilterBar = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'csv'>('pdf');
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

  const hasChanges = useMemo(() => {
    if (!filtersApplied) {
      return dateFrom || dateTo || selectedLocations.length > 0 || selectedAssetTypes.length > 0 || includeArchived;
    }
    return false;
  }, [dateFrom, dateTo, selectedLocations, selectedAssetTypes, includeArchived, filtersApplied]);

  const handleApplyFilters = () => {
    setFiltersApplied(true);
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
        ? "Your formatted PDF report has been generated and is downloading..."
        : "Your CSV file with complete data is downloading..."
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

  const handleDateFromChange = (date: Date | undefined) => {
    setFiltersApplied(false);
    setDateFrom(date);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setFiltersApplied(false);
    setDateTo(date);
  };

  const handleArchivedChange = (checked: boolean) => {
    setFiltersApplied(false);
    setIncludeArchived(checked);
  };

  return (
    <>
      <Card className="p-4 sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="mb-4 flex items-center gap-2 flex-wrap pb-4 border-b">
            <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
            {activeFilters.map((filter, idx) => (
              <Badge 
                key={`${filter.type}-${idx}`}
                variant="secondary" 
                className="gap-1 pl-2 pr-1 py-1 bg-primary/10 text-primary border-0 hover:bg-primary/20"
              >
                {filter.label}
                <button 
                  onClick={() => removeFilter(filter)}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-6 text-xs">
              Clear all
            </Button>
          </div>
        )}

        {/* Desktop View */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 justify-between flex-wrap">
            <div className="flex items-center gap-3 flex-1">
              {/* Saved Views Dropdown */}
              <SavedViewsDropdown />

              {/* Separator */}
              <div className="h-6 w-px bg-border" />

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[120px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, "MMM dd") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground text-xs">–</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[120px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, "MMM dd") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Location Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start">
                    <span className="truncate text-sm">
                      {selectedLocations.length > 0 ? `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""}` : "Locations"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">SELECT LOCATIONS</Label>
                    {locations.map(location => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox id={location} checked={selectedLocations.includes(location)} onCheckedChange={() => toggleLocation(location)} />
                        <label htmlFor={location} className="text-sm font-normal cursor-pointer">
                          {location}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Resource Type Multi-Select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[140px] justify-start">
                    <span className="truncate text-sm">
                      {selectedAssetTypes.length > 0 ? `${selectedAssetTypes.length} type${selectedAssetTypes.length > 1 ? "s" : ""}` : "Resource Types"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">SELECT RESOURCE TYPES</Label>
                    {assetTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox id={type} checked={selectedAssetTypes.includes(type)} onCheckedChange={() => toggleAssetType(type)} />
                        <label htmlFor={type} className="text-sm font-normal cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Include Inactive Toggle */}
              <div className="flex items-center space-x-2 px-2 py-1.5 border rounded-md bg-muted/30">
                <Switch id="archived" checked={includeArchived} onCheckedChange={handleArchivedChange} className="scale-90" />
                <Label htmlFor="archived" className="text-xs cursor-pointer">
                  Include Inactive Resources
                </Label>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                    Include historical or retired items in metrics. This may affect availability percentages.
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Apply Button */}
              {hasChanges && (
                <Button size="sm" onClick={handleApplyFilters} className="gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </Button>
              )}
              
              {(filtersApplied || hasChanges) && (
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={handleResetFilters} className="gap-1">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Clear all filters and show complete data
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                    <Table className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Export Raw Data</span>
                    <span className="xl:hidden">CSV</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Download complete dataset as CSV for analysis
                </TooltipContent>
              </Tooltip>
              
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" onClick={handleExportPDF} className="gap-1.5">
                    <FileCheck className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Export for Audit</span>
                    <span className="xl:hidden">PDF</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Generate formatted PDF report for compliance audits
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-3">
          <div className="flex items-center gap-2">
            <SavedViewsDropdown />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter Reports
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filter Reports</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Date Range */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "MMM dd") : "From"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? format(dateTo, "MMM dd") : "To"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Locations</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {locations.map(location => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox id={`mobile-${location}`} checked={selectedLocations.includes(location)} onCheckedChange={() => toggleLocation(location)} />
                          <label htmlFor={`mobile-${location}`} className="text-sm cursor-pointer">
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Types */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Resource Types</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {assetTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox id={`mobile-${type}`} checked={selectedAssetTypes.includes(type)} onCheckedChange={() => toggleAssetType(type)} />
                          <label htmlFor={`mobile-${type}`} className="text-sm cursor-pointer">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Include Inactive */}
                  <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                    <Switch id="archived-mobile" checked={includeArchived} onCheckedChange={handleArchivedChange} />
                    <Label htmlFor="archived-mobile" className="cursor-pointer text-sm">
                      Include Inactive Resources
                    </Label>
                  </div>

                  {/* Apply / Reset */}
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" onClick={handleApplyFilters}>
                      <Check className="h-4 w-4 mr-1" />
                      Apply Filters
                    </Button>
                    <Button variant="outline" onClick={handleResetFilters}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile Export Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Table className="h-4 w-4" />
              Raw Data
            </Button>
            <Button variant="default" size="sm" onClick={handleExportPDF} className="gap-1.5">
              <FileCheck className="h-4 w-4" />
              Audit PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Preview Modal */}
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
