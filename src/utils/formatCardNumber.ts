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
 *   - "SM211/SM250" (Sun & Moon Black Star Promo)
 *
 * Our DB stores `number` with the prefix ("TG01") but `setTotal` only as a
 * plain integer ("30"), so we re-attach the prefix at display time.
 *
 * If `number` already contains a slash, it's returned as-is. If `setTotal`
 * is empty/missing, only `number` is returned.
 */
export function formatCardNumber(
  number: string | null | undefined,
  setTotal?: string | null | undefined
): string {
  const num = number || '';
  if (!num) return '';
  if (num.includes('/')) return num;
  if (!setTotal) return num;

  const prefixMatch = num.match(/^[A-Za-z]+/);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  return `${num}/${prefix}${setTotal}`;
}
