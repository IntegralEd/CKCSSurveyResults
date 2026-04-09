'use client';

/**
 * ChartPanel — stacked horizontal bar charts per survey item.
 *
 * Style follows Softr_Chart_Style_Reference.rtf:
 *   - 4 segments: Strongly Agree (#17345B), Agree (#255694),
 *                 Neutral (#BCD631), Negative (#F79520)
 *   - 88px label column (right-aligned) + flex bar column
 *   - Percentage labels above each segment
 *   - All comparison group bars span the same full width
 */

import type { ComparisonRow, ComparisonGroup } from '@/lib/types';

// ─── Brand palette ────────────────────────────────────────────────────────────

const COLORS = {
  sa: '#17345B',
  ag: '#255694',
  ne: '#BCD631',
  ng: '#F79520',
};

const SEGMENT_LABELS = ['Strongly Agree', 'Agree', 'Neutral', 'Negative'] as const;
const SEGMENT_COLORS = [COLORS.sa, COLORS.ag, COLORS.ne, COLORS.ng];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive the four segment widths (%) from top-N percentages. */
function deriveSegments(top1: number, top2: number, top3: number) {
  return [
    top1,
    Math.max(0, top2 - top1),
    Math.max(0, top3 - top2),
    Math.max(0, 100 - top3),
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Segment({ pct, color, label }: { pct: number; color: string; label: string }) {
  if (pct <= 0) return <div style={{ flex: 0 }} />;
  const showLabel = pct >= 5;
  return (
    <div
      style={{
        flex: pct,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: pct > 0 ? 2 : 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#17345B',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          minHeight: 14,
        }}
        title={`${label}: ${pct.toFixed(1)}%`}
      >
        {showLabel ? `${Math.round(pct)}%` : ''}
      </div>
      <div
        style={{
          width: '100%',
          height: 32,
          backgroundColor: color,
          borderRadius: 4,
          transition: 'flex 300ms ease',
        }}
      />
    </div>
  );
}

interface ChartRowProps {
  label: string;
  n: number | null;
  top1: number | null;
  top2: number | null;
  top3: number | null;
}

function ChartRow({ label, n, top1, top2, top3 }: ChartRowProps) {
  const hasData = n !== null && n > 0 && top1 !== null && top2 !== null && top3 !== null;
  const segs = hasData ? deriveSegments(top1!, top2!, top3!) : [];

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'end', gap: 12 }}
    >
      {/* Label column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#17345B', textAlign: 'right', whiteSpace: 'nowrap' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5E738C', whiteSpace: 'nowrap' }}>
          {hasData ? `n=${(n as number).toLocaleString()}` : 'n/a'}
        </div>
      </div>

      {/* Bar column — full width regardless of which groups are shown */}
      <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', gap: 6 }}>
        {hasData ? (
          segs.map((pct, i) => (
            <Segment key={i} pct={pct} color={SEGMENT_COLORS[i]} label={SEGMENT_LABELS[i]} />
          ))
        ) : (
          <div style={{ fontSize: 12, color: '#5E738C', height: 32, display: 'flex', alignItems: 'center' }}>
            No data
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-5 flex-wrap text-xs text-slate-600 mb-6">
      {SEGMENT_LABELS.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: SEGMENT_COLORS[i] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  rows: ComparisonRow[];
  groups: ComparisonGroup[];
  schoolName: string;
}

export default function ChartPanel({ rows, groups, schoolName }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-1">
      <Legend />
      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.questionLabel}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
          >
            {/* Item header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-mono mr-2">#{row.itemOrder}</span>
                <span className="text-sm font-medium text-slate-800">{row.prompt}</span>
              </div>
              {row.domain && (
                <span className="text-xs text-[#5E738C] bg-slate-100 rounded px-2 py-0.5 shrink-0">
                  {row.domain}
                </span>
              )}
            </div>

            {/* Chart rows — one per group */}
            <div className="space-y-3 pt-1">
              <ChartRow
                label={schoolName}
                n={row.schoolN}
                top1={row.schoolTop1Pct}
                top2={row.schoolTop2Pct}
                top3={row.schoolTop3Pct}
              />
              {groups.includes('city') && (
                <ChartRow
                  label="City"
                  n={row.cityN}
                  top1={row.cityTop1Pct}
                  top2={row.cityTop2Pct}
                  top3={row.cityTop3Pct}
                />
              )}
              {groups.includes('region') && (
                <ChartRow
                  label="Region"
                  n={row.regionN}
                  top1={row.regionTop1Pct}
                  top2={row.regionTop2Pct}
                  top3={row.regionTop3Pct}
                />
              )}
              {groups.includes('network') && (
                <ChartRow
                  label="Network"
                  n={row.networkN}
                  top1={row.networkTop1Pct}
                  top2={row.networkTop2Pct}
                  top3={row.networkTop3Pct}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
