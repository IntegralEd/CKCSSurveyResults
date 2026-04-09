/**
 * lib/csv.ts
 *
 * Minimal CSV serialization utility.
 * Safe to import in both server and client code.
 */

export interface CsvColumn {
  key: string;
  label: string;
}

/**
 * Serializes an array of row objects into a CSV string.
 *
 * - Values that contain commas, double-quotes, or newlines are quoted.
 * - Double-quote characters inside values are escaped as "".
 * - Uses CRLF line endings per the RFC 4180 spec.
 * - Returns a UTF-8 string with a BOM so Excel opens it correctly.
 */
export function toCsv(
  rows: Record<string, unknown>[],
  columns: CsvColumn[]
): string {
  const BOM = '\uFEFF';
  const CRLF = '\r\n';

  const header = columns.map((c) => escapeCell(c.label)).join(',');

  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          const str = val == null ? '' : String(val);
          return escapeCell(str);
        })
        .join(',')
    )
    .join(CRLF);

  return BOM + header + CRLF + body;
}

function escapeCell(value: string): string {
  // Needs quoting if it contains a comma, double-quote, newline, or carriage return.
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
