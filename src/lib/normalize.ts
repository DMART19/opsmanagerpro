/**
 * Shared normalizer for consistent field value matching.
 * Produces a canonical lowercase string suitable for deduplication and grouping.
 *
 * Rules:
 *  - trim whitespace
 *  - lowercase
 *  - strip leading/trailing punctuation per token (e.g. ".9mm" → "9mm")
 *  - remove smart quotes
 *  - replace dashes/underscores/slashes with space
 *  - drop remaining non-alphanumeric (except spaces)
 *  - collapse whitespace
 *  - rejoin without spaces for compact form (e.g. "9 mm" → "9mm")
 */
export const normalizeFieldValue = (s: string): string => {
  let v = s.trim().toLowerCase();

  // smart quotes → nothing
  v = v.replace(/[''`""]/g, "");

  // dashes, underscores, slashes → space
  v = v.replace(/[-–—_/\\]/g, " ");

  // drop remaining non-alphanumeric (keep spaces & digits & letters)
  v = v.replace(/[^\w\s]/g, "");

  // collapse spaces
  v = v.replace(/\s+/g, " ").trim();

  // strip leading dots/punctuation that survived (edge case for ".9mm")
  v = v.replace(/^\.+/, "");

  // compact: remove internal spaces for short values (≤20 chars) to unify "9 mm" → "9mm"
  if (v.length <= 20) {
    v = v.replace(/\s+/g, "");
  }

  return v;
};

/**
 * Build a token set from a normalized string for synonym detection.
 */
export const tokenize = (s: string): Set<string> => {
  // For tokenization, keep spaces so we can split
  const expanded = s.trim().toLowerCase()
    .replace(/[''`""]/g, "")
    .replace(/[-–—_/\\]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return new Set(expanded.split(" ").filter(Boolean));
};
