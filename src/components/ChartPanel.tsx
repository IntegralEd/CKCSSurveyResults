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
 *
 * ChartRow accepts a pre-built `segments` array so both survey (cumulative top-N)
 * and assessment (direct pct) modes can share the same rendering code.
 */

import type { ComparisonRow, ComparisonGroup } from '@/lib/types';

// ─── Shared segment type ──────────────────────────────────────────────────────

export interface ChartSegment {
  pct: number;
  color: string;
  label: string;
}

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

interface ChartRowProps {
  label: string;
  n: number | null;
  top1: number | null;
  top2: number | null;
  top3: number | null;
}

function ChartRow({ label, n, top1, top2, top3 }: ChartRowProps) {
  const hasData = n !== null && n > 0 && top1 !== null && top2 !== null && top3 !== null;
  const segs = hasData
    ? deriveSegments(top1!, top2!, top3!).map((pct, i) => ({
        pct,
        color: SEGMENT_COLORS[i],
        label: SEGMENT_LABELS[i],
      }))
    : [];

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'end', gap: 12 }}
    >
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
          segs.map((seg, i) => (
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
      {SEGMENT_LABELS.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: SEGMENT_COLORS[i] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Panel header ─────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  schoolName: string;
  city?: string;
  region?: string;
  groups: ComparisonGroup[];
  schoolNames?: string[];  // multi-school mode
}

function PanelHeader({ schoolName, city, region, groups, schoolNames }: PanelHeaderProps) {
  if (schoolNames && schoolNames.length > 1) {
    return (
      <div className="flex items-center gap-2 flex-wrap mb-4 text-sm">
        <span className="font-semibold text-[#17345B]">Schools:</span>
        {schoolNames.map((name) => (
          <span key={name} className="bg-[#17345B]/10 text-[#17345B] rounded px-2 py-0.5 text-xs font-medium">
            {name}
          </span>
        ))}
      </div>
    );
  }

  const parts: { label: string; value: string }[] = [
    { label: 'School', value: schoolName },
  ];
  if (groups.includes('city') && city)     parts.push({ label: 'City',    value: city });
  if (groups.includes('region') && region) parts.push({ label: 'Region',  value: region });
  if (groups.includes('network'))          parts.push({ label: 'Network', value: 'Network' });

  return (
    <div className="flex items-center gap-6 flex-wrap mb-4 text-sm">
      {parts.map(({ label, value }) => (
        <span key={label} className="text-slate-600">
          <span className="font-semibold text-[#17345B]">{label}</span>
          {' = '}
          <span className="font-medium">&ldquo;{value}&rdquo;</span>
        </span>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  rows: ComparisonRow[];
  groups: ComparisonGroup[];
  school: { name: string; city?: string; region?: string };
}

export default function ChartPanel({ rows, groups, school }: Props) {
  if (rows.length === 0) return null;

  // Detect multi-school mode
  const uniqueSchools = Array.from(new Set(rows.map((r) => r.schoolName).filter(Boolean)));
  const isMultiSchool = uniqueSchools.length > 1;

  // Group rows by questionLabel (for multi-school: multiple rows per item)
  const itemKeys: string[] = [];
  const itemRowMap = new Map<string, ComparisonRow[]>();
  for (const row of rows) {
    if (!itemRowMap.has(row.questionLabel)) {
      itemKeys.push(row.questionLabel);
      itemRowMap.set(row.questionLabel, []);
    }
    itemRowMap.get(row.questionLabel)!.push(row);
  }

  return (
    <div className="space-y-1 chart-panel">
      <PanelHeader
        schoolName={school.name}
        city={school.city}
        region={school.region}
        groups={groups}
        schoolNames={isMultiSchool ? uniqueSchools : undefined}
      />
      <Legend />
      <div className="space-y-4">
        {itemKeys.map((key) => {
          const itemRows = itemRowMap.get(key)!;
          const first = itemRows[0];
          return (
            <div
              key={key}
              className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 print:break-inside-avoid"
            >
              {/* Item header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-mono mr-2">#{first.itemOrder}</span>
                  <span className="text-sm font-medium text-slate-800">{first.prompt}</span>
                </div>
                {first.domain && (
                  <span className="text-xs text-[#5E738C] bg-slate-100 rounded px-2 py-0.5 shrink-0">
                    {first.domain}
                  </span>
                )}
              </div>

              {/* Chart rows */}
              <div className="space-y-3 pt-1">
                {isMultiSchool ? (
                  // Multi-school: one row per school
                  itemRows.map((row) => (
                    <ChartRow
                      key={row.schoolName}
                      label={row.schoolName}
                      n={row.schoolN}
                      top1={row.schoolTop1Pct}
                      top2={row.schoolTop2Pct}
                      top3={row.schoolTop3Pct}
                    />
                  ))
                ) : (
                  // Single-school: school + comparison groups
                  <>
                    <ChartRow
                      label="School"
                      n={first.schoolN}
                      top1={first.schoolTop1Pct}
                      top2={first.schoolTop2Pct}
                      top3={first.schoolTop3Pct}
                    />
                    {groups.includes('city') && (
                      <ChartRow
                        label="City"
                        n={first.cityN}
                        top1={first.cityTop1Pct}
                        top2={first.cityTop2Pct}
                        top3={first.cityTop3Pct}
                      />
                    )}
                    {groups.includes('region') && (
                      <ChartRow
                        label="Region"
                        n={first.regionN}
                        top1={first.regionTop1Pct}
                        top2={first.regionTop2Pct}
                        top3={first.regionTop3Pct}
                      />
                    )}
                    {groups.includes('network') && (
                      <ChartRow
                        label="Network"
                        n={first.networkN}
                        top1={first.networkTop1Pct}
                        top2={first.networkTop2Pct}
                        top3={first.networkTop3Pct}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
