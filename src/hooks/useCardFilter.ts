import { useMemo } from 'react';
import type { Card } from '../types';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

export type OwnershipFilter = 'all' | 'owned' | 'missing';

interface FilterOptions {
  selectedRarities: Set<string>;
  ownershipFilter: OwnershipFilter;
}

/**
 * Hook for filtering cards by rarity and ownership status
 */
export function useCardFilter(
  cards: CardWithOwnership[],
  filterOptions: FilterOptions
): CardWithOwnership[] {
  const { selectedRarities, ownershipFilter } = filterOptions;

  const filteredCards = useMemo(() => {
    let filtered = cards;

    // Apply ownership filter
    if (ownershipFilter === 'owned') {
      filtered = filtered.filter((card) => card.isOwned);
    } else if (ownershipFilter === 'missing') {
      filtered = filtered.filter((card) => !card.isOwned);
    }
    // 'all' means no ownership filtering

    // Apply rarity filter
    if (selectedRarities.size > 0) {
      filtered = filtered.filter((card) => selectedRarities.has(card.rarity));
    }

    return filtered;
  }, [cards, selectedRarities, ownershipFilter]);

  return filteredCards;
}

/**
 * Get all unique rarities from cards
 */
export function useAvailableRarities(cards: CardWithOwnership[]): string[] {
  return useMemo(() => {
    const rarities = new Set<string>();
    cards.forEach((card) => {
      if (card.rarity) {
        rarities.add(card.rarity);
      }
    });
    return Array.from(rarities).sort();
  }, [cards]);
}
