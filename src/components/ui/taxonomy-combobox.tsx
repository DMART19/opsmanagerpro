import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

export interface TaxonomyOption {
  id: string;
  name: string;
}

interface TaxonomyComboboxProps {
  /** The Supabase table name (e.g., "manufacturers", "asset_statuses") */
  table: string;
  /** Current selected ID (FK value) */
  value: string | null;
  /** Called with the selected ID */
  onChange: (id: string | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the user_id column is required for insert/query */
  userScoped?: boolean;
  /** Allow creating new values inline */
  allowCreate?: boolean;
  /** Allow clearing (selecting "none") */
  allowClear?: boolean;
  /** Additional className for the trigger button */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ── Session-level cache shared across all instances ──
const taxonomyCache = new Map<string, { data: TaxonomyOption[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 100;
const DEBOUNCE_MS = 300;

function getCached(table: string): TaxonomyOption[] | null {
  const entry = taxonomyCache.get(table);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
  return null;
}

function setCache(table: string, data: TaxonomyOption[]) {
  taxonomyCache.set(table, { data, ts: Date.now() });
}

/** Clear all cached taxonomy data — call on auth changes to prevent cross-session leakage */
export function clearTaxonomyCache() {
  taxonomyCache.clear();
}

export const TaxonomyCombobox = ({
  table,
  value,
  onChange,
  placeholder = "Select...",
  userScoped = true,
  allowCreate = true,
  allowClear = true,
  className,
  disabled = false,
}: TaxonomyComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(false);
  const fetchedRef = useRef(false);
  const labelFetchedRef = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // Fetch a page of options, optionally filtered by search
  const fetchOptions = useCallback(async (searchTerm?: string, append = false) => {
    // Check cache for unfiltered full loads
    if (!searchTerm && !append) {
      const cached = getCached(table);
      if (cached) {
        setOptions(cached);
        setHasMore(false);
        setTotalLoaded(true);
        return;
      }
    }

    setLoading(true);
    try {
      // Get current user to enforce workspace-scoped queries
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = (supabase as any)
        .from(table)
        .select("id, name")
        .order("name", { ascending: true });

      // Enforce tenant isolation: only fetch data belonging to this user's workspace
      if (userScoped && user) {
        query = query.eq("user_id", user.id);
      } else if (!userScoped && user) {
        // For tables that use created_by instead of user_id
        query = query.eq("created_by", user.id);
      }

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      const offset = append ? options.length : 0;
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;

      // Deduplicate by name (keep first occurrence) to avoid duplicate dropdown entries
      const rawItems = (data || []) as TaxonomyOption[];
      const seenNames = new Set<string>();
      const items = rawItems.filter(item => {
        const lower = item.name.toLowerCase();
        if (seenNames.has(lower)) return false;
        seenNames.add(lower);
        return true;
      });
      const moreAvailable = rawItems.length === PAGE_SIZE;

      if (append) {
        setOptions(prev => {
          const merged = [...prev, ...items];
          if (!searchTerm && !moreAvailable) {
            setCache(table, merged);
            setTotalLoaded(true);
          }
          return merged;
        });
      } else {
        setOptions(items);
        if (!searchTerm && !moreAvailable) {
          setCache(table, items);
          setTotalLoaded(true);
        }
      }
      setHasMore(moreAvailable);
    } catch (err) {
      console.error(`Failed to fetch ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [table, options.length, userScoped]);

  // Fetch on first open (lazy load)
  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchOptions();
    }
  }, [open, fetchOptions]);

  // Fetch just the selected label on mount (single row, no full load)
  useEffect(() => {
    if (value && options.length === 0 && !fetchedRef.current && !labelFetchedRef.current) {
      labelFetchedRef.current = true;
      (async () => {
        try {
          const { data } = await (supabase as any)
            .from(table)
            .select("id, name")
            .eq("id", value)
            .maybeSingle();
          if (data) setOptions([data as TaxonomyOption]);
        } catch {}
      })();
    }
  }, [value, options.length, table]);

  // Server-side search when debounced value changes
  useEffect(() => {
    if (!open) return;
    if (totalLoaded) return; // All data cached, filter client-side
    if (debouncedSearch.trim()) {
      fetchOptions(debouncedSearch.trim());
    } else if (fetchedRef.current) {
      fetchOptions();
    }
  }, [debouncedSearch, open, totalLoaded]);

  // Client-side filter when all data is loaded
  const filtered = useMemo(() => {
    if (totalLoaded && search.trim()) {
      const term = search.toLowerCase().trim();
      return options.filter((o) => o.name.toLowerCase().includes(term));
    }
    return options;
  }, [options, search, totalLoaded]);

  // Check if search matches an existing option (case-insensitive)
  const exactMatch = useMemo(() => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return options.some((o) => o.name.toLowerCase() === term);
  }, [options, search]);

  const canCreate = allowCreate && search.trim().length > 0 && !exactMatch;

  // Load more handler
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchOptions(debouncedSearch.trim() || undefined, true);
    }
  };

  // Create new taxonomy value
  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;

    const existing = options.find(
      (o) => o.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      onChange(existing.id);
      setSearch("");
      setOpen(false);
      return;
    }

    setCreating(true);
    try {
      // Always fetch the current user so we can set created_by / user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        return;
      }

      let insertData: Record<string, any> = { name };

      if (userScoped) {
        insertData.user_id = user.id;
      } else {
        // For non-user-scoped tables (e.g. custom_categories) that track creator
        insertData.created_by = user.id;
      }

      const { data, error } = await (supabase as any)
        .from(table)
        .insert(insertData)
        .select("id, name")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error(`"${name}" already exists`);
          await fetchOptions();
          const found = options.find(
            (o) => o.name.toLowerCase() === name.toLowerCase()
          );
          if (found) onChange(found.id);
        } else {
          throw error;
        }
        return;
      }

      const newOption = data as TaxonomyOption;
      setOptions((prev) => [...prev, newOption].sort((a, b) => a.name.localeCompare(b.name)));
      // Invalidate cache so next open gets fresh data
      taxonomyCache.delete(table);
      onChange(newOption.id);
      setSearch("");
      setOpen(false);
      toast.success(`"${name}" created`);
    } catch (err: any) {
      toast.error(`Failed to create: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Current label
  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return options.find((o) => o.id === value)?.name || null;
  }, [value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            className
          )}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search${allowCreate ? " or create" : ""}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground italic">None</span>
                </CommandItem>
              )}
              {filtered.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onChange(option.id === value ? null : option.id);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
              {hasMore && (
                <CommandItem
                  onSelect={handleLoadMore}
                  className="text-muted-foreground justify-center"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Load more…"
                  )}
                </CommandItem>
              )}
            </CommandGroup>
            {loading && filtered.length === 0 && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && filtered.length === 0 && !canCreate && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  disabled={creating}
                  className="text-primary"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
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
