import type { Card } from '../types';

/**
 * The user-selectable variant types.
 */
const USER_VARIANTS = new Set(['base', 'reverse-holo', 'poke-ball', 'master-ball', 'stamp', 'energy']);

/**
 * A card is a "secret rare" when its number exceeds the set's printed total
 * (e.g. card 199/198). The number string can have a numeric prefix only
 * (TG/SV-style alphanumeric numbers like "TG01" never qualify because they
 * use their own subset numbering).
 */
function isSecretRareCard(card: Card): boolean {
  if (!card.setTotal) return false;
  const numMatch = card.number.match(/^(\d+)/);
  if (!numMatch) return false;
  const num = parseInt(numMatch[1], 10);
  const total = parseInt(card.setTotal, 10);
  if (!Number.isFinite(num) || !Number.isFinite(total) || total <= 0) return false;
  return num > total;
}

/**
 * Count how many cards remain after filtering by selected variants.
 * Shared by binder creation and the questionnaire variant step.
 *
 * Logic:
 * - Secret rares (card number > set printed total) are only counted when
 *   'secret-rare' is in the tracked list.
 * - For each unique base card, check if any of its variants are in the
 *   tracked list. If yes, keep only the tracked variants for that card.
 * - If none of a card's variants are tracked (e.g. ultra/illustration rares
 *   that only exist as 'base'), keep the base version so the card isn't lost.
 */
export function countCardsWithVariants(
  cards: Card[],
  variantsToTrack: string[]
): number {
  const filtered = cards.filter(c => USER_VARIANTS.has(c.variant || 'base'));

  if (!variantsToTrack || variantsToTrack.length === 0) {
    return filtered.length;
  }

  const trackSecretRares = variantsToTrack.includes('secret-rare');

  const baseCardHasTracked = new Map<string, boolean>();
  filtered.forEach(card => {
    if (isSecretRareCard(card)) return;
    const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/, '');
    const cardVariant = card.variant || 'base';
    if (variantsToTrack.includes(cardVariant)) {
      baseCardHasTracked.set(baseId, true);
    }
    if (!baseCardHasTracked.has(baseId)) {
      baseCardHasTracked.set(baseId, false);
    }
  });

  let count = 0;
  filtered.forEach(card => {
    if (isSecretRareCard(card)) {
      if (trackSecretRares && (card.variant || 'base') === 'base') count++;
      return;
    }
    const cardVariant = card.variant || 'base';
    const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/, '');
    if (!baseCardHasTracked.get(baseId)) {
      if (cardVariant === 'base') count++;
    } else if (variantsToTrack.includes(cardVariant)) {
      count++;
    }
  });

  return count;
}
