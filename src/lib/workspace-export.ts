/**
 * Workspace Data Export — generates CSV or JSON exports for all operational data.
 * Runs client-side in chunks to avoid blocking the UI on large datasets.
 */

import { supabase } from "@/integrations/supabase/client";

export type ExportDataType =
  | "assets"
  | "containers"
  | "team_members"
  | "credentials"
  | "tasks"
  | "pallets";

export type ExportFormat = "csv" | "json";

interface ExportColumn {
  key: string;
  label: string;
}

// ─── Column definitions ───

const ASSET_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "description", label: "Description" },
  { key: "asset_type", label: "Type" },
  { key: "barcode", label: "Barcode" },
  { key: "serial_number", label: "Serial Number" },
  { key: "model_part_num", label: "Model/Part #" },
  { key: "quantity_available", label: "Qty Available" },
  { key: "quantity_out", label: "Qty Out" },
  { key: "section", label: "Section" },
  { key: "date_expire", label: "Expiration" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];

const CONTAINER_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "box_number", label: "Box Number" },
  { key: "box_description", label: "Description" },
  { key: "barcode", label: "Barcode" },
  { key: "item_count", label: "Item Count" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];

const TEAM_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "position", label: "Position" },
  { key: "employee_id", label: "Employee ID" },
  { key: "hire_date", label: "Hire Date" },
  { key: "base_location", label: "Location" },
  { key: "created_at", label: "Created" },
];

const CREDENTIAL_COLUMNS: ExportColumn[] = [
  { key: "employee_name", label: "Employee" },
  { key: "requirement_name", label: "Credential" },
  { key: "status", label: "Status" },
  { key: "issue_date", label: "Issue Date" },
  { key: "expire_date", label: "Expiration" },
  { key: "verified_at", label: "Verified At" },
  { key: "notes", label: "Notes" },
];

const TASK_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date" },
  { key: "completed_at", label: "Completed At" },
  { key: "created_at", label: "Created" },
];

const PALLET_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "pallet_id", label: "Pallet ID" },
  { key: "pallet_type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "current_weight", label: "Current Weight" },
  { key: "max_capacity", label: "Max Capacity" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];

const COLUMN_MAP: Record<ExportDataType, ExportColumn[]> = {
  assets: ASSET_COLUMNS,
  containers: CONTAINER_COLUMNS,
  team_members: TEAM_COLUMNS,
  credentials: CREDENTIAL_COLUMNS,
  tasks: TASK_COLUMNS,
  pallets: PALLET_COLUMNS,
};

// ─── Data Fetchers (paginated) ───

async function fetchAllPages(
  tableName: string,
  userId: string,
  userIdColumn: string = "user_id"
): Promise<any[]> {
  const allRows: any[] = [];
  const batchSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .eq(userIdColumn, userId)
      .range(from, from + batchSize - 1)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
    allRows.push(...(data || []));
    hasMore = (data?.length || 0) === batchSize;
    from += batchSize;
  }

  return allRows;
}

async function fetchCredentials(userId: string): Promise<any[]> {
  const allRows: any[] = [];
  const batchSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("employee_requirements")
      .select(`
        *,
        employees!inner(first_name, last_name, user_id),
        requirement_definitions(name)
      `)
      .eq("employees.user_id", userId)
      .range(from, from + batchSize - 1);

    if (error) throw new Error(`Failed to fetch credentials: ${error.message}`);

    const mapped = (data || []).map((r: any) => ({
      ...r,
      employee_name: `${r.employees?.first_name || ""} ${r.employees?.last_name || ""}`.trim(),
      requirement_name: r.requirement_definitions?.name || "",
    }));

    allRows.push(...mapped);
    hasMore = (data?.length || 0) === batchSize;
    from += batchSize;
  }

  return allRows;
}

// ─── Fetcher map ───

async function fetchExportData(
  dataType: ExportDataType,
  userId: string
): Promise<any[]> {
  switch (dataType) {
    case "assets":
      return fetchAllPages("cache_inventory", userId);
    case "containers":
      return fetchAllPages("cache_boxes", userId);
    case "team_members":
      return fetchAllPages("employees", userId);
    case "credentials":
      return fetchCredentials(userId);
    case "tasks":
      return fetchAllPages("tasks", userId);
    case "pallets":
      return fetchAllPages("pallets", userId, "created_by");
  }
}

