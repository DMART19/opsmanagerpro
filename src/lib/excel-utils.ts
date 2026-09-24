/**
 * Secure Excel utilities
 * RFC 4180-compliant CSV parsing implemented natively
 * Uses read-excel-file / write-excel-file (browser builds) for .xlsx
 */
// Loaded on demand to keep the main bundle small
const getReader = () => import('read-excel-file/browser').then(m => m.default);
const getWriter = () => import('write-excel-file/browser').then(m => m.default);

export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, unknown>[];
  sheetName: string;
}

/**
 * Validation error for a specific row
 */
export interface RowValidationError {
  rowIndex: number;
  field: string;
  value: unknown;
  message: string;
}

/**
 * Validate quantity fields in parsed data
 * Returns array of validation errors for invalid quantities
 */
export function validateQuantityFields(
  rows: Record<string, unknown>[],
  quantityFields: string[] = ['quantity', 'quantity_available', 'quantity_out']
): RowValidationError[] {
  const errors: RowValidationError[] = [];
  
  rows.forEach((row, rowIndex) => {
    quantityFields.forEach(field => {
      const value = row[field];
      
      // Skip if field not present or null/undefined
      if (value === null || value === undefined || value === '') {
        return;
      }
      
      // Parse the value as a number
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      
      // Check for invalid values
      if (isNaN(numValue)) {
        errors.push({
          rowIndex: rowIndex + 1, // 1-indexed for user display
          field,
          value,
          message: `Invalid number format`
        });
      } else if (numValue < 1) {
        errors.push({
          rowIndex: rowIndex + 1,
          field,
          value,
          message: `Quantity must be at least 1`
        });
      }
    });
  });
  
  return errors;
}

/**
 * RFC 4180-compliant CSV parser
 * Handles: quoted fields, escaped quotes (""), commas in quoted fields, newlines in quoted fields
 */
function parseCsvContent(content: string): { headers: string[]; rows: Record<string, unknown>[] } {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("") -> add single quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        // Regular character inside quotes (including commas and newlines)
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        // Record separator
        currentRecord.push(currentField.trim());
        if (currentRecord.some(f => f !== '')) {
          records.push(currentRecord);
        }
        currentRecord = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  
  // Don't forget the last field and record
  currentRecord.push(currentField.trim());
  if (currentRecord.some(f => f !== '')) {
    records.push(currentRecord);
  }
  
  if (records.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const headers = records[0];
  const rows: Record<string, unknown>[] = [];
  
  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const row: Record<string, unknown> = {};
    
    headers.forEach((header, index) => {
      row[header] = record[index] || null;
    });
    
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * Parse an Excel or CSV file and return the data as JSON
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith('.csv');

  // Handle CSV files separately
  if (isCSV) {
    const content = await file.text();
    const { headers, rows } = parseCsvContent(content);
    
    if (headers.length === 0) {
      throw new Error('No data found in CSV file');
    }

    return {
      headers: headers.filter(Boolean),
      rows,
      sheetName: 'CSV Import',
    };
  }

  // Handle Excel files (.xlsx)
  const readXlsxFile = await getReader();
  let sheets: Awaited<ReturnType<typeof readXlsxFile>>;
  try {
    sheets = await readXlsxFile(file);
  } catch {
    throw new Error('Unable to read this file. Please ensure it is a valid Excel (.xlsx) or CSV file.');
  }

  const first = sheets[0];
  if (!first) {
    throw new Error('No worksheet found in the Excel file');
  }

  const data = first.data as unknown[][];
  const headers: string[] = (data[0] || []).map((v, i) =>
    v === null || v === undefined || v === '' ? `Column${i + 1}` : String(v)
  );
  const rows: Record<string, unknown>[] = [];

  for (let r = 1; r < data.length; r++) {
    const src = data[r] || [];
    const rowData: Record<string, unknown> = {};
    let hasData = false;
    headers.forEach((header, c) => {
      let value: unknown = src[c] ?? null;
      if (value instanceof Date) value = value.toISOString().split('T')[0];
      rowData[header] = value;
      if (value !== null && value !== undefined && value !== '') hasData = true;
    });
    if (hasData) rows.push(rowData);
  }

  return {
    headers: headers.filter(Boolean),
    rows,
    sheetName: first.sheet,
  };
}

/**
 * Create and download an Excel file from JSON data
 */
export async function createExcelFile(
  data: Record<string, unknown>[],
  filename: string,
  sheetName: string = 'Sheet1'
): Promise<void> {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const writeXlsxFile = await getWriter();
  const headers = Object.keys(data[0]);

  const toCell = (value: unknown): string | number | boolean | Date | null => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
    return String(value);
  };

  const sheetData: any[][] = [
    headers.map(h => ({ value: h, fontWeight: 'bold', backgroundColor: '#E0E0E0' })),
    ...data.map(item => headers.map(h => {
      const v = toCell(item[h]);
      return v === null ? null : { value: v, ...(v instanceof Date ? { format: 'yyyy-mm-dd' } : {}) };
    })),
  ];

  const columns = headers.map(h => {
    let max = Math.max(10, h.length + 2);
    for (const item of data) {
      const v = toCell(item[h]);
      const s = v === null ? '' : String(v);
      max = Math.max(max, Math.min(s.length + 2, 50));
    }
    return { width: max };
  });

  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  await writeXlsxFile(sheetData as any, { sheet: sheetName.slice(0, 31), columns } as any).toFile(name);
}

/**
 * Create and download a CSV file from JSON data
 */
export function createCsvFile(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  
  // Escape CSV values properly
  const escapeValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeValue).join(','),
    ...data.map(row => 
      headers.map(header => escapeValue(row[header])).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
