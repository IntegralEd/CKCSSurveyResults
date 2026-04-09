'use client';

import { useState } from 'react';
import TabToggle from '@/components/TabToggle';
import ResultsTable from '@/components/ResultsTable';
import DownloadButton from '@/components/DownloadButton';
import MultiSelect from '@/components/MultiSelect';
import type {
  FilterOptions,
  ActiveFilters,
  ResultMode,
  AgreementRow,
  TopNRow,
  CommentRow,
  ComparisonRow,
  ComparisonGroup,
  SchoolInfo,
} from '@/lib/types';

// ─── Column definitions ───────────────────────────────────────────────────────

const AGREEMENT_COLUMNS = [
  { key: 'prompt',        label: 'Item' },
  { key: 'domain',        label: 'Domain' },
  { key: 'n',             label: 'N' },
  { key: 'top2Pct',       label: 'Top 2 %' },
  { key: 'top3Pct',       label: 'Top 3 %' },
];

const TOPN_COLUMNS = [
  { key: 'prompt',        label: 'Item' },
  { key: 'domain',        label: 'Domain' },
  { key: 'n',             label: 'N' },
  { key: 'top2Pct',       label: 'Top 2 %' },
  { key: 'top3Pct',       label: 'Top 3 %' },
];

const COMMENTS_COLUMNS = [
  { key: 'administration', label: 'Administration' },
  { key: 'school',         label: 'Region' },
  { key: 'prompt',         label: 'Item' },
  { key: 'commentText',    label: 'Response' },
];