// ─── Formatters ───

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: any[], columns: ExportColumn[]): string {
  const header = columns.map(c => escapeCSV(c.label)).join(",");
  const lines = rows.map(row =>
    columns.map(c => escapeCSV(row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
}

function toJSON(rows: any[], columns: ExportColumn[]): string {
  const clean = rows.map(row => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.label] = row[col.key] ?? null;
    }
    return obj;
  });
  return JSON.stringify(clean, null, 2);
}

// ─── Download helper ───

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Public API ───

export interface ExportProgress {
  phase: "fetching" | "formatting" | "complete" | "error";
  message: string;
  recordCount?: number;
}

export const DATA_TYPE_LABELS: Record<ExportDataType, string> = {
  assets: "Assets",
  containers: "Containers",
  team_members: "Team Members",
  credentials: "Credentials",
  tasks: "Calendar Tasks",
  pallets: "Pallet Layouts",
};

export async function exportWorkspaceData(
  dataType: ExportDataType,
  format: ExportFormat,
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  try {
    onProgress?.({ phase: "fetching", message: `Loading ${DATA_TYPE_LABELS[dataType]}…` });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Authentication required");

    const rows = await fetchExportData(dataType, userData.user.id);
    const columns = COLUMN_MAP[dataType];

    onProgress?.({
      phase: "formatting",
      message: `Formatting ${rows.length} records…`,
      recordCount: rows.length,
    });

    // Yield to UI thread for large datasets
    await new Promise(r => setTimeout(r, 0));

    const label = DATA_TYPE_LABELS[dataType].toLowerCase().replace(/\s+/g, "-");
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const content = toCSV(rows, columns);
      downloadBlob(content, `${label}-export-${timestamp}.csv`, "text/csv;charset=utf-8;");
    } else {
      const content = toJSON(rows, columns);
      downloadBlob(content, `${label}-export-${timestamp}.json`, "application/json");
    }

    // Log the export access event
    import("@/lib/log-data-access").then(m =>
      m.logDataAccess({ objectType: dataType === "tasks" ? "calendar_tasks" : dataType === "pallets" ? "pallet_layouts" : dataType as any, actionType: "export", metadata: { format, recordCount: rows.length } })
    );

    onProgress?.({
      phase: "complete",
      message: `Exported ${rows.length} ${DATA_TYPE_LABELS[dataType].toLowerCase()}`,
      recordCount: rows.length,
    });
  } catch (err: any) {
    onProgress?.({ phase: "error", message: err.message || "Export failed" });
    throw err;
  }
}

export async function exportAllWorkspaceData(
  format: ExportFormat,
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  const types: ExportDataType[] = ["assets", "containers", "team_members", "credentials", "tasks", "pallets"];
  const allData: Record<string, any[]> = {};

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Authentication required");

  let totalRecords = 0;

  for (const dataType of types) {
    onProgress?.({ phase: "fetching", message: `Loading ${DATA_TYPE_LABELS[dataType]}…` });
    const rows = await fetchExportData(dataType, userData.user.id);
    const columns = COLUMN_MAP[dataType];

    // Clean rows to only include labeled columns
    allData[DATA_TYPE_LABELS[dataType]] = rows.map(row => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.label] = row[col.key] ?? null;
      }
      return obj;
    });
    totalRecords += rows.length;
  }

  onProgress?.({ phase: "formatting", message: `Formatting ${totalRecords} total records…`, recordCount: totalRecords });
  await new Promise(r => setTimeout(r, 0));

  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const content = JSON.stringify(allData, null, 2);
    downloadBlob(content, `workspace-full-export-${timestamp}.json`, "application/json");
  } else {
    // For CSV, combine into separate sections
    let combined = "";
    for (const [section, rows] of Object.entries(allData)) {
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      combined += `\n--- ${section} (${rows.length} records) ---\n`;
      combined += columns.map(escapeCSV).join(",") + "\n";
      combined += rows.map(r => columns.map(c => escapeCSV(r[c])).join(",")).join("\n") + "\n";
    }
    downloadBlob(combined, `workspace-full-export-${timestamp}.csv`, "text/csv;charset=utf-8;");
  }

  // Log the full export access event
  import("@/lib/log-data-access").then(m =>
    m.logDataAccess({ objectType: "assets", actionType: "export", metadata: { format, recordCount: totalRecords, scope: "all" } })
  );

  onProgress?.({ phase: "complete", message: `Exported ${totalRecords} records across all categories`, recordCount: totalRecords });
}
