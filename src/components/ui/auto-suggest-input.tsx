import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeFieldValue } from "@/lib/normalize";
import type { SmartSuggestion } from "@/hooks/use-field-suggestions";

interface AutoSuggestInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  suggestions: SmartSuggestion[];
  value: string;
  onChange: (value: string) => void;
  maxSuggestions?: number;
}

/**
 * Input with smart auto-suggestions. Shows recommended badge for canonical values.
 */
export const AutoSuggestInput = ({
  suggestions,
  value,
  onChange,
  maxSuggestions = 6,
  className,
  onKeyDown: externalKeyDown,
  ...inputProps
}: AutoSuggestInputProps) => {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!value || value.trim().length < 1) return [];
    const query = value.toLowerCase().trim();
    const queryNorm = normalizeFieldValue(value);

    const scored: { suggestion: SmartSuggestion; score: number }[] = [];
    for (const s of suggestions) {
      const lower = s.display.toLowerCase();
      if (lower === query) continue; // don't suggest exact match

      let score: number;

      // Check display text match
      if (lower.startsWith(query)) {
        score = s.tier;
      } else if (lower.includes(query)) {
        score = s.tier + 3;
      }
      // Check normalized match (e.g. ".9mm" query matches "9mm" normalized)
      else if (queryNorm && s.normalized.startsWith(queryNorm)) {
        score = s.tier + 1;
      } else if (queryNorm && s.normalized.includes(queryNorm)) {
        score = s.tier + 4;
      } else {
        continue;
      }

      if (s.recommended) score -= 0.5;
      scored.push({ suggestion: s, score });
    }

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.suggestion.count !== b.suggestion.count) return b.suggestion.count - a.suggestion.count;
      return a.suggestion.display.localeCompare(b.suggestion.display);
    });

    return scored.slice(0, maxSuggestions).map((s) => s.suggestion);
  }, [value, suggestions, maxSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setOpen(true);
      setHighlightIdx(-1);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (s: SmartSuggestion) => {
      // Insert the canonical (normalized) value
      onChange(s.canonical);
      setOpen(false);
      setHighlightIdx(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (open && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightIdx((i) => (i + 1) % filtered.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
          return;
        }
        if (e.key === "Enter" && highlightIdx >= 0) {
          e.preventDefault();
          handleSelect(filtered[highlightIdx]);
          return;
        }
        if (e.key === "Escape") {
          setOpen(false);
          return;
        }
      }
      externalKeyDown?.(e);
    },
    [open, filtered, highlightIdx, handleSelect, externalKeyDown]
  );

  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onFocus={() => {
          if (value && filtered.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={className}
        {...inputProps}
      />
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-48 overflow-y-auto">
          {filtered.map((s, i) => {
            const queryTrimmed = value.trim();
            const idx = s.display.toLowerCase().indexOf(queryTrimmed.toLowerCase());
            const before = idx >= 0 ? s.display.slice(0, idx) : s.display;
            const match = idx >= 0 ? s.display.slice(idx, idx + queryTrimmed.length) : "";
            const after = idx >= 0 ? s.display.slice(idx + queryTrimmed.length) : "";

            return (
              <button
                key={s.display}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm transition-colors min-h-[44px] flex items-center justify-between gap-2",
                  "hover:bg-accent/50 active:bg-accent/70",
                  i === highlightIdx && "bg-accent/60"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <span className="truncate">
                  {idx >= 0 ? (
                    <>
                      {before}
                      <span className="font-semibold text-primary">{match}</span>
                      {after}
                    </>
                  ) : (
                    s.display
                  )}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {s.recommended && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
                      ★
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {s.count}×
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
