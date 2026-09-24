import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Undo, 
  Redo, 
  Wand2, 
  RotateCcw, 
  Download, 
  Save, 
  Layers, 
  FolderOpen, 
  Printer,
  MoreHorizontal,
} from "lucide-react";

interface CanvasToolbarProps {
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onSmartArrange: () => void;
  onReset: () => void;
  onExport: () => void;
  onPrint: () => void;
  onLoad: () => void;
  onSave: () => void;
  onToggleLayerView: () => void;
  showLayerView: boolean;
  arrangeAllLayers: boolean;
  onArrangeAllLayersChange: (value: boolean) => void;
  selectedLayer: number;
}

export const CanvasToolbar = ({
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  onSmartArrange,
  onReset,
  onExport,
  onPrint,
  onLoad,
  onSave,
  onToggleLayerView,
  showLayerView,
  arrangeAllLayers,
  onArrangeAllLayersChange,
  selectedLayer,
}: CanvasToolbarProps) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r border-border pr-3 mr-1" aria-label="History">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={historyIndex <= 0}
                className="h-8 gap-1.5 px-2"
              >
                <Undo className="h-4 w-4" />
                <span className="hidden md:inline text-xs">Undo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo last change · Ctrl+Z</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={historyIndex >= historyLength - 1}
                className="h-8 gap-1.5 px-2"
              >
                <Redo className="h-4 w-4" />
                <span className="hidden md:inline text-xs">Redo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo · Ctrl+Shift+Z</TooltipContent>
          </Tooltip>
        </div>

        {/* Smart Arrange */}
        <div className="flex items-center gap-2 border-r border-border pr-3 mr-1" aria-label="Arrange">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onSmartArrange}
                className="gap-1.5"
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Smart Arrange</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium">Auto-arrange items for optimal placement</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sorts by weight (heavy items first) and respects fragile items. 
                You'll be asked to confirm before changes are made. Undo with Ctrl+Z.
              </p>
            </TooltipContent>
          </Tooltip>
          
          <div className="hidden lg:flex items-center gap-1.5">
            <Switch
              id="arrange-all"
              checked={arrangeAllLayers}
              onCheckedChange={onArrangeAllLayersChange}
              className="scale-75"
            />
            <Label htmlFor="arrange-all" className="text-[11px] cursor-pointer whitespace-nowrap">
              All Layers
            </Label>
          </div>
        </div>

        {/* Layer View */}
        <div aria-label="View">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showLayerView ? "default" : "outline"}
                size="sm"
                onClick={onToggleLayerView}
                className="gap-1.5"
              >
                <Layers className="h-4 w-4" />
                <span className="inline">Layers</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show/hide the layer stack</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions Group */}
        <div className="flex items-center gap-1.5" aria-label="Actions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onReset} className="h-8 gap-1.5 px-2">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden md:inline text-xs">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all items and start over</TooltipContent>
          </Tooltip>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More actions · Export, Print</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onLoad} className="gap-1.5">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Load</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open a saved pallet layout</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onSave} size="sm" className="gap-1.5">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save this pallet build · Ctrl+S</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
