import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Check, ChevronsUpDown, MapPin, Clock, Plus } from "lucide-react";
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

interface Section {
  id: string;
  section_code: string;
  section_name: string;
}

interface LocationSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RECENT_KEY = "recent-container-locations";
const MAX_RECENT = 5;

const getRecentLocations = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
};

export const pushRecentLocation = (sectionId: string) => {
  if (!sectionId) return;
  const recent = getRecentLocations().filter((id) => id !== sectionId);
  recent.unshift(sectionId);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

export const LocationSearchCombobox = ({
  value,
  onChange,
  placeholder = "Location",
  className,
}: LocationSearchComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("warehouse_sections")
        .select("id, section_code, section_name")
        .order("section_code");
      if (error) throw error;
      setSections((data || []) as Section[]);
    } catch (err) {
      console.error("Failed to fetch sections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchSections();
    }
  }, [open, fetchSections]);

  const recentIds = useMemo(() => getRecentLocations(), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const s = sections.find((sec) => sec.id === value);
    return s ? `${s.section_code} - ${s.section_name}` : null;
  }, [value, sections]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const term = search.toLowerCase().trim();
    return sections.filter(
      (s) =>
        s.section_code.toLowerCase().includes(term) ||
        s.section_name.toLowerCase().includes(term)
    );
  }, [sections, search]);

  // Split into recent and rest
  const { recentSections, otherSections } = useMemo(() => {
    const recentSet = new Set(recentIds);
    const recent: Section[] = [];
    const other: Section[] = [];
    for (const s of filtered) {
      if (recentSet.has(s.id)) {
        recent.push(s);
      } else {
        other.push(s);
      }
    }
    // Sort recent by recency order
    recent.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    return { recentSections: recent, otherSections: other };
  }, [filtered, recentIds]);

  const handleSelect = (sectionId: string) => {
    if (sectionId === "__none__") {
      onChange("");
    } else {
      onChange(sectionId);
      pushRecentLocation(sectionId);
    }
    setSearch("");
    setOpen(false);
  };

  const exactMatch = useMemo(() => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return sections.some(
      (s) => s.section_code.toLowerCase() === term || s.section_name.toLowerCase() === term
    );
  }, [sections, search]);

  const canCreate = search.trim().length > 0 && !exactMatch;

  const handleCreateNew = async () => {
    const name = search.trim();
    setSearch("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;

      const code = name.toUpperCase().replace(/\s+/g, "-").slice(0, 10);
      const { data: newSection, error } = await supabase
        .from("warehouse_sections")
        .insert({
          section_code: code,
          section_name: name,
          max_capacity: 100,
          current_capacity: 0,
          floor_level: 1,
        })
        .select("id, section_code, section_name")
        .single();

      if (error) throw error;
      if (newSection) {
        const sec = newSection as Section;
        setSections((prev) => [...prev, sec]);
        onChange(sec.id);
        pushRecentLocation(sec.id);
      }
    } catch (err) {
      console.error("Failed to create location:", err);
    }
    setOpen(false);
  };

  const renderItem = (section: Section) => (
    <CommandItem
      key={section.id}
      value={`${section.section_code} ${section.section_name}`}
      onSelect={() => handleSelect(section.id)}
    >
      <Check
        className={cn("mr-2 h-4 w-4 shrink-0", value === section.id ? "opacity-100" : "opacity-0")}
      />
      <MapPin className="mr-1.5 h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      <span className="truncate">
        {section.section_code} — {section.section_name}
      </span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          type="button"
          className={cn(
            "w-full justify-between font-normal h-10 border-border/30 bg-muted/20 text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {selectedLabel || placeholder}
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
            {/* None option */}
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => handleSelect("__none__")}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground italic">No specific location</span>
              </CommandItem>
            </CommandGroup>

            {/* Recent locations */}
            {recentSections.length > 0 && (
              <CommandGroup heading={<span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Recent</span>}>
                {recentSections.map(renderItem)}
              </CommandGroup>
            )}

            {/* All / filtered locations */}
            {otherSections.length > 0 && (
              <CommandGroup heading={recentSections.length > 0 ? "All Locations" : undefined}>
                {otherSections.map(renderItem)}
              </CommandGroup>
            )}

            {!loading && filtered.length === 0 && !canCreate && (
              <CommandEmpty>No locations found.</CommandEmpty>
            )}

            {/* Create new */}
            {canCreate && (
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Create "{search.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
