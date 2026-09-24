import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tags, ListChecks, Layers, Barcode, FileText, Plus, X, Save, Loader2 } from "lucide-react";
import type { AssetSettings } from "@/hooks/use-user-settings";

interface AssetsTabProps {
  settings: AssetSettings;
  onSave: (settings: Partial<AssetSettings>) => Promise<boolean>;
  saving: boolean;
}

export const AssetsTab = ({ settings, onSave, saving }: AssetsTabProps) => {
  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleToggle = (field: keyof AssetSettings, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const addCategory = () => {
    if (newCategory.trim() && !formData.default_categories.includes(newCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        default_categories: [...prev.default_categories, newCategory.trim()]
      }));
      setNewCategory("");
      setHasChanges(true);
    }
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      default_categories: prev.default_categories.filter(c => c !== category)
    }));
    setHasChanges(true);
  };

  const addStatus = () => {
    if (newStatus.trim() && !formData.status_options.includes(newStatus.trim())) {
      setFormData(prev => ({
        ...prev,
        status_options: [...prev.status_options, newStatus.trim()]
      }));
      setNewStatus("");
      setHasChanges(true);
    }
  };

  const removeStatus = (status: string) => {
    if (formData.status_options.length > 1) {
      setFormData(prev => ({
        ...prev,
        status_options: prev.status_options.filter(s => s !== status)
      }));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    const success = await onSave(formData);
    if (success) setHasChanges(false);
  };

  const handleCancel = () => {
    setFormData(settings);
    setHasChanges(false);
    setNewCategory("");
    setNewStatus("");
  };

  return (
    <div className="space-y-4">
      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-lg">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[100px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Categories
        </h3>
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Tags className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label className="font-medium">Asset Categories</Label>
              <p className="text-xs text-muted-foreground">Used when adding new assets</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.default_categories.map((category) => (
              <Badge key={category} variant="secondary" className="px-3 py-1.5 text-sm gap-1.5">
                {category}
                <button 
                  onClick={() => removeCategory(category)} 
                  className="hover:text-destructive ml-1"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
              className="h-11 flex-1"
            />
            <Button 
              variant="outline" 
              onClick={addCategory} 
              disabled={!newCategory.trim()} 
              className="h-11 px-4"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Status Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Statuses
        </h3>
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <Label className="font-medium">Available Statuses</Label>
              <p className="text-xs text-muted-foreground">Status options for assets</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.status_options.map((status) => (
              <Badge key={status} variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
                {status}
                <button
                  onClick={() => removeStatus(status)}
                  className="hover:text-destructive ml-1 disabled:opacity-50"
                  disabled={formData.status_options.length <= 1}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add status..."
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStatus())}
              className="h-11 flex-1"
            />
            <Button 
              variant="outline" 
              onClick={addStatus} 
              disabled={!newStatus.trim()} 
              className="h-11 px-4"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Behavior Settings */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Behavior
        </h3>
        
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <Label className="font-medium">Group Duplicates</Label>
                <p className="text-xs text-muted-foreground">Combine identical items with quantities</p>
              </div>
            </div>
            <Switch
              checked={formData.group_duplicates}
              onCheckedChange={(val) => handleToggle("group_duplicates", val)}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Barcode className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <Label className="font-medium">Auto-Generate Tags</Label>
                <p className="text-xs text-muted-foreground">Create unique IDs for new items</p>
              </div>
            </div>
            <Switch
              checked={formData.auto_generate_asset_tags}
              onCheckedChange={(val) => handleToggle("auto_generate_asset_tags", val)}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <Label className="font-medium">Require Checkout Notes</Label>
                <p className="text-xs text-muted-foreground">Force notes when checking out</p>
              </div>
            </div>
            <Switch
              checked={formData.require_checkout_notes}
              onCheckedChange={(val) => handleToggle("require_checkout_notes", val)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};
