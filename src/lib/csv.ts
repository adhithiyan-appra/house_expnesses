import { format } from 'date-fns';

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: CsvCell[][],
): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  triggerDownload(blob, safeName);
}

export function downloadJSON(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
  triggerDownload(blob, safeName);
}

export function fileStamp(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
