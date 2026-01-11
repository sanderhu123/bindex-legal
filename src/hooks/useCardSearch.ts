import { useMemo } from 'react';
import type { Card } from '../types';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hook for searching cards by name, number, or Pokédex number
 */
export function useCardSearch(cards: CardWithOwnership[], searchQuery: string): CardWithOwnership[] {
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return cards;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Create a regex to match the query as a complete word (not partial)
    // This prevents "Pidgeot" from matching "Pidgeotto"
    const escapedQuery = escapeRegExp(query);
    const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
    
    return cards.filter((card) => {
      // Search by name using word boundary (case-insensitive)
      // Matches "Pidgeot", "Pidgeot EX", "Pidgeot V" but NOT "Pidgeotto"
      const nameMatch = wordBoundaryRegex.test(card.name);
      
      // Search by number (e.g., "001/150" or "#001" or just "1")
      const numberMatch = card.number.toLowerCase().includes(query);
      
      // Search by Pokédex number (for Region mode)
      const pokedexMatch = card.pokedexNumber 
        ? card.pokedexNumber.toString().includes(query.replace('#', '').replace(/\D/g, ''))
        : false;
      
      return nameMatch || numberMatch || pokedexMatch;
    });
  }, [cards, searchQuery]);

  return filteredCards;
}
