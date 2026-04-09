'use client';

import { toCsv, type CsvColumn } from '@/lib/csv';

interface Props {
  rows: Record<string, unknown>[];
  columns: CsvColumn[];
  filename?: string;
  disabled?: boolean;
}

/**
 * Triggers a CSV download of the current table data.
 * Uses toCsv() for serialization, then creates a temporary anchor element
 * to initiate the browser download without navigating away.
 */
export default function DownloadButton({
  rows,
  columns,
  filename = 'survey-results.csv',
  disabled = false,
}: Props) {
  function handleDownload() {
    if (disabled || rows.length === 0) return;

    const csvString = toCsv(rows, columns);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Free the object URL after a short delay.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors',
        disabled
          ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
          : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50',
      ].join(' ')}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"
        />
      </svg>
      Download CSV
    </button>
  );
}
