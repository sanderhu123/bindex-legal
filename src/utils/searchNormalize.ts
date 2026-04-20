/**
 * Normalize a string for name-based card search.
 *
 * Removes common punctuation that appears in card names (e.g. the dash in
 * "Charizard-GX" or the dot in "Zacian LV.X") and collapses extra whitespace,
 * so users can find cards regardless of how they type the punctuation.
 *
 * Apply this to BOTH the card name and the user's query before comparing.
 *
 * Examples:
 *   "Charizard-GX"   -> "charizard gx"
 *   "Zacian LV.X"    -> "zacian lv x"
 *   "Farfetch'd"     -> "farfetch d"
 *   "Mr. Mime"       -> "mr mime"
 */
export function normalizeForNameSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-.'’`,!?:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
