// ─── Airtable entity types ────────────────────────────────────────────────────

/**
 * One row in Survey_Respondents.
 *
 * Slicer fields are stored as typed properties.
 * All response columns (including pre-computed Top2/Top3 indicators) are kept
 * in `fields` as a flexible record because the column set varies with survey
 * administration. Access response values as:
 *   respondent.fields[item.questionLabel]        — raw response string
 *   respondent.fields[`${item.questionLabel}_Top2`] — number (0 or 1)
 *   respondent.fields[`${item.questionLabel}_Top3`] — number (0 or 1)
 */
export interface SurveyRespondent {
  id: string;                 // Airtable record ID
  respondentKey: string;      // Respondent_Key
  // Slicer fields — real Airtable field names mapped to typed properties
  administration: string;     // Survey_Admin (singleSelect)
  school: string;             // School_Name (from School_Link)
  region: string;             // Region (from School_Link)
  race: string[];             // Race_Multiselect (multipleSelects)
  gender: string[];           // Gender_Select (multipleSelects)
  grade: string;              // Select Your Grade (singleSelect)
  // All other columns (response fields + pre-computed top-N indicators)
  fields: Record<string, unknown>;
}

/**
 * One row in Survey_Items.
 *
 * Airtable field → interface property mapping:
 *   Item_AT_ID       → itemAtId
 *   Item_Order       → itemOrder  (stored as singleLineText, parsed to number)
 *   Item_Prompt      → prompt
 *   Question_Label   → questionLabel  (also the column name in Survey_Respondents)
 *   Question_Type    → questionType
 *   Category_Code    → categoryCode
 *   Category_Select  → categorySelect (multipleSelects)
 *   Top_2            → top2Values    (multipleSelects)
 *   Top_3            → top3Values    (multipleSelects)
 *   Likert_Scale     → likertScale
 */
export interface SurveyItem {
  id: string;
  itemAtId: string;
  itemOrder: number;
  prompt: string;
  /** Maps to the column name in Survey_Respondents that stores answers for this item */
  questionLabel: string;
  questionType: string;
  categoryCode: string;
  categorySelect: string[];
  top2Values: string[];
  top3Values: string[];
  likertScale: number;
}

/**
 * One row in Survey_Item_Comments.
 *
 * Airtable field → interface property mapping:
 *   Comment_Text            → commentText
 *   Survey_Admin            → surveyAdmin
 *   Region (from School_Link) → regionFromSchool
 *   Respondent_Link         → respondentLink  (text key, not a linked record)
 *   Survey_Item_Link        → linkedItemRecordId  (first element of linked record array)
 */
export interface SurveyItemComment {
  id: string;
  commentText: string;
  surveyAdmin: string;
  regionFromSchool: string;
  respondentLink: string;
  schoolName?: string;     // from School_Link lookup
  /** Airtable record ID from Survey_Item_Link[0] — use to look up item in itemMap */
  linkedItemRecordId?: string;
  itemAtId?: string;       // from Survey_Item_Link lookup
}

// ─── Filter types ─────────────────────────────────────────────────────────────

/**
 * All available filter option lists, one string array per slicer field.
 */
export interface FilterOptions {
  administration: string[];
  school: string[];
  region: string[];
  race: string[];
  gender: string[];
  grade: string[];
  domain: string[]; // derived from Survey_Items.Category_Select
}

/**
 * Currently selected filter values.
 * An empty array means "all" (no filter applied for that field).
 */
export interface ActiveFilters {
  administration: string[];
  school: string[];
  region: string[];
  race: string[];
  gender: string[];
  grade: string[];
  domain: string[]; // filters which Survey_Items are included in aggregation
}

// ─── Result row types ─────────────────────────────────────────────────────────

/**
 * One aggregated row in Agreement mode.
 *
 * Response scale is 4 buckets: Strongly Agree, Agree, Neutral, Negative.
 * Top-2 = Strongly Agree + Agree; Top-3 = Strongly Agree + Agree + Neutral.
 *
 * TODO: Confirm exact string values used in Survey_Respondents singleSelect response fields.
 *   Expected: 'Strongly Agree', 'Agree', 'Neutral', 'Negative' — verify exact casing.
 */
export interface AgreementRow {
  questionLabel: string;
  prompt: string;
  domain: string;
  itemOrder: number;
  /** Number of respondents with a non-blank response */
  n: number;
  /** Number of respondents who chose Strongly Agree */
  stronglyAgreeCount: number;
  /** Number of respondents who chose Agree */
  agreeCount: number;
  /** Number of respondents who chose Neutral */
  neutralCount: number;
  /** Number of respondents who chose Negative */
  negativeCount: number;
  /** Percent Strongly Agree (0–100, rounded to 1 decimal) */
  stronglyAgreePct: number;
  /** Percent Agree */
  agreePct: number;
  /** Percent Neutral */
  neutralPct: number;
  /** Percent Negative */
  negativePct: number;
  /** Percent top-2 (Strongly Agree + Agree) */
  top2Pct: number;
  /** Percent top-3 (Strongly Agree + Agree + Neutral) */
  top3Pct: number;
  /** Number of respondents with blank/undefined response */
  blankCount: number;
}

/**
 * One row in Top N mode — simplified view showing only top-2/3 percentages.
 */
export interface TopNRow {
  questionLabel: string;
  prompt: string;
  domain: string;
  itemOrder: number;
  n: number;
  top2Pct: number;
  top3Pct: number;
}

/**
 * One open-response comment row.
 */
export interface CommentRow {
  respondentLink: string;
  school: string;
  administration: string;
  questionLabel: string;
  prompt: string;
  commentText: string;
  itemPrompt?: string;
}

// ─── Mode ─────────────────────────────────────────────────────────────────────

export type ResultMode = 'agreement' | 'topn' | 'comments';

// ─── API request/response shapes ─────────────────────────────────────────────

export interface ResultsRequestBody {
  filters: ActiveFilters;
  mode: Exclude<ResultMode, 'comments'>;
}

export interface CommentsRequestBody {
  filters: ActiveFilters;
}
