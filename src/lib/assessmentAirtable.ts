/**
 * lib/assessmentAirtable.ts
 *
 * Airtable fetch helpers for assessment data.
 * Server-only — never import from client components.
 *
 * Field names confirmed from Schema_Registry (04202026).
 * Table IDs confirmed from schema registry.
 */
import { fetchAllRecords } from './airtable';
import type { AssessmentBank, AssessmentSchoolResult, AssessmentItemDetail } from './assessmentTypes';
import type { SchoolInfo } from './types';

// ─── Table IDs ────────────────────────────────────────────────────────────────

export const TABLE_ASSESSMENT_SCHOOL_ITEM = 'tblD7Kjxmno3JuhAk';
export const TABLE_ASSESSMENT_BANKS = 'tblwgM7tZ0e1sEpfX';
export const TABLE_ASSESSMENT_ITEMS = 'tblqIgPFR3mCHjQRo';

// ─── Field name constants: Assessment_Banks ───────────────────────────────────

export const ASSESSMENT_BANK_FIELDS = {
  assessmentId: 'Assessment_ID',
  reportAtId: 'Assessment_Bank_Report_AT_ID',
  gradeLevel: 'Grade Level',
  itemCount: 'Item_Count',
  /** multipleRecordLinks → Assessment_Results_School_Item (fldof4j3fBoR3YFXL).
   *  Empty/absent = no results for this bank → exclude from DDL. */
  resultsLink: 'Assessment_Results_School_Item_Links',
} as const;

// ─── Field name constants: Assessment_Results_School_Item ─────────────────────

export const ASSESSMENT_RESULT_FIELDS = {
  // Identity
  schoolExtract: 'School_Extract',
  assessmentId: 'Assessment_ID',
  bankReportAtId: 'Assessment_Bank_Report_AT_ID',
  // Item metadata
  itemPrompt: 'Item_Extract',
  itemOrder: 'Item_Order',
  itemType: 'Item_Type',
  domains: 'Domain (from Assessment_Item_Link)',
  // Response counts / percentages
  itemResponses: 'Item_Responses',
  respondents: 'Respondents',
  fullCreditAll: 'Full_Credit_All',
  fullCreditAllCount: 'Full_Credit_All_Count',
  partialCredit: 'Partial_Credit',
  partialCreditCount: 'Partial_Credit_Count',
  blanks: 'Blanks',
  // School's own city / region (for SchoolInfo construction) and comparison label
  cityTxt: 'City',
  schoolRegion: 'Region_Txt',
  // City comparison (multipleLookupValues — take [0])
  cityItemResponses: 'City_Item_Responses',
  cityFullCreditPct: 'City_Full_Credit_Percent',
  cityPartialCreditPct: 'City_Partial_Credit_Percent',
  cityBlanksCount: 'City_Blanks_Count',
  // Region comparison (singleLineText → parseFloat; pct fields stored as 0–100)
  regionN: 'Region_N',
  regionFullCreditPct: 'RegionFull_Credit_All',
  regionPartialCreditPct: 'Region_Partial_Credit',
  regionBlanksCount: 'Region_Blanks_Count',
  regionBlankPct: 'Region_Blanks_Percent',
  // Network comparison (singleLineText with spaces → parseFloat)
  networkN: 'Network N',
  networkFullCreditPct: 'Network Full Credit',
  networkPartialCreditPct: 'Network Partial Credit',
  networkBlankPct: 'Network Blank',
} as const;

// ─── File-local helpers ───────────────────────────────────────────────────────

/** Extract [0] from a multipleLookupValues array as a number */
function lookupNum(val: unknown): number {
  if (Array.isArray(val)) {
    return typeof val[0] === 'number' ? val[0] : parseFloat(String(val[0] ?? '0')) || 0;
  }
  return typeof val === 'number' ? val : parseFloat(String(val ?? '0')) || 0;
}

/** Extract [0] from a multipleLookupValues array as a string */
function lookupStr(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? '').trim();
  return String(val ?? '').trim();
}

/** Parse a singleLineText field that stores a numeric value */
function strNum(val: unknown): number {
  if (typeof val === 'number') return val;
  return parseFloat(String(val ?? '0')) || 0;
}

/** Coerce any field to a trimmed string */
function strField(val: unknown): string {
  return String(val ?? '').trim();
}

