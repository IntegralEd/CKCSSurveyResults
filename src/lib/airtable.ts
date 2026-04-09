/**
 * lib/airtable.ts
 *
 * Airtable client setup and low-level fetch helpers.
 * This file is server-only — never import it from client components.
 *
 * Field names confirmed from the Schema_Registry CSV.
 * Table IDs confirmed from schema registry.
 */
import Airtable from 'airtable';
import type { SurveyRespondent, SurveyItem, SurveyItemComment, SchoolInfo, SchoolItemResult } from './types';

// ─── Environment variables ────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

/**
 * Confirmed table IDs from the schema registry.
 * The env vars allow overriding with the human-readable table name if preferred;
 * Airtable accepts either the table ID (tblXXX) or the table name string.
 */
export const TABLE_RESPONDENTS =
  process.env.AIRTABLE_TABLE_RESPONDENTS ?? 'tblE1rwPUjtxodIvZ';
export const TABLE_ITEMS =
  process.env.AIRTABLE_TABLE_ITEMS ?? 'tbl9lguOzNO8VjMvY';
export const TABLE_COMMENTS =
  process.env.AIRTABLE_TABLE_COMMENTS ?? 'tbla8CWwKDBuQwmtq';
export const TABLE_SCHOOL_ITEM_RESULTS = 'tblwEdi9EQhCsixNd';
export const TABLE_SCHOOLS = 'tblTyVLW0R8MxmQ0S';

// ─── Client ───────────────────────────────────────────────────────────────────

let _base: Airtable.Base | null = null;

/**
 * Returns a singleton Airtable.Base instance.
 * Lazily initialised so the API key is only read when a request is made.
 */
export function getBase(): Airtable.Base {
  if (_base) return _base;
  const apiKey = requireEnv('AIRTABLE_API_KEY');
  const baseId = requireEnv('AIRTABLE_BASE_ID');
  Airtable.configure({ apiKey });
  _base = Airtable.base(baseId);
  return _base;
}

// ─── Generic pagination helper ───────────────────────────────────────────────

export interface FetchOptions {
  fields?: string[];
  filterByFormula?: string;
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  maxRecords?: number;
}

/**
 * Fetches ALL records from a table, handling Airtable's 100-record page limit.
 */
