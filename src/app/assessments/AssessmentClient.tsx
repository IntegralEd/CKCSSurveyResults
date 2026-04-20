'use client';

/**
 * AssessmentClient — interactive assessment results dashboard.
 *
 * Modes:
 *   1. No pre-selection (no URL params):   user picks both bank and school.
 *   2. bankAtId in URL:                    bank pre-selected, user picks school.
 *   3. lockedSchool prop set:              school locked (from school detail page),
 *                                          user must select a bank before loading.
 *
 * After selection: fetches AssessmentRow[] from POST /api/assessment/results,
 * then shows AssessmentChartPanel + table view.
 */

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AssessmentChartPanel from '@/components/AssessmentChartPanel';
import AssessmentItemModal, { ItemInfoButton } from '@/components/AssessmentItemModal';
import ResultsTable from '@/components/ResultsTable';
import type { AssessmentBank, AssessmentRow, AssessmentComparisonGroup } from '@/lib/assessmentTypes';
import type { UserContext } from '@/lib/types';

const LoadingOverlay = dynamic(() => import('@/components/LoadingOverlay'), { ssr: false });

// ─── Column definitions ───────────────────────────────────────────────────────

function assessmentTableColumns(groups: AssessmentComparisonGroup[]) {
  const cols: {
    key: string; label: string; width?: string; minWidth?: string;
    group?: string; groupStart?: boolean;
  }[] = [
    { key: 'itemOrder', label: '#',    width: '40px',  minWidth: '40px' },
    { key: 'itemPrompt', label: 'Item', width: '320px', minWidth: '240px' },
    // School
    { key: 'schoolN',              label: 'N',           width: '64px',  group: 'School',  groupStart: true },
    { key: 'schoolFullCreditPct',  label: 'Full %',      width: '80px',  group: 'School' },
    { key: 'schoolPartialCreditPct', label: 'Partial %', width: '80px',  group: 'School' },
    { key: 'schoolNoCreditPct',    label: 'No Credit %', width: '90px',  group: 'School' },
    { key: 'schoolBlankPct',       label: 'Blank %',     width: '80px',  group: 'School' },
  ];

  if (groups.includes('city')) {
    cols.push(
      { key: 'cityN',              label: 'N',           width: '64px', group: 'City', groupStart: true },
      { key: 'cityFullCreditPct',  label: 'Full %',      width: '80px', group: 'City' },
      { key: 'cityPartialCreditPct', label: 'Partial %', width: '80px', group: 'City' },
      { key: 'cityNoCreditPct',    label: 'No Credit %', width: '90px', group: 'City' },
    );
  }
  if (groups.includes('region')) {
    cols.push(
      { key: 'regionN',              label: 'N',           width: '64px', group: 'Region', groupStart: true },
      { key: 'regionFullCreditPct',  label: 'Full %',      width: '80px', group: 'Region' },
      { key: 'regionPartialCreditPct', label: 'Partial %', width: '80px', group: 'Region' },
      { key: 'regionNoCreditPct',    label: 'No Credit %', width: '90px', group: 'Region' },
    );
  }
  if (groups.includes('network')) {
    cols.push(
      { key: 'networkN',              label: 'N',           width: '64px', group: 'Network', groupStart: true },
      { key: 'networkFullCreditPct',  label: 'Full %',      width: '80px', group: 'Network' },
      { key: 'networkPartialCreditPct', label: 'Partial %', width: '80px', group: 'Network' },
      { key: 'networkNoCreditPct',    label: 'No Credit %', width: '90px', group: 'Network' },
    );
  }
  cols.push({ key: 'domains', label: 'Domain', width: '120px' });
  return cols;
}

// ─── Comparison group options ─────────────────────────────────────────────────