// ─── Assessment_Banks fetch ───────────────────────────────────────────────────

/**
 * Fetch all Assessment_Banks records, sorted by Assessment_ID.
 * Used to populate the bank selector DDL.
 * Records without a reportAtId are excluded (formula fields that haven't resolved).
 */
export async function fetchAssessmentBanks(): Promise<AssessmentBank[]> {
  const records = await fetchAllRecords(TABLE_ASSESSMENT_BANKS, {
    fields: Object.values(ASSESSMENT_BANK_FIELDS),
    sort: [{ field: ASSESSMENT_BANK_FIELDS.assessmentId, direction: 'asc' }],
  });

  return records
    .filter((r) => {
      const f = r.fields as Record<string, unknown>;
      // Exclude banks where the results link is absent or empty (no data yet).
      const links = f[ASSESSMENT_BANK_FIELDS.resultsLink];
      return Array.isArray(links) && links.length > 0;
    })
    .map((r) => {
      const f = r.fields as Record<string, unknown>;
      return {
        id: r.id,
        assessmentId: strField(f[ASSESSMENT_BANK_FIELDS.assessmentId]),
        reportAtId: strField(f[ASSESSMENT_BANK_FIELDS.reportAtId]),
        gradeLevel: strField(f[ASSESSMENT_BANK_FIELDS.gradeLevel]),
        itemCount: typeof f[ASSESSMENT_BANK_FIELDS.itemCount] === 'number'
          ? (f[ASSESSMENT_BANK_FIELDS.itemCount] as number)
          : 0,
      };
    })
    .filter((b) => b.reportAtId !== '');
}

// ─── Assessment_Results_School_Item fetch ─────────────────────────────────────

/**
 * Fetch Assessment_Results_School_Item records for a given school and bank.
 *
 * Filters by:
 *   School_Extract = schoolExtract   (exact text match)
 *   FIND(bankReportAtId, ARRAYJOIN({Assessment_Bank_Report_AT_ID})) > 0
 *
 * @param schoolExtract  School_Extract text value — matches the school name shown in the UI
 * @param bankReportAtId Assessment_Bank_Report_AT_ID (recXXX) passed via URL param
 */