export async function fetchAllRecords(
  tableName: string,
  opts: FetchOptions = {}
): Promise<Airtable.Record<Airtable.FieldSet>[]> {
  const base = getBase();
  const records: Airtable.Record<Airtable.FieldSet>[] = [];

  await new Promise<void>((resolve, reject) => {
    base(tableName)
      .select({
        pageSize: 100,
        ...(opts.fields ? { fields: opts.fields } : {}),
        ...(opts.filterByFormula ? { filterByFormula: opts.filterByFormula } : {}),
        ...(opts.sort ? { sort: opts.sort } : {}),
        ...(opts.maxRecords ? { maxRecords: opts.maxRecords } : {}),
      })
      .eachPage(
        (pageRecords, fetchNextPage) => {
          records.push(...pageRecords);
          fetchNextPage();
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
  });

  return records;
}

// ─── Slicer field name constants ──────────────────────────────────────────────
// Source: Schema_Registry-CKCS Report Source Schema Registry.csv (confirmed)

/**
 * Maps logical filter keys to real Airtable field names in Survey_Respondents.
 * Used by FilterBar, getFilterOptions(), and filterRespondents().
 */
export const SLICER_FIELDS = {
  administration: 'Survey_Admin',
  school: 'School_Name (from School_Link)',
  region: 'Region (from School_Link)',
  race: 'Race_Multiselect',
  grade: 'Select Your Grade',
  gender: 'Gender_Select',
} as const;

// ─── Survey_Items field name constants ────────────────────────────────────────

export const ITEM_FIELDS = {
  itemAtId: 'Item_AT_ID',
  itemOrder: 'Item_Order',
  prompt: 'Item_Prompt',
  questionLabel: 'Question_Label',
  questionType: 'Question_Type',
  categoryCode: 'Category_Code',
  categorySelect: 'Category_Select',
  top2: 'Top_2',
  top3: 'Top_3',
  top2Flat: 'Top_2_Flat',
  top3Flat: 'Top_3_Flat',
  likertScale: 'Likert_Scale',
} as const;

// ─── Survey_Item_Comments field name constants ────────────────────────────────

export const COMMENT_FIELDS = {
  commentText: 'Comment_Text',
  surveyItemLink: 'Survey_Item_Link',
  surveyAdmin: 'Survey_Admin',
  schoolLink: 'School_Link',
  regionFromSchool: 'Region (from School_Link)',
  genderTags: 'Gender_Tags',
  raceTags: 'Race_Tags',
  respondentLink: 'Respondent_Link',
} as const;

// ─── Legacy FIELDS alias (kept for backward compatibility) ────────────────────

// ─── Schools field name constants ─────────────────────────────────────────────

export const SCHOOLS_FIELDS = {
  schoolName: 'School_Name',
  fullSchoolName: 'Full_School_Name',
  city: 'City',
  region: 'Region',
} as const;

// ─── Survey_School_Item_Results field name constants ──────────────────────────

export const SCHOOL_RESULT_FIELDS = {
  // Identity
  schoolTxt: 'School_Txt',
  administrationKey: 'Administration_Key',
  cityTxt: 'City_Txt',
  regionTxt: 'Region_Txt',
  questionLabel: 'Question_Label_Txt',
  prompt: 'Question_Prompt',
  itemOrder: 'Item_Order',
  surveyItemLink: 'Survey_Item_Link',
  // School-level results
  respondents: 'Respondents',
  percentTop2: 'Percent_Top_2',
  percentTop3: 'Percent_Top_3',
  schoolSACount: 'School_Strongly_Agree_Count',
  schoolAgreeCount: 'School_Agree_Count',
  schoolNeutralCount: 'School_Neutral_Count',
  schoolNegativeCount: 'School_Negative_Count',
  // City comparison (multipleLookupValues — take [0])
  cityRespondents: 'City_Respondents (from Survey_City_Item_Results_Link)',
  cityTop1Pct: 'City_Top_1_Percent (from Survey_City_Item_Results_Link)',
  cityTop2Pct: 'City_Top_2_Percent (from Survey_City_Item_Results_Link)',
  cityTop3Pct: 'City_Top_3_Percent (from Survey_City_Item_Results_Link)',
  // Region comparison (multipleLookupValues — take [0])
  regionRespondents: 'Region_Respondents',
  regionTop1Pct: 'Region_Top1_Percent',
  regionTop2Pct: 'Region_Top2_Percent',
  regionTop3Pct: 'Region_Top3_Percent',
  // Network comparison (multipleLookupValues — take [0])
  networkRespondents: 'Network_Respondents (from Survey_Network_Item_Results_Link)',
  networkTop1Pct: 'Network_Top_1_Percent (from Survey_Network_Item_Results_Link)',
  networkTop2Pct: 'Network_Top_2_Percent (from Survey_Network_Item_Results_Link)',
  networkTop3Pct: 'Network_Top_3_Percent (from Survey_Network_Item_Results_Link)',
} as const;

// ─── Schools fetch helper ─────────────────────────────────────────────────────

/**
 * Fetch schools that actually have records in Survey_School_Item_Results.
 *
 * Queries Survey_School_Item_Results (not the Schools table) for the minimal
 * fields needed to build the school selector. Deduplicates by the linked
 * school record ID so the selector only shows schools with result data.
 *
 * City and Region come from the pre-rolled lookup fields on the results table
 * so no second fetch against the Schools table is needed.
 */
export async function fetchSchools(): Promise<SchoolInfo[]> {
  const records = await fetchAllRecords(TABLE_SCHOOL_ITEM_RESULTS, {
    fields: ['Schools', 'School_Txt', 'City_Txt', 'Region_Txt'],
  });

  const seen = new Map<string, SchoolInfo>();

  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    const rawSchools = f['Schools'];
    const schoolRecordId = Array.isArray(rawSchools) ? String(rawSchools[0] ?? '') : '';
    if (!schoolRecordId || seen.has(schoolRecordId)) continue;

    const name = String(f['School_Txt'] ?? '').trim();
    if (!name) continue;

    seen.set(schoolRecordId, {
      id: schoolRecordId,
      name,
      fullName: name,
      city: String(f['City_Txt'] ?? ''),
      region: String(f['Region_Txt'] ?? ''),
    });
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Survey_School_Item_Results fetch helper ──────────────────────────────────

/** Helper: safely extract [0] from a multipleLookupValues array as a number */
function lookupNum(val: unknown): number {
  if (Array.isArray(val)) return typeof val[0] === 'number' ? val[0] : parseFloat(String(val[0] ?? '0')) || 0;
  return typeof val === 'number' ? val : parseFloat(String(val ?? '0')) || 0;
}

/**
 * Airtable stores top-N percentages as decimals (0–1), e.g. 0.67 = 67%.
 * Multiply by 100 and round to 1 decimal for display consistency with
 * the agreement aggregation which produces 0–100 values.
 */
function pctField(val: unknown): number {
  return Math.round(lookupNum(val) * 1000) / 10; // ×100, rounded to 1 decimal
}

/** Helper: safely extract [0] from a multipleLookupValues array as a string */
function lookupStr(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? '');
  return String(val ?? '');
}

/**
 * Fetch Survey_School_Item_Results records for a given school.
 *
 * Filters by School_Txt (singleLineText) using the exact value from the results
 * table itself — same value we expose as SchoolInfo.name via fetchSchools().
 *
 * Note: filterByFormula resolves multipleRecordLinks fields to their display
 * names (primary field), not record IDs — so record-ID-based joins do not
 * work in filterByFormula context. School_Txt is the reliable match key.
 *
 * @param schoolTxt  School_Txt value from Survey_School_Item_Results (= SchoolInfo.name)
 */
export async function fetchSchoolItemResults(schoolTxt: string): Promise<SchoolItemResult[]> {
  const escaped = schoolTxt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const records = await fetchAllRecords(TABLE_SCHOOL_ITEM_RESULTS, {
    filterByFormula: `{School_Txt} = "${escaped}"`,
    fields: Object.values(SCHOOL_RESULT_FIELDS),
    sort: [{ field: SCHOOL_RESULT_FIELDS.itemOrder, direction: 'asc' }],
  });

  return records.map((r) => {
    const f = r.fields as Record<string, unknown>;

    const rawItemLink = f[SCHOOL_RESULT_FIELDS.surveyItemLink];
    const surveyItemRecordId = Array.isArray(rawItemLink) ? String(rawItemLink[0] ?? '') : '';

    return {
      id: r.id,
      schoolTxt: String(f[SCHOOL_RESULT_FIELDS.schoolTxt] ?? ''),
      administrationKey: String(f[SCHOOL_RESULT_FIELDS.administrationKey] ?? ''),
      cityTxt: String(f[SCHOOL_RESULT_FIELDS.cityTxt] ?? ''),
      regionTxt: String(f[SCHOOL_RESULT_FIELDS.regionTxt] ?? ''),
      questionLabel: String(f[SCHOOL_RESULT_FIELDS.questionLabel] ?? ''),
      prompt: lookupStr(f[SCHOOL_RESULT_FIELDS.prompt]),
      itemOrder: typeof f[SCHOOL_RESULT_FIELDS.itemOrder] === 'number'
        ? (f[SCHOOL_RESULT_FIELDS.itemOrder] as number)
        : parseInt(String(f[SCHOOL_RESULT_FIELDS.itemOrder] ?? '0'), 10) || 0,
      surveyItemRecordId,
      schoolN: lookupNum(f[SCHOOL_RESULT_FIELDS.respondents]),
      schoolTop2Pct: pctField(f[SCHOOL_RESULT_FIELDS.percentTop2]),
      schoolTop3Pct: pctField(f[SCHOOL_RESULT_FIELDS.percentTop3]),
      schoolSACount: lookupNum(f[SCHOOL_RESULT_FIELDS.schoolSACount]),
      schoolAgreeCount: lookupNum(f[SCHOOL_RESULT_FIELDS.schoolAgreeCount]),
      schoolNeutralCount: lookupNum(f[SCHOOL_RESULT_FIELDS.schoolNeutralCount]),
      schoolNegativeCount: lookupNum(f[SCHOOL_RESULT_FIELDS.schoolNegativeCount]),
      cityN: lookupNum(f[SCHOOL_RESULT_FIELDS.cityRespondents]),
      cityTop1Pct: pctField(f[SCHOOL_RESULT_FIELDS.cityTop1Pct]),
      cityTop2Pct: pctField(f[SCHOOL_RESULT_FIELDS.cityTop2Pct]),
      cityTop3Pct: pctField(f[SCHOOL_RESULT_FIELDS.cityTop3Pct]),
      regionN: lookupNum(f[SCHOOL_RESULT_FIELDS.regionRespondents]),
      regionTop1Pct: pctField(f[SCHOOL_RESULT_FIELDS.regionTop1Pct]),
      regionTop2Pct: pctField(f[SCHOOL_RESULT_FIELDS.regionTop2Pct]),
      regionTop3Pct: pctField(f[SCHOOL_RESULT_FIELDS.regionTop3Pct]),
      networkN: lookupNum(f[SCHOOL_RESULT_FIELDS.networkRespondents]),
      networkTop1Pct: pctField(f[SCHOOL_RESULT_FIELDS.networkTop1Pct]),
      networkTop2Pct: pctField(f[SCHOOL_RESULT_FIELDS.networkTop2Pct]),
      networkTop3Pct: pctField(f[SCHOOL_RESULT_FIELDS.networkTop3Pct]),
    };
  });
}

// ─── Legacy FIELDS alias (kept for backward compatibility) ────────────────────

/**
 * @deprecated Use SLICER_FIELDS, ITEM_FIELDS, or COMMENT_FIELDS instead.
 */
export const FIELDS = {
  respondents: {
    respondentKey: 'Respondent_Key',
    surveyAdmin: SLICER_FIELDS.administration,
    schoolName: SLICER_FIELDS.school,
    region: SLICER_FIELDS.region,
    raceMutiselect: SLICER_FIELDS.race,
    raceEthnicity: 'Race_Ethnicity',
    genderSelect: SLICER_FIELDS.gender,
    grade: SLICER_FIELDS.grade,
    studentItemComments: 'Student_Item_Comments',
  },
  items: ITEM_FIELDS,
  comments: COMMENT_FIELDS,
} as const;

// ─── Typed helpers ────────────────────────────────────────────────────────────

/**
 * Fetch Survey_Respondents records.
 *
 * @param fields  Optional list of field names to retrieve. Omit to fetch all fields
 *                (expensive on large tables — pass a specific field list when possible).
 *
 * Slicer field names (confirmed from schema):
 *   'Respondent_Key'
 *   'Survey_Admin'
 *   'School_Name (from School_Link)'
 *   'Region (from School_Link)'
 *   'Race_Multiselect'        ← multipleSelects (NOT 'Race')
 *   'Gender_Select'           ← multipleSelects (NOT 'Gender')
 *   'Select Your Grade'       ← singleSelect (NOT 'Grade')
 *   'Student_Item_Comments'   ← linked records to Survey_Item_Comments
 */
export async function fetchRespondents(
  fields?: string[]
): Promise<SurveyRespondent[]> {
  const records = await fetchAllRecords(TABLE_RESPONDENTS, {
    ...(fields ? { fields } : {}),
  });

  const knownSlicerFieldSet = new Set<string>([
    'Respondent_Key',
    SLICER_FIELDS.administration,
    SLICER_FIELDS.school,
    SLICER_FIELDS.region,
    SLICER_FIELDS.race,
    SLICER_FIELDS.gender,
    SLICER_FIELDS.grade,
    'Student_Item_Comments',
    'Race_Ethnicity',
    'Gender',
  ]);

  return records.map((r) => {
    const f = r.fields as Record<string, unknown>;

    // Build a fields map containing all non-slicer columns.
    // This includes response columns and pre-computed Top2/Top3 indicators.
    const fieldMap: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(f)) {
      if (!knownSlicerFieldSet.has(key)) {
        fieldMap[key] = val;
      }
    }

    // School_Name (from School_Link) is a lookup — may arrive as an array.
    const rawSchool = f[SLICER_FIELDS.school];
    const school = Array.isArray(rawSchool)
      ? String(rawSchool[0] ?? '')
      : String(rawSchool ?? '');

    // Region (from School_Link) is similarly a lookup.
    const rawRegion = f[SLICER_FIELDS.region];
    const region = Array.isArray(rawRegion)
      ? String(rawRegion[0] ?? '')
      : String(rawRegion ?? '');

    // Race_Multiselect is a multipleSelects field — always an array.
    const rawRace = f[SLICER_FIELDS.race];
    const race = Array.isArray(rawRace) ? (rawRace as string[]) : [];

    // Gender_Select is a multipleSelects field — always an array.
    const rawGender = f[SLICER_FIELDS.gender];
    const gender = Array.isArray(rawGender) ? (rawGender as string[]) : [];

    return {
      id: r.id,
      respondentKey: String(f['Respondent_Key'] ?? ''),
      administration: String(f[SLICER_FIELDS.administration] ?? ''),
      school,
      region,
      race,
      gender,
      grade: String(f[SLICER_FIELDS.grade] ?? ''),
      fields: fieldMap,
    };
  });
}

/**
 * Fetch Survey_Items records.
 *
 * Confirmed field names (from schema registry):
 *   'Item_AT_ID'       — unique identifier (multilineText)
 *   'Item_Order'       — display order (singleLineText, parsed as number)
 *   'Item_Prompt'      — display text
 *   'Question_Label'   — maps to column name in Survey_Respondents
 *   'Question_Type'    — singleSelect
 *   'Category_Code'    — domain text (multilineText)
 *   'Category_Select'  — domain as multipleSelects
 *   'Top_2'            — multipleSelects — top-2 response value strings
 *   'Top_3'            — multipleSelects — top-3 response value strings
 *   'Likert_Scale'     — number
 */
export async function fetchItems(): Promise<SurveyItem[]> {
  const records = await fetchAllRecords(TABLE_ITEMS, {
    fields: Object.values(ITEM_FIELDS),
    sort: [{ field: ITEM_FIELDS.itemOrder, direction: 'asc' }],
  });

  return records.map((r) => {
    const f = r.fields as Record<string, unknown>;

    // Category_Select is a multipleSelects field.
    const rawCategory = f[ITEM_FIELDS.categorySelect];
    const categorySelect = Array.isArray(rawCategory)
      ? (rawCategory as string[])
      : [];

    // Top_2 and Top_3 are multipleSelects — array of response value strings.
    const rawTop2 = f[ITEM_FIELDS.top2];
    const top2Values = Array.isArray(rawTop2) ? (rawTop2 as string[]) : [];

    const rawTop3 = f[ITEM_FIELDS.top3];
    const top3Values = Array.isArray(rawTop3) ? (rawTop3 as string[]) : [];

    // Item_Order is stored as singleLineText — parse to number.
    const itemOrder = parseInt(String(f[ITEM_FIELDS.itemOrder] ?? '0'), 10) || 0;

    return {
      id: r.id,
      itemAtId: String(f[ITEM_FIELDS.itemAtId] ?? ''),
      itemOrder,
      prompt: String(f[ITEM_FIELDS.prompt] ?? ''),
      questionLabel: String(f[ITEM_FIELDS.questionLabel] ?? ''),
      questionType: String(f[ITEM_FIELDS.questionType] ?? ''),
      categoryCode: String(f[ITEM_FIELDS.categoryCode] ?? ''),
      categorySelect,
      top2Values,
      top3Values,
      likertScale: typeof f[ITEM_FIELDS.likertScale] === 'number'
        ? (f[ITEM_FIELDS.likertScale] as number)
        : 0,
    };
  });
}

/**
 * Fetch Survey_Item_Comments.
 *
 * Join model:
 *   Survey_Respondents.Student_Item_Comments → Survey_Item_Comments (linked records)
 *   Survey_Item_Comments.Survey_Item_Link    → Survey_Items (linked records)
 *   Survey_Item_Comments.Respondent_Link     → text key (NOT a linked record)
 *
 * Current strategy: filter by Survey_Admin values from the filtered respondent set
 * (coarse filter). Comments are then further filtered in application code using
 * school/region matches if needed.
 *
 * TODO: For finer-grained filtering by individual respondent, switch to filtering
 *   via Respondent_Link text values using:
 *     OR({Respondent_Link}="key1", {Respondent_Link}="key2", ...)
 *   This is accurate but generates large formulas for big respondent sets.
 *   For large sets, consider fetching all comments and post-filtering in memory.
 *
 * @param surveyAdmins  Filter by Survey_Admin values (e.g. ["Fall 2024"])
 * @param maxRecords    Optional cap to prevent huge fetches during development
 */
export async function fetchComments(
  surveyAdmins: string[],
  maxRecords?: number
): Promise<SurveyItemComment[]> {
  let filterByFormula: string | undefined;

  if (surveyAdmins.length > 0) {
    const adminFormulas = surveyAdmins.map(
      (a) => `{${COMMENT_FIELDS.surveyAdmin}} = "${a.replace(/"/g, '\\"')}"`
    );
    filterByFormula =
      surveyAdmins.length === 1
        ? adminFormulas[0]
        : `OR(${adminFormulas.join(',')})`;
  }

  const records = await fetchAllRecords(TABLE_COMMENTS, {
    fields: Object.values(COMMENT_FIELDS),
    ...(filterByFormula ? { filterByFormula } : {}),
    ...(maxRecords ? { maxRecords } : {}),
  });

  return records.map((r) => {
    const f = r.fields as Record<string, unknown>;

    // Survey_Item_Link is a linked record array — take the first record ID.
    const rawItemLink = f[COMMENT_FIELDS.surveyItemLink];
    const linkedItemRecordId = Array.isArray(rawItemLink)
      ? String(rawItemLink[0] ?? '')
      : '';

    // School_Link is a linked record array — take first for display.
    const rawSchoolLink = f[COMMENT_FIELDS.schoolLink];
    const schoolName = Array.isArray(rawSchoolLink)
      ? String(rawSchoolLink[0] ?? '')
      : '';

    // Region (from School_Link) may be a lookup array or a string.
    const rawRegion = f[COMMENT_FIELDS.regionFromSchool];
    const regionFromSchool = Array.isArray(rawRegion)
      ? String(rawRegion[0] ?? '')
      : String(rawRegion ?? '');

    return {
      id: r.id,
      commentText: String(f[COMMENT_FIELDS.commentText] ?? ''),
      surveyAdmin: String(f[COMMENT_FIELDS.surveyAdmin] ?? ''),
      regionFromSchool,
      respondentLink: String(f[COMMENT_FIELDS.respondentLink] ?? ''),
      schoolName,
      linkedItemRecordId,
    };
  });
}
