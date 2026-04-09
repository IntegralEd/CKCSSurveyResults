/**
 * lib/comments.ts
 *
 * Fetch open-response comments and enrich with prompt text.
 * Server-only.
 *
 * Schema (confirmed from schema registry):
 *   Survey_Item_Comments fields:
 *     Comment_Text              — the response text
 *     Survey_Item_Link          — linked record array → Survey_Items (use record ID)
 *     Survey_Admin              — singleSelect (administration)
 *     School_Link               — linked record array → Schools
 *     Region (from School_Link) — lookup
 *     Respondent_Link           — TEXT key, not a linked record
 *
 *   Survey_Respondents.Student_Item_Comments — linked record array → Survey_Item_Comments
 *
 * Join strategy (current — "coarse by admin"):
 *   Filter comments by the Survey_Admin values present in the filtered respondent set.
 *   This aligns comments with the selected administration filter but does not filter
 *   by school or individual respondent.
 *
 * TODO: For school-level filtering, additionally match on School_Link values.
 *   For respondent-level precision, join via Respondent_Link (text key) — the
 *   Survey_Item_Comments.Respondent_Link field should match Survey_Respondents.Respondent_Key.
 *   To implement: build a Set<string> of filtered respondent keys, then post-filter
 *   comments where comment.respondentLink is in that set.
 *
 * Item prompt lookup:
 *   Use Survey_Item_Comments.Survey_Item_Link[0] (Airtable record ID) to look up
 *   the item in the itemMapById (Map<recordId, SurveyItem>).
 *   Items MUST be indexed by Airtable record ID for this to work — see getItemMapById()
 *   in items.ts.
 */
import { fetchComments } from './airtable';
import type { SurveyItem, SurveyRespondent, CommentRow } from './types';

/**
 * Fetches Survey_Item_Comments filtered by Survey_Admin values present in
 * the filtered respondent set, then enriches each comment with prompt text.
 *
 * @param respondents  Already-filtered respondents (used to derive Survey_Admin values)
 * @param itemMapById  Map<airtableRecordId, SurveyItem> for prompt lookups
 *                     Build with getItemMapById() from items.ts
 */
export async function getComments(
  respondents: SurveyRespondent[],
  itemMapById: Map<string, SurveyItem>
): Promise<CommentRow[]> {
  if (respondents.length === 0) return [];

  // Derive unique Survey_Admin values from the filtered respondent set.
  const adminValues = Array.from(
    new Set(respondents.map((r) => r.administration).filter(Boolean))
  );

  // Build a respondent key set for precise post-filtering.
  // comment.respondentLink (text key) must match respondent.respondentKey.
  const respondentKeySet = new Set(
    respondents.map((r) => r.respondentKey).filter(Boolean)
  );

  const rawComments = await fetchComments(adminValues);

  const rows: CommentRow[] = [];

  for (const comment of rawComments) {
    // Post-filter: only include comments whose respondent is in the filtered set.
    // This enforces school, demographic, and all other active filters.
    if (comment.respondentLink && !respondentKeySet.has(comment.respondentLink)) {
      continue;
    }

    // Look up the linked Survey_Item by Airtable record ID.
    const linkedId = comment.linkedItemRecordId ?? '';
    const item = linkedId ? itemMapById.get(linkedId) : undefined;
    const questionLabel = item?.questionLabel ?? '';
    const prompt = item?.prompt ?? questionLabel;

    rows.push({
      respondentLink: comment.respondentLink,
      school: comment.regionFromSchool ?? '',
      administration: comment.surveyAdmin,
      questionLabel,
      prompt,
      commentText: comment.commentText,
      itemPrompt: item?.prompt,
    });
  }

  // Build a secondary map by questionLabel for sort order lookup.
  const orderByLabel = new Map<string, number>();
  Array.from(itemMapById.values()).forEach((item) => {
    orderByLabel.set(item.questionLabel, item.itemOrder);
  });

  rows.sort((a, b) => {
    const aOrder = orderByLabel.get(a.questionLabel) ?? 9999;
    const bOrder = orderByLabel.get(b.questionLabel) ?? 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.questionLabel.localeCompare(b.questionLabel);
  });

  return rows;
}
