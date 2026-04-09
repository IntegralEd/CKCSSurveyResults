/**
 * lib/items.ts
 *
 * Fetch and map Survey_Items.
 * Server-only.
 *
 * Field mapping (all confirmed from schema registry):
 *   Item_AT_ID       → item.itemAtId
 *   Item_Order       → item.itemOrder  (singleLineText, parsed to number)
 *   Item_Prompt      → item.prompt
 *   Question_Label   → item.questionLabel  (= column name in Survey_Respondents)
 *   Question_Type    → item.questionType
 *   Category_Code    → item.categoryCode
 *   Category_Select  → item.categorySelect  (multipleSelects)
 *   Top_2            → item.top2Values  (multipleSelects)
 *   Top_3            → item.top3Values  (multipleSelects)
 *   Likert_Scale     → item.likertScale
 */
import { fetchItems } from './airtable';
import type { SurveyItem } from './types';

/**
 * Returns all Survey_Items sorted ascending by Item_Order.
 * All items are returned; callers should filter by Question_Type if open-response
 * items need to be excluded from aggregation views.
 */
export async function getSurveyItems(): Promise<SurveyItem[]> {
  const items = await fetchItems();
  return items.sort((a, b) => a.itemOrder - b.itemOrder);
}

/**
 * Returns a Map<questionLabel, SurveyItem> for O(1) lookups by questionLabel.
 * questionLabel is the value from the Question_Label field and corresponds to
 * the column name in Survey_Respondents.
 */
export async function getItemMap(): Promise<Map<string, SurveyItem>> {
  const items = await getSurveyItems();
  const map = new Map<string, SurveyItem>();
  for (const item of items) {
    map.set(item.questionLabel, item);
  }
  return map;
}

/**
 * Returns a Map<airtableRecordId, SurveyItem> for O(1) lookups by Airtable record ID.
 * Useful when joining from Survey_Item_Comments.Survey_Item_Link (which stores record IDs).
 */
export async function getItemMapById(): Promise<Map<string, SurveyItem>> {
  const items = await getSurveyItems();
  const map = new Map<string, SurveyItem>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}
