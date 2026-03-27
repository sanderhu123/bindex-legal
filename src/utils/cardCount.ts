import type { Card } from '../types';

/**
 * Count how many cards remain after filtering by selected variants.
 * Shared by binder creation and the questionnaire variant step.
 *
 * Logic:
 * - For each unique base card, check if any of its variants are in the tracked list.
 * - If yes, keep only the tracked variants for that card.
 * - If none of a card's variants are tracked (e.g. secret rares that only have 'base'),
 *   keep the base version so the card isn't lost.
 */
export function countCardsWithVariants(
  cards: Card[],
  variantsToTrack: string[]
): number {
  if (!variantsToTrack || variantsToTrack.length === 0) {
    return cards.length;
  }

  const baseCardHasTracked = new Map<string, boolean>();
  cards.forEach(card => {
    const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
    const cardVariant = card.variant || 'base';
    if (variantsToTrack.includes(cardVariant)) {
      baseCardHasTracked.set(baseId, true);
    }
    if (!baseCardHasTracked.has(baseId)) {
      baseCardHasTracked.set(baseId, false);
    }
  });

  let count = 0;
  cards.forEach(card => {
    const cardVariant = card.variant || 'base';
    const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
    if (!baseCardHasTracked.get(baseId)) {
      if (cardVariant === 'base') count++;
    } else if (variantsToTrack.includes(cardVariant)) {
      count++;
    }
  });

  return count;
}