export async function fetchAssessmentResults(
  schoolExtract: string,
  bankReportAtId: string
): Promise<AssessmentSchoolResult[]> {
  const escSchool = schoolExtract.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const escBank   = bankReportAtId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const filterByFormula = `AND({School_Extract} = "${escSchool}", FIND("${escBank}", ARRAYJOIN({Assessment_Bank_Report_AT_ID})) > 0)`;

  const records = await fetchAllRecords(TABLE_ASSESSMENT_SCHOOL_ITEM, {
    filterByFormula,
    fields: Object.values(ASSESSMENT_RESULT_FIELDS),
    sort: [{ field: ASSESSMENT_RESULT_FIELDS.itemOrder, direction: 'asc' }],
  });

  return records.map((r) => {
    const f = r.fields as Record<string, unknown>;

    // Domain (from Assessment_Item_Link) arrives as a multipleSelects or lookup array
    const rawDomains = f[ASSESSMENT_RESULT_FIELDS.domains];
    const domains = Array.isArray(rawDomains) ? rawDomains.map(String) : [];

    return {
      id: r.id,
      schoolExtract:        strField(f[ASSESSMENT_RESULT_FIELDS.schoolExtract]),
      assessmentId:         strField(f[ASSESSMENT_RESULT_FIELDS.assessmentId]),
      bankReportAtId:       lookupStr(f[ASSESSMENT_RESULT_FIELDS.bankReportAtId]),
      itemPrompt:           strField(f[ASSESSMENT_RESULT_FIELDS.itemPrompt]),
      itemOrder:            typeof f[ASSESSMENT_RESULT_FIELDS.itemOrder] === 'number'
                              ? (f[ASSESSMENT_RESULT_FIELDS.itemOrder] as number)
                              : parseInt(String(f[ASSESSMENT_RESULT_FIELDS.itemOrder] ?? '0'), 10) || 0,
      itemType:             strField(f[ASSESSMENT_RESULT_FIELDS.itemType]),
      domains,
      itemResponses:        lookupNum(f[ASSESSMENT_RESULT_FIELDS.itemResponses]),
      respondents:          lookupNum(f[ASSESSMENT_RESULT_FIELDS.respondents]),
      fullCreditAll:        lookupNum(f[ASSESSMENT_RESULT_FIELDS.fullCreditAll]),
      fullCreditAllCount:   lookupNum(f[ASSESSMENT_RESULT_FIELDS.fullCreditAllCount]),
      partialCredit:        lookupNum(f[ASSESSMENT_RESULT_FIELDS.partialCredit]),
      partialCreditCount:   lookupNum(f[ASSESSMENT_RESULT_FIELDS.partialCreditCount]),
      blanks:               lookupNum(f[ASSESSMENT_RESULT_FIELDS.blanks]),
      cityTxt:              strField(f[ASSESSMENT_RESULT_FIELDS.cityTxt]),
      cityItemResponses:    lookupNum(f[ASSESSMENT_RESULT_FIELDS.cityItemResponses]),
      cityFullCreditPct:    lookupNum(f[ASSESSMENT_RESULT_FIELDS.cityFullCreditPct]),
      cityPartialCreditPct: lookupNum(f[ASSESSMENT_RESULT_FIELDS.cityPartialCreditPct]),
      cityBlanksCount:      lookupNum(f[ASSESSMENT_RESULT_FIELDS.cityBlanksCount]),
      regionN:              strNum(f[ASSESSMENT_RESULT_FIELDS.regionN]),
      regionFullCreditPct:  strNum(f[ASSESSMENT_RESULT_FIELDS.regionFullCreditPct]),
      regionPartialCreditPct: strNum(f[ASSESSMENT_RESULT_FIELDS.regionPartialCreditPct]),
      regionBlanksCount:    lookupNum(f[ASSESSMENT_RESULT_FIELDS.regionBlanksCount]),
      regionBlankPct:       lookupNum(f[ASSESSMENT_RESULT_FIELDS.regionBlankPct]),
      networkN:             strNum(f[ASSESSMENT_RESULT_FIELDS.networkN]),
      networkFullCreditPct: strNum(f[ASSESSMENT_RESULT_FIELDS.networkFullCreditPct]),
      networkPartialCreditPct: strNum(f[ASSESSMENT_RESULT_FIELDS.networkPartialCreditPct]),
      networkBlankPct:      strNum(f[ASSESSMENT_RESULT_FIELDS.networkBlankPct]),
    };
  });
}

// ─── Unique schools with assessment data ──────────────────────────────────────

/**
 * Fetch unique school names present in Assessment_Results_School_Item.
 * Used to populate the school selector on the assessments page.
 *
 * When bankReportAtId is provided, limits results to that bank's records
 * so only schools with data for the selected assessment appear.
 */
