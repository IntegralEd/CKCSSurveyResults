/**
 * lib/aggregation.ts
 *
 * Agreement aggregation and Top-N aggregation over filtered respondents.
 * Pure computation — no Airtable calls.
 *
 * Response scale (4 buckets, confirmed from schema):
 *   Strongly Agree | Agree | Neutral | Negative
 *
 * TODO: Confirm exact string casing used in Survey_Respondents singleSelect response fields.
 *   Expected: 'Strongly Agree', 'Agree', 'Neutral', 'Negative'
 *   Verify these match the actual values stored in Airtable before going live.
 *
 * Pre-computed top-N indicators:
 *   Survey_Respondents already has {Question_Label}_Top2 and {Question_Label}_Top3
 *   fields (number, 0 or 1). When these fields are present on a respondent record,
 *   they are used as the primary source for top-N computation (sum / n).
 *   If they are absent, top-N is computed from the raw response bucket counts.
 */
import type { SurveyRespondent, SurveyItem, AgreementRow, TopNRow, SchoolItemResult, ComparisonRow, ComparisonGroup } from './types';

// ─── Response bucket constants ────────────────────────────────────────────────

/**
 * The 4 response buckets for CKCS survey items.
 *
 * TODO: Confirm exact string values used in Survey_Respondents singleSelect fields.
 *   These strings must exactly match the raw values stored in Airtable.
 */
export const RESPONSE_BUCKETS = [
  'Strongly Agree',
  'Agree',
  'Neutral',
  'Negative',
] as const;

export type ResponseBucket = typeof RESPONSE_BUCKETS[number];

// Normalized (uppercased) bucket keys for case-insensitive matching.
// Response values are uppercased before comparison so that casing differences
// between administrations ("Strongly Agree" vs "Strongly agree") are ignored.
const BUCKET_UPPER: Record<string, ResponseBucket> = {
  'STRONGLY AGREE': 'Strongly Agree',
  'AGREE': 'Agree',
  'NEUTRAL': 'Neutral',
  'NEGATIVE': 'Negative',
};

/** Top-2 = Strongly Agree + Agree */
export const TOP_2_BUCKETS: ResponseBucket[] = ['Strongly Agree', 'Agree'];

/** Top-3 = Strongly Agree + Agree + Neutral */
export const TOP_3_BUCKETS: ResponseBucket[] = ['Strongly Agree', 'Agree', 'Neutral'];

// ─── Agreement aggregation ────────────────────────────────────────────────────

/**
 * For each Survey_Item, counts how many respondents chose each response bucket.
 * Returns one AgreementRow per item, sorted by Item_Order ascending.
 *
 * For each respondent:
 *   - Raw response:   respondent.fields[item.questionLabel]
 *   - Pre-computed:   respondent.fields[`${item.questionLabel}_Top2`]  (0 or 1)
 *                     respondent.fields[`${item.questionLabel}_Top3`]  (0 or 1)
 *
 * When pre-computed indicators are present on at least one respondent, they are
 * summed for top2Pct / top3Pct. Otherwise, top-N is computed from bucket counts.
 */
export function aggregateAgreement(
  respondents: SurveyRespondent[],
  items: SurveyItem[]
): AgreementRow[] {
  const rows: AgreementRow[] = [];

  for (const item of items) {
    const fieldName = item.questionLabel;
    if (!fieldName) continue;

    const top2Field = `${fieldName}_Top2`;
    const top3Field = `${fieldName}_Top3`;

    let stronglyAgreeCount = 0;
    let agreeCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let blankCount = 0;
    let n = 0;

    // Accumulators for pre-computed indicator sums
    let top2Sum = 0;
    let top3Sum = 0;
    let precomputedCount = 0;

    for (const respondent of respondents) {
      const raw = respondent.fields[fieldName];
      const rawStr = raw != null ? String(raw).trim() : '';

      if (rawStr === '') {
        blankCount++;
      } else {
        n++;
        const bucket = BUCKET_UPPER[rawStr.toUpperCase()];
        switch (bucket) {
          case 'Strongly Agree': stronglyAgreeCount++; break;
          case 'Agree':          agreeCount++;          break;
          case 'Neutral':        neutralCount++;        break;
          case 'Negative':       negativeCount++;       break;
          // Non-standard value: still counted in n but not in any named bucket
        }
      }

      // Accumulate pre-computed top-N indicators if present
      const top2Val = respondent.fields[top2Field];
      const top3Val = respondent.fields[top3Field];
      if (top2Val != null && top3Val != null) {
        top2Sum += Number(top2Val);
        top3Sum += Number(top3Val);
        precomputedCount++;
      }
    }

    // Use pre-computed top-N if available for at least some respondents;
    // fall back to bucket counts when not present.
    const usePrecomputed = precomputedCount > 0;
    const denominator = usePrecomputed ? precomputedCount : n;

    const top2Pct = denominator > 0
      ? (usePrecomputed
          ? round1((top2Sum / denominator) * 100)
          : computeTopPct(
              { 'Strongly Agree': stronglyAgreeCount, 'Agree': agreeCount },
              TOP_2_BUCKETS,
              n
            ))
      : 0;

    const top3Pct = denominator > 0
      ? (usePrecomputed
          ? round1((top3Sum / denominator) * 100)
          : computeTopPct(
              {
                'Strongly Agree': stronglyAgreeCount,
                'Agree': agreeCount,
                'Neutral': neutralCount,
              },
              TOP_3_BUCKETS,
              n
            ))
      : 0;

    // Derive domain string from categorySelect (join for display)
    const domain = item.categorySelect.join(', ');

    rows.push({
      questionLabel: item.questionLabel,
      prompt: item.prompt,
      domain,
      itemOrder: item.itemOrder,
      n,
      stronglyAgreeCount,
      agreeCount,
      neutralCount,
      negativeCount,
      stronglyAgreePct: n > 0 ? round1((stronglyAgreeCount / n) * 100) : 0,
      agreePct:         n > 0 ? round1((agreeCount / n) * 100) : 0,
      neutralPct:       n > 0 ? round1((neutralCount / n) * 100) : 0,
      negativePct:      n > 0 ? round1((negativeCount / n) * 100) : 0,
      top2Pct,
      top3Pct,
      blankCount,
    });
  }

  return rows.sort((a, b) => a.itemOrder - b.itemOrder);
}

