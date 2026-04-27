/**
 * lib/assessmentAggregation.ts
 *
 * Transforms pre-aggregated Assessment_Results_School_Item records
 * into AssessmentRow display objects.
 *
 * All Airtable percentage fields arrive as decimals (0–1).
 * All output pct fields are 0–100, rounded to 1 decimal.
 *
 * Chart segment order (left = best, right = worst):
 *   Full Credit  → #17345B  navy
 *   Partial Credit → #255694 blue
 *   No Credit    → #F79520  orange  (computed: residual after full + partial + blank)
 *   Blank        → #D1D5DB  gray    (computed: Blanks / Item_Responses × 100)
 *
 * Region comparison does not carry a blank count so No Credit absorbs blanks:
 *   regionNoCreditPct = 100 - regionFullCreditPct - regionPartialCreditPct
 */
import type { AssessmentSchoolResult, AssessmentRow, AssessmentComparisonGroup, AssessmentItemDetail } from './assessmentTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Multiply decimal 0–1 by 100 and round to 1 decimal */
function pct(decimal: number): number {
  return round1(decimal * 100);
}

/** Clamp a computed remainder to [0, 100] to absorb float rounding errors */
function clamp0(x: number): number {
  return Math.max(0, Math.min(100, x));
}

// ─── Main aggregation ─────────────────────────────────────────────────────────

/**
 * Transform Assessment_Results_School_Item records into display rows.
 *
 * Filters out records missing itemOrder or itemPrompt.
 * Sorts by itemOrder ascending.
 * Applies the comparisonGroups mask — non-requested groups are set to null.
 * Merges rich item detail when itemDetailMap is provided.
 *
 * @param results          Records from fetchAssessmentResults()
 * @param comparisonGroups Which comparison columns to populate
 * @param itemDetailMap    Optional Map<itemOrder, AssessmentItemDetail> from fetchAssessmentItemDetails()
 */
export function buildAssessmentRows(
  results: AssessmentSchoolResult[],
  comparisonGroups: AssessmentComparisonGroup[],
  itemDetailMap?: Map<number, AssessmentItemDetail>
): AssessmentRow[] {
  const includeCity    = comparisonGroups.includes('city');
  const includeRegion  = comparisonGroups.includes('region');
  const includeNetwork = comparisonGroups.includes('network');

  return results
    .filter((r) => r.itemOrder > 0 && r.itemPrompt)
    .sort((a, b) => a.itemOrder - b.itemOrder)
    .map((r) => {
      // ── School level ────────────────────────────────────────────────────────
      const schoolFullPct    = pct(r.fullCreditAll);
      const schoolPartialPct = pct(r.partialCredit);
      const schoolBlankPct   = r.itemResponses > 0
        ? round1((r.blanks / r.itemResponses) * 100)
        : 0;
      const schoolNoCreditPct = clamp0(
        round1(100 - schoolFullPct - schoolPartialPct - schoolBlankPct)
      );

      // ── City level ──────────────────────────────────────────────────────────
      let cityN: number | null = null;
      let cityFullCreditPct: number | null = null;
      let cityPartialCreditPct: number | null = null;
      let cityNoCreditPct: number | null = null;
      let cityBlankPct: number | null = null;

      if (includeCity && r.cityItemResponses > 0) {
        cityN               = r.cityItemResponses;
        cityFullCreditPct   = pct(r.cityFullCreditPct);
        cityPartialCreditPct = pct(r.cityPartialCreditPct);
        cityBlankPct        = round1((r.cityBlanksCount / r.cityItemResponses) * 100);
        cityNoCreditPct     = clamp0(
          round1(100 - cityFullCreditPct - cityPartialCreditPct - cityBlankPct)
        );
      } else if (includeCity) {
        cityN = 0;
        cityFullCreditPct = cityPartialCreditPct = cityNoCreditPct = cityBlankPct = 0;
      }

      // ── Region level ────────────────────────────────────────────────────────
      let regionN: number | null = null;
      let regionFullCreditPct: number | null = null;
      let regionPartialCreditPct: number | null = null;
      let regionNoCreditPct: number | null = null;
      let regionBlankPct: number | null = null;

      if (includeRegion && r.regionN > 0) {
        regionN               = r.regionN;
        // Region pct fields are decimals 0–1 (multipleLookupValues from Assessment_Results_Region_Item)
        regionFullCreditPct   = pct(r.regionFullCreditPct);
        regionPartialCreditPct = pct(r.regionPartialCreditPct);
        regionBlankPct        = pct(r.regionBlankPct);
        regionNoCreditPct     = clamp0(
          round1(100 - regionFullCreditPct - regionPartialCreditPct - regionBlankPct)
        );
      } else if (includeRegion) {
        regionN = 0;
        regionFullCreditPct = regionPartialCreditPct = regionNoCreditPct = regionBlankPct = 0;
      }

      // ── Network level ───────────────────────────────────────────────────────
      let networkN: number | null = null;
      let networkFullCreditPct: number | null = null;
      let networkPartialCreditPct: number | null = null;
      let networkNoCreditPct: number | null = null;
      let networkBlankPct: number | null = null;

      if (includeNetwork && r.networkN > 0) {
        networkN               = r.networkN;
        // Network pct fields are decimals 0–1 (multipleLookupValues from Assessment_Network_Results)
        networkFullCreditPct   = pct(r.networkFullCreditPct);
        networkPartialCreditPct = pct(r.networkPartialCreditPct);
        networkBlankPct        = pct(r.networkBlankPct);
        networkNoCreditPct     = clamp0(
          round1(100 - networkFullCreditPct - networkPartialCreditPct - networkBlankPct)
        );
      } else if (includeNetwork) {
        networkN = 0;
        networkFullCreditPct = networkPartialCreditPct = networkNoCreditPct = networkBlankPct = 0;
      }

      return {
        itemOrder: r.itemOrder,
        itemPrompt: r.itemPrompt,
        itemType: r.itemType,
        domains: r.domains,
        assessmentId: r.assessmentId,
        schoolName: r.schoolExtract,
        detail: itemDetailMap?.get(r.itemOrder),
        schoolN: r.itemResponses,
        schoolFullCreditPct:    schoolFullPct,
        schoolPartialCreditPct: schoolPartialPct,
        schoolNoCreditPct,
        schoolBlankPct,
        cityN,
        cityFullCreditPct,
        cityPartialCreditPct,
        cityNoCreditPct,
        cityBlankPct,
        regionN,
        regionFullCreditPct,
        regionPartialCreditPct,
        regionNoCreditPct,
        regionBlankPct,
        networkN,
        networkFullCreditPct,
        networkPartialCreditPct,
        networkNoCreditPct,
        networkBlankPct,
      };
    });
}
