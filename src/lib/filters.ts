/**
 * lib/filters.ts
 *
 * Fetch filter option lists and apply multi-select filter logic to respondents.
 * Server-only.
 *
 * Real Airtable field names confirmed from schema registry.
 */
import { fetchRespondents, fetchItems, SLICER_FIELDS } from './airtable';
import type { FilterOptions, ActiveFilters, SurveyRespondent } from './types';

/**
 * The slicer fields we request when only building the filter option lists.
 * Uses the confirmed field names from SLICER_FIELDS.
 */
const SLICER_FIELD_NAMES = [
  'Respondent_Key',
  SLICER_FIELDS.administration,   // 'Survey_Admin'
  SLICER_FIELDS.school,           // 'School_Name (from School_Link)'
  SLICER_FIELDS.region,           // 'Region (from School_Link)'
  SLICER_FIELDS.race,             // 'Race_Multiselect'
  SLICER_FIELDS.gender,           // 'Gender_Select'
  SLICER_FIELDS.grade,            // 'Select Your Grade'
] as const;

/**
 * Fetches all unique values for each slicer field from Survey_Respondents,
 * plus all unique domain values from Survey_Items.Category_Select.
 *
 * Notes on multi-value fields:
 *   - Race_Multiselect (multipleSelects): each respondent may have multiple values.
 *     We flatten all values into a single unique set.
 *   - Gender_Select (multipleSelects): same treatment.
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  const [respondents, items] = await Promise.all([
    fetchRespondents([...SLICER_FIELD_NAMES]),
    fetchItems(),
  ]);

  const sets: Record<string, Set<string>> = {
    administration: new Set(),
    school: new Set(),
    region: new Set(),
    race: new Set(),
    gender: new Set(),
    grade: new Set(),
  };

  for (const r of respondents) {
    if (r.administration) sets.administration.add(r.administration);
    if (r.school) sets.school.add(r.school);
    if (r.region) sets.region.add(r.region);
    // Race_Multiselect and Gender_Select are arrays — flatten unique values
    for (const v of r.race) if (v) sets.race.add(v);
    for (const v of r.gender) if (v) sets.gender.add(v);
    if (r.grade) sets.grade.add(r.grade);
  }

  // Domain options come from Survey_Items.Category_Select (multipleSelects).
  const domainSet = new Set<string>();
  for (const item of items) {
    for (const cat of item.categorySelect) {
      if (cat) domainSet.add(cat);
    }
  }

  return {
    administration: sorted(sets.administration),
    school: sorted(sets.school),
    region: sorted(sets.region),
    race: sorted(sets.race),
    gender: sorted(sets.gender),
    grade: sorted(sets.grade),
    domain: sorted(domainSet),
  };
}

/**
 * Fetches respondents and applies multi-select filter logic.
 *
 * For each filter field, an empty array means "include all".
 * Within a field multiple selections are OR'd; across fields they are AND'd.
 *
 * Race and gender filters check for intersection with the respondent's
 * multi-value arrays (Race_Multiselect, Gender_Select).
 *
 * Also fetches Survey_Items to determine which response columns to request,
 * minimising the data pulled from Airtable.
 */
export async function filterRespondents(
  filters: ActiveFilters
): Promise<SurveyRespondent[]> {
  const items = await fetchItems();

  // Determine which items are in scope given the domain filter.
  const includedItems = items.filter((item) => {
    if (filters.domain.length > 0) {
      const matches = item.categorySelect.some((d) => filters.domain.includes(d));
      if (!matches) return false;
    }
    return true;
  });

  // Collect the response field names to fetch (Question_Label values).
  // Also include the pre-computed top-N indicator fields for each item.
  const responseFieldNames: string[] = [];
  for (const item of includedItems) {
    if (item.questionLabel) {
      responseFieldNames.push(item.questionLabel);
      responseFieldNames.push(`${item.questionLabel}_Top2`);
      responseFieldNames.push(`${item.questionLabel}_Top3`);
    }
  }

  const fieldsToFetch = [
    ...SLICER_FIELD_NAMES,
    ...responseFieldNames,
  ];

  const respondents = await fetchRespondents(fieldsToFetch);

  return respondents.filter((r) => {
    if (filters.administration.length > 0 &&
        !filters.administration.includes(r.administration)) return false;
    if (filters.school.length > 0 &&
        !filters.school.includes(r.school)) return false;
    if (filters.region.length > 0 &&
        !filters.region.includes(r.region)) return false;
    // Race_Multiselect: pass if any selected race matches any respondent race value
    if (filters.race.length > 0 &&
        !r.race.some((v) => filters.race.includes(v))) return false;
    // Gender_Select: pass if any selected gender matches any respondent gender value
    if (filters.gender.length > 0 &&
        !r.gender.some((v) => filters.gender.includes(v))) return false;
    if (filters.grade.length > 0 &&
        !filters.grade.includes(r.grade)) return false;
    return true;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sorted(s: Set<string>): string[] {
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}
