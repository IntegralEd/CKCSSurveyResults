'use client';

import MultiSelect from './MultiSelect';
import type { FilterOptions, ActiveFilters } from '@/lib/types';

interface Props {
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  onChange: (updated: ActiveFilters) => void;
}

/**
 * Renders one MultiSelect dropdown per slicer field, plus a Domain filter.
 * All dropdowns sit in a horizontal flex-wrap row.
 *
 * Calling onChange with an updated copy of ActiveFilters — parent owns state.
 */
export default function FilterBar({ filterOptions, activeFilters, onChange }: Props) {
  function update<K extends keyof ActiveFilters>(field: K, values: string[]) {
    onChange({ ...activeFilters, [field]: values });
  }

  const anyActive = Object.values(activeFilters).some((v) => v.length > 0);

  return (
    <div className="bg-white border border-[rgba(23,52,91,0.10)] rounded-lg p-3">
      <div className="flex items-center flex-wrap gap-2">
        <MultiSelect
          label="Administration"
          options={filterOptions.administration}
          selected={activeFilters.administration}
          onChange={(v) => update('administration', v)}
        />
        <MultiSelect
          label="School"
          options={filterOptions.school}
          selected={activeFilters.school}
          onChange={(v) => update('school', v)}
        />
        <MultiSelect
          label="Region"
          options={filterOptions.region}
          selected={activeFilters.region}
          onChange={(v) => update('region', v)}
        />
        <MultiSelect
          label="Grade"
          options={filterOptions.grade}
          selected={activeFilters.grade}
          onChange={(v) => update('grade', v)}
        />
        <MultiSelect
          label="Gender"
          options={filterOptions.gender}
          selected={activeFilters.gender}
          onChange={(v) => update('gender', v)}
        />
        <MultiSelect
          label="Race"
          options={filterOptions.race}
          selected={activeFilters.race}
          onChange={(v) => update('race', v)}
        />
        <MultiSelect
          label="Domain"
          options={filterOptions.domain}
          selected={activeFilters.domain}
          onChange={(v) => update('domain', v)}
        />

        {/* Reset all filters */}
        {anyActive && (
          <button
            type="button"
            onClick={() =>
              onChange({
                administration: [],
                school: [],
                region: [],
                race: [],
                gender: [],
                grade: [],
                domain: [],
              })
            }
            className="ml-2 text-xs text-[#5E738C] hover:text-[#17345B] underline underline-offset-2 transition-colors"
          >
            Reset all
          </button>
        )}
      </div>
    </div>
  );
}
