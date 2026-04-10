'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TabToggle from '@/components/TabToggle';
import ResultsTable from '@/components/ResultsTable';
import ChartPanel from '@/components/ChartPanel';
import DownloadButton from '@/components/DownloadButton';
import MultiSelect from '@/components/MultiSelect';
import SchoolMultiSelect from '@/components/SchoolMultiSelect';

const LoadingOverlay = dynamic(() => import('@/components/LoadingOverlay'), { ssr: false });
import type {
  FilterOptions,
  ActiveFilters,
  ResultMode,
  CommentRow,
  ComparisonRow,
  HistoryRow,
  ComparisonGroup,
  SchoolInfo,
  UserContext,
} from '@/lib/types';

// ─── Column definitions ───────────────────────────────────────────────────────

const COMMENTS_COLUMNS = [
  { key: 'administration', label: 'Administration', width: '120px' },
  { key: 'school',         label: 'Region',         width: '120px' },
  { key: 'prompt',         label: 'Item',           width: '320px', minWidth: '240px' },
  { key: 'commentText',    label: 'Response',       width: '400px', minWidth: '280px' },
];

function comparisonColumns(groups: ComparisonGroup[], multiSchool = false) {
  const cols: { key: string; label: string; width?: string; minWidth?: string; group?: string; groupStart?: boolean }[] = [];
  if (multiSchool) {
    cols.push({ key: 'schoolName', label: 'School', width: '140px', minWidth: '120px' });
  }
  cols.push(
    { key: 'itemOrder', label: '#',    width: '40px',  minWidth: '40px' },
    { key: 'prompt',    label: 'Item', width: '320px', minWidth: '240px' },
  );
  if (multiSchool) {
    cols.push({ key: 'schoolN',       label: 'N',       width: '64px' });
    cols.push({ key: 'schoolTop1Pct', label: 'Top 1 %', width: '80px' });
    cols.push({ key: 'schoolTop2Pct', label: 'Top 2 %', width: '80px' });
    cols.push({ key: 'schoolTop3Pct', label: 'Top 3 %', width: '80px' });
  } else {
    cols.push({ key: 'schoolN',       label: 'N',       width: '64px', group: 'School', groupStart: true });
    cols.push({ key: 'schoolTop1Pct', label: 'Top 1 %', width: '80px', group: 'School' });
    cols.push({ key: 'schoolTop2Pct', label: 'Top 2 %', width: '80px', group: 'School' });
    cols.push({ key: 'schoolTop3Pct', label: 'Top 3 %', width: '80px', group: 'School' });
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

// ─── applyGroupBy helper ──────────────────────────────────────────────────────

function applyGroupBy(
  rawRows: Record<string, unknown>[],
  groupBy: 'item' | 'domain' | 'school'
): Record<string, unknown>[] {
  if (groupBy === 'item') {
    return [...rawRows].sort((a, b) => Number(a.itemOrder ?? 0) - Number(b.itemOrder ?? 0));
  }
  if (groupBy === 'domain') {
    const sorted = [...rawRows].sort((a, b) => {
      const da = String(a.domain ?? '');
      const db = String(b.domain ?? '');
      // Empty domain (open-ended / uncategorized) always sorts last
      if (!da && db) return 1;
      if (da && !db) return -1;
      return da.localeCompare(db) || Number(a.itemOrder ?? 0) - Number(b.itemOrder ?? 0);
    });
    const result: Record<string, unknown>[] = [];
    let lastDomain = '';
    for (const row of sorted) {
      const d = String(row.domain ?? '');
      if (d !== lastDomain) {
        result.push({ _sectionHeader: true, _label: d || 'Open Ended / Uncategorized' });
        lastDomain = d;
      }
      result.push(row);
    }
    return result;
  }
  if (groupBy === 'school') {
    const sorted = [...rawRows].sort((a, b) =>
      String(a.schoolName ?? '').localeCompare(String(b.schoolName ?? '')) ||
      Number(a.itemOrder ?? 0) - Number(b.itemOrder ?? 0)
    );
    const result: Record<string, unknown>[] = [];
    let lastSchool = '';
    for (const row of sorted) {
      const s = String(row.schoolName ?? '');
      if (s !== lastSchool) {
        result.push({ _sectionHeader: true, _label: s || 'Unknown School' });
        lastSchool = s;
      }
      result.push(row);
    }
    return result;
  }
  return rawRows;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'results';
type AnyRow = CommentRow | ComparisonRow | HistoryRow;

interface Props {
  filterOptions: FilterOptions;
  schools: SchoolInfo[];
  userContext?: UserContext;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardClient({ filterOptions, schools, userContext }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [compareAdmin, setCompareAdmin] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<SchoolInfo[]>([]);
  const [comparisonGroups, setComparisonGroups] = useState<ComparisonGroup[]>([]);
  const [formFilters, setFormFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  // ── Results state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');
  const [mode, setMode] = useState<ResultMode>('comments');
  const [groupBy, setGroupBy] = useState<'item' | 'domain' | 'school'>('item');
  const [rows, setRows] = useState<AnyRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capture admin labels at load time so tab labels don't change mid-session
  const [loadedAdminA, setLoadedAdminA] = useState('');
  const [loadedAdminB, setLoadedAdminB] = useState('');
  // ── Secondary filters (applied after initial load) ──────────────────────────
  const [secondaryFilters, setSecondaryFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  // ── Hydration gate ───────────────────────────────────────────────────────────
  // Show loading overlay until client hydration completes (covers iframe load experience)
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Permission-derived values ────────────────────────────────────────────────

  const acct = userContext?.accountType ?? '';

  /**
   * Schools visible in the picker — driven by School_Access_Formula (assignedSchools).
   *
   * Site_Admin and unauthenticated (dev) users always see all schools.
   * All other account types are limited to the schools in assignedSchools,
   * which Airtable pre-computes as the union of direct assignments + region assignments.
   * Falls back to all schools when assignedSchools is empty (unset in Airtable).
   */
  const visibleSchools: SchoolInfo[] = (() => {
    if (acct === 'Site_Admin' || acct === '') return schools;
    const assigned = userContext?.assignedSchools ?? [];
    if (assigned.length > 0) {
      return schools.filter((s) => assigned.includes(s.name));
    }
    return schools;
  })();

  /** School_User cannot change their school selection */
  const isSchoolLocked = acct === 'School_User';

  /** Site_Admin (and unauthenticated dev) see the debug panel */
  const showDebug = acct === 'Site_Admin' || acct === '';

  // Pre-select schools for School_User and complete hydration
  useEffect(() => {
    if (acct === 'School_User' && (userContext?.assignedSchools.length ?? 0) > 0 && selectedSchools.length === 0) {
      const preselected = schools.filter((s) => userContext!.assignedSchools.includes(s.name));
      if (preselected.length > 0) setSelectedSchools(preselected);
    }
    setIsHydrated(true);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const schoolSelected = selectedSchools.length > 0;
  const canLoad = selectedAdmin.length > 0;
  const otherAdmins = filterOptions.administration.filter((a) => a !== selectedAdmin);
  const isMultiSchool = selectedSchools.length > 1;

  // Comparison groups unlock only for a single school selection
  function groupEnabled(group: ComparisonGroup): boolean {
    if (selectedSchools.length !== 1) return false;
    const s = selectedSchools[0];
    if (group === 'city')    return Boolean(s?.city);
    if (group === 'region')  return Boolean(s?.city || s?.region);
    if (group === 'network') return true;
    return false;
  }

  function toggleComparisonGroup(group: ComparisonGroup) {
    setComparisonGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  function handleSchoolsChange(newSchools: SchoolInfo[]) {
    setSelectedSchools(newSchools);
    if (newSchools.length > 1) {
      // Multi-school: disable comparison groups
      setComparisonGroups([]);
    } else if (newSchools.length === 1) {
      // Single school: clear groups no longer valid for this school
      const s = newSchools[0];
      setComparisonGroups((prev) =>
        prev.filter((g) => {
          if (g === 'city')   return Boolean(s?.city);
          if (g === 'region') return Boolean(s?.city || s?.region);
          return true;
        })
      );
    } else {
      setComparisonGroups([]);
    }
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
      if ((targetMode === 'comparison' || targetMode === 'charts') && selectedSchools.length > 0) {
        const res = await fetch('/api/comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolTxt: selectedSchools.map((s) => s.name),
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
            school: selectedSchools.length > 0 ? [selectedSchools[0].name] : [],
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
        const filters = selectedSchools.length > 0
          ? { ...base, school: selectedSchools.map((s) => s.name) }
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
      (schoolSelected && (comparisonGroups.length > 0 || isMultiSchool)) ? 'comparison' :
      compareAdmin ? 'history' :
      'comments';
    setMode(initialMode);
    setGroupBy('item');
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
    mode === 'comparison' || mode === 'charts' ? comparisonColumns(comparisonGroups, isMultiSchool) :
    mode === 'history'                         ? historyColumns(loadedAdminA, loadedAdminB) :
    COMMENTS_COLUMNS;

  const rawRowsAsRecords = (rows ?? []) as unknown as Record<string, unknown>[];
  const rowsAsRecords = (mode === 'comparison' || mode === 'history')
    ? applyGroupBy(rawRowsAsRecords, groupBy)
    : rawRowsAsRecords;

  // ── Render: hydration loading overlay ────────────────────────────────────────

  if (!isHydrated) {
    return <LoadingOverlay message="Loading dashboard…" />;
  }

  // ── Render: Form phase ────────────────────────────────────────────────────────

  if (phase === 'form') {
    return (
      <div className="max-w-2xl space-y-6">

        {/* ── Debug: user context (Site_Admin / dev only) ── */}
        {showDebug && userContext && (
          <details
            className="rounded-lg border text-xs"
            style={{ borderColor: 'rgba(23,52,91,0.15)', background: 'rgba(23,52,91,0.03)' }}
          >
            <summary
              className="px-4 py-2 cursor-pointer font-semibold select-none"
              style={{ color: '#17345B' }}
            >
              User Context
              {userContext.email && (
                <span className="ml-2 font-normal" style={{ color: '#5E738C' }}>
                  — {userContext.email}
                </span>
              )}
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-2 font-mono" style={{ color: '#5E738C' }}>
              <div>
                <span className="font-sans font-semibold" style={{ color: '#17345B' }}>accountType: </span>
                <span className="rounded px-1.5 py-0.5" style={{ background: '#17345B', color: '#fff' }}>
                  {userContext.accountType || '(none — full access)'}
                </span>
              </div>
              <div>
                <span className="font-sans font-semibold" style={{ color: '#17345B' }}>assignedSchools </span>
                <span className="text-slate-400">({userContext.assignedSchools.length})</span>
                <span className="font-sans">: </span>
                {userContext.assignedSchools.length === 0
                  ? <span className="text-slate-400">—</span>
                  : userContext.assignedSchools.map((s) => (
                      <span
                        key={s}
                        className="inline-block rounded mr-1 mt-1 px-2 py-0.5"
                        style={{ background: '#255694', color: '#fff' }}
                      >
                        {s}
                      </span>
                    ))
                }
              </div>
              <div>
                <span className="font-sans font-semibold" style={{ color: '#17345B' }}>assignedRegions </span>
                <span className="text-slate-400">({userContext.assignedRegions.length})</span>
                <span className="font-sans">: </span>
                {userContext.assignedRegions.length === 0
                  ? <span className="text-slate-400">—</span>
                  : userContext.assignedRegions.map((r) => (
                      <span
                        key={r}
                        className="inline-block rounded mr-1 mt-1 px-2 py-0.5"
                        style={{ background: '#BCD631', color: '#17345B' }}
                      >
                        {r}
                      </span>
                    ))
                }
              </div>
              <div>
                <span className="font-sans font-semibold" style={{ color: '#17345B' }}>visibleSchools </span>
                <span className="text-slate-400">({visibleSchools.length} of {schools.length})</span>
              </div>
              <div className="font-sans pt-1">
                <a
                  href="/admin/debug"
                  className="underline underline-offset-2 text-xs"
                  style={{ color: '#5E738C' }}
                >
                  → Full debug page
                </a>
              </div>
            </div>
          </details>
        )}

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

            <SchoolMultiSelect
            schools={visibleSchools}
            selected={selectedSchools}
            onChange={handleSchoolsChange}
            disabled={isSchoolLocked}
            lockedNote={isSchoolLocked ? 'School access is managed by your account permissions.' : undefined}
          />

          <div>
            <p className="text-xs font-medium text-[#5E738C] mb-2">
              Compare to
              {!schoolSelected && <span className="ml-1 text-slate-400">(select a school to unlock)</span>}
              {isMultiSchool && <span className="ml-1 text-slate-400">(disabled in multi-school mode)</span>}
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

          {isMultiSchool && (
            <p className="text-xs text-slate-400">
              {selectedSchools.length} schools selected — City/Region/Network comparison disabled. Results grouped by item by default.
            </p>
          )}
        </div>

        {/* ── 3. Respondent filters (domain, gender, race) ── */}
        <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#17345B] uppercase tracking-wide mb-1">
              Filters <span className="font-normal text-[#5E738C] normal-case">(optional)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Gender and race apply to Open Responses and History. Pre-aggregated school results are not filtered by demographics.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <MultiSelect
              label="Domain"
              options={filterOptions.domain}
              selected={formFilters.domain}
              onChange={(v) => setFormFilters((f) => ({ ...f, domain: v }))}
            />
            <MultiSelect
              label="Gender"
              options={filterOptions.gender}
              selected={formFilters.gender}
              onChange={(v) => setFormFilters((f) => ({ ...f, gender: v }))}
            />
            <MultiSelect
              label="Race"
              options={filterOptions.race}
              selected={formFilters.race}
              onChange={(v) => setFormFilters((f) => ({ ...f, race: v }))}
            />
          </div>
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
        {selectedSchools.map((s, i) => (
          <span
            key={s.name}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === 0 ? 'bg-[#17345B] text-white' : 'bg-[#255694] text-white'
            }`}
          >
            {s.name}
          </span>
        ))}
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
        {formFilters.gender.map((g) => (
          <span key={g} className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs">
            {g}
          </span>
        ))}
        {formFilters.race.map((r) => (
          <span key={r} className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs">
            {r}
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

      {/* Tab toggle + group by toggle + download */}
      <div className="flex items-center gap-4 flex-wrap">
        <TabToggle
          mode={mode}
          onChange={handleModeChange}
          showComparison={schoolSelected && (comparisonGroups.length > 0 || isMultiSchool)}
          showHistory={Boolean(loadedAdminB)}
        />

        {/* Group by toggle */}
        {(mode === 'comparison' || mode === 'charts' || mode === 'history') && (
          <div
            role="group"
            aria-label="Group by"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5"
          >
            <span className="px-2 text-xs text-slate-500 font-medium">Group by</span>
            {(['item', 'domain', ...(isMultiSchool ? ['school'] : [])] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setGroupBy(opt as 'item' | 'domain' | 'school')}
                className={[
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                  groupBy === opt
                    ? 'bg-[#17345B] text-white shadow-sm'
                    : 'text-[#5E738C] hover:text-[#17345B] hover:bg-slate-200',
                ].join(' ')}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {mode === 'charts' ? (
            <button
              type="button"
              onClick={() => {
                const name = csvFilename(selectedSchools[0]?.name, loadedAdminA, 'charts');
                const prev = document.title;
                document.title = name.replace(/\.csv$/, '');
                document.body.classList.add('print-charts');
                window.print();
                document.body.classList.remove('print-charts');
                document.title = prev;
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#17345B] text-white hover:bg-[#255694] transition-colors"
            >
              Download PDF
            </button>
          ) : (
            <DownloadButton
              rows={rowsAsRecords.filter((r) => !r._sectionHeader)}
              columns={columns}
              filename={
                mode === 'history'
                  ? csvFilename(selectedSchools[0]?.name, loadedAdminA, 'vs', loadedAdminB)
                  : csvFilename(selectedSchools[0]?.name ?? 'all', loadedAdminA, mode)
              }
              disabled={!rows || rows.length === 0}
            />
          )}
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

      {/* Pre-aggregation note — shown when gender/race filters are active in comparison/charts */}
      {(mode === 'comparison' || mode === 'charts') &&
        (formFilters.gender.length > 0 || formFilters.race.length > 0) && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
          Gender and race filters are not applied to pre-aggregated school results (Table and Charts views). They apply only to Open Responses and History.
        </div>
      )}

      {/* Loading overlay */}
      {loading && <LoadingOverlay message="Loading results…" />}
      {!loading && error && (
        <div className="py-6 text-center text-red-600 text-sm">Error: {error}</div>
      )}
      {!loading && !error && rows !== null && rows.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          No results found for the selected filters.
        </div>
      )}

      {/* Charts view */}
      {!loading && !error && rows !== null && rows.length > 0 && mode === 'charts' && (
        <ChartPanel
          rows={rows as import('@/lib/types').ComparisonRow[]}
          groups={comparisonGroups}
          school={{
            name:   selectedSchools[0]?.name   ?? 'School',
            city:   selectedSchools[0]?.city   ?? undefined,
            region: selectedSchools[0]?.region ?? undefined,
          }}
        />
      )}

      {/* Table view — all modes except charts */}
      {!loading && !error && rows !== null && rows.length > 0 && mode !== 'charts' && (
        <ResultsTable
          columns={columns}
          rows={rowsAsRecords}
          defaultSortKey={mode === 'comparison' || mode === 'history' ? 'itemOrder' : undefined}
          disableSort={groupBy !== 'item'}
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
