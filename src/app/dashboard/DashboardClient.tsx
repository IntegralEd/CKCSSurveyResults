'use client';

import { useState, useEffect, useCallback } from 'react';
import FilterBar from '@/components/FilterBar';
import TabToggle from '@/components/TabToggle';
import ResultsTable from '@/components/ResultsTable';
import DownloadButton from '@/components/DownloadButton';
import type {
  FilterOptions,
  ActiveFilters,
  ResultMode,
  AgreementRow,
  TopNRow,
  CommentRow,
} from '@/lib/types';

// ─── Column definitions per mode ─────────────────────────────────────────────

const AGREEMENT_COLUMNS = [
  { key: 'domain', label: 'Domain' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'n', label: 'N' },
  { key: 'top2Pct', label: 'Top 2 %' },
  { key: 'top3Pct', label: 'Top 3 %' },
];

const TOPN_COLUMNS = [
  { key: 'domain', label: 'Domain' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'n', label: 'N' },
  { key: 'top2Pct', label: 'Top 2 %' },
  { key: 'top3Pct', label: 'Top 3 %' },
];

const COMMENTS_COLUMNS = [
  { key: 'administration', label: 'Administration' },
  { key: 'school', label: 'School' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'commentText', label: 'Response' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  filterOptions: FilterOptions;
}

const EMPTY_FILTERS: ActiveFilters = {
  administration: [],
  school: [],
  region: [],
  race: [],
  gender: [],
  grade: [],
  domain: [],
};

export default function DashboardClient({ filterOptions }: Props) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [mode, setMode] = useState<ResultMode>('agreement');
  const [rows, setRows] = useState<
    AgreementRow[] | TopNRow[] | CommentRow[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondentCount, setRespondentCount] = useState<number | null>(null);

  const fetchResults = useCallback(
    async (filters: ActiveFilters, currentMode: ResultMode) => {
      setLoading(true);
      setError(null);

      try {
        if (currentMode === 'comments') {
          const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: CommentRow[] = await res.json();
          setRows(data);
          setRespondentCount(null);
        } else {
          const res = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters, mode: currentMode }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: AgreementRow[] | TopNRow[] = await res.json();
          setRows(data);
          // n from the first row is a proxy for respondent count
          setRespondentCount(data.length > 0 ? (data[0] as AgreementRow).n : 0);
        }
      } catch (err) {
        setError(String(err));
        setRows(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Trigger a fetch whenever filters or mode change.
  useEffect(() => {
    fetchResults(activeFilters, mode);
  }, [activeFilters, mode, fetchResults]);

  const handleFilterChange = (updated: ActiveFilters) => {
    setActiveFilters(updated);
  };

  const handleModeChange = (newMode: ResultMode) => {
    setMode(newMode);
  };

  const columns =
    mode === 'comments'
      ? COMMENTS_COLUMNS
      : mode === 'topn'
      ? TOPN_COLUMNS
      : AGREEMENT_COLUMNS;

  const rowsAsRecords = (rows ?? []) as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <FilterBar
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onChange={handleFilterChange}
      />

      {/* Controls row: tab toggle + respondent count badge + download */}
      <div className="flex items-center gap-4 flex-wrap">
        <TabToggle mode={mode} onChange={handleModeChange} />

        {respondentCount !== null && mode !== 'comments' && (
          <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
            N = {respondentCount.toLocaleString()}
          </span>
        )}

        <div className="ml-auto">
          <DownloadButton
            rows={rowsAsRecords}
            columns={columns}
            filename={`ckcs-survey-${mode}.csv`}
            disabled={!rows || rows.length === 0}
          />
        </div>
      </div>

      {/* Status messages */}
      {loading && (
        <div className="py-12 text-center text-slate-500 text-sm">
          Loading results…
        </div>
      )}

      {!loading && error && (
        <div className="py-6 text-center text-red-600 text-sm">
          Error: {error}
        </div>
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
          sortable
        />
      )}
    </div>
  );
}
