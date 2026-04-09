'use client';

import type { ResultMode } from '@/lib/types';

interface Props {
  mode: ResultMode;
  onChange: (mode: ResultMode) => void;
}

const TABS: { mode: ResultMode; label: string }[] = [
  { mode: 'agreement', label: 'Agreement' },
  { mode: 'topn', label: 'Top 2/3' },
  { mode: 'comments', label: 'Open Responses' },
];

/**
 * Three-way toggle: Agreement | Top 2/3 | Open Responses.
 * Active tab: brand.navy background with white text.
 * Inactive tabs: brand.slate text, brand.navy on hover.
 */
export default function TabToggle({ mode, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Result mode"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5"
    >
      {TABS.map((tab) => {
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
