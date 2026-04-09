'use client';

import { useRef, useEffect, useState } from 'react';

export interface TableColumn {
  key: string;
  label: string;
  /** Inline width / minWidth style e.g. '20px', '320px', '40%' */
  width?: string;
  minWidth?: string;
}

interface Props {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  /** Default sort key — rows are pre-sorted by this field; column header clicks override */
  defaultSortKey?: string;
}

type SortDir = 'asc' | 'desc';

/**
 * Table with:
 *   - Default sort by a specified key (itemOrder by default)
 *   - Column header click to re-sort
 *   - Per-column width control
 *   - Floating horizontal scrollbar that stays pinned at the bottom of the
 *     viewport while the user scrolls the page vertically
 */
export default function ResultsTable({ columns, rows, defaultSortKey }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostInnerRef = useRef<HTMLDivElement>(null);
  const [ghostWidth, setGhostWidth] = useState(0);

  // Keep ghost scrollbar width in sync with actual table scroll width
  useEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    const update = () => setGhostWidth(wrap.scrollWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [rows, columns]);

  // Sync scroll: table → ghost
  useEffect(() => {
    const wrap = tableWrapRef.current;
    const ghost = ghostRef.current;
    if (!wrap || !ghost) return;
    const onTableScroll = () => { ghost.scrollLeft = wrap.scrollLeft; };
    const onGhostScroll = () => { wrap.scrollLeft = ghost.scrollLeft; };
    wrap.addEventListener('scroll', onTableScroll);
    ghost.addEventListener('scroll', onGhostScroll);
    return () => {
      wrap.removeEventListener('scroll', onTableScroll);
      ghost.removeEventListener('scroll', onGhostScroll);
    };
  }, []);

  function handleHeaderClick(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedRows = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const aNum = typeof av === 'number' ? av : parseFloat(String(av ?? ''));
        const bNum = typeof bv === 'number' ? bv : parseFloat(String(bv ?? ''));
        if (!isNaN(aNum) && !isNaN(bNum)) return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        return sortDir === 'asc'
          ? String(av ?? '').localeCompare(String(bv ?? ''))
          : String(bv ?? '').localeCompare(String(av ?? ''));
      })
    : rows;

  return (
    <div>
      {/* Table scroll container */}
      <div
        ref={tableWrapRef}
        className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm"
        style={{ scrollbarWidth: 'none' }} // hide native scrollbar; ghost handles it
      >
        <table className="text-sm border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth ?? col.width,
                  }}
                  className={[
                    'px-3 py-2.5 text-left font-medium border-b border-slate-200',
                    'cursor-pointer select-none hover:bg-slate-200 transition-colors',
                    sortKey === col.key ? 'text-[#17345B]' : '',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIndicator active={sortKey === col.key} dir={sortDir} />
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
                  const isPct = col.key.toLowerCase().includes('pct');
                  const display =
                    val == null ? '—'
                    : isPct
                      ? `${(val as number).toFixed(1)}%`
                    : isNum && Number.isInteger(val as number)
                      ? (val as number).toLocaleString()
                    : isNum
                      ? (val as number).toFixed(1)
                    : String(val);

                  const isWide = col.key === 'prompt' || col.key === 'commentText';
                  const isTopN = ['top2Pct','top3Pct','schoolTop2Pct','cityTop2Pct','regionTop2Pct','networkTop2Pct'].includes(col.key);
                  const isOrder = col.key === 'itemOrder';

                  return (
                    <td
                      key={col.key}
                      style={{ width: col.width, minWidth: col.minWidth ?? col.width }}
                      className={[
                        'px-3 py-2 border-b border-slate-100 align-top',
                        isNum && !isWide ? 'text-right tabular-nums' : 'text-left',
                        isWide ? 'whitespace-normal' : 'whitespace-nowrap',
                        isTopN ? 'bg-[#17345B]/[0.04] font-medium text-[#17345B]' : '',
                        isOrder ? 'text-center text-slate-400 text-xs' : '',
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

      {/* Floating horizontal scrollbar — stays pinned to bottom of viewport */}
      <div
        ref={ghostRef}
        className="overflow-x-auto sticky bottom-0 z-10 bg-white border-t border-slate-200"
        style={{ height: 16 }}
      >
        <div ref={ghostInnerRef} style={{ width: ghostWidth, height: 1 }} />
      </div>
    </div>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 10 14" fill="currentColor">
      <path d="M5 1l3 4H2l3-4zm0 12L2 9h6l-3 4z" />
    </svg>
  );
  return dir === 'asc' ? (
    <svg className="w-3 h-3 text-[#5E738C] shrink-0" viewBox="0 0 10 10" fill="currentColor">
      <path d="M5 1l4 7H1l4-7z" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-[#5E738C] shrink-0" viewBox="0 0 10 10" fill="currentColor">
      <path d="M5 9L1 2h8L5 9z" />
    </svg>
  );
}
