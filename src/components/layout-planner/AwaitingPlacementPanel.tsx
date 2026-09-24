import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, GripVertical, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpaceAllocation } from "./SpaceAllocationContext";

export const AwaitingPlacementPanel = () => {
  const { awaiting, selectedItem, setSelectedItem } = useSpaceAllocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [size, setSize] = useState<"small" | "medium" | "large" | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    awaiting.forEach((it) => { if (it.subcategory) set.add(it.subcategory); });
    return Array.from(set).sort().slice(0, 8);
  }, [awaiting]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return awaiting.filter((it) => {
      if (q) {
        const hay = `${it.description || ""} ${it.subcategory || ""} ${it.id_cache_fema || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category && it.subcategory !== category) return false;
      if (size) {
        const qty = it.quantity_available || 0;
        if (size === "small" && qty >= 10) return false;
        if (size === "medium" && (qty < 10 || qty > 50)) return false;
        if (size === "large" && qty <= 50) return false;
      }
      return true;
    });
  }, [awaiting, query, category, size]);

  return (
    <div className="flex flex-col h-full min-h-0 border-r bg-card">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Awaiting Placement</h3>
          <Badge variant="secondary" className="text-[10px]">{awaiting.length}</Badge>
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inventory…"
            className="h-9 pl-8 text-sm"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? null : c)}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1">
          {(["small", "medium", "large"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSize(size === s ? null : s)}
              className={cn(
                "flex-1 text-[11px] py-1 rounded border capitalize transition-colors",
                size === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <PackageSearch className="h-8 w-8 mx-auto opacity-60" />
            <p className="text-xs">
              {awaiting.length === 0 ? "All inventory placed." : "No matches."}
            </p>
          </div>
        ) : filtered.map((it) => {
          const isSelected = selectedItem?.id === it.id;
          return (
            <button
              key={it.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-inventory-id", it.id);
                e.dataTransfer.effectAllowed = "move";
                setSelectedItem(it);
              }}
              onClick={() => setSelectedItem(isSelected ? null : it)}
              className={cn(
                "w-full text-left flex items-start gap-2 p-2 rounded-md border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.description || "Untitled"}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {it.quantity_available || 0} available
                  </span>
                  {it.subcategory && (
                    <span className="text-[10px] text-muted-foreground">· {it.subcategory}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};