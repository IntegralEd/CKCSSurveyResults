'use client';

/**
 * AssessmentChartPanel — stacked horizontal bar charts per assessment item.
 *
 * 4 segments (most positive → most negative):
 *   Full Credit    → #17345B  navy
 *   Partial Credit → #255694  blue
 *   No Credit      → #F79520  orange
 *   Blank          → #D1D5DB  gray
 *
 * Direct percentages (not cumulative top-N); comparison group bars
 * follow the same 88px label + flex bar layout as ChartPanel.
 */

import type { AssessmentRow, AssessmentComparisonGroup } from '@/lib/assessmentTypes';
import { ItemInfoButton } from '@/components/AssessmentItemModal';

// ─── Segment config ───────────────────────────────────────────────────────────

const ASSESSMENT_SEGMENTS = [
  { key: 'fullCredit',    label: 'Full Credit',    color: '#17345B' },
  { key: 'partialCredit', label: 'Partial Credit', color: '#255694' },
  { key: 'noCredit',      label: 'No Credit',      color: '#F79520' },
  { key: 'blank',         label: 'Blank',          color: '#D1D5DB' },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Segment({ pct, color, label }: { pct: number; color: string; label: string }) {
  if (pct <= 0) return <div style={{ flex: 0 }} />;
  const showLabel = pct >= 2;
  return (
    <div
      style={{
        flex: pct,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: pct > 0 ? 2 : 0,
        overflow: 'visible',
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
          paddingLeft: 2,
          paddingRight: 2,
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

interface AssessmentBarRowProps {
  label: string;
  n: number | null;
  fullCreditPct: number | null;
  partialCreditPct: number | null;
  noCreditPct: number | null;
  blankPct: number | null;
}

function AssessmentBarRow({
  label,
  n,
  fullCreditPct,
  partialCreditPct,
  noCreditPct,
  blankPct,
}: AssessmentBarRowProps) {
  const hasData = n !== null && n > 0
    && fullCreditPct !== null
    && partialCreditPct !== null
    && noCreditPct !== null;

  const segments = hasData
    ? [
        { pct: fullCreditPct!,    color: '#17345B', label: 'Full Credit' },
        { pct: partialCreditPct!, color: '#255694', label: 'Partial Credit' },
        { pct: noCreditPct!,      color: '#F79520', label: 'No Credit' },
        { pct: blankPct ?? 0,     color: '#D1D5DB', label: 'Blank' },
      ]
    : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'end', gap: 12 }}>
      {/* Label column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#17345B', textAlign: 'right' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5E738C', whiteSpace: 'nowrap' }}>
          {hasData ? `n=${(n as number).toLocaleString()}` : 'n/a'}
        </div>
      </div>

      {/* Bar column */}
      <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', gap: 6, overflow: 'visible', paddingRight: 24 }}>
        {hasData ? (
          segments.map((seg, i) => (
            <Segment key={i} pct={seg.pct} color={seg.color} label={seg.label} />
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
    <div className="flex items-center gap-5 flex-wrap text-xs text-slate-600 mb-6 print:mb-3">
      {ASSESSMENT_SEGMENTS.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  rows: AssessmentRow[];
  groups: AssessmentComparisonGroup[];
  school: { name: string; city?: string; region?: string };
  assessmentId: string;
  onItemInfo?: (row: AssessmentRow) => void;
}

export default function AssessmentChartPanel({ rows, groups, school, assessmentId, onItemInfo }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-1 chart-panel">
      {/* Context header */}
      <div className="flex items-center gap-6 flex-wrap mb-4 text-sm">
        <span className="text-slate-600">
          <span className="font-semibold text-[#17345B]">School</span>
          {' = '}
          <span className="font-medium">&ldquo;{school.name}&rdquo;</span>
        </span>
        <span className="text-slate-600">
          <span className="font-semibold text-[#17345B]">Assessment</span>
          {' = '}
          <span className="font-medium">&ldquo;{assessmentId}&rdquo;</span>
        </span>
      </div>

      <Legend />

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.itemOrder}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 print:break-inside-avoid"
          >
            {/* Item header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-1.5 min-w-0">
                <span className="text-xs text-slate-400 font-mono shrink-0 mt-px">#{row.itemOrder}</span>
                {onItemInfo && row.detail && (
                  <ItemInfoButton
                    onClick={() => onItemInfo(row)}
                    label={`View detail for item ${row.itemOrder}`}
                  />
                )}
                <span className="text-sm font-medium text-slate-800">{row.itemPrompt}</span>
              </div>
              {row.domains.length > 0 && (
                <span className="text-xs text-[#5E738C] bg-slate-100 rounded px-2 py-0.5 shrink-0">
                  {row.domains.join(', ')}
                </span>
              )}
            </div>

            {/* Chart rows */}
            <div className="space-y-3 pt-1">
              <AssessmentBarRow
                label="School"
                n={row.schoolN}
                fullCreditPct={row.schoolFullCreditPct}
                partialCreditPct={row.schoolPartialCreditPct}
                noCreditPct={row.schoolNoCreditPct}
                blankPct={row.schoolBlankPct}
              />
              {groups.includes('city') && (
                <AssessmentBarRow
                  label="City"
                  n={row.cityN}
                  fullCreditPct={row.cityFullCreditPct}
                  partialCreditPct={row.cityPartialCreditPct}
                  noCreditPct={row.cityNoCreditPct}
                  blankPct={row.cityBlankPct}
                />
              )}
              {groups.includes('region') && (
                <AssessmentBarRow
                  label="Region"
                  n={row.regionN}
                  fullCreditPct={row.regionFullCreditPct}
                  partialCreditPct={row.regionPartialCreditPct}
                  noCreditPct={row.regionNoCreditPct}
                  blankPct={null}
                />
              )}
              {groups.includes('network') && (
                <AssessmentBarRow
                  label="Network"
                  n={row.networkN}
                  fullCreditPct={row.networkFullCreditPct}
                  partialCreditPct={row.networkPartialCreditPct}
                  noCreditPct={row.networkNoCreditPct}
                  blankPct={row.networkBlankPct}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
