'use client';

/**
 * SchoolMultiSelect — grouped school picker with region-level checkboxes.
 *
 * - Schools grouped by region, sorted by city then name within region
 * - Region row: clicking selects/deselects all schools in that region
 * - Region checkbox shows indeterminate (dash) when partially selected
 * - Individual school rows with checkboxes
 * - Trigger button summarises current selection
 */

import { useState, useRef, useEffect } from 'react';
import type { SchoolInfo } from '@/lib/types';

interface Props {
  schools: SchoolInfo[];
  selected: SchoolInfo[];
  onChange: (schools: SchoolInfo[]) => void;
}

export default function SchoolMultiSelect({ schools, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build region map sorted by region name; schools sorted by city then name
  const regionMap = new Map<string, SchoolInfo[]>();
  for (const s of schools) {
    const r = s.region || 'Other';
    if (!regionMap.has(r)) regionMap.set(r, []);
    regionMap.get(r)!.push(s);
  }
  const regions = Array.from(regionMap.keys()).sort();
  for (const r of regions) {
    regionMap.get(r)!.sort((a, b) =>
      (a.city ?? '').localeCompare(b.city ?? '') || a.name.localeCompare(b.name)
    );
  }

  const selectedNames = new Set(selected.map((s) => s.name));

  function toggleSchool(school: SchoolInfo) {
    if (selectedNames.has(school.name)) {
      onChange(selected.filter((s) => s.name !== school.name));
    } else {
      onChange([...selected, school]);
    }
  }

  function toggleRegion(region: string) {
    const regionSchools = regionMap.get(region)!;
    const allSelected = regionSchools.every((s) => selectedNames.has(s.name));
    if (allSelected) {
      const regionNameSet = new Set(regionSchools.map((s) => s.name));
      onChange(selected.filter((s) => !regionNameSet.has(s.name)));
    } else {
      const toAdd = regionSchools.filter((s) => !selectedNames.has(s.name));
      onChange([...selected, ...toAdd]);
    }
  }

  function regionState(region: string): 'all' | 'some' | 'none' {
    const regionSchools = regionMap.get(region)!;
    const count = regionSchools.filter((s) => selectedNames.has(s.name)).length;
    if (count === 0) return 'none';
    if (count === regionSchools.length) return 'all';
    return 'some';
  }

  // Trigger label
  let triggerLabel: string;
  if (selected.length === 0) {
    triggerLabel = '';
  } else if (selected.length === 1) {
    const s = selected[0];
    triggerLabel = s.city ? `${s.name} · ${s.city}` : s.name;
  } else if (selected.length <= 3) {
    triggerLabel = selected.map((s) => s.name).join(', ');
  } else {
    triggerLabel = `${selected.length} schools selected`;
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-left bg-white focus:outline-none focus:border-[#17345B] flex items-center justify-between gap-2"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-800 truncate'}>
          {selected.length === 0 ? '— No school selected —' : triggerLabel}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {/* Clear row */}
          <div className="sticky top-0 bg-white border-b border-slate-100 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {selected.length === 0 ? 'Select schools or a region' : `${selected.length} selected`}
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-[#5E738C] hover:text-[#17345B] underline underline-offset-2"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Region groups */}
          {regions.map((region) => {
            const state = regionState(region);
            const regionSchools = regionMap.get(region)!;
            const selectedCount = regionSchools.filter((s) => selectedNames.has(s.name)).length;

            return (
              <div key={region}>
                {/* Region header row */}
                <button
                  type="button"
                  onClick={() => toggleRegion(region)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-50"
                >
                  {/* Checkbox */}
                  <span
                    className={[
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      state === 'all'  ? 'bg-[#17345B] border-[#17345B]' :
                      state === 'some' ? 'bg-[#17345B]/20 border-[#17345B]/60' :
                                         'border-slate-300 bg-white',
                    ].join(' ')}
                  >
                    {state === 'all' && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5 9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {state === 'some' && (
                      <span className="w-2 h-0.5 bg-[#17345B] rounded-full block" />
                    )}
                  </span>
                  <span className="text-xs font-bold text-[#17345B] uppercase tracking-wide flex-1">
                    {region}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {selectedCount}/{regionSchools.length}
                  </span>
                </button>

                {/* Individual schools */}
                {regionSchools.map((school) => {
                  const checked = selectedNames.has(school.name);
                  return (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => toggleSchool(school)}
                      className="w-full flex items-center gap-2.5 px-3 pl-9 py-1.5 hover:bg-slate-50 text-left"
                    >
                      <span
                        className={[
                          'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                          checked ? 'bg-[#17345B] border-[#17345B]' : 'border-slate-300 bg-white',
                        ].join(' ')}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5 9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className="text-sm text-slate-700 flex-1">{school.name}</span>
                      {school.city && (
                        <span className="text-xs text-slate-400">{school.city}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
