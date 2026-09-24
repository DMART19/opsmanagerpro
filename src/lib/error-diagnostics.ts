/**
 * Enhanced Error Diagnostics Engine
 * 
 * Provides deep root cause analysis, investigation steps,
 * affected component identification, and fix suggestions
 * based on error message patterns, stack traces, and metadata.
 */

export interface DiagnosticResult {
  likelyCause: string;
  suggestedFix: string;
  category: ErrorCategory;
  affectedComponent: string;
  investigationSteps: string[];
  severity: "critical" | "high" | "medium" | "low";
  relatedQuery: string | null;
}

export type ErrorCategory = "schema" | "permission" | "runtime" | "network" | "auth" | "config" | "storage" | "edge_function" | "unknown";

interface PatternRule {
  patterns: RegExp[];
  cause: string;
  fix: string;
  category: ErrorCategory;
  component: string;
  steps: string[];
  severity: DiagnosticResult["severity"];
  queryHint?: string;
}

const RULES: PatternRule[] = [
  // ─── Database Schema ───
  {
    patterns: [/function .+ does not exist/i, /Could not find the function/i, /rpc.*schema/i],
    cause: "RPC function missing or schema mismatch",
    fix: "Verify the RPC function exists in the database and parameter types match the call signature",
    category: "schema",
    component: "Database → RPC Functions",
    steps: [
      "Check the function name and parameter types in the migration files",
      "Verify the function exists by querying pg_proc",
      "Ensure the function is in the public schema",
      "Check for pending migrations that create or modify this function",
    ],
    severity: "high",
    queryHint: "SELECT proname, proargtypes FROM pg_proc WHERE proname ILIKE '%{fn}%'",
  },
  {
    patterns: [/column "?(\w+)"? does not exist/i, /42703/],
    cause: "Database column missing — query references a column not in the table schema",
    fix: "Run pending migrations or verify the column name in the query matches the actual schema",
    category: "schema",
    component: "Database → Table Schema",
    steps: [
      "Identify the table and column from the error message",
      "Check if a migration was created but not applied",
      "Verify column name spelling matches between code and schema",
      "Look for recent schema changes that may have renamed or removed the column",
    ],
    severity: "high",
    queryHint: "SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'",
  },
  {
    patterns: [/relation "?(\w+)"? does not exist/i, /42P01/],
    cause: "Database table or view does not exist",
    fix: "Create the table via migration or verify the table name is spelled correctly",
    category: "schema",
    component: "Database → Tables",
    steps: [
      "Check if the table name is correct in the query",
      "Verify the table exists in the public schema",
      "Check for pending migrations that create this table",
      "Ensure the schema cache is refreshed if table was recently created",
    ],
    severity: "critical",
  },
  {
    patterns: [/violates foreign key constraint/i, /23503/],
    cause: "Foreign key reference to a non-existent record",
    fix: "Ensure referenced records exist before inserting, or check cascade rules on the constraint",
    category: "schema",
    component: "Database → Foreign Keys",
    steps: [
      "Identify which foreign key constraint is violated",
      "Check if the parent record exists in the referenced table",
      "Verify insertion order — parent records must be created first",
      "Consider adding ON DELETE CASCADE or SET NULL if appropriate",
    ],
    severity: "medium",
  },
  {
    patterns: [/duplicate key value violates unique constraint/i, /23505/],
    cause: "Duplicate record insertion attempted — unique constraint violation",
    fix: "Use upsert (ON CONFLICT) or check for existing records before inserting",
    category: "schema",
    component: "Database → Unique Constraints",
    steps: [
      "Identify which unique constraint was violated",
      "Check if the insert logic should use ON CONFLICT DO UPDATE",
      "Verify the application isn't accidentally sending duplicate requests",
      "Check for race conditions in concurrent operations",
    ],
    severity: "medium",
  },
  {
    patterns: [/violates not-null constraint/i, /23502/],
    cause: "Required column was given a NULL value",
    fix: "Ensure all required fields are populated before insert/update, or add a default value",
    category: "schema",
    component: "Database → Column Constraints",
    steps: [
      "Identify which column has the NOT NULL violation",
      "Check the form/mutation code to ensure the field is being set",
      "Consider adding a DEFAULT value to the column if appropriate",
      "Verify the data pipeline isn't stripping required fields",
    ],
    severity: "medium",
  },
  {
    patterns: [/API \[42\d{3}\]/i],
    cause: "PostgreSQL syntax or constraint error (42xxx class)",
    fix: "Review the SQL query for syntax errors, missing columns, or constraint violations",
    category: "schema",
    component: "Database → SQL Queries",
    steps: [
      "Parse the Postgres error code (42xxx = syntax/access errors)",
      "Check the specific column or function referenced in the error",
      "Verify the query syntax matches the current schema",
      "Run the query manually to get detailed error output",
    ],
    severity: "high",
    queryHint: "Check pg_stat_activity for the failing query",
  },

  // ─── Permission / RLS ───
  {
    patterns: [/new row violates row-level security/i, /42501/],
    cause: "Row-level security policy blocking the insert/update operation",
    fix: "Review RLS policies for the affected table — ensure WITH CHECK clause permits this user's data",
    category: "permission",
    component: "Database → RLS Policies",
    steps: [
      "Identify which table's RLS is blocking the operation",
      "Check if user_id is being set correctly in the insert",
      "Verify the RLS policy's WITH CHECK clause for INSERT/UPDATE",
      "Ensure auth.uid() matches the user_id being inserted",
      "Check if the user is authenticated (not anonymous)",
    ],
    severity: "high",
  },
  {
    patterns: [/permission denied/i, /insufficient_privilege/i],
    cause: "Database permission denied — user role lacks required privilege",
    fix: "Grant the necessary permission to the authenticated role or fix the security definer function",
    category: "permission",
    component: "Database → Role Permissions",
    steps: [
      "Check which operation (SELECT/INSERT/UPDATE/DELETE) was denied",
      "Verify the table has appropriate GRANT statements for the authenticated role",
      "If using security definer functions, verify they exist and are accessible",
    ],
    severity: "high",
  },

  // ─── Authentication ───
  {
    patterns: [/JWT expired/i, /invalid.*token/i, /token.*expired/i],
    cause: "Authentication token expired or invalid — session needs refresh",
    fix: "The Supabase client should auto-refresh; check if autoRefreshToken is enabled",
    category: "auth",
    component: "Auth → Session Management",
    steps: [
      "Check if the user's session is stale (tab left open too long)",
      "Verify autoRefreshToken: true in Supabase client config",
      "Check if localStorage is being cleared unexpectedly",
      "Look for concurrent tabs causing token conflicts",
    ],
    severity: "medium",
  },
  {
    patterns: [/401/],
    cause: "HTTP 401 Unauthorized — request lacks valid authentication",
    fix: "Verify the authorization header includes a valid Bearer token",
    category: "auth",
    component: "Auth → API Authorization",
    steps: [
      "Check if the user is logged in when making this request",
      "Verify the Supabase client is sending the auth header",
      "Check if edge function verify_jwt settings are correct",
      "Look for session expiration or logout race conditions",
    ],
    severity: "high",
  },
  {
    patterns: [/auth.*fail/i, /login.*fail/i, /invalid.*credentials/i],
    cause: "Authentication failure — invalid email or password",
    fix: "Verify user credentials or check email confirmation status",
    category: "auth",
    component: "Auth → Login Flow",
    steps: [
      "Check if the user's email is confirmed",
      "Verify the user exists in auth.users",
      "Check for rate limiting on auth endpoints",
      "Review for brute-force attempt patterns",
    ],
    severity: "low",
  },
  {
    patterns: [/email not confirmed/i],
    cause: "User email has not been verified",
    fix: "User needs to check their inbox for the confirmation email, or admin can auto-confirm",
    category: "auth",
    component: "Auth → Email Verification",
    steps: [
      "Check if the confirmation email was sent successfully",
      "Verify email provider settings are correct",
      "Consider enabling auto-confirm if appropriate for the use case",
    ],
    severity: "low",
  },

  // ─── Runtime / React ───
  {
    patterns: [/Cannot read propert/i, /is not a function/i, /undefined is not/i, /null is not/i],
    cause: "Null or undefined reference — accessing a property on a missing value",
    fix: "Add null checks or optional chaining (?.) before accessing the property",
    category: "runtime",
    component: "Frontend → Component Logic",
    steps: [
      "Find the exact line from the stack trace",
      "Check if the data is loaded before rendering (loading state)",
      "Add optional chaining (?.) or nullish coalescing (??) operators",
      "Verify the data query isn't returning undefined during re-renders",
    ],
    severity: "medium",
  },
  {
    patterns: [/Maximum update depth exceeded/i, /Too many re-renders/i],
    cause: "React infinite rendering loop — state update triggering re-render endlessly",
    fix: "Check useEffect dependencies and ensure state updates don't trigger the same effect",
    category: "runtime",
    component: "Frontend → React Lifecycle",
    steps: [
      "Find the component from the stack trace",
      "Check useEffect hooks for missing or incorrect dependency arrays",
      "Look for setState calls inside render (without useEffect)",
      "Check for object/array references that change every render in deps",
    ],
    severity: "high",
  },
  {
    patterns: [/chunk.*fail/i, /dynamically imported module/i, /loading.*module/i, /preloadError/i],
    cause: "Code-splitting chunk failed to load — stale deployment or network issue",
    fix: "User should refresh the page; if persistent, check deployment for missing chunks",
    category: "network",
    component: "Frontend → Code Splitting",
    steps: [
      "Check if a new deployment invalidated old chunk hashes",
      "Verify the CDN/hosting is serving all chunk files",
      "Consider adding a service worker for offline fallbacks",
      "Add a global handler to auto-refresh on chunk load failures",
    ],
    severity: "low",
  },

  // ─── Network / API ───
  {
    patterns: [/Failed to fetch/i, /NetworkError/i, /ERR_CONNECTION/i],
    cause: "Network connectivity issue — request could not reach the server",
    fix: "Check network connectivity; may be a transient issue if the user's connection dropped",
    category: "network",
    component: "Network → Connectivity",
    steps: [
      "Check if the error is intermittent (network flap) or persistent",
      "Verify the API server is reachable",
      "Check for DNS resolution issues",
      "Look for VPN/firewall blocking requests",
    ],
    severity: "low",
  },
  {
    patterns: [/CORS/i, /cross-origin/i, /blocked by CORS/i],
    cause: "CORS misconfiguration — browser blocking cross-origin request",
    fix: "Add proper CORS headers to the API/edge function response",
    category: "network",
    component: "API → CORS Configuration",
    steps: [
      "Check the edge function includes Access-Control-Allow-Origin header",
      "Verify the OPTIONS preflight handler is implemented",
      "Ensure the allowed headers list includes all required headers",
      "Check if the origin domain matches the allowed origins",
    ],
    severity: "high",
  },
  {
    patterns: [/timeout/i, /ETIMEDOUT/i, /504/],
    cause: "Request timed out — server took too long to respond",
    fix: "Optimize the query, increase timeout limits, or check server load",
    category: "network",
    component: "API → Performance",
    steps: [
      "Identify the slow endpoint from the error context",
      "Check for unoptimized database queries (missing indexes)",
      "Look for N+1 query patterns in the endpoint logic",
      "Check server resource utilization during the timeout",
    ],
    severity: "high",
    queryHint: "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10",
  },
  {
    patterns: [/429|rate.?limit/i, /too many requests/i],
    cause: "API rate limit exceeded — too many requests in a short period",
    fix: "Reduce request frequency, implement debouncing, or increase rate limit thresholds",
    category: "network",
    component: "API → Rate Limiting",
    steps: [
      "Identify which endpoint is being rate-limited",
      "Check if the client is making redundant requests",
      "Implement request debouncing or throttling",
      "Consider increasing the rate limit for this endpoint",
    ],
    severity: "medium",
  },
  {
    patterns: [/500|Internal Server Error/i],
    cause: "Server-side internal error — unhandled exception in backend code",
    fix: "Check edge function logs for detailed error information",
    category: "network",
    component: "API → Edge Functions",
    steps: [
      "Check edge function logs for the specific error",
      "Verify all required secrets/environment variables are set",
      "Look for unhandled promise rejections in the function code",
      "Check for database connection issues in the function",
    ],
    severity: "high",
  },

  // ─── PostgREST / Config ───
  {
    patterns: [/API \[PGRST/i, /PostgREST/i, /PGRST\d+/],
    cause: "PostgREST API configuration issue — schema cache or permission problem",
    fix: "Verify table exists, schema cache is up to date, and API permissions are correct",
    category: "config",
    component: "API → PostgREST",
    steps: [
      "Check the specific PGRST error code for details",
      "Verify the table/view is in the exposed schema",
      "Refresh the schema cache if a new table/column was added",
      "Check the API role's permissions on the affected table",
    ],
    severity: "high",
  },

  // ─── Storage ───
  {
    patterns: [/storage.*bucket/i, /bucket.*not found/i, /storage.*policy/i],
    cause: "Storage bucket missing or access policy blocking the operation",
    fix: "Verify the storage bucket exists and has appropriate access policies",
    category: "storage",
    component: "Storage → Buckets",
    steps: [
      "Check if the storage bucket exists",
      "Verify storage policies allow the operation for this user",
      "Check if the file path is correctly formatted",
      "Ensure the user has the correct role for the bucket's policies",
    ],
    severity: "medium",
  },

  // ─── Edge Functions ───
  {
    patterns: [/edge.*function/i, /function.*invoke/i, /functions\/v1/i],
    cause: "Edge function invocation error",
    fix: "Check edge function deployment status and logs for detailed errors",
    category: "edge_function",
    component: "Backend → Edge Functions",
    steps: [
      "Check edge function logs for the specific error",
      "Verify the function is deployed and accessible",
      "Check all required secrets are configured",
      "Test the function directly with curl",
    ],
    severity: "high",
  },

  // ─── User-facing / Toast ───
  {
    patterns: [/Toast Error.*limit/i, /limit reached/i],
    cause: "Usage or plan limit reached — user action was blocked by billing constraints",
    fix: "User needs to upgrade their plan or the admin can adjust limits",
    category: "config",
    component: "Billing → Plan Limits",
    steps: [
      "Check which limit was hit (assets, team members, etc.)",
      "Review the user's current plan and usage in workspace_plans",
      "Determine if the limit is correct or needs adjustment",
    ],
    severity: "low",
  },
  {
    patterns: [/Toast Error.*save|update|create|delete/i],
    cause: "CRUD operation failed — user-facing action was rejected",
    fix: "Check database constraints, RLS policies, and required field validation",
    category: "runtime",
    component: "Frontend → Data Operations",
    steps: [
      "Check the specific operation that failed",
      "Verify RLS policies permit this user's operation",
      "Check for required fields that may be missing",
      "Look for constraint violations in the database logs",
    ],
    severity: "medium",
  },
];

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  schema: "Database Schema",
  permission: "Permission / RLS",
  runtime: "Runtime Error",
  network: "Network / API",
  auth: "Authentication",
  config: "Configuration",
  storage: "File Storage",
  edge_function: "Edge Function",
  unknown: "Unknown",
};

