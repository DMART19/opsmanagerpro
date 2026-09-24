import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Lightbulb, Check } from "lucide-react";
import { useAssetAttributes, AttributeType } from "@/hooks/use-asset-attributes";
import { cn } from "@/lib/utils";

// Common operational field suggestions
const FIELD_SUGGESTIONS = [
  "Location",
  "Purchase Date",
  "Warranty Expiration",
  "Supplier",
  "Condition",
  "Assigned To",
  "Calibration Date",
  "Weight",
  "Dimensions",
  "Cost",
  "Purchase Price",
  "Department",
  "Notes",
];

// Common misspellings → corrections
const SPELL_CORRECTIONS: Record<string, string> = {
  "manufaturer": "Manufacturer",
  "manufacurer": "Manufacturer",
  "manufactuer": "Manufacturer",
  "manufacturor": "Manufacturer",
  "seriel": "Serial",
  "seria": "Serial",
  "serieal": "Serial",
  "calibraton": "Calibration",
  "calibraion": "Calibration",
  "warrantee": "Warranty",
  "waranty": "Warranty",
  "warrenty": "Warranty",
  "locaton": "Location",
  "locaiton": "Location",
  "suppiler": "Supplier",
  "supplyer": "Supplier",
  "supplir": "Supplier",
  "conditon": "Condition",
  "condtion": "Condition",
  "assignd": "Assigned",
  "assinged": "Assigned",
  "dimesions": "Dimensions",
  "dimensons": "Dimensions",
  "purchse": "Purchase",
  "purchace": "Purchase",
  "expiraton": "Expiration",
  "expirarion": "Expiration",
  "departmant": "Department",
  "departement": "Department",
  "barcdoe": "Barcode",
  "barcod": "Barcode",
  "weigth": "Weight",
  "wieght": "Weight",
};

type ExtendedFieldType = AttributeType | "url" | "barcode";

const FIELD_TYPES: { value: ExtendedFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "boolean", label: "Toggle" },
  { value: "barcode", label: "Barcode" },
  { value: "url", label: "URL" },
];

interface InlineFieldCreatorProps {
  onCreated?: () => void;
}

export const InlineFieldCreator = ({ onCreated }: InlineFieldCreatorProps) => {
  const { createAttribute, isCreating, attributes } = useAssetAttributes();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ExtendedFieldType>("text");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [spellSuggestion, setSpellSuggestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Existing attribute names for dedup
  const existingNames = useMemo(
    () => new Set(attributes.map((a) => a.name.toLowerCase())),
    [attributes]
  );

  // Filtered suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!name.trim() || name.length < 2) return [];
    const lower = name.toLowerCase();
    return FIELD_SUGGESTIONS.filter(
      (s) =>
        s.toLowerCase().includes(lower) &&
        !existingNames.has(s.toLowerCase())
    ).slice(0, 4);
  }, [name, existingNames]);

  // Spell check
  useEffect(() => {
    if (!name.trim() || name.length < 3) {
      setSpellSuggestion(null);
      return;
    }
    // Check each word
    const words = name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (SPELL_CORRECTIONS[word]) {
        const corrected = name.replace(
          new RegExp(word, "i"),
          SPELL_CORRECTIONS[word]
        );
        if (corrected.toLowerCase() !== name.toLowerCase()) {
          setSpellSuggestion(corrected);
          return;
        }
      }
    }
    setSpellSuggestion(null);
  }, [name]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    // Map barcode/url to text for storage
    const storageType: AttributeType =
      type === "barcode" || type === "url" ? "text" : type;

    try {
      await createAttribute({
        name: name.trim(),
        type: storageType,
        required: false,
        options: storageType === "select" ? options : undefined,
      });
      setName("");
      setType("text");
      setOptions([]);
      setNewOption("");
      setIsOpen(false);
      onCreated?.();
    } catch {
      // handled by mutation
    }
  };

  const acceptSuggestion = () => {
    if (spellSuggestion) {
      setName(spellSuggestion);
      setSpellSuggestion(null);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setName(suggestion);
    // Auto-detect type from name
    const lower = suggestion.toLowerCase();
    if (lower.includes("date") || lower.includes("expiration")) setType("date");
    else if (lower.includes("price") || lower.includes("cost") || lower.includes("weight")) setType("number");
    else setType("text");
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs rounded-lg gap-1.5"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Field
      </Button>
    );
  }

  return (
    <div className="p-3 rounded-xl border border-border/30 bg-muted/10 space-y-3">
      {/* Field Name */}
      <div className="space-y-1.5">
        <Label className="text-xs">Field Name</Label>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Calibration Date"
          className="h-9 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (name.trim()) handleCreate();
            }
          }}
        />

        {/* Spell suggestion */}
        {spellSuggestion && (
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-warning hover:underline"
            onClick={acceptSuggestion}
          >
            <Lightbulb className="h-3 w-3" />
            Did you mean: <span className="font-medium">{spellSuggestion}</span>?
          </button>
        )}

        {/* Field suggestions */}
        {filteredSuggestions.length > 0 && !spellSuggestion && (
          <div className="flex flex-wrap gap-1.5">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-primary/5 text-primary hover:bg-primary/10 transition-colors border border-primary/10"
              >
                <Lightbulb className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Field Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">Field Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as ExtendedFieldType)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((ft) => (
              <SelectItem key={ft.value} value={ft.value}>
                {ft.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dropdown Options */}
      {type === "select" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options</Label>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Add option"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" className="h-9 px-2.5" onClick={handleAddOption}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <Badge key={opt} variant="secondary" className="gap-1 text-xs">
                  {opt}
                  <button type="button" onClick={() => setOptions(options.filter((o) => o !== opt))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs rounded-lg gap-1.5"
          disabled={!name.trim() || isCreating || (type === "select" && options.length === 0)}
          onClick={handleCreate}
        >
          {isCreating ? "Adding..." : (
            <>
              <Check className="h-3.5 w-3.5" />
              Add Field
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs rounded-lg text-muted-foreground"
          onClick={() => {
            setIsOpen(false);
            setName("");
            setType("text");
            setOptions([]);
            setSpellSuggestion(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
