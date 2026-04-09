'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * A compact multi-select dropdown with checkboxes.
 * No external library dependencies.
 *
 * - Shows "(All)" when nothing is selected.
 * - Shows a count badge when some values are selected.
 * - Includes a "Clear" button to reset to all.
 * - Closes when clicking outside.
 *
 * Active/selected state uses brand.navy (#17345B).
 */
export default function MultiSelect({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const allSelected = selected.length === 0;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function clearAll() {
    onChange([]);
  }

  const buttonLabel = allSelected
    ? `${label}: All`
    : `${label}: ${selected.length}`;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm',
          'transition-colors select-none whitespace-nowrap',
          open
            ? 'border-[#17345B] bg-[#17345B]/5 text-[#17345B]'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
        ].join(' ')}
      >
        <span>{buttonLabel}</span>
        {!allSelected && (
          <span className="inline-flex items-center justify-center rounded-full bg-[#17345B] text-white text-xs w-4 h-4 font-medium">
            {selected.length}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-[#5E738C] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 min-w-[180px] max-w-xs bg-white border border-slate-200 rounded-md shadow-lg py-1">
          {/* Header row */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
            <span className="text-xs font-medium text-[#5E738C] uppercase tracking-wide">
              {label}
            </span>
            {!allSelected && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-[#17345B] hover:text-[#255694] font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {options.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400 italic">No options available</li>
            )}
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <li key={opt}>
                  <label className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-slate-50 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#17345B] focus:ring-[#17345B] focus:ring-offset-0 accent-[#17345B]"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
