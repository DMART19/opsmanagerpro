import { useState, useRef, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineQuantityCardProps {
  label: string;
  value: number;
  itemId: string;
  field: "quantity_available" | "quantity_out";
  className?: string;
  cardClassName?: string;
  icon?: ReactNode;
  readOnly?: boolean;
  onSaved: () => void;
}

export const InlineQuantityCard = ({
  label,
  value,
  itemId,
  field,
  className,
  cardClassName,
  icon,
  readOnly,
  onSaved,
}: InlineQuantityCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const numValue = parseInt(editValue, 10);
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be 0 or greater",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .update({ [field]: numValue })
        .eq("id", itemId);

      if (error) throw error;

      toast({ title: "Quantity updated" });
      setIsEditing(false);
      onSaved();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn("bg-muted/50 rounded-xl p-4", cardClassName)}>
        <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={0}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="h-11 text-xl font-bold flex-1 text-center"
            disabled={isSaving}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 shrink-0 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5 text-emerald-600" />
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 shrink-0 border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-muted/40 rounded-2xl p-4 shadow-sm transition-all duration-150",
        !readOnly && "group cursor-pointer hover:bg-muted/60 active:scale-[0.97]",
        cardClassName
      )}
      onClick={() => !readOnly && setIsEditing(true)}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {!readOnly && <Edit className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        <span className={cn("text-3xl font-bold tracking-tight", className)}>
          {value}
        </span>
      </div>
    </div>
  );
};
