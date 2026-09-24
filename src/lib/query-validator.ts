import { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { captureError } from "@/lib/error-capture";

export type QueryResult<T> = {
  data: T | null;
  error: QueryError | null;
  isLoading: boolean;
};

export type QueryError = {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  type: "database" | "network" | "validation" | "permission" | "unknown";
};

export type RetryConfig = {
  maxAttempts: number;
  delayMs: number;
  shouldRetry: (error: QueryError) => boolean;
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  shouldRetry: (error) => error.type === "network",
};

/**
 * Maps PostgreSQL error codes to user-friendly messages
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  "23505": "This record already exists. Please use a unique identifier.",
  "23503": "Referenced record not found. Please check your selection.",
  "23502": "Required field is missing. Please fill in all required fields.",
  "42P01": "Database table not found. Please contact support.",
  "42703": "Invalid field specified. Please refresh and try again.",
  "PGRST200": "Invalid relationship or foreign key. Please contact support.",
  "PGRST116": "Multiple records found when one was expected.",
  "PGRST204": "No matching records found.",
};

/**
 * Categorizes errors by type for better handling
 */
export const categorizeError = (error: PostgrestError | Error): QueryError => {
  // Handle PostgrestError (Supabase errors)
  if ("code" in error && "message" in error) {
    const pgError = error as PostgrestError;
    
    // Detect error type based on code and message
    let errorType: QueryError["type"] = "unknown";
    
    if (pgError.code?.startsWith("PGRST")) {
      errorType = "database";
    } else if (pgError.code?.startsWith("23")) {
      errorType = "validation";
    } else if (pgError.code === "42501" || pgError.message.includes("permission")) {
      errorType = "permission";
    } else if (pgError.message.includes("network") || pgError.message.includes("fetch")) {
      errorType = "network";
    }

    return {
      code: pgError.code || "UNKNOWN",
      message: pgError.message,
      details: pgError.details,
      hint: pgError.hint,
      type: errorType,
    };
  }

  // Handle generic JavaScript errors
  return {
    code: "JS_ERROR",
    message: error.message || "An unexpected error occurred",
    type: "unknown",
  };
};

/**
 * Gets a user-friendly error message
 */
export const getUserFriendlyMessage = (error: QueryError): string => {
  // Check for specific error code messages
  if (error.code && ERROR_CODE_MESSAGES[error.code]) {
    return ERROR_CODE_MESSAGES[error.code];
  }

  // Type-specific messages
  switch (error.type) {
    case "permission":
      return "You don't have permission to perform this action.";
    case "network":
      return "Network error. Please check your connection and try again.";
    case "validation":
      return "Invalid data provided. Please check your input.";
    case "database":
      return "Database error occurred. Please try again or contact support.";
    default:
      return error.message || "An unexpected error occurred.";
  }
};

/**
 * Logs errors to console with structured information
 */
export const logError = (error: QueryError, context?: string) => {
  console.error(`[QueryError${context ? ` - ${context}` : ""}]`, {
    code: error.code,
    type: error.type,
    message: error.message,
    details: error.details,
    hint: error.hint,
    timestamp: new Date().toISOString(),
  });

  // Capture to error_logs for admin visibility
  captureError({
    severity: error.type === "permission" ? "warn" : "error",
    message: `DB ${error.type} [${error.code}]${context ? ` (${context})` : ""}: ${error.message}`,
    stack_trace: error.details
      ? `Details: ${error.details}${error.hint ? `\nHint: ${error.hint}` : ""}`
      : undefined,
    api_endpoint: context || undefined,
    page_route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
};

/**
 * Shows a toast notification for errors
 */
export const showErrorToast = (error: QueryError, context?: string) => {
  const message = getUserFriendlyMessage(error);
  
  toast.error(context || "Operation Failed", {
    description: message,
    duration: 5000,
  });
};

/**
 * Delays execution for retry logic
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a query with retry logic and error handling
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  config: Partial<RetryConfig> = {}
): Promise<QueryResult<T>> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: QueryError | null = null;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      const { data, error } = await queryFn();

      if (error) {
        lastError = categorizeError(error);
        
        // Check if we should retry
        if (attempt < retryConfig.maxAttempts && retryConfig.shouldRetry(lastError)) {
          console.warn(`Query failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying...`);
          await delay(retryConfig.delayMs * attempt);
          continue;
        }

        // Log and return error
        logError(lastError, "executeWithRetry");
        return { data: null, error: lastError, isLoading: false };
      }

      return { data, error: null, isLoading: false };
    } catch (error) {
      lastError = categorizeError(error as Error);
      
      if (attempt < retryConfig.maxAttempts && retryConfig.shouldRetry(lastError)) {
        console.warn(`Query failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying...`);
        await delay(retryConfig.delayMs * attempt);
        continue;
      }

      logError(lastError, "executeWithRetry");
      return { data: null, error: lastError, isLoading: false };
    }
  }

  return { 
    data: null, 
    error: lastError || { code: "MAX_RETRIES", message: "Maximum retry attempts reached", type: "unknown" },
    isLoading: false 
  };
}

/**
 * Validates query parameters before execution
 */
export const validateQueryParams = (params: Record<string, any>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    // Check for null/undefined in required fields
    if (value === null || value === undefined) {
      errors.push(`${key} is required but was ${value === null ? "null" : "undefined"}`);
    }

    // Check for empty strings
    if (typeof value === "string" && value.trim() === "") {
      errors.push(`${key} cannot be an empty string`);
    }

    // Check for invalid UUIDs (basic check)
    if (key.includes("_id") && typeof value === "string") {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        errors.push(`${key} is not a valid UUID: ${value}`);
      }
    }

    // Check for invalid dates
    if (key.includes("date") && value instanceof Date && isNaN(value.getTime())) {
      errors.push(`${key} is an invalid date`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Safe query executor with validation
 */
export async function executeSafeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    context?: string;
    params?: Record<string, any>;
    showToast?: boolean;
    retryConfig?: Partial<RetryConfig>;
  } = {}
): Promise<QueryResult<T>> {
  const { context, params, showToast = true, retryConfig } = options;

  // Validate parameters if provided
  if (params) {
    const validation = validateQueryParams(params);
    if (!validation.valid) {
      const error: QueryError = {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: validation.errors.join("; "),
        type: "validation",
      };
      
      logError(error, context);
      if (showToast) showErrorToast(error, context);
      
      return { data: null, error, isLoading: false };
    }
  }

  // Execute query with retry logic
  const result = await executeWithRetry(queryFn, retryConfig);

  // Show toast if error occurred
  if (result.error && showToast) {
    showErrorToast(result.error, context);
  }

  return result;
}
