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

/**
 * Normalize a string for illustrator (artist) search.
 *
 * Lowercases AND strips diacritics so users can type "Mekayu" to find
 * "Mékayu", "Jose" to find "José", etc.
 *
 * The matching column in Postgres (`artist_normalized`) is generated using
 * `lower(unaccent(artist))`. The `NFD` + combining-mark strip below produces
 * the same output for all Latin-script accents, so JS and DB stay in sync.
 *
 * Apply this to BOTH the artist value and the user's query before comparing.
 *
 * Examples:
 *   "Mékayu"        -> "mekayu"
 *   "José Vega"     -> "jose vega"
 *   "Mitsuhiro Arita" -> "mitsuhiro arita"
 */
export function normalizeForArtistSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
