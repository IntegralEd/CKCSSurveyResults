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
  CommentRow,
  ComparisonRow,
  HistoryRow,
  ComparisonGroup,
  SchoolInfo,
} from '@/lib/types';

// ─── Column definitions ───────────────────────────────────────────────────────

const COMMENTS_COLUMNS = [
  { key: 'administration', label: 'Administration', width: '120px' },
  { key: 'school',         label: 'Region',         width: '120px' },
  { key: 'prompt',         label: 'Item',           width: '320px', minWidth: '240px' },
  { key: 'commentText',    label: 'Response',       width: '400px', minWidth: '280px' },
];

function comparisonColumns(groups: ComparisonGroup[]) {
  const cols: { key: string; label: string; width?: string; minWidth?: string; group?: string; groupStart?: boolean }[] = [
    { key: 'itemOrder', label: '#',    width: '40px',  minWidth: '40px' },
    { key: 'prompt',    label: 'Item', width: '320px', minWidth: '240px' },
    { key: 'schoolN',       label: 'N',       width: '64px', group: 'School', groupStart: true },
    { key: 'schoolTop1Pct', label: 'Top 1 %', width: '80px', group: 'School' },
    { key: 'schoolTop2Pct', label: 'Top 2 %', width: '80px', group: 'School' },
    { key: 'schoolTop3Pct', label: 'Top 3 %', width: '80px', group: 'School' },
  ];
  if (groups.includes('city')) {
    cols.push({ key: 'cityN',       label: 'N',       width: '64px', group: 'City',   groupStart: true });
    cols.push({ key: 'cityTop1Pct', label: 'Top 1 %', width: '80px', group: 'City' });
    cols.push({ key: 'cityTop2Pct', label: 'Top 2 %', width: '80px', group: 'City' });
    cols.push({ key: 'cityTop3Pct', label: 'Top 3 %', width: '80px', group: 'City' });
  }
  if (groups.includes('region')) {
    cols.push({ key: 'regionN',       label: 'N',       width: '64px', group: 'Region', groupStart: true });
    cols.push({ key: 'regionTop1Pct', label: 'Top 1 %', width: '80px', group: 'Region' });
    cols.push({ key: 'regionTop2Pct', label: 'Top 2 %', width: '80px', group: 'Region' });
    cols.push({ key: 'regionTop3Pct', label: 'Top 3 %', width: '80px', group: 'Region' });
  }
  if (groups.includes('network')) {
    cols.push({ key: 'networkN',       label: 'N',       width: '64px', group: 'Network', groupStart: true });
    cols.push({ key: 'networkTop1Pct', label: 'Top 1 %', width: '80px', group: 'Network' });
    cols.push({ key: 'networkTop2Pct', label: 'Top 2 %', width: '80px', group: 'Network' });
    cols.push({ key: 'networkTop3Pct', label: 'Top 3 %', width: '80px', group: 'Network' });
  }
  cols.push({ key: 'domain', label: 'Domain', width: '120px' });
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

function historyColumns(adminA: string, adminB: string) {
  return [
    { key: 'itemOrder', label: '#',    width: '40px',  minWidth: '40px' },
    { key: 'prompt',    label: 'Item', width: '320px', minWidth: '240px' },
    { key: 'aN',       label: 'N',       width: '64px', group: adminA, groupStart: true },
    { key: 'aTop1Pct', label: 'Top 1 %', width: '80px', group: adminA },
    { key: 'aTop2Pct', label: 'Top 2 %', width: '80px', group: adminA },
    { key: 'aTop3Pct', label: 'Top 3 %', width: '80px', group: adminA },
    { key: 'bN',       label: 'N',       width: '64px', group: adminB, groupStart: true },
    { key: 'bTop1Pct', label: 'Top 1 %', width: '80px', group: adminB },
    { key: 'bTop2Pct', label: 'Top 2 %', width: '80px', group: adminB },
    { key: 'bTop3Pct', label: 'Top 3 %', width: '80px', group: adminB },
    { key: 'domain',   label: 'Domain',  width: '120px' },
  ];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'results';
type AnyRow = CommentRow | ComparisonRow | HistoryRow;

interface Props {
  filterOptions: FilterOptions;
  schools: SchoolInfo[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardClient({ filterOptions, schools }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [compareAdmin, setCompareAdmin] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
  const [comparisonGroups, setComparisonGroups] = useState<ComparisonGroup[]>([]);
  const [formFilters, setFormFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  // ── Results state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');
  const [mode, setMode] = useState<ResultMode>('comments');
  const [rows, setRows] = useState<AnyRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capture admin labels at load time so tab labels don't change mid-session
  const [loadedAdminA, setLoadedAdminA] = useState('');
  const [loadedAdminB, setLoadedAdminB] = useState('');
  // ── Secondary filters (applied after initial load) ──────────────────────────
  const [secondaryFilters, setSecondaryFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const schoolSelected = selectedSchool !== null;
  const canLoad = selectedAdmin.length > 0;
  const otherAdmins = filterOptions.administration.filter((a) => a !== selectedAdmin);

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

  async function fetchResults(
    targetMode: ResultMode,
    secondary: ActiveFilters,
    adminA: string,
    adminB: string,
  ) {
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
            administration: adminA,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail?.message ?? body.error ?? `HTTP ${res.status}`);
        }
        setRows(await res.json());

      } else if (targetMode === 'history') {
        const res = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminA,
            adminB,
            domain: formFilters.domain,
            school: selectedSchool ? [selectedSchool.name] : [],
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail?.message ?? body.error ?? `HTTP ${res.status}`);
        }
        setRows(await res.json());

      } else {
        // comments — use secondary.administration if user has made a selection,
        // otherwise default to adminA (the loaded administration)
        const commentAdmins = secondary.administration.length > 0
          ? secondary.administration
          : (adminA ? [adminA] : []);
        const base = mergeFilters({ ...formFilters, administration: commentAdmins }, secondary);
        const filters = selectedSchool
          ? { ...base, school: [selectedSchool.name] }
          : base;
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
      schoolSelected && comparisonGroups.length > 0 ? 'comparison' :
      compareAdmin ? 'history' :
      'comments';
    setMode(initialMode);
    setLoadedAdminA(selectedAdmin);
    setLoadedAdminB(compareAdmin);
    setSecondaryFilters(EMPTY_FILTERS);
    setPhase('results');
    await fetchResults(initialMode, EMPTY_FILTERS, selectedAdmin, compareAdmin);
  }

  async function handleModeChange(newMode: ResultMode) {
    setMode(newMode);
    await fetchResults(newMode, secondaryFilters, loadedAdminA, loadedAdminB);
  }

  async function handleSecondaryFilterChange(updated: ActiveFilters) {
    setSecondaryFilters(updated);
    await fetchResults(mode, updated, loadedAdminA, loadedAdminB);
  }

  function handleReset() {
    setPhase('form');
    setRows(null);
    setError(null);
    setSecondaryFilters(EMPTY_FILTERS);
    setLoadedAdminA('');
    setLoadedAdminB('');
  }

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns =
    mode === 'comparison' ? comparisonColumns(comparisonGroups) :
    mode === 'history'    ? historyColumns(loadedAdminA, loadedAdminB) :
    COMMENTS_COLUMNS;

  const rowsAsRecords = (rows ?? []) as unknown as Record<string, unknown>[];

  // ── Render: Form phase ────────────────────────────────────────────────────────

  if (phase === 'form') {
    return (
      <div className="max-w-2xl space-y-6">

        {/* ── 1. Administration (required) ── */}
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#17345B] uppercase tracking-wide">
            Administration <span className="font-normal text-red-500 normal-case">*</span>
          </h2>
          <select
            value={selectedAdmin}
            onChange={(e) => {
              setSelectedAdmin(e.target.value);
              // Reset compare admin if it's now the same
              if (compareAdmin === e.target.value) setCompareAdmin('');
            }}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#17345B]"
          >
            <option value="">— Select an administration —</option>
            {filterOptions.administration.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Compare to prior administration (conditional) */}
          {selectedAdmin && otherAdmins.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#5E738C] mb-2">Compare to prior administration</p>
              <select
                value={compareAdmin}
                onChange={(e) => setCompareAdmin(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#17345B]"
              >
                <option value="">— None —</option>
                {otherAdmins.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── 2. School + comparison groups ── */}
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#17345B] uppercase tracking-wide">
            School <span className="font-normal text-[#5E738C] normal-case">(optional)</span>
          </h2>
          <select
            value={selectedSchool?.name ?? ''}
            onChange={(e) => handleSchoolChange(e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#17345B]"
          >
            <option value="">— All schools —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}{s.city ? ` · ${s.city}` : ''}
              </option>
            ))}
          </select>

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

        {/* ── 3. Domain filter ── */}
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#17345B] uppercase tracking-wide mb-3">
            Domain <span className="font-normal text-[#5E738C] normal-case">(optional)</span>
          </h2>
          <MultiSelect
            label="Domain"
            options={filterOptions.domain}
            selected={formFilters.domain}
            onChange={(v) => setFormFilters((f) => ({ ...f, domain: v }))}
          />
        </div>

        {/* ── Load button ── */}
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
          <p className="text-xs text-slate-400">Select an administration to continue.</p>
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
        {loadedAdminA && (
          <span className="bg-slate-100 text-slate-700 rounded-full px-3 py-1 text-xs font-medium">
            {loadedAdminA}
          </span>
        )}
        {loadedAdminB && (
          <span className="bg-slate-100 text-slate-500 rounded-full px-3 py-1 text-xs">
            vs {loadedAdminB}
          </span>
        )}
        {comparisonGroups.map((g) => (
          <span key={g} className="bg-[#255694] text-white rounded-full px-3 py-1 text-xs">
            vs {g.charAt(0).toUpperCase() + g.slice(1)}
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
          showHistory={Boolean(loadedAdminB)}
        />
        <div className="ml-auto">
          <DownloadButton
            rows={rowsAsRecords}
            columns={columns}
            filename={
              mode === 'comparison'
                ? csvFilename(selectedSchool?.name, loadedAdminA, 'comparison')
                : mode === 'history'
                  ? csvFilename(selectedSchool?.name, loadedAdminA, 'vs', loadedAdminB)
                  : csvFilename(selectedSchool?.name ?? 'all', loadedAdminA, 'comments')
            }
            disabled={!rows || rows.length === 0}
          />
        </div>
      </div>

      {/* Secondary filters (demographic slicers — post-load, comments only) */}
      {mode === 'comments' && (
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-3">
          <p className="text-xs text-[#5E738C] mb-2 font-medium">Refine by demographic</p>
          <div className="flex items-center flex-wrap gap-2">
            <MultiSelect
              label="Administration"
              options={[loadedAdminA, ...(loadedAdminB ? [loadedAdminB] : [])].filter(Boolean)}
              selected={secondaryFilters.administration}
              onChange={(v) => handleSecondaryFilterChange({ ...secondaryFilters, administration: v })}
            />
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
        <ResultsTable
          columns={columns}
          rows={rowsAsRecords}
          defaultSortKey={mode === 'comparison' || mode === 'history' ? 'itemOrder' : undefined}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a CSV filename: slug of parts + MMDDYY date. */
function csvFilename(...parts: (string | null | undefined)[]): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const slug = parts
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${slug}_${mm}${dd}${yy}.csv`;
}

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
