import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Session-level cache for locations
let locationCache: { data: string[]; ts: number } | null = null;
const CACHE_TTL = 3 * 60 * 1000;

export const LocationCombobox = ({
  value,
  onChange,
  placeholder = "Location",
  className,
}: LocationComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchLocations = useCallback(async () => {
    if (locationCache && Date.now() - locationCache.ts < CACHE_TTL) {
      setLocations(locationCache.data);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cache_inventory")
        .select("section")
        .not("section", "is", null)
        .not("section", "eq", "")
        .limit(500);

      if (error) throw error;

      const unique = [...new Set(
        (data || [])
          .map((r) => (r.section as string)?.trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));

      locationCache = { data: unique, ts: Date.now() };
      setLocations(unique);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchLocations();
    }
  }, [open, fetchLocations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return locations;
    const term = search.toLowerCase().trim();
    return locations.filter((l) => l.toLowerCase().includes(term));
  }, [locations, search]);

  const exactMatch = useMemo(() => {
    if (!search.trim()) return true;
    return locations.some((l) => l.toLowerCase() === search.toLowerCase().trim());
  }, [locations, search]);

  const canCreate = search.trim().length > 0 && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type new…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange("");
                  setSearch("");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground italic">None</span>
              </CommandItem>
              {filtered.map((loc) => (
                <CommandItem
                  key={loc}
                  value={loc}
                  onSelect={() => {
                    onChange(loc);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === loc ? "opacity-100" : "opacity-0")} />
                  <MapPin className="mr-1.5 h-3.5 w-3.5 text-muted-foreground/50" />
                  {loc}
                </CommandItem>
              ))}
            </CommandGroup>
            {!loading && filtered.length === 0 && !canCreate && (
              <CommandEmpty>No locations found.</CommandEmpty>
            )}
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange(search.trim());
                    // Invalidate cache so new location appears next time
                    locationCache = null;
                    setSearch("");
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Use "{search.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/** Invalidate the location cache (call after adding/editing locations) */
export const invalidateLocationCache = () => {
  locationCache = null;
};
