/**
 * Minimal CSV parse/stringify for ingredients import/export.
 * Handles quoted fields (commas, newlines, double quotes).
 */

/**
 * Parse a CSV string into rows of string arrays.
 * Respects double-quoted fields; "" inside quoted field becomes ".
 */
export function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (inQuotes) {
      if (c === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field.trim());
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && csv[i + 1] === "\n") i++;
        row.push(field.trim());
        field = "";
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
  }
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

/**
 * Escape a CSV field: wrap in quotes if it contains comma, quote, or newline; double internal quotes.
 */
function escapeCSVField(value: string): string {
  const s = String(value ?? "").trim();
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Build a CSV string from rows. Headers and values are escaped.
 */
export function stringifyCSV(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCSVField).join(",")).join("\n");
}
