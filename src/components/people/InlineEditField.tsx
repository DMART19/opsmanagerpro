import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  icon?: React.ReactNode;
  emptyLabel?: string;
  emptySubLabel?: string;
  className?: string;
}

export const InlineEditField = ({
  value,
  onSave,
  placeholder,
  type = "text",
  icon,
  emptyLabel,
  emptySubLabel = "Not added",
  className,
}: InlineEditFieldProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing]);

  const handleSave = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("flex items-center gap-1.5 py-1 px-1.5 -mx-1.5", className)}>
        {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
        <Input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 text-sm flex-1"
          disabled={saving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-success hover:text-success shrink-0"
          onClick={handleSave}
          disabled={saving}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground shrink-0"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (!value) {
    return (
      <div className={cn("flex items-center justify-between py-2 px-1.5 rounded-md bg-muted/20", className)}>
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-muted-foreground/50 flex-shrink-0">{icon}</span>}
          <div>
            <p className="text-xs font-medium text-muted-foreground">{emptyLabel}</p>
            <p className="text-[11px] text-muted-foreground/60">{emptySubLabel}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary hover:text-primary gap-1"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
          Add
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between py-1.5 group rounded-md hover:bg-muted/40 px-1.5 -mx-1.5 transition-colors", className)}>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
        <span className="text-sm truncate">{value}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
};
