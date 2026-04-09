'use client';

import { useState } from 'react';

export interface TableColumn {
  key: string;
  label: string;
}

interface Props {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  sortable?: boolean;
}

type SortDir = 'asc' | 'desc';

/**
 * A sortable, striped table component.
 *
 * - Click a column header to sort ascending; click again to sort descending.
 * - Zebra-striped rows with hover highlight.
 * - Text values are left-aligned; numeric values are right-aligned.
 * - Active sort column header uses brand.navy; sort arrow uses brand.slate.
 */
export default function ResultsTable({ columns, rows, sortable = false }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleHeaderClick(key: string) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedRows = sortable && sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const aNum = typeof av === 'number' ? av : parseFloat(String(av ?? ''));
        const bNum = typeof bv === 'number' ? bv : parseFloat(String(bv ?? ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const aStr = String(av ?? '');
        const bStr = String(bv ?? '');
        const cmp = aStr.localeCompare(bStr);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleHeaderClick(col.key)}
                className={[
                  'px-4 py-2.5 text-left font-medium whitespace-nowrap border-b border-slate-200',
                  sortable ? 'cursor-pointer select-none hover:bg-slate-200 transition-colors' : '',
                  sortKey === col.key ? 'text-[#17345B]' : '',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortable && (
                    <SortIndicator active={sortKey === col.key} dir={sortDir} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={[
                rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                'hover:bg-[#17345B]/5 transition-colors',
              ].join(' ')}
            >
              {columns.map((col) => {
                const val = row[col.key];
                const isNum = typeof val === 'number';
                const display =
                  val == null
                    ? '—'
                    : isNum
                    ? typeof val === 'number' && !Number.isInteger(val)
                      ? (val as number).toFixed(1)
                      : String(val)
                    : String(val);

                // Highlight top-N percentage columns with a subtle navy tint
                const isTopN = col.key === 'top2Pct' || col.key === 'top3Pct';

                return (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-2 border-b border-slate-100 align-top',
                      isNum ? 'text-right tabular-nums' : 'text-left',
                      col.key === 'prompt' || col.key === 'commentText'
                        ? 'max-w-sm whitespace-normal'
                        : 'whitespace-nowrap',
                      isTopN ? 'bg-[#17345B]/[0.04] font-medium text-[#17345B]' : '',
                    ].join(' ')}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sort indicator icon ──────────────────────────────────────────────────────

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 text-[#5E738C]" viewBox="0 0 10 14" fill="currentColor">
        <path d="M5 1l3 4H2l3-4zm0 12L2 9h6l-3 4z" />
      </svg>
    );
  }
  return dir === 'asc' ? (
    <svg className="w-3 h-3 text-[#5E738C]" viewBox="0 0 10 10" fill="currentColor">
      <path d="M5 1l4 7H1l4-7z" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-[#5E738C]" viewBox="0 0 10 10" fill="currentColor">
      <path d="M5 9L1 2h8L5 9z" />
    </svg>
  );
}
