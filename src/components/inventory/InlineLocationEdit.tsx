import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useInvalidateCacheInventory } from "@/hooks/use-cache-inventory";
import { MapPin } from "lucide-react";

interface InlineLocationEditProps {
  itemId: string;
  location: string | null;
  className?: string;
  onUpdated?: () => void;
}

export const InlineLocationEdit = ({
  itemId,
  location,
  className,
  onUpdated,
}: InlineLocationEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(location || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const invalidate = useInvalidateCacheInventory();

  useEffect(() => {
    setValue(location || "");
  }, [location]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed === (location || "")) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("cache_inventory")
        .update({ section: trimmed || null })
        .eq("id", itemId);
      if (error) throw error;
      invalidate();
      onUpdated?.();
      setIsEditing(false);
    } catch (err: any) {
      toast({
        title: "Failed to update location",
        description: err.message,
        variant: "destructive",
      });
      setValue(location || "");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <span
        className={cn(
          "cursor-pointer hover:bg-muted/60 px-1 py-0.5 -mx-1 rounded transition-colors inline-flex items-center gap-0.5 max-w-[160px]",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="Click to edit location"
      >
        {location ? (
          <span className="truncate">{location}</span>
        ) : (
          <>
            <MapPin className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-muted-foreground/40 italic">Add location</span>
          </>
        )}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
          setValue(location || "");
          setIsEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      placeholder="Location…"
      className={cn(
        "w-28 h-5 px-1 text-[11px] rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary",
        className
      )}
    />
  );
};
