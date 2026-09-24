import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useInvalidateCacheInventory } from "@/hooks/use-cache-inventory";

interface InlineQuantityEditProps {
  itemId: string;
  quantity: number;
  className?: string;
  onUpdated?: () => void;
}

export const InlineQuantityEdit = ({
  itemId,
  quantity,
  className,
  onUpdated,
}: InlineQuantityEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(quantity));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const invalidate = useInvalidateCacheInventory();

  useEffect(() => {
    setValue(String(quantity));
  }, [quantity]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const handleSave = async () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      setValue(String(quantity));
      setIsEditing(false);
      return;
    }
    if (num === quantity) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .update({ quantity_available: num })
        .eq("id", itemId);
      if (error) throw error;
      invalidate();
      onUpdated?.();
      setIsEditing(false);
    } catch (err: any) {
      toast({
        title: "Failed to update quantity",
        description: err.message,
        variant: "destructive",
      });
      setValue(String(quantity));
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <span
        className={cn(
          "cursor-pointer hover:bg-muted/60 px-1.5 py-0.5 -mx-1.5 rounded transition-colors tabular-nums",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="Click to edit"
      >
        {quantity}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
          setValue(String(quantity));
          setIsEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      className={cn(
        "w-12 h-6 px-1.5 text-sm tabular-nums text-right rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary",
        className
      )}
    />
  );
};
