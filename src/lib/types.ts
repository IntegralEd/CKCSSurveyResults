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

// ─── Schools lookup ───────────────────────────────────────────────────────────

/**
 * One row from the Schools table.
 * Used to populate the school selector and resolve city/region for a selection.
 *
 * Airtable field → property:
 *   School_Name      → name
 *   Full_School_Name → fullName
 *   City             → city   (singleSelect)
 *   Region           → region (singleSelect)
 */
export interface SchoolInfo {
  id: string;        // Airtable record ID
  name: string;      // School_Name
  fullName: string;  // Full_School_Name
  city: string;      // City
  region: string;    // Region
}

// ─── Survey_School_Item_Results ───────────────────────────────────────────────

/**
 * One record from Survey_School_Item_Results — one school × one survey item.
 *
 * School-level results are stored directly on the record.
 * City / Region / Network comparison values arrive as multipleLookupValues
 * (arrays) rolled up from the linked aggregate tables; we take [0].
 *
 * Key Airtable field → property mappings:
 *   School_Txt                                    → schoolTxt
 *   Administration_Key                            → administrationKey
 *   City_Txt                                      → cityTxt
 *   Region_Txt                                    → regionTxt
 *   Question_Label_Txt                            → questionLabel
 *   Question_Prompt                               → prompt          (lookup[0])
 *   Item_Order                                    → itemOrder       (number)
 *   Survey_Item_Link                              → surveyItemRecordId (link[0])
 *   Respondents                                   → schoolN
 *   Percent_Top_2                                 → schoolTop2Pct
 *   Percent_Top_3                                 → schoolTop3Pct
 *   School_Strongly_Agree_Count                   → schoolSACount
 *   School_Agree_Count                            → schoolAgreeCount
 *   School_Neutral_Count                          → schoolNeutralCount
 *   School_Negative_Count                         → schoolNegativeCount
 *   City_Respondents (from Survey_City_…)         → cityN            (lookup[0])
 *   City_Top_2_Percent (from Survey_City_…)       → cityTop2Pct      (lookup[0])
 *   City_Top_3_Percent (from Survey_City_…)       → cityTop3Pct      (lookup[0])
 *   Region_Respondents                            → regionN          (lookup[0])
 *   Region_Top2_Percent                           → regionTop2Pct    (lookup[0])
 *   Region_Top3_Percent                           → regionTop3Pct    (lookup[0])
 *   Network_Respondents (from Survey_Network_…)   → networkN         (lookup[0])
 *   Network_Top_2_Percent (from Survey_Network_…) → networkTop2Pct   (lookup[0])
 *   Network_Top_3_Percent (from Survey_Network_…) → networkTop3Pct   (lookup[0])
 */
export interface SchoolItemResult {
  id: string;
  schoolTxt: string;
  administrationKey: string;
  cityTxt: string;
  regionTxt: string;
  questionLabel: string;
  prompt: string;
  itemOrder: number;
  surveyItemRecordId: string;
  // School-level
  schoolN: number;
  schoolTop2Pct: number;
  schoolTop3Pct: number;
  schoolSACount: number;
  schoolAgreeCount: number;
  schoolNeutralCount: number;
  schoolNegativeCount: number;
  // City comparison
  cityN: number;
  cityTop1Pct: number;
  cityTop2Pct: number;
  cityTop3Pct: number;
  // Region comparison
  regionN: number;
  regionTop1Pct: number;
  regionTop2Pct: number;
  regionTop3Pct: number;
  // Network comparison
  networkN: number;
  networkTop1Pct: number;
  networkTop2Pct: number;
  networkTop3Pct: number;
}

/**
 * One display row in comparison mode.
 * Includes school results alongside whichever comparison groups were requested.
 */
export interface ComparisonRow {
  questionLabel: string;
  prompt: string;
  domain: string;
  itemOrder: number;
  // School
  schoolN: number;
  schoolTop1Pct: number;
  schoolTop2Pct: number;
  schoolTop3Pct: number;
  // Optional comparison groups — null when that group was not requested
  cityN: number | null;
  cityTop1Pct: number | null;
  cityTop2Pct: number | null;
  cityTop3Pct: number | null;
  regionN: number | null;
  regionTop1Pct: number | null;
  regionTop2Pct: number | null;
  regionTop3Pct: number | null;
  networkN: number | null;
  networkTop1Pct: number | null;
  networkTop2Pct: number | null;
  networkTop3Pct: number | null;
}

export type ComparisonGroup = 'city' | 'region' | 'network';

/**
 * One row in History mode — side-by-side top-2% for two administrations.
 */
export interface HistoryRow {
  itemOrder: number;
  questionLabel: string;
  prompt: string;
  domain: string;
  aN: number;
  aTop2Pct: number;
  bN: number | null;
  bTop2Pct: number | null;
  /** bTop2Pct − aTop2Pct, null if bTop2Pct is null */
  delta: number | null;
}

// ─── Mode ─────────────────────────────────────────────────────────────────────

export type ResultMode = 'agreement' | 'topn' | 'comments' | 'comparison' | 'history';

// ─── API request/response shapes ─────────────────────────────────────────────

export interface ResultsRequestBody {
  filters: ActiveFilters;
  mode: Exclude<ResultMode, 'comments'>;
}

export interface CommentsRequestBody {
  filters: ActiveFilters;
}
