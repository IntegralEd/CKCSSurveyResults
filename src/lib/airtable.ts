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
import type { SurveyRespondent, SurveyItem, SurveyItemComment } from './types';

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
