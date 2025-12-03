import { useMemo } from 'react';
import type { Card } from '../types';

interface CardWithOwnership extends Card {
  isOwned: boolean;
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
    
    return cards.filter((card) => {
      // Search by name (case-insensitive)
      const nameMatch = card.name.toLowerCase().includes(query);
      
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
