'use client';

import { useRef, useEffect, useState } from 'react';

export interface TableColumn {
  key: string;
  label: string;
  /** Inline width / minWidth style e.g. '20px', '320px', '40%' */
  width?: string;
  minWidth?: string;
  /**
   * Optional group label. Consecutive columns sharing the same group value
   * are rendered under a merged colspan header row (e.g. "School Results").
   * Columns without a group get rowspan=2 and appear only in the first header row.
   */
  group?: string;
  /** When true, renders a prominent left border to divide this group from the previous. */
  groupStart?: boolean;
}

interface Props {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  /** Default sort key — rows are pre-sorted by this field; column header clicks override */
  defaultSortKey?: string;
  /** When true, hide sort indicators, ignore header clicks, render rows in given order */
  disableSort?: boolean;
  /**
   * Optional escape hatch for custom cell rendering.
   * Called for every cell; return a React node to override the default display,
   * or undefined/null to use the default number/string formatting.
   */
  renderCell?: (colKey: string, val: unknown, row: Record<string, unknown>) => React.ReactNode | undefined | null;
}

type SortDir = 'asc' | 'desc';

/**
 * Table with:
 *   - Default sort by a specified key (itemOrder by default)
 *   - Column header click to re-sort
 *   - Per-column width control
 *   - Floating horizontal scrollbars at BOTH top and bottom of the table.
 *     The top scrollbar is visible the moment the table renders (no scrolling
 *     required); the bottom one stays pinned to the viewport bottom while the
 *     parent block is in view. The top bar is critical inside iframe/Softr
 *     embeds where auto-resized iframes don't trigger sticky positioning.
 *   - Section header rows (row._sectionHeader = true) rendered as full-width dividers
 */