export async function fetchAssessmentSchools(
  bankReportAtId?: string
): Promise<SchoolInfo[]> {
  const opts: Parameters<typeof fetchAllRecords>[1] = {
    fields: [
      ASSESSMENT_RESULT_FIELDS.schoolExtract,
      ASSESSMENT_RESULT_FIELDS.cityTxt,
      ASSESSMENT_RESULT_FIELDS.schoolRegion,
    ],
  };
  if (bankReportAtId) {
    const esc = bankReportAtId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    opts.filterByFormula = `FIND("${esc}", ARRAYJOIN({Assessment_Bank_Report_AT_ID})) > 0`;
  }

  const records = await fetchAllRecords(TABLE_ASSESSMENT_SCHOOL_ITEM, opts);

  // Deduplicate by school name; take first record's city/region for each school
  const seen = new Map<string, SchoolInfo>();
  for (const r of records) {
    const f = r.fields as Record<string, unknown>;
    const name = strField(f[ASSESSMENT_RESULT_FIELDS.schoolExtract]);
    if (!name || seen.has(name)) continue;
    seen.set(name, {
      id: r.id,
      name,
      fullName: name,
      city: strField(f[ASSESSMENT_RESULT_FIELDS.cityTxt]),
      region: lookupStr(f[ASSESSMENT_RESULT_FIELDS.schoolRegion]),
    });
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Field name constants: Assessment_Items ───────────────────────────────────

export const ASSESSMENT_ITEM_FIELDS = {
  itemOrder:           'Item_Order',
  itemLabel:           'Item_Label',
  displayLabel:        'Item_Display_Label',
  prompt:              'Prompt',
  itemType:            'Item_Type',
  correctResponseText: 'Correct_Response_Text',
  correctMcResponse:   'Correct_MC_Response',
  correctMcFlat:       'Correct_MC_Flat',
  optionA:             'Option_A',
  optionB:             'Option_B',
  optionC:             'Option_C',
  optionD:             'Option_D',
  optionE:             'Option_E',
  optionF:             'Option_F',
  pointsPossible:      'Points_Possible',
  standardsCode:       'Standards_Code',
  rubricReference:     'Rubric_Reference',
  bankReportAtId:      'Assessment_Bank_Report_AT_ID',
} as const;

// ─── Assessment_Items fetch ───────────────────────────────────────────────────

/**
 * Fetch all Assessment_Items for a given bank, keyed by Item_Order.
 *
 * Uses Assessment_Bank_Report_AT_ID formula field on Assessment_Items
 * for a direct equality filter (formula field, not a lookup array).
 *
 * @param bankReportAtId  Assessment_Bank_Report_AT_ID value (recXXX)
 * @returns Map<itemOrder, AssessmentItemDetail>
 */
export async function fetchAssessmentItemDetails(
  bankReportAtId: string
): Promise<Map<number, AssessmentItemDetail>> {
  const esc = bankReportAtId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const records = await fetchAllRecords(TABLE_ASSESSMENT_ITEMS, {
    filterByFormula: `{Assessment_Bank_Report_AT_ID} = "${esc}"`,
    fields: Object.values(ASSESSMENT_ITEM_FIELDS),
    sort: [{ field: ASSESSMENT_ITEM_FIELDS.itemOrder, direction: 'asc' }],
  });

  const map = new Map<number, AssessmentItemDetail>();

  for (const r of records) {
    const f = r.fields as Record<string, unknown>;

    const itemOrder = typeof f[ASSESSMENT_ITEM_FIELDS.itemOrder] === 'number'
      ? (f[ASSESSMENT_ITEM_FIELDS.itemOrder] as number)
      : parseInt(String(f[ASSESSMENT_ITEM_FIELDS.itemOrder] ?? '0'), 10) || 0;

    if (!itemOrder) continue;

    // Correct_MC_Response is a multipleSelects field → array of letter strings
    const rawMc = f[ASSESSMENT_ITEM_FIELDS.correctMcResponse];
    const correctMcLetters = Array.isArray(rawMc) ? rawMc.map(String) : [];

    // Options — collect only non-empty entries
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
    const optionKeys = [
      ASSESSMENT_ITEM_FIELDS.optionA,
      ASSESSMENT_ITEM_FIELDS.optionB,
      ASSESSMENT_ITEM_FIELDS.optionC,
      ASSESSMENT_ITEM_FIELDS.optionD,
      ASSESSMENT_ITEM_FIELDS.optionE,
      ASSESSMENT_ITEM_FIELDS.optionF,
    ] as const;
    const options: Record<string, string> = {};
    optionLetters.forEach((letter, i) => {
      const text = strField(f[optionKeys[i]]);
      if (text) options[letter] = text;
    });

    const pointsRaw = f[ASSESSMENT_ITEM_FIELDS.pointsPossible];
    const pointsPossible = typeof pointsRaw === 'number' ? pointsRaw : null;

    map.set(itemOrder, {
      itemOrder,
      itemLabel:           strField(f[ASSESSMENT_ITEM_FIELDS.itemLabel]),
      displayLabel:        strField(f[ASSESSMENT_ITEM_FIELDS.displayLabel]),
      prompt:              strField(f[ASSESSMENT_ITEM_FIELDS.prompt]),
      itemType:            strField(f[ASSESSMENT_ITEM_FIELDS.itemType]),
      correctResponseText: strField(f[ASSESSMENT_ITEM_FIELDS.correctResponseText]),
      correctMcLetters,
      correctMcFlat:       strField(f[ASSESSMENT_ITEM_FIELDS.correctMcFlat]),
      options,
      pointsPossible,
      standardsCode:       strField(f[ASSESSMENT_ITEM_FIELDS.standardsCode]),
      rubricReference:     strField(f[ASSESSMENT_ITEM_FIELDS.rubricReference]),
    });
  }

  return map;
}