export function diagnoseError(message: string, stackTrace?: string | null, metadata?: {
  api_endpoint?: string | null;
  api_status_code?: number | null;
  page_route?: string | null;
  request_method?: string | null;
  hit_count?: number;
}): DiagnosticResult {
  const combined = `${message} ${stackTrace || ""} ${metadata?.api_endpoint || ""}`;
  
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(combined))) {
      // Extract potential query hint with interpolated values
      let relatedQuery = rule.queryHint || null;
      if (relatedQuery) {
        // Try to extract table/function names from the message
        const fnMatch = message.match(/function "?(\w+)"?/i);
        const tableMatch = message.match(/relation "?(\w+)"?/i) || message.match(/table "?(\w+)"?/i);
        if (fnMatch) relatedQuery = relatedQuery.replace("{fn}", fnMatch[1]);
        if (tableMatch) relatedQuery = relatedQuery.replace("{table}", tableMatch[1]);
      }

      // Boost severity for high-frequency errors
      let effectiveSeverity = rule.severity;
      if (metadata?.hit_count && metadata.hit_count >= 20 && effectiveSeverity !== "critical") {
        effectiveSeverity = effectiveSeverity === "high" ? "critical" : "high";
      }

      return {
        likelyCause: rule.cause,
        suggestedFix: rule.fix,
        category: rule.category,
        affectedComponent: rule.component,
        investigationSteps: rule.steps,
        severity: effectiveSeverity,
        relatedQuery,
      };
    }
  }

  return {
    likelyCause: "Unclassified application error",
    suggestedFix: "Review the stack trace and error message for more context",
    category: "unknown",
    affectedComponent: "Unknown",
    investigationSteps: [
      "Review the full error message and stack trace",
      "Check the page route where the error occurred",
      "Look for related errors with similar patterns",
      "Check recent code changes that may have introduced the issue",
    ],
    severity: "medium",
    relatedQuery: null,
  };
}

export function getCategoryLabel(category: ErrorCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategoryColor(category: ErrorCategory): string {
  switch (category) {
    case "schema": return "text-purple-600 bg-purple-500/10 border-purple-500/30";
    case "permission": return "text-orange-600 bg-orange-500/10 border-orange-500/30";
    case "runtime": return "text-red-600 bg-red-500/10 border-red-500/30";
    case "network": return "text-yellow-600 bg-yellow-500/10 border-yellow-500/30";
    case "auth": return "text-blue-600 bg-blue-500/10 border-blue-500/30";
    case "config": return "text-cyan-600 bg-cyan-500/10 border-cyan-500/30";
    case "storage": return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
    case "edge_function": return "text-pink-600 bg-pink-500/10 border-pink-500/30";
    default: return "text-muted-foreground bg-muted/50 border-border";
  }
}
