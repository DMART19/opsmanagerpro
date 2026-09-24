import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, FilePlus } from "lucide-react";

interface SaveTrailerLayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  onOverwrite?: () => void;
  /** Name of the currently loaded layout (if any) */
  activeLayoutName?: string | null;
}

export const SaveTrailerLayoutModal = ({
  open,
  onOpenChange,
  onSave,
  onOverwrite,
  activeLayoutName,
}: SaveTrailerLayoutModalProps) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const handleSaveNew = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    onOpenChange(false);
  };

  const handleOverwrite = () => {
    onOverwrite?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Trailer Layout</DialogTitle>
          <DialogDescription>
            Save the current layout so you can load it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Overwrite option — only when a layout is already loaded */}
          {activeLayoutName && onOverwrite && (
            <>
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground">Currently editing</p>
                <p className="text-sm font-semibold truncate">{activeLayoutName}</p>
                <Button
                  onClick={handleOverwrite}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Save className="h-3.5 w-3.5" />
                  Overwrite "{activeLayoutName}"
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {/* Save as new */}
          <div className="space-y-2">
            <Label htmlFor="layout-name" className="text-xs">Save as new layout</Label>
            <Input
              id="layout-name"
              placeholder="e.g., Standard 53ft Load Configuration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNew();
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveNew} disabled={!name.trim()} className="gap-2">
            <FilePlus className="h-3.5 w-3.5" />
            Save as New
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
