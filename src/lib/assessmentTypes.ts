// ─── Assessment_Banks entity ──────────────────────────────────────────────────

/**
 * One row in Assessment_Banks (tblwgM7tZ0e1sEpfX).
 *
 * Airtable field → property mapping:
 *   Assessment_ID                → assessmentId   (singleLineText — display name in DDL/headings)
 *   Assessment_Bank_Report_AT_ID → reportAtId     (formula — used as the URL param for filtering)
 *   Grade Level                  → gradeLevel     (singleSelect)
 *   Item_Count                   → itemCount      (number)
 */
export interface AssessmentBank {
  id: string;           // Airtable record ID
  assessmentId: string; // Assessment_ID — human-readable name
  reportAtId: string;   // Assessment_Bank_Report_AT_ID — recXXX filter key
  gradeLevel: string;   // Grade Level
  itemCount: number;    // Item_Count
}

// ─── Assessment_Results_School_Item entity ────────────────────────────────────

/**
 * One row in Assessment_Results_School_Item (tblD7Kjxmno3JuhAk).
 * Represents one school × one assessment item.
 *
 * Percentage fields (fullCreditAll, partialCredit, cityFullCreditPct, etc.)
 * are stored as decimals (0–1) in Airtable. pctField() × 100 for display.
 *
 * Airtable field → property mapping:
 *   School_Extract                    → schoolExtract        (singleLineText)
 *   Assessment_ID                     → assessmentId         (singleLineText, denormalized)
 *   Assessment_Bank_Report_AT_ID      → bankReportAtId       (multipleLookupValues[0])
 *   Item_Extract                      → itemPrompt           (multilineText)
 *   Item_Order                        → itemOrder            (number)
 *   Item_Type                         → itemType             (singleLineText)
 *   Domain (from Assessment_Item_Link)→ domains              (multipleSelects lookup)
 *   Item_Responses                    → itemResponses        (number — non-blank responses)
 *   Respondents                       → respondents          (number — total students)
 *   Full_Credit_All                   → fullCreditAll        (decimal 0–1)
 *   Full_Credit_All_Count             → fullCreditAllCount   (number)
 *   Partial_Credit                    → partialCredit        (decimal 0–1)
 *   Partial_Credit_Count              → partialCreditCount   (number)
 *   Blanks                            → blanks               (number)
 *   City                              → cityTxt              (singleLineText)
 *   City_Item_Responses               → cityItemResponses    (multipleLookupValues[0])
 *   City_Full_Credit_Percent          → cityFullCreditPct    (multipleLookupValues[0], decimal)
 *   City_Partial_Credit_Percent       → cityPartialCreditPct (multipleLookupValues[0], decimal)
 *   City_Blanks_Count                 → cityBlanksCount      (multipleLookupValues[0])
 *   Region_Responses_Count            → regionN              (multipleLookupValues[0])
 *   Region_Full_Credit_Pct            → regionFullCreditPct  (multipleLookupValues[0], decimal 0–1)
 *   Region_Partial_Credit_Pct         → regionPartialCreditPct (multipleLookupValues[0], decimal 0–1)
 *   Network_Responses_Count           → networkN             (multipleLookupValues[0])
 *   Network_Full_Credit_Pct           → networkFullCreditPct (multipleLookupValues[0], decimal 0–1)
 *   Network_Partial_Credit_Pct        → networkPartialCreditPct (multipleLookupValues[0], decimal 0–1)
 *   Network_Blanks_Pct                → networkBlankPct      (multipleLookupValues[0], decimal 0–1)
 */
export interface AssessmentSchoolResult {
  id: string;
  schoolExtract: string;
  assessmentId: string;
  bankReportAtId: string;
  // Item metadata
  itemPrompt: string;
  itemOrder: number;
  itemType: string;
  domains: string[];
  // Response counts
  itemResponses: number;    // non-blank responses
  respondents: number;      // total students
  fullCreditAll: number;    // decimal 0–1
  fullCreditAllCount: number;
  partialCredit: number;    // decimal 0–1
  partialCreditCount: number;
  blanks: number;
  // City comparison (multipleLookupValues → [0])
  cityTxt: string;
  cityItemResponses: number;
  cityFullCreditPct: number;     // decimal 0–1
  cityPartialCreditPct: number;  // decimal 0–1
  cityBlanksCount: number;
  // Region comparison (multipleLookupValues from Assessment_Results_Region_Item → [0])
  // All pct fields stored as decimals 0–1, matching City_*_Percent shape.
  regionN: number;
  regionFullCreditPct: number;    // decimal 0–1
  regionPartialCreditPct: number; // decimal 0–1
  regionBlanksCount: number;      // count
  regionBlankPct: number;         // decimal 0–1
  // Network comparison (multipleLookupValues from Assessment_Network_Results → [0])
  networkN: number;
  networkFullCreditPct: number;    // decimal 0–1
  networkPartialCreditPct: number; // decimal 0–1
  networkBlankPct: number;         // decimal 0–1
}

