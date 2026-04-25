/**
 * Format a card's number/setTotal pair for display, the way it's printed on
 * the actual card.
 *
 * Most cards just show "25/172" — plain number / plain set total. But for
 * subsets like Trainer Gallery, Galarian Gallery, Shiny Vault, Radiant
 * Collection, Holo subsets and the Black Star Promos, the prefix is
 * REPEATED on both sides of the slash on the printed card:
 *   - "TG01/TG30"   (Trainer Gallery)
 *   - "GG70/GG70"   (Galarian Gallery)
 *   - "SV94/SV94"   (Shiny Vault)
 *   - "RC29/RC32"   (Radiant Collection)
 *   - "H1/H32"      (e-card era Holo subset)
 *   - "SM211/SM250" (Sun & Moon Black Star Promo)
 *
 * Our DB stores `number` with the prefix ("TG01") but `setTotal` only as a
 * plain integer ("30"), so we re-attach the prefix at display time.
 *
 * If `number` already contains a slash, it's returned as-is. If `setTotal`
 * is empty/missing, only `number` is returned.
 *
 * SUBSET TOTAL OVERRIDES
 * ----------------------
 * For most prefixed subsets (TG, GG, SV) pokemontcg.io stores the subset in
 * its own set ID (e.g. `swsh10tg`), so the `printedTotal` we read from the
 * DB IS the subset total — and `setTotal` already equals what's printed on
 * the card.
 *
 * But a few legacy subsets (Radiant Collection in Generations / Legendary
 * Treasures, the H-prefix Holo subsets in Aquapolis / Skyridge) live INSIDE
 * the parent set — so `setTotal` is the parent's printed total (e.g. 83 for
 * Generations) and would render as "RC29/RC83" instead of "RC29/RC32".
 *
 * The lookup below maps "(setId, prefix) → real subset total" for those
 * cases. Add new entries here if more subsets surface with the same problem.
 */
const SUBSET_TOTALS: Record<string, Record<string, number>> = {
  // Radiant Collection
  g1: { RC: 32 }, // Generations
  bw11: { RC: 25 }, // Legendary Treasures

  // E-card era Holo subset
  ecard2: { H: 32 }, // Aquapolis
  ecard3: { H: 32 }, // Skyridge
};

/**
 * Strip the variant suffix from a card ID and return the parent set ID.
 *
 * Card IDs look like:
 *   "g1-RC29"           → set "g1"
 *   "g1-RC29-base"      → set "g1"
 *   "bw11-RC25-reverse" → set "bw11"
 *   "swsh10-25"         → set "swsh10"
 *
 * Returns "" if the ID isn't in a recognisable "<setId>-<number>" form.
 */
function extractSetIdFromCardId(cardId: string): string {
  const baseId = cardId.replace(
    /-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/,
    ''
  );
  const lastDash = baseId.lastIndexOf('-');
  if (lastDash <= 0) return '';
  return baseId.slice(0, lastDash);
}

export function formatCardNumber(
  number: string | null | undefined,
  setTotal?: string | null | undefined,
  cardId?: string | null | undefined
): string {
  const num = number || '';
  if (!num) return '';
  if (num.includes('/')) return num;

  const prefixMatch = num.match(/^[A-Za-z]+/);
  const prefix = prefixMatch ? prefixMatch[0] : '';

  // Override path: when we know this card is from a subset whose real total
  // doesn't match its parent set's printedTotal, use the hard-coded total
  // from SUBSET_TOTALS so the displayed number matches what's printed on
  // the actual card.
  if (prefix && cardId) {
    const setId = extractSetIdFromCardId(cardId);
    const overrideTotal = SUBSET_TOTALS[setId]?.[prefix.toUpperCase()];
    if (overrideTotal) {
      return `${num}/${prefix}${overrideTotal}`;
    }
  }

  if (!setTotal) return num;
  return `${num}/${prefix}${setTotal}`;
}