// ─── Top-N aggregation ────────────────────────────────────────────────────────

/**
 * Returns only top2Pct and top3Pct per item, sorted by top2Pct descending.
 */
export function aggregateTopN(
  respondents: SurveyRespondent[],
  items: SurveyItem[]
): TopNRow[] {
  return aggregateAgreement(respondents, items)
    .map((row) => ({
      questionLabel: row.questionLabel,
      prompt: row.prompt,
      domain: row.domain,
      itemOrder: row.itemOrder,
      n: row.n,
      top2Pct: row.top2Pct,
      top3Pct: row.top3Pct,
    }))
    .sort((a, b) => b.top2Pct - a.top2Pct);
}

// ─── Comparison aggregation ───────────────────────────────────────────────────

/**
 * Transforms pre-aggregated Survey_School_Item_Results records into ComparisonRows.
 *
 * No heavy computation — school/city/region/network top-N values are already
 * computed by Airtable. This function just reshapes the data and applies the
 * comparisonGroups mask so callers only receive the columns they requested.
 *
 * Filters to Likert-type items only (itemOrder > 0 and prompt present).
 * Sorts by itemOrder ascending.
 *
 * @param results          Records from fetchSchoolItemResults()
 * @param comparisonGroups Which comparison columns to populate (null the rest)
 * @param itemMap          Optional Map<surveyItemRecordId, SurveyItem> for domain lookup
 */
export function buildComparisonRows(
  results: SchoolItemResult[],
  comparisonGroups: ComparisonGroup[],
  itemMap?: Map<string, SurveyItem>
): ComparisonRow[] {
  const includeCity = comparisonGroups.includes('city');
  const includeRegion = comparisonGroups.includes('region');
  const includeNetwork = comparisonGroups.includes('network');

  return results
    .filter((r) => {
      if (!r.itemOrder || !r.prompt) return false;
      // Exclude open-ended items — only include items with a Likert scale
      if (itemMap) {
        const item = itemMap.get(r.surveyItemRecordId);
        if (item && item.likertScale === 0) return false;
      }
      return true;
    })
    .sort((a, b) => a.itemOrder - b.itemOrder)
    .map((r) => {
      const item = itemMap?.get(r.surveyItemRecordId);
      const domain = item ? item.categorySelect.join(', ') : '';

      const schoolTop1Pct = r.schoolN > 0
        ? round1((r.schoolSACount / r.schoolN) * 100) : 0;

      return {
        questionLabel: r.questionLabel,
        prompt: r.prompt,
        domain,
        itemOrder: r.itemOrder,
        schoolName: r.schoolTxt,
        schoolN: r.schoolN,
        schoolTop1Pct,
        schoolTop2Pct: r.schoolTop2Pct,
        schoolTop3Pct: r.schoolTop3Pct,
        cityN:       includeCity    ? r.cityN       : null,
        cityTop1Pct: includeCity    ? r.cityTop1Pct : null,
        cityTop2Pct: includeCity    ? r.cityTop2Pct : null,
        cityTop3Pct: includeCity    ? r.cityTop3Pct : null,
        regionN:       includeRegion ? r.regionN       : null,
        regionTop1Pct: includeRegion ? r.regionTop1Pct : null,
        regionTop2Pct: includeRegion ? r.regionTop2Pct : null,
        regionTop3Pct: includeRegion ? r.regionTop3Pct : null,
        networkN:       includeNetwork ? r.networkN       : null,
        networkTop1Pct: includeNetwork ? r.networkTop1Pct : null,
        networkTop2Pct: includeNetwork ? r.networkTop2Pct : null,
        networkTop3Pct: includeNetwork ? r.networkTop3Pct : null,
      };
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTopPct(
  counts: Record<string, number>,
  keys: readonly string[],
  n: number
): number {
  if (n === 0) return 0;
  const topCount = keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  return round1((topCount / n) * 100);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