export default function ResultsTable({ columns, rows, defaultSortKey, disableSort = false, renderCell }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const ghostTopRef = useRef<HTMLDivElement>(null);
  const ghostBottomRef = useRef<HTMLDivElement>(null);
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

  // Sync scroll between table and both ghost scrollbars (guard against feedback loops)
  useEffect(() => {
    const wrap = tableWrapRef.current;
    const top = ghostTopRef.current;
    const bottom = ghostBottomRef.current;
    if (!wrap || !top || !bottom) return;

    let syncing = false;
    const sync = (source: HTMLElement, ...targets: HTMLElement[]) => {
      if (syncing) return;
      syncing = true;
      for (const t of targets) {
        if (t.scrollLeft !== source.scrollLeft) t.scrollLeft = source.scrollLeft;
      }
      // release on next frame so the resulting scroll events don't re-enter
      requestAnimationFrame(() => { syncing = false; });
    };
    const onWrap = () => sync(wrap, top, bottom);
    const onTop = () => sync(top, wrap, bottom);
    const onBottom = () => sync(bottom, wrap, top);

    wrap.addEventListener('scroll', onWrap);
    top.addEventListener('scroll', onTop);
    bottom.addEventListener('scroll', onBottom);
    return () => {
      wrap.removeEventListener('scroll', onWrap);
      top.removeEventListener('scroll', onTop);
      bottom.removeEventListener('scroll', onBottom);
    };
  }, []);

  function handleHeaderClick(key: string) {
    if (disableSort) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedRows = disableSort
    ? rows
    : sortKey
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
      {/* Top floating scrollbar — visible the moment the table renders, regardless
          of iframe/embed scroll behavior. Mirrors the bottom one. */}
      <div
        ref={ghostTopRef}
        className="overflow-x-auto bg-white border border-slate-200 border-b-0 rounded-t-lg"
        style={{ height: 14 }}
        aria-hidden="true"
      >
        <div style={{ width: ghostWidth, height: 1 }} />
      </div>
      {/* Table scroll container */}
      <div
        ref={tableWrapRef}
        className="overflow-x-auto border-x border-slate-200 shadow-sm"
        style={{ scrollbarWidth: 'none' }} // hide native scrollbar; ghosts handle it
      >
        <table className="text-sm border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
          <thead>
            <GroupedHeader
              columns={columns}
              sortKey={sortKey}
              sortDir={sortDir}
              onHeaderClick={handleHeaderClick}
              disableSort={disableSort}
            />
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => {
              // Section header row
              if (row._sectionHeader) {
                return (
                  <tr key={`header-${rowIdx}`}>
                    <td
                      colSpan={columns.length}
                      className="px-3 py-2 text-xs font-semibold text-[#17345B] bg-[#17345B]/[0.06] border-b border-slate-200 uppercase tracking-wide"
                    >
                      {String(row._label ?? '')}
                    </td>
                  </tr>
                );
              }
              return (
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
                    const isWide = col.key === 'prompt' || col.key === 'commentText' || col.key === 'itemPrompt';
                    const isTopN = isPct;
                    const isOrder = col.key === 'itemOrder';

                    // Custom cell renderer — use if provided and returns non-null
                    const custom = renderCell?.(col.key, val, row);

                    const display = custom != null ? null
                      : val == null ? '—'
                      : isPct
                        ? `${(val as number).toFixed(1)}%`
                      : isNum && Number.isInteger(val as number)
                        ? (val as number).toLocaleString()
                      : isNum
                        ? (val as number).toFixed(1)
                      : String(val);

                    return (
                      <td
                        key={col.key}
                        style={{ width: col.width, minWidth: col.minWidth ?? col.width }}
                        className={[
                          'px-3 py-2 border-b border-slate-100 align-top',
                          isNum && !isWide && custom == null ? 'text-right tabular-nums' : 'text-left',
                          isWide ? 'whitespace-normal' : 'whitespace-nowrap',
                          isTopN ? 'bg-[#17345B]/[0.04] font-medium text-[#17345B]' : '',
                          isOrder ? 'text-center text-slate-400 text-xs' : '',
                          col.groupStart ? 'border-l-[3px] border-l-slate-400' : '',
                        ].join(' ')}
                      >
                        {custom ?? display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom floating horizontal scrollbar — stays pinned to bottom of viewport
          while the parent block is in view (works in standalone, no-op in some embeds). */}
      <div
        ref={ghostBottomRef}
        className="overflow-x-auto sticky bottom-0 z-10 bg-white border border-slate-200 border-t-0 rounded-b-lg"
        style={{ height: 16 }}
        aria-hidden="true"
      >
        <div style={{ width: ghostWidth, height: 1 }} />
      </div>
    </div>
  );
}

// ─── Grouped header ───────────────────────────────────────────────────────────

interface GroupedHeaderProps {
  columns: TableColumn[];
  sortKey: string | null;
  sortDir: SortDir;
  onHeaderClick: (key: string) => void;
  disableSort?: boolean;
}

function GroupedHeader({ columns, sortKey, sortDir, onHeaderClick, disableSort }: GroupedHeaderProps) {
  const hasGroups = columns.some((c) => c.group);

  const thStyle = (col: TableColumn) => ({
    width: col.width,
    minWidth: col.minWidth ?? col.width,
  });
  const thClass = (active: boolean) =>
    [
      'px-3 py-2.5 text-left font-medium border-b border-slate-200',
      disableSort
        ? 'pointer-events-none opacity-70'
        : 'cursor-pointer select-none hover:bg-slate-200 transition-colors',
      active && !disableSort ? 'text-[#17345B]' : '',
    ].join(' ');

  if (!hasGroups) {
    return (
      <tr className="bg-slate-100 text-slate-600">
        {columns.map((col) => (
          <th
            key={col.key}
            onClick={() => onHeaderClick(col.key)}
            style={thStyle(col)}
            className={thClass(sortKey === col.key)}
          >
            <span className="inline-flex items-center gap-1">
              {col.label}
              {!disableSort && <SortIndicator active={sortKey === col.key} dir={sortDir} />}
            </span>
          </th>
        ))}
      </tr>
    );
  }

  const GROUP_BORDER = 'border-l-[3px] border-l-slate-400';

  // Build group spans for the top header row
  type GroupSpan =
    | { kind: 'leaf'; col: TableColumn }
    | { kind: 'group'; label: string; span: number; groupStart: boolean };

  const groupSpans: GroupSpan[] = [];
  let i = 0;
  while (i < columns.length) {
    const g = columns[i].group;
    if (!g) {
      groupSpans.push({ kind: 'leaf', col: columns[i] });
      i++;
    } else {
      let span = 0;
      while (i + span < columns.length && columns[i + span].group === g) span++;
      groupSpans.push({ kind: 'group', label: g, span, groupStart: !!columns[i].groupStart });
      i += span;
    }
  }

  const groupedCols = columns.filter((c) => c.group);

  return (
    <>
      {/* Row 1: group labels (colSpan) + ungrouped leaves (rowSpan 2) */}
      <tr className="bg-slate-100 text-slate-600">
        {groupSpans.map((gs, idx) => {
          if (gs.kind === 'leaf') {
            return (
              <th
                key={gs.col.key}
                rowSpan={2}
                onClick={() => onHeaderClick(gs.col.key)}
                style={thStyle(gs.col)}
                className={thClass(sortKey === gs.col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {gs.col.label}
                  {!disableSort && <SortIndicator active={sortKey === gs.col.key} dir={sortDir} />}
                </span>
              </th>
            );
          }
          return (
            <th
              key={`${gs.label}-${idx}`}
              colSpan={gs.span}
              className={[
                'px-3 py-2 text-center font-semibold border-b border-slate-200 text-[#17345B] bg-slate-50',
                gs.groupStart ? GROUP_BORDER : '',
              ].join(' ')}
            >
              {gs.label}
            </th>
          );
        })}
      </tr>
      {/* Row 2: leaf headers for grouped columns only */}
      <tr className="bg-slate-100 text-slate-600">
        {groupedCols.map((col) => (
          <th
            key={col.key}
            onClick={() => onHeaderClick(col.key)}
            style={thStyle(col)}
            className={[thClass(sortKey === col.key), col.groupStart ? GROUP_BORDER : ''].join(' ')}
          >
            <span className="inline-flex items-center gap-1">
              {col.label}
              {!disableSort && <SortIndicator active={sortKey === col.key} dir={sortDir} />}
            </span>
          </th>
        ))}
      </tr>
    </>
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