// ─── Aggregated display row ───────────────────────────────────────────────────

/**
 * One display row for the assessment chart/table view.
 *
 * All pct fields are 0–100 (rounded to 1 decimal).
 *
 * Bar chart segments (most positive → most negative, left to right):
 *   Full Credit  → navy   #17345B
 *   Partial Credit → blue #255694
 *   No Credit    → orange #F79520  (computed: 100 - full - partial - blank)
 *   Blank        → gray   #D1D5DB
 *
 * Comparison group columns are null when that group was not requested.
 * Region and network blank pct may be null when the source does not have blank data.
 */
export interface AssessmentRow {
  itemOrder: number;
  itemPrompt: string;
  itemType: string;
  domains: string[];
  assessmentId: string;
  schoolName: string;
  /** Rich item detail from Assessment_Items — present when fetched, absent if not loaded */
  detail?: AssessmentItemDetail;
  // School-level (0–100 pct, 1 decimal)
  schoolN: number;
  schoolFullCreditPct: number;
  schoolPartialCreditPct: number;
  schoolNoCreditPct: number;   // computed: 100 - full - partial - blank
  schoolBlankPct: number;      // computed: Blanks / Item_Responses × 100
  // City comparison — null when not requested
  cityN: number | null;
  cityFullCreditPct: number | null;
  cityPartialCreditPct: number | null;
  cityNoCreditPct: number | null;   // computed: 100 - full - partial - blank
  cityBlankPct: number | null;      // computed: City_Blanks_Count / City_Item_Responses × 100
  // Region comparison — null when not requested
  regionN: number | null;
  regionFullCreditPct: number | null;
  regionPartialCreditPct: number | null;
  regionNoCreditPct: number | null;  // computed: 100 - full - partial - blank
  regionBlankPct: number | null;
  // Network comparison — null when not requested
  networkN: number | null;
  networkFullCreditPct: number | null;
  networkPartialCreditPct: number | null;
  networkNoCreditPct: number | null;
  networkBlankPct: number | null;
}

// ─── Assessment_Items detail ──────────────────────────────────────────────────

/**
 * Rich item detail fetched from Assessment_Items (tblqIgPFR3mCHjQRo).
 * Keyed by itemOrder; merged onto AssessmentRow.detail after the results fetch.
 *
 * Airtable field → property mapping:
 *   Item_Order             → itemOrder         (number — join key)
 *   Item_Label             → itemLabel         (singleLineText — short code like "Q1")
 *   Item_Display_Label     → displayLabel      (multilineText — longer display name)
 *   Prompt                 → prompt            (richText — full item text, may contain markdown)
 *   Item_Type              → itemType          (singleSelect)
 *   Correct_Response_Text  → correctResponseText (singleLineText — open-response answer)
 *   Correct_MC_Response    → correctMcLetters  (multipleSelects — ["A","C"] etc.)
 *   Correct_MC_Flat        → correctMcFlat     (multilineText — same as above, flat string)
 *   Option_A … Option_F    → options           (map of letter → text, omit empty)
 *   Points_Possible        → pointsPossible    (number)
 *   Standards_Code         → standardsCode     (singleLineText)
 *   Rubric_Reference       → rubricReference   (richText — partial-credit rubric)
 */
export interface AssessmentItemDetail {
  itemOrder: number;
  itemLabel: string;
  displayLabel: string;
  prompt: string;
  itemType: string;
  correctResponseText: string;
  correctMcLetters: string[];           // e.g. ["A", "C"]
  correctMcFlat: string;
  options: Record<string, string>;      // { A: "option text", B: "...", ... }
  pointsPossible: number | null;
  standardsCode: string;
  rubricReference: string;
}

// ─── Comparison group ─────────────────────────────────────────────────────────

export type AssessmentComparisonGroup = 'city' | 'region' | 'network';

// ─── Filter state ─────────────────────────────────────────────────────────────

/**
 * Active filter values for the assessment dashboard.
 *
 * bankReportAtId and schoolExtract are always required to load results.
 * comparisonGroups controls which comparison columns are populated.
 */
export interface AssessmentFilters {
  bankReportAtId: string;
  schoolExtract: string;
  comparisonGroups: AssessmentComparisonGroup[];
}
