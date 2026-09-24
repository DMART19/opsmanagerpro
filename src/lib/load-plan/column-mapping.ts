import type { ColumnKey, ColumnMapping, ParsedRow } from "./types";

/** Field synonyms used for auto-mapping. Lowercased, stripped of punctuation. */
const SYNONYMS: Record<ColumnKey, string[]> = {
  name: ["name", "item", "itemname", "description", "product", "title", "desc"],
  quantity: ["quantity", "qty", "count", "units", "pieces", "pcs", "amount"],
  weight: ["weight", "wt", "lbs", "pounds", "kg", "kilos", "mass"],
  length: ["length", "len", "long", "l", "depth", "d"],
  width: ["width", "wid", "w"],
  height: ["height", "hgt", "tall", "h"],
  volume: ["volume", "cube", "cubic", "vol", "ft3", "cuft"],
  sku: ["sku", "partnumber", "partno", "code", "id", "barcode", "upc"],
  category: ["category", "cat", "type", "class", "group"],
  stackable: ["stackable", "stack", "canstack"],
  fragile: ["fragile", "delicate", "handlewithcare"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function autoMapColumns(headers: string[]): ColumnMapping {
  const normed = headers.map((h) => ({ raw: h, n: norm(h) }));
  const out: ColumnMapping = {};
  (Object.keys(SYNONYMS) as ColumnKey[]).forEach((field) => {
    const candidates = SYNONYMS[field];
    // Exact match first
    let hit = normed.find((h) => candidates.includes(h.n));
    // Partial (contains)
    if (!hit) hit = normed.find((h) => candidates.some((c) => h.n.includes(c) && c.length >= 3));
    out[field] = hit ? hit.raw : null;
  });
  return out;
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function toBool(v: unknown): boolean | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["y", "yes", "true", "1", "t"].includes(s)) return true;
  if (["n", "no", "false", "0", "f"].includes(s)) return false;
  return undefined;
}

/** Apply a mapping to raw spreadsheet rows. Returns normalized ParsedRows (missing values
 *  remain as 0 / undefined so validation can flag them). */
export function applyMapping(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows.map((r, idx) => {
    const pick = (key: ColumnKey) => {
      const col = mapping[key];
      return col ? r[col] : undefined;
    };
    const name = String(pick("name") ?? "").trim();
    const qty = toNumber(pick("quantity")) ?? 1;
    const weight = toNumber(pick("weight")) ?? 0;
    const length = toNumber(pick("length")) ?? 0;
    const width = toNumber(pick("width")) ?? 0;
    const height = toNumber(pick("height")) ?? 0;
    const volume = toNumber(pick("volume"));
    return {
      id: `row-${idx}`,
      name: name || `Item ${idx + 1}`,
      quantity: Math.max(0, Math.round(qty)),
      weight,
      length,
      width,
      height,
      volume,
      sku: pick("sku") != null ? String(pick("sku")) : undefined,
      category: pick("category") != null ? String(pick("category")) : undefined,
      stackable: toBool(pick("stackable")),
      fragile: toBool(pick("fragile")),
      sourceRowIndex: idx + 2, // +1 header, +1 for 1-based
    };
  });
}