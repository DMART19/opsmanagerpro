# Query Validation Layer - Usage Guide

This guide explains how to use the comprehensive query validation layer to catch errors before they reach the UI.

## Overview

The validation layer provides:
- ✅ Automatic error handling and categorization
- ✅ User-friendly error messages with toast notifications
- ✅ Automatic retry logic for network errors
- ✅ Query parameter validation
- ✅ Structured error logging
- ✅ TypeScript support

## Quick Start

### 1. Using `useSafeQuery` Hook (Recommended)

```typescript
import { useSafeQuery } from "@/hooks/use-safe-query";
import { supabase } from "@/integrations/supabase/client";

function MyComponent() {
  const { execute, loading, error, data } = useSafeQuery<Staff[]>();

  useEffect(() => {
    execute(
      () => supabase.from("staff").select("*").order("created_at", { ascending: false }),
      {
        context: "Load Staff",
        showToast: true, // Show error toast automatically
        onSuccess: (data) => console.log("Loaded:", data),
        onError: (error) => console.error("Failed:", error),
      }
    );
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Render data */}</div>;
}
```

### 2. Using `useSafeMutation` Hook (For Insert/Update/Delete)

```typescript
import { useSafeMutation } from "@/hooks/use-safe-query";

function AddEmployeeForm() {
  const { mutate, loading, error } = useSafeMutation<Staff>();

  const handleSubmit = async (formData: any) => {
    const result = await mutate(
      () => supabase.from("staff").insert(formData).select(),
      {
        context: "Add Employee",
        params: formData, // Automatically validated
        showToast: true, // Shows success/error toast
        onSuccess: () => {
          console.log("Employee added!");
          // Refresh list, close modal, etc.
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### 3. Manual Error Handling

```typescript
import { executeSafeQuery, showErrorToast } from "@/lib/query-validator";

async function customQuery() {
  const result = await executeSafeQuery(
    () => supabase.from("staff").select("*"),
    {
      context: "Custom Query",
      showToast: false, // Disable automatic toast
    }
  );

  if (result.error) {
    // Custom error handling based on type
    if (result.error.type === "permission") {
      console.log("User lacks permissions");
      showErrorToast(result.error, "Access Denied");
    } else if (result.error.type === "validation") {
      console.log("Invalid data");
    }
    return;
  }

  console.log("Success:", result.data);
}
```

## Advanced Features

### Custom Retry Configuration

```typescript
const { execute } = useSafeQuery();

execute(
  () => supabase.from("staff").select("*"),
  {
    retryConfig: {
      maxAttempts: 5,
      delayMs: 2000,
      shouldRetry: (error) => 
        error.type === "network" || error.type === "unknown",
    },
  }
);
```

### Query Parameter Validation

The validation layer automatically checks:
- ✅ Non-null/undefined required fields
- ✅ Non-empty strings
- ✅ Valid UUID formats for `*_id` fields
- ✅ Valid date objects

```typescript
// This will validate before executing
mutate(
  () => supabase.from("staff").insert(data),
  {
    params: {
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      warehouse_id: "invalid-uuid", // ❌ Will fail validation
    },
  }
);
```

## Error Types

The validator categorizes errors into these types:

| Type | Description | Auto-Retry |
|------|-------------|------------|
| `database` | Database/schema errors (e.g., PGRST200) | ❌ No |
| `validation` | Constraint violations (e.g., 23502, 23503) | ❌ No |
| `permission` | RLS policy failures | ❌ No |
| `network` | Connection/fetch errors | ✅ Yes |
| `unknown` | Unclassified errors | ✅ Yes |

## User-Friendly Error Messages

The validator automatically translates error codes:

| Error Code | User Message |
|------------|--------------|
| 23505 | "This record already exists..." |
| 23503 | "Referenced record not found..." |
| 23502 | "Required field is missing..." |
| PGRST200 | "Invalid relationship or foreign key..." |
| PGRST116 | "Multiple records found when one was expected" |

## Error Boundary

All routes are wrapped with `<ErrorBoundary>` to catch React errors:

```typescript
// Already configured in App.tsx
<ErrorBoundary>
  <Routes>...</Routes>
</ErrorBoundary>
```

For custom fallback UI:

```typescript
import { withErrorBoundary } from "@/components/ErrorBoundary";

const SafeComponent = withErrorBoundary(MyComponent, <CustomFallback />);
```

## Best Practices

1. **Always use hooks for components**: `useSafeQuery` and `useSafeMutation` handle state automatically
2. **Provide context**: Always pass a `context` string for better error logging
3. **Show toasts for mutations**: Enable `showToast: true` for user feedback
4. **Validate complex forms**: Pass `params` to catch validation errors early
5. **Handle errors gracefully**: Use `onError` callbacks for custom error handling

## Migration Guide

### Before (Without Validation)

```typescript
const { data, error } = await supabase.from("staff").select("*");
if (error) {
  console.error(error);
  toast.error("Failed to load staff");
}
```

### After (With Validation)

```typescript
const { execute } = useSafeQuery();
await execute(
  () => supabase.from("staff").select("*"),
  { context: "Load Staff" }
);
// Error handling, toasts, and logging are automatic!
```

## API Reference

### `useSafeQuery<T>()`
Returns: `{ execute, loading, error, data, reset }`

### `useSafeMutation<T>()`
Returns: `{ mutate, loading, error }`

### `executeSafeQuery<T>(queryFn, options)`
Options:
- `context?: string` - Description for logging
- `params?: Record<string, any>` - Parameters to validate
- `showToast?: boolean` - Show error toast (default: true)
- `retryConfig?: RetryConfig` - Custom retry configuration

### `QueryError`
```typescript
{
  code: string;
  message: string;
  details?: string;
  hint?: string;
  type: "database" | "network" | "validation" | "permission" | "unknown";
}
```

## Examples in Codebase

Check these files for real-world usage:
- `src/hooks/use-staff.ts` - Can be refactored to use validation
- `src/hooks/use-checkouts.ts` - Can be refactored to use validation
- `src/components/people/AddEmployeeModal.tsx` - Perfect candidate for `useSafeMutation`

---

**Need Help?** Check console logs - all errors are logged with structured information including timestamps and context.
