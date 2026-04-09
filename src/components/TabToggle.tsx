'use client';

import type { ResultMode } from '@/lib/types';

interface Props {
  mode: ResultMode;
  onChange: (mode: ResultMode) => void;
  showComparison?: boolean;
}

const BASE_TABS: { mode: ResultMode; label: string }[] = [
  { mode: 'comments', label: 'Open Responses' },
];

const COMPARISON_TAB: { mode: ResultMode; label: string } = {
  mode: 'comparison', label: 'Comparison',
};

export default function TabToggle({ mode, onChange, showComparison = false }: Props) {
  const tabs = showComparison ? [COMPARISON_TAB, ...BASE_TABS] : BASE_TABS;

  return (
    <div
      role="tablist"
      aria-label="Result mode"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5"
    >
      {tabs.map((tab) => {
        const isActive = tab.mode === mode;
        return (
          <button
            key={tab.mode}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.mode)}
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-[#17345B] text-white shadow-sm'
                : 'text-[#5E738C] hover:text-[#17345B] hover:bg-slate-200',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
