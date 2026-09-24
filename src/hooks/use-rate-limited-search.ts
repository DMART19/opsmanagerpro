/**
 * Hook that wraps a search callback with rate limiting.
 * Returns a rate-limited search function and blocked state.
 */
import { useState, useCallback, useRef } from "react";
import { checkActionLimit, recordActionAttempt } from "@/lib/rate-limit";

interface UseRateLimitedSearchOptions {
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
}

export function useRateLimitedSearch(options: UseRateLimitedSearchOptions = {}) {
  const { debounceMs = 300 } = options;
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const checkSearch = useCallback((): boolean => {
    const result = checkActionLimit("search");
    if (!result.allowed) {
      setIsBlocked(true);
      setBlockMessage(result.message);
      // Auto-clear after retry window
      setTimeout(() => {
        setIsBlocked(false);
        setBlockMessage("");
      }, result.retryAfterMs);
      return false;
    }
    recordActionAttempt("search");
    setIsBlocked(false);
    return true;
  }, []);

  /**
   * Wraps a search handler with debounce + rate limiting.
   * Returns a debounced function that only fires if under the limit.
   */
  const createDebouncedSearch = useCallback(
    <T extends (...args: any[]) => any>(searchFn: T) => {
      return (...args: Parameters<T>) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (checkSearch()) {
            searchFn(...args);
          }
        }, debounceMs);
      };
    },
    [checkSearch, debounceMs]
  );

  return { isBlocked, blockMessage, checkSearch, createDebouncedSearch };
}
