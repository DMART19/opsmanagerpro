import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFieldValue, tokenize } from "@/lib/normalize";

type SuggestableField = "description" | "section" | "model_part_num" | "serial_number" | "barcode";

const FIELD_COLUMN_MAP: Record<SuggestableField, string> = {
  description: "description",
  section: "section",
  model_part_num: "model_part_num",
  serial_number: "serial_number",
  barcode: "barcode",
};

export interface SmartSuggestion {
  /** The display value the user sees */
  display: string;
  /** The normalized canonical value to insert */
  canonical: string;
  /** Compact normalized form for matching */
  normalized: string;
  /** How many assets use this exact value */
  count: number;
  /** Whether this is the recommended (most-used) canonical form */
  recommended: boolean;
  /** Match tier: 1 = exact/normalized, 2 = synonym/grouped, 3 = fuzzy */
  tier: number;
}

/** Two values are "synonyms" if their token sets overlap ≥ 70 % */
const areSynonyms = (a: string, b: string): boolean => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const minSize = Math.min(ta.size, tb.size);
  return overlap / minSize >= 0.7;
};

interface RawEntry { value: string; count: number; normalized: string }

/**
 * Build canonical groups from raw entries.
 * Within each group the entry with the highest count becomes the canonical form.
 */
const buildGroups = (entries: RawEntry[]): Map<string, { canonical: string; members: RawEntry[] }> => {
  const groups: { canonical: string; members: RawEntry[] }[] = [];

  for (const entry of entries) {
    let placed = false;
    for (const g of groups) {
      const gNorm = normalizeFieldValue(g.canonical);
      if (
        entry.normalized === gNorm ||
        areSynonyms(entry.value, g.canonical)
      ) {
        g.members.push(entry);
        const best = g.members.reduce((a, b) => (b.count > a.count ? b : a));
        g.canonical = best.value;
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ canonical: entry.value, members: [entry] });
    }
  }

  const map = new Map<string, { canonical: string; members: RawEntry[] }>();
  for (const g of groups) {
    for (const m of g.members) {
      map.set(m.value, g);
    }
  }
  return map;
};

/**
 * Returns smart suggestions for a given inventory field.
 */
export const useFieldSuggestions = (field: SuggestableField): SmartSuggestion[] => {
  const column = FIELD_COLUMN_MAP[field];

  const { data: suggestions = [] } = useQuery<SmartSuggestion[]>({
    queryKey: ["field-suggestions-v2", field],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cache_inventory")
        .select(column)
        .not(column, "is", null)
        .limit(1000);

      if (error) throw error;
      if (!data) return [];

      // Count occurrences per exact value
      const countMap = new Map<string, number>();
      for (const row of data) {
        const val = ((row as any)[column] as string)?.trim();
        if (!val) continue;
        countMap.set(val, (countMap.get(val) || 0) + 1);
      }

      const entries: RawEntry[] = Array.from(countMap.entries()).map(([value, count]) => ({
        value,
        count,
        normalized: normalizeFieldValue(value),
      }));

      // Sort by count desc so grouping picks the most common first
      entries.sort((a, b) => b.count - a.count);

      const groupMap = buildGroups(entries);

      const result: SmartSuggestion[] = entries.map((e) => {
        const group = groupMap.get(e.value)!;
        return {
          display: e.value,
          canonical: group.canonical,
          normalized: e.normalized,
          count: e.count,
          recommended: e.value === group.canonical && group.members.length > 1,
          tier: e.value === group.canonical ? 1 : 2,
        };
      });

      result.sort((a, b) => {
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
        if (a.count !== b.count) return b.count - a.count;
        return a.display.localeCompare(b.display, undefined, { sensitivity: "base" });
      });

      return result;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  return suggestions;
};