const ALL_GROUPS: { value: AssessmentComparisonGroup; label: string }[] = [
  { value: 'city',    label: 'City' },
  { value: 'region',  label: 'Region' },
  { value: 'network', label: 'Network' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'charts' | 'table';
type Phase = 'form' | 'results';

interface Props {
  banks: AssessmentBank[];
  schools: string[];
  defaultBankReportAtId: string;
  userContext: UserContext;
  lockedSchool?: string;        // when set, school selector is hidden and locked
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentClient({
  banks,
  schools: initialSchools,
  defaultBankReportAtId,
  userContext,
  lockedSchool,
}: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedBankAtId, setSelectedBankAtId] = useState(defaultBankReportAtId);
  const [selectedSchool, setSelectedSchool] = useState(lockedSchool ?? '');
  const [comparisonGroups, setComparisonGroups] = useState<AssessmentComparisonGroup[]>([]);
  // Schools available for the current bank (re-fetched when bank changes)
  const [availableSchools, setAvailableSchools] = useState<string[]>(initialSchools);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // ── Results state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');
  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [rows, setRows] = useState<AssessmentRow[] | null>(null);
  const [loadedSchool, setLoadedSchool] = useState('');
  const [loadedBankId, setLoadedBankId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Item detail modal ───────────────────────────────────────────────────────
  const [modalRow, setModalRow] = useState<AssessmentRow | null>(null);

  // ── Permission-derived values ────────────────────────────────────────────────
  const acct = userContext?.accountType ?? '';
  const showDebug = acct === 'Site_Admin' || acct === '';

  // Filter schools by permission
  const visibleSchools: string[] = (() => {
    if (acct === 'Site_Admin' || acct === '') return availableSchools;
    const assigned = userContext?.assignedSchools ?? [];
    if (assigned.length > 0) {
      return availableSchools.filter((s) => assigned.includes(s));
    }
    return availableSchools;
  })();

  // The selected bank object (for display name)
  const selectedBank = banks.find((b) => b.reportAtId === selectedBankAtId);

  // ── Bank change handler: re-fetch school list for that bank ──────────────────
  const handleBankChange = useCallback(async (bankAtId: string) => {
    setSelectedBankAtId(bankAtId);
    if (!lockedSchool) setSelectedSchool('');
    if (!bankAtId) {
      setAvailableSchools(initialSchools);
      return;
    }
    setSchoolsLoading(true);
    try {
      const res = await fetch(`/api/assessment/filters?bankAtId=${encodeURIComponent(bankAtId)}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSchools(data.schools ?? []);
      }
    } catch {
      // keep current list on error
    } finally {
      setSchoolsLoading(false);
    }
  }, [lockedSchool, initialSchools]);

  // ── Submit handler ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedBankAtId || !selectedSchool) return;
    setLoading(true);
    setError(null);
    setPhase('results');
    try {
      const res = await fetch('/api/assessment/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankReportAtId: selectedBankAtId,
          schoolExtract: selectedSchool,
          comparisonGroups,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: AssessmentRow[] = await res.json();
      setRows(data);
      setLoadedSchool(selectedSchool);
      setLoadedBankId(selectedBankAtId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('form');
    } finally {
      setLoading(false);
    }
  }, [selectedBankAtId, selectedSchool, comparisonGroups]);

  // ── Toggle comparison group ──────────────────────────────────────────────────
  const toggleGroup = useCallback((g: AssessmentComparisonGroup) => {
    setComparisonGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }, []);

  // ── Loaded bank info ─────────────────────────────────────────────────────────
  const loadedBank = banks.find((b) => b.reportAtId === loadedBankId);

  // ── Results as generic rows for table ────────────────────────────────────────
  const tableRows: Record<string, unknown>[] = (rows ?? []).map((r) => ({
    ...r,
    domains: r.domains.join(', '),
  }));

  const canSubmit = !!selectedBankAtId && !!selectedSchool;

  return (
    <div className="space-y-6">
      {loading && <LoadingOverlay message="Loading assessment results…" />}

      {/* ── Selection form ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bank selector */}
          <div>
            <label className="block text-xs font-semibold text-[#17345B] mb-1">
              Assessment
            </label>
            <select
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17345B]/30"
              value={selectedBankAtId}
              onChange={(e) => handleBankChange(e.target.value)}
            >
              <option value="">— Select assessment —</option>
              {banks.map((b) => (
                <option key={b.id} value={b.reportAtId}>
                  {b.assessmentId}{b.gradeLevel ? ` (${b.gradeLevel})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* School selector — hidden when lockedSchool */}
          {!lockedSchool ? (
            <div>
              <label className="block text-xs font-semibold text-[#17345B] mb-1">
                School{schoolsLoading ? ' (loading…)' : ''}
              </label>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17345B]/30 disabled:opacity-50"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                disabled={!selectedBankAtId || schoolsLoading}
              >
                <option value="">— Select school —</option>
                {visibleSchools.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#17345B] mb-1">School</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {lockedSchool}
              </div>
            </div>
          )}
        </div>

        {/* Comparison groups */}
        <div>
          <div className="text-xs font-semibold text-[#17345B] mb-2">Compare with</div>
          <div className="flex flex-wrap gap-3">
            {ALL_GROUPS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-[#17345B]"
                  checked={comparisonGroups.includes(value)}
                  onChange={() => toggleGroup(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded bg-[#17345B] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#255694] transition-colors"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            Load Results
          </button>
          {phase === 'results' && (
            <button
              className="px-4 py-2 rounded border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => { setPhase('form'); setRows(null); }}
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {phase === 'results' && rows && rows.length > 0 && (
        <div className="space-y-4">
          {/* View toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
              {(['charts', 'table'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewMode(v)}
                  className={[
                    'px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                    viewMode === v
                      ? 'bg-[#17345B] text-white shadow-sm'
                      : 'text-[#5E738C] hover:text-[#17345B] hover:bg-slate-200',
                  ].join(' ')}
                >
                  {v === 'charts' ? 'Charts' : 'Table'}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              {rows.length} item{rows.length !== 1 ? 's' : ''}
            </div>
          </div>

          {viewMode === 'charts' && (
            <AssessmentChartPanel
              rows={rows}
              groups={comparisonGroups}
              school={{ name: loadedSchool }}
              assessmentId={loadedBank?.assessmentId ?? loadedBankId}
              onItemInfo={setModalRow}
            />
          )}

          {viewMode === 'table' && (
            <ResultsTable
              columns={assessmentTableColumns(comparisonGroups)}
              rows={tableRows}
              renderCell={(colKey, val, row) => {
                if (colKey !== 'itemOrder') return undefined;
                const order = val as number;
                const srcRow = rows.find((r) => r.itemOrder === order);
                return (
                  <span className="inline-flex items-center justify-center gap-1">
                    <span className="text-slate-400 tabular-nums">{order}</span>
                    {srcRow?.detail && (
                      <ItemInfoButton
                        onClick={() => setModalRow(srcRow)}
                        label={`View detail for item ${order}`}
                      />
                    )}
                  </span>
                );
              }}
            />
          )}
        </div>
      )}

      {/* Item detail modal */}
      {modalRow?.detail && (
        <AssessmentItemModal
          item={modalRow.detail}
          itemOrder={modalRow.itemOrder}
          assessmentId={modalRow.assessmentId}
          onClose={() => setModalRow(null)}
        />
      )}

      {phase === 'results' && rows && rows.length === 0 && (
        <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded p-4">
          No results found for the selected school and assessment.
          Check that data exists in Assessment_Results_School_Item for this combination.
        </div>
      )}

      {/* Debug panel */}
      {showDebug && phase === 'results' && (
        <details className="text-xs text-slate-400 border border-slate-100 rounded p-3">
          <summary className="cursor-pointer font-semibold">Debug</summary>
          <div className="mt-2 space-y-1">
            <div>bankReportAtId: {loadedBankId}</div>
            <div>schoolExtract: {loadedSchool}</div>
            <div>rows: {rows?.length ?? 0}</div>
            <div>comparisonGroups: {comparisonGroups.join(', ') || 'none'}</div>
            <div>accountType: {userContext.accountType || '(none)'}</div>
          </div>
        </details>
      )}
    </div>
  );
}
