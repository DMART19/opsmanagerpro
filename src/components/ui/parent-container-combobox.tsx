import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Box, ChevronRight } from "lucide-react";
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

interface ContainerOption {
  id: string;
  box_number: string | null;
  description: string | null;
  container_id: string | null;
  section?: string | null;
}

interface ParentContainerComboboxProps {
  value: string;
  onChange: (value: string) => void;
  containers: ContainerOption[];
  placeholder?: string;
  className?: string;
}

/** Build a breadcrumb path for a container, walking up the parent chain */
const buildPath = (id: string, lookup: Map<string, ContainerOption>): string[] => {
  const path: string[] = [];
  let current = lookup.get(id);
  let safety = 6;
  while (current && safety-- > 0) {
    path.unshift(current.box_number || "Unnamed");
    current = current.container_id ? lookup.get(current.container_id) : undefined;
  }
  return path;
};

/** Compute nesting depth */
const getDepth = (id: string, lookup: Map<string, ContainerOption>): number => {
  let depth = 0;
  let current = lookup.get(id);
  let safety = 6;
  while (current?.container_id && safety-- > 0) {
    depth++;
    current = lookup.get(current.container_id);
  }
  return depth;
};

export const ParentContainerCombobox = ({
  value,
  onChange,
  containers,
  placeholder = "Parent container (optional)",
  className,
}: ParentContainerComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const lookup = useMemo(
    () => new Map(containers.map((c) => [c.id, c])),
    [containers]
  );

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const c = lookup.get(value);
    if (!c) return null;
    const path = buildPath(value, lookup);
    return path.join(" → ");
  }, [value, lookup]);

  const filtered = useMemo(() => {
    if (!search.trim()) return containers;
    const term = search.toLowerCase().trim();
    return containers.filter(
      (c) =>
        (c.box_number || "").toLowerCase().includes(term) ||
        (c.description || "").toLowerCase().includes(term) ||
        (c.section || "").toLowerCase().includes(term)
    );
  }, [containers, search]);

  // Sort: top-level first, then by name
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = getDepth(a.id, lookup);
      const db = getDepth(b.id, lookup);
      if (da !== db) return da - db;
      return (a.box_number || "").localeCompare(b.box_number || "");
    });
  }, [filtered, lookup]);

  const handleSelect = (id: string) => {
    onChange(id === "__none__" ? "" : id);
    setSearch("");
    setOpen(false);
  };

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
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or location…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => handleSelect("__none__")}>
                <Check
                  className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")}
                />
                <span className="text-muted-foreground italic">None (top-level)</span>
              </CommandItem>
            </CommandGroup>

            <CommandGroup>
              {sorted.map((c) => {
                const depth = getDepth(c.id, lookup);
                const path = buildPath(c.id, lookup);
                return (
                  <CommandItem
                    key={c.id}
                    value={`${c.box_number} ${c.description} ${c.section}`}
                    onSelect={() => handleSelect(c.id)}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div style={{ paddingLeft: `${depth * 12}px` }} className="flex items-center gap-1.5 min-w-0">
                        <Box className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="font-medium truncate">
                          {c.box_number || "Unnamed"}
                        </span>
                        {c.description && (
                          <span className="text-muted-foreground/60 truncate text-xs">
                            — {c.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {path.length > 1 && (
                      <div className="flex items-center gap-0.5 ml-6 text-[10px] text-muted-foreground/50" style={{ paddingLeft: `${depth * 12}px` }}>
                        {path.map((seg, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                            <span className={i === path.length - 1 ? "text-muted-foreground" : ""}>
                              {seg}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {filtered.length === 0 && (
              <CommandEmpty>No containers found.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