function comparisonColumns(groups: ComparisonGroup[]) {
  const cols = [
    { key: 'prompt',         label: 'Item' },
    { key: 'domain',         label: 'Domain' },
    { key: 'schoolN',        label: 'School N' },
    { key: 'schoolTop2Pct',  label: 'School Top 2 %' },
    { key: 'schoolTop3Pct',  label: 'School Top 3 %' },
  ];
  if (groups.includes('city')) {
    cols.push({ key: 'cityN', label: 'City N' });
    cols.push({ key: 'cityTop2Pct', label: 'City Top 2 %' });
  }
  if (groups.includes('region')) {
    cols.push({ key: 'regionN', label: 'Region N' });
    cols.push({ key: 'regionTop2Pct', label: 'Region Top 2 %' });
  }
  if (groups.includes('network')) {
    cols.push({ key: 'networkN', label: 'Network N' });
    cols.push({ key: 'networkTop2Pct', label: 'Network Top 2 %' });
  }
  return cols;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: ActiveFilters = {
  administration: [], school: [], region: [],
  race: [], gender: [], grade: [], domain: [],
};

const ALL_COMPARISON_GROUPS: { value: ComparisonGroup; label: string }[] = [
  { value: 'city',    label: 'City' },
  { value: 'region',  label: 'Region' },
  { value: 'network', label: 'Network' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'results';
type AnyRow = AgreementRow | TopNRow | CommentRow | ComparisonRow;

interface Props {
  filterOptions: FilterOptions;
  schools: SchoolInfo[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardClient({ filterOptions, schools }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
  const [comparisonGroups, setComparisonGroups] = useState<ComparisonGroup[]>([]);
  const [formFilters, setFormFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  // ── Results state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');
  const [mode, setMode] = useState<ResultMode>('agreement');
  const [rows, setRows] = useState<AnyRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondentCount, setRespondentCount] = useState<number | null>(null);

  // ── Secondary filters (applied after initial load) ──────────────────────────
  const [secondaryFilters, setSecondaryFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const schoolSelected = selectedSchool !== null;
  const canLoad = schoolSelected || formFilters.administration.length > 0;

  // Comparison groups unlock progressively based on school's city/region
  function groupEnabled(group: ComparisonGroup): boolean {
    if (!schoolSelected) return false;
    if (group === 'city')    return Boolean(selectedSchool?.city);
    if (group === 'region')  return Boolean(selectedSchool?.city || selectedSchool?.region);
    if (group === 'network') return true;
    return false;
  }

  function toggleComparisonGroup(group: ComparisonGroup) {
    setComparisonGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  function handleSchoolChange(schoolName: string) {
    if (!schoolName) {
      setSelectedSchool(null);
      setComparisonGroups([]);
      return;
    }
    const school = schools.find((s) => s.name === schoolName) ?? null;
    setSelectedSchool(school);
    // Clear groups that are no longer valid for the new school
    setComparisonGroups((prev) =>
      prev.filter((g) => {
        if (g === 'city')   return Boolean(school?.city);
        if (g === 'region') return Boolean(school?.city || school?.region);
        return true;
      })
    );
  }

  // ── Fetch helpers ────────────────────────────────────────────────────────────

  async function fetchResults(targetMode: ResultMode, secondary: ActiveFilters) {
    setLoading(true);
    setError(null);

    try {
      if (targetMode === 'comparison' && selectedSchool) {
        const res = await fetch('/api/comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolTxt: selectedSchool.name,
            comparisonGroups,
            domain: formFilters.domain,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail?.message ?? body.error ?? `HTTP ${res.status}`);
        }
        setRows(await res.json());
        setRespondentCount(null);

      } else if (targetMode === 'comments') {
        const filters = mergeFilters(formFilters, secondary);
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail?.message ?? body.error ?? `HTTP ${res.status}`);
        }
        setRows(await res.json());
        setRespondentCount(null);

      } else {
        const filters = mergeFilters(formFilters, secondary);
        const res = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters, mode: targetMode }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail?.message ?? body.error ?? `HTTP ${res.status}`);
        }
        const data: AgreementRow[] | TopNRow[] = await res.json();
        setRows(data);
        setRespondentCount(data.length > 0 ? (data[0] as AgreementRow).n ?? null : 0);
      }
    } catch (err) {
      setError(String(err));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleLoad() {
    const initialMode: ResultMode =
      schoolSelected && comparisonGroups.length > 0 ? 'comparison' : 'agreement';
    setMode(initialMode);
    setSecondaryFilters(EMPTY_FILTERS);
    setPhase('results');
    await fetchResults(initialMode, EMPTY_FILTERS);
  }

  async function handleModeChange(newMode: ResultMode) {
    setMode(newMode);
    await fetchResults(newMode, secondaryFilters);
  }

  async function handleSecondaryFilterChange(updated: ActiveFilters) {
    setSecondaryFilters(updated);
    await fetchResults(mode, updated);
  }

  function handleReset() {
    setPhase('form');
    setRows(null);
    setError(null);
    setRespondentCount(null);
    setSecondaryFilters(EMPTY_FILTERS);
  }

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns =
    mode === 'comments'    ? COMMENTS_COLUMNS :
    mode === 'comparison'  ? comparisonColumns(comparisonGroups) :
    mode === 'topn'        ? TOPN_COLUMNS :
    AGREEMENT_COLUMNS;

  const rowsAsRecords = (rows ?? []) as unknown as Record<string, unknown>[];

  // ── Render: Form phase ────────────────────────────────────────────────────────

  if (phase === 'form') {
    return (
      <div className="max-w-2xl space-y-6">
        {/* School selector */}
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#17345B] uppercase tracking-wide">
            Select a School
          </h2>
          <select
            value={selectedSchool?.name ?? ''}
            onChange={(e) => handleSchoolChange(e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#17345B]"
          >
            <option value="">— All schools (no comparison) —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}{s.city ? ` · ${s.city}` : ''}
              </option>
            ))}
          </select>

          {/* Comparison group checkboxes */}
          <div>
            <p className="text-xs font-medium text-[#5E738C] mb-2">
              Compare to{!schoolSelected && <span className="ml-1 text-slate-400">(select a school to unlock)</span>}
            </p>
            <div className="flex gap-4">
              {ALL_COMPARISON_GROUPS.map(({ value, label }) => {
                const enabled = groupEnabled(value);
                return (
                  <label
                    key={value}
                    className={`flex items-center gap-2 text-sm select-none ${
                      enabled ? 'cursor-pointer text-slate-700' : 'cursor-not-allowed opacity-40 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={comparisonGroups.includes(value)}
                      disabled={!enabled}
                      onChange={() => toggleComparisonGroup(value)}
                      className="accent-[#17345B]"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Administration + Domain filters */}
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#17345B] uppercase tracking-wide">
            Filters <span className="font-normal text-[#5E738C] normal-case">(optional)</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            <MultiSelect
              label="Administration"
              options={filterOptions.administration}
              selected={formFilters.administration}
              onChange={(v) => setFormFilters((f) => ({ ...f, administration: v }))}
            />
            <MultiSelect
              label="Domain"
              options={filterOptions.domain}
              selected={formFilters.domain}
              onChange={(v) => setFormFilters((f) => ({ ...f, domain: v }))}
            />
          </div>
        </div>

        {/* Load button */}
        <button
          type="button"
          onClick={handleLoad}
          disabled={!canLoad}
          className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
            canLoad
              ? 'bg-[#17345B] text-white hover:bg-[#255694]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Load Results
        </button>
        {!canLoad && (
          <p className="text-xs text-slate-400">
            Select a school or an administration to load results.
          </p>
        )}
      </div>
    );
  }

  // ── Render: Results phase ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Context bar */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        {selectedSchool && (
          <span className="bg-[#17345B] text-white rounded-full px-3 py-1 text-xs font-medium">
            {selectedSchool.name}
          </span>
        )}
        {comparisonGroups.map((g) => (
          <span key={g} className="bg-[#255694] text-white rounded-full px-3 py-1 text-xs">
            vs {g.charAt(0).toUpperCase() + g.slice(1)}
          </span>
        ))}
        {formFilters.administration.map((a) => (
          <span key={a} className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs">
            {a}
          </span>
        ))}
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto text-xs text-[#5E738C] hover:text-[#17345B] underline underline-offset-2"
        >
          ← Change filters
        </button>
      </div>

      {/* Tab toggle + N badge + download */}
      <div className="flex items-center gap-4 flex-wrap">
        <TabToggle
          mode={mode}
          onChange={handleModeChange}
          showComparison={schoolSelected && comparisonGroups.length > 0}
        />
        {respondentCount !== null && mode !== 'comments' && mode !== 'comparison' && (
          <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
            N = {respondentCount.toLocaleString()}
          </span>
        )}
        <div className="ml-auto">
          <DownloadButton
            rows={rowsAsRecords}
            columns={columns}
            filename={`ckcs-${mode}.csv`}
            disabled={!rows || rows.length === 0}
          />
        </div>
      </div>

      {/* Secondary filters (demographic slicers — post-load) */}
      {mode !== 'comparison' && (
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-3">
          <p className="text-xs text-[#5E738C] mb-2 font-medium">Refine by demographic</p>
          <div className="flex items-center flex-wrap gap-2">
            <MultiSelect
              label="Grade"
              options={filterOptions.grade}
              selected={secondaryFilters.grade}
              onChange={(v) => handleSecondaryFilterChange({ ...secondaryFilters, grade: v })}
            />
            <MultiSelect
              label="Gender"
              options={filterOptions.gender}
              selected={secondaryFilters.gender}
              onChange={(v) => handleSecondaryFilterChange({ ...secondaryFilters, gender: v })}
            />
            <MultiSelect
              label="Race"
              options={filterOptions.race}
              selected={secondaryFilters.race}
              onChange={(v) => handleSecondaryFilterChange({ ...secondaryFilters, race: v })}
            />
            {Object.values(secondaryFilters).some((v) => v.length > 0) && (
              <button
                type="button"
                onClick={() => handleSecondaryFilterChange(EMPTY_FILTERS)}
                className="text-xs text-[#5E738C] hover:text-[#17345B] underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status */}
      {loading && (
        <div className="py-12 text-center text-slate-500 text-sm">Loading results…</div>
      )}
      {!loading && error && (
        <div className="py-6 text-center text-red-600 text-sm">Error: {error}</div>
      )}
      {!loading && !error && rows !== null && rows.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          No results found for the selected filters.
        </div>
      )}

      {/* Results table */}
      {!loading && !error && rows !== null && rows.length > 0 && (
        <ResultsTable columns={columns} rows={rowsAsRecords} sortable />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Merge primary form filters with post-load secondary demographic filters. */
function mergeFilters(primary: ActiveFilters, secondary: ActiveFilters): ActiveFilters {
  return {
    administration: primary.administration,
    school:         primary.school,
    region:         primary.region,
    domain:         primary.domain,
    race:           secondary.race,
    gender:         secondary.gender,
    grade:          secondary.grade,
  };
}
