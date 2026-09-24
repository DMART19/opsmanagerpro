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
import { CalendarIcon, Download, FileText, Mail, Filter, RotateCcw, Check, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
import { REPORTS_TOOLTIPS } from "@/lib/tooltip-content";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
const locations = ["Main Office", "Storage Room", "IT Closet", "Conference Room"];
const assetTypes = ["Electronics", "Furniture", "Office Equipment", "AV Equipment", "Supplies"];
export const FilterBar = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const {
    checkRestriction
  } = useTourMode();

  // Track if filters have pending changes
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
      description: "Reports updated with your selected filters."
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
      description: "All filters have been cleared."
    });
  };
  const handleExportCSV = () => {
    if (checkRestriction('export')) return;
    toast({
      title: "Export Started",
      description: "Your CSV report is being generated..."
    });
  };
  const handleExportPDF = () => {
    if (checkRestriction('export')) return;
    toast({
      title: "Export Started",
      description: "Your PDF report is being generated..."
    });
  };
  const handleEmailReport = () => {
    if (checkRestriction('email')) return;
    toast({
      title: "Email Scheduled",
      description: "Report will be sent to your registered email address."
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

  // Generate active filter summary
  const getFilterSummary = () => {
    if (!filtersApplied) return null;
    const parts: string[] = [];
    if (dateFrom && dateTo) {
      parts.push(`${format(dateFrom, "MMM d, yyyy")} – ${format(dateTo, "MMM d, yyyy")}`);
    } else if (dateFrom) {
      parts.push(`From ${format(dateFrom, "MMM d, yyyy")}`);
    } else if (dateTo) {
      parts.push(`Until ${format(dateTo, "MMM d, yyyy")}`);
    }
    if (selectedLocations.length > 0) {
      parts.push(`${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''}`);
    }
    if (selectedAssetTypes.length > 0) {
      parts.push(`${selectedAssetTypes.length} asset type${selectedAssetTypes.length > 1 ? 's' : ''}`);
    }
    if (includeArchived) {
      parts.push('Including archived');
    }
    return parts.length > 0 ? parts.join(' • ') : null;
  };
  const filterSummary = getFilterSummary();
  return <Card className="p-6">
      {/* Active Filter Summary */}
      {filterSummary && <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            <Check className="h-3 w-3 mr-1" />
            Showing: {filterSummary}
          </Badge>
        </div>}

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="flex items-center gap-4 flex-1">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MMM dd") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground text-sm">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MMM dd") : "To date"}
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
                <Button variant="outline" className="w-[180px] justify-start">
                  <span className="truncate">
                    {selectedLocations.length > 0 ? `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""}` : "All Locations"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Select Locations</Label>
                  {locations.map(location => <div key={location} className="flex items-center space-x-2">
                      <Checkbox id={location} checked={selectedLocations.includes(location)} onCheckedChange={() => toggleLocation(location)} />
                      <label htmlFor={location} className="text-sm font-normal cursor-pointer">
                        {location}
                      </label>
                    </div>)}
                </div>
              </PopoverContent>
            </Popover>

            {/* Asset Type Multi-Select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <span className="truncate">
                    {selectedAssetTypes.length > 0 ? `${selectedAssetTypes.length} type${selectedAssetTypes.length > 1 ? "s" : ""}` : "All Assets"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Select Asset Types</Label>
                  {assetTypes.map(type => <div key={type} className="flex items-center space-x-2">
                      <Checkbox id={type} checked={selectedAssetTypes.includes(type)} onCheckedChange={() => toggleAssetType(type)} />
                      <label htmlFor={type} className="text-sm font-normal cursor-pointer">
                        {type}
                      </label>
                    </div>)}
                </div>
              </PopoverContent>
            </Popover>

            {/* Include Archived Toggle */}
            <div className="flex items-center space-x-2 px-3 py-2 border rounded-md">
              <Switch id="archived" checked={includeArchived} onCheckedChange={handleArchivedChange} />
              <Label htmlFor="archived" className="text-sm cursor-pointer">
                Include Archived
              </Label>
            </div>

            {/* Apply / Reset Buttons */}
            <div className="flex items-center gap-2">
              {hasChanges && <Button size="sm" onClick={handleApplyFilters}>
                  <Check className="h-4 w-4 mr-1" />
                  Apply Filters
                </Button>}
              {(filtersApplied || hasChanges) && <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>}
            </div>
          </div>

          {/* Export Buttons with tooltips */}
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm">
                {REPORTS_TOOLTIPS.emailReport}
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm">
                {REPORTS_TOOLTIPS.exportCSV}
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm">
                {REPORTS_TOOLTIPS.exportPDF}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Filter Reports
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>Filter Options</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Date Range */}
                <div className="space-y-3">
                  <Label>Date Range</Label>
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
                  <Label>Locations</Label>
                  {locations.map(location => <div key={location} className="flex items-center space-x-2">
                      <Checkbox id={`mobile-${location}`} checked={selectedLocations.includes(location)} onCheckedChange={() => toggleLocation(location)} />
                      <label htmlFor={`mobile-${location}`} className="text-sm cursor-pointer">
                        {location}
                      </label>
                    </div>)}
                </div>

                {/* Asset Types */}
                <div className="space-y-3">
                  <Label>Asset Types</Label>
                  {assetTypes.map(type => <div key={type} className="flex items-center space-x-2">
                      <Checkbox id={`mobile-${type}`} checked={selectedAssetTypes.includes(type)} onCheckedChange={() => toggleAssetType(type)} />
                      <label htmlFor={`mobile-${type}`} className="text-sm cursor-pointer">
                        {type}
                      </label>
                    </div>)}
                </div>

                {/* Include Archived */}
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Switch id="archived-mobile" checked={includeArchived} onCheckedChange={handleArchivedChange} />
                  <Label htmlFor="archived-mobile" className="cursor-pointer">
                    Include Archived Data
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

        {/* Export Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleEmailReport}>
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>;
};