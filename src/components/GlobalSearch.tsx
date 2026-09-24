import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Package, Archive, Users, CalendarCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useMobileSearch } from "@/contexts/MobileSearchContext";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: "item" | "container" | "team" | "task";
}

const typeConfig = {
  item: { icon: Package, label: "Item", color: "text-blue-500" },
  container: { icon: Archive, label: "Container", color: "text-amber-500" },
  team: { icon: Users, label: "Team", color: "text-green-500" },
  task: { icon: CalendarCheck, label: "Task", color: "text-purple-500" },
};

type PageContext = "assets" | "team" | "calendar" | "general";

function getPageContext(pathname: string): PageContext {
  if (pathname.startsWith("/inventory")) return "assets";
  if (pathname.startsWith("/people")) return "team";
  if (pathname.startsWith("/calendar")) return "calendar";
  return "general";
}

function getPlaceholder(ctx: PageContext, isMobile: boolean): string {
  if (!isMobile) return "Search items, containers, team…";
  switch (ctx) {
    case "assets": return "Search items or containers…";
    case "team": return "Search team members…";
    case "calendar": return "Search tasks…";
    default: return "Search…";
  }
}

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mobileSearch = useMobileSearch();

  const pageCtx = getPageContext(location.pathname);

  // Sync page context to mobile search provider
  useEffect(() => {
    mobileSearch.setPageContext(pageCtx);
  }, [pageCtx]);

  // On mobile, broadcast query to page-level filters
  useEffect(() => {
    if (isMobile) {
      mobileSearch.setQuery(query);
    }
  }, [query, isMobile]);

  // Reset query on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setQuery("");
      setResults([]);
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const term = `%${q.trim()}%`;
    const ctx = getPageContext(location.pathname);
    const onMobile = window.innerWidth < 768;

    try {
      // On mobile, only search the current page's data type
      const shouldSearchItems = !onMobile || ctx === "assets" || ctx === "general";
      const shouldSearchContainers = !onMobile || ctx === "assets" || ctx === "general";
      const shouldSearchTeam = !onMobile || ctx === "team" || ctx === "general";
      const shouldSearchTasks = !onMobile || ctx === "calendar" || ctx === "general";

      const [itemsRes, boxesRes, empRes, tasksRes] = await Promise.all([
        shouldSearchItems
          ? supabase.from("cache_inventory").select("id, description, asset_type, box_number, category_ref:category_id(name), asset_status:asset_status_id(name)").eq("asset_type", "item").ilike("description", term).limit(5)
          : Promise.resolve({ data: [] }),
        shouldSearchContainers
          ? supabase.from("cache_inventory").select("id, description, box_number, asset_type, container_type_ref:container_type_id(name), container_status_ref:container_status_id(name)").eq("asset_type", "container").or(`box_number.ilike.${term},description.ilike.${term}`).limit(5)
          : Promise.resolve({ data: [] }),
        shouldSearchTeam
          ? supabase.from("employees").select("id, first_name, last_name, position").or(`first_name.ilike.${term},last_name.ilike.${term}`).limit(5)
          : Promise.resolve({ data: [] }),
        shouldSearchTasks
          ? supabase.from("tasks").select("id, title, status").ilike("title", term).limit(5)
          : Promise.resolve({ data: [] }),
      ]);

      const mapped: SearchResult[] = [
        ...(itemsRes.data || []).map((i: any) => ({ id: i.id, label: i.description || "Unnamed Item", sublabel: i.category_ref?.name || i.asset_status?.name || undefined, type: "item" as const })),
        ...(boxesRes.data || []).map((b: any) => ({ id: b.id, label: b.box_number || b.description || "Container", sublabel: b.container_type_ref?.name || undefined, type: "container" as const })),
        ...(empRes.data || []).map((e: any) => ({ id: e.id, label: `${e.first_name} ${e.last_name}`, sublabel: e.position || undefined, type: "team" as const })),
        ...(tasksRes.data || []).map((t: any) => ({ id: t.id, label: t.title, sublabel: t.status || undefined, type: "task" as const })),
      ];
      setResults(mapped);
      setSelectedIndex(0);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 200);
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    switch (result.type) {
      case "item":
        navigate(`/inventory?highlight=${result.id}`);
        break;
      case "container":
        navigate(`/inventory?highlight=${result.id}`);
        break;
      case "team":
        navigate(`/people?highlight=${result.id}`);
        break;
      case "task":
        navigate(`/calendar?task=${result.id}`);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const placeholder = getPlaceholder(pageCtx, isMobile);

  return (
    <div ref={containerRef} className={cn("relative", isMobile ? "flex-1" : "w-64 xl:w-72")}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-8 pr-8 h-9 text-sm bg-nav-foreground/5 border-nav-foreground/10 text-nav-foreground placeholder:text-nav-foreground/40",
            "focus-visible:ring-primary/30 focus-visible:border-primary/50 rounded-lg",
            isMobile && "h-10 text-base"
          )}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 text-nav-foreground/50 hover:text-nav-foreground hover:bg-transparent"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Results dropdown — on mobile in-page contexts, don't show dropdown (filtering happens inline) */}
      {open && query.trim() && !(isMobile && pageCtx !== "general") && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border/50 rounded-lg shadow-lg overflow-hidden z-[100] max-h-[360px] overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
          )}
          {results.map((result, i) => {
            const cfg = typeConfig[result.type];
            const Icon = cfg.icon;
            return (
              <button
                key={`${result.type}-${result.id}`}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors cursor-pointer",
                  i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                )}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.label}</div>
                  {result.sublabel && (
                    <div className="text-xs text-muted-foreground truncate">{result.sublabel}</div>
                  )}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground shrink-0">
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
