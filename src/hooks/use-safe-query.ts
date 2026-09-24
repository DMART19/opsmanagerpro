import { useCallback, useState } from "react";
import { PostgrestError } from "@supabase/supabase-js";
import { 
  executeSafeQuery, 
  QueryResult, 
  QueryError,
  RetryConfig 
} from "@/lib/query-validator";

export type UseSafeQueryOptions = {
  context?: string;
  showToast?: boolean;
  retryConfig?: Partial<RetryConfig>;
  onSuccess?: (data: any) => void;
  onError?: (error: QueryError) => void;
};

/**
 * Hook for executing safe queries with validation and error handling
 */
export function useSafeQuery<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<QueryError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (
      queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
      options: UseSafeQueryOptions = {}
    ): Promise<QueryResult<T>> => {
      setLoading(true);
      setError(null);

      const result = await executeSafeQuery<T>(queryFn, {
        context: options.context,
        showToast: options.showToast,
        retryConfig: options.retryConfig,
      });

      setLoading(false);
      setError(result.error);
      setData(result.data);

      if (result.error && options.onError) {
        options.onError(result.error);
      } else if (result.data && options.onSuccess) {
        options.onSuccess(result.data);
      }

      return result;
    },
    []
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}

/**
 * Hook for executing safe mutations (insert, update, delete)
 */
export function useSafeMutation<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<QueryError | null>(null);

  const mutate = useCallback(
    async (
      mutateFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
      options: UseSafeQueryOptions & { params?: Record<string, any> } = {}
    ): Promise<QueryResult<T>> => {
      setLoading(true);
      setError(null);

      const result = await executeSafeQuery<T>(mutateFn, {
        context: options.context,
        params: options.params,
        showToast: options.showToast ?? true, // Show toast by default for mutations
        retryConfig: options.retryConfig,
      });

      setLoading(false);
      setError(result.error);

      if (result.error && options.onError) {
        options.onError(result.error);
      } else if (result.data && options.onSuccess) {
        options.onSuccess(result.data);
      }

      return result;
    },
    []
  );

  return {
    mutate,
    loading,
    error,
  };
}
