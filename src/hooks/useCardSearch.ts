import { useMemo } from 'react';
import type { Card } from '../types';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

/**
 * Strip leading zeros from a string so "007", "07", and "7" all become "7".
 * Non-numeric prefixes like "TG01" are left as-is (only pure-numeric strings are stripped).
 */
function stripLeadingZeros(value: string): string {
  // Only strip zeros from a purely numeric string (e.g., "007" → "7")
  if (/^\d+$/.test(value)) {
    return String(Number(value)); // "007" → "7", "0" stays "0"
  }
  return value;
}

/**
 * Check if a search query looks like a card number search.
 * Returns true for things like "7", "007", "001/159", "#7", "TG21".
 * Returns false for plain name searches like "oddish" or "pikachu".
 */
function looksLikeNumberSearch(query: string): boolean {
  // Starts with a digit, or starts with # followed by a digit, or contains a /
  return /^#?\d/.test(query) || query.includes('/') || /^[a-z]{1,3}\d/i.test(query);
}

/**
 * Hook for searching cards by name, number, or Pokédex number.
 * 
 * Number search is normalized so "7", "07", and "007" all return the same cards.
 * Slash format like "001/159" is also supported — it matches the card number part.
 */
export function useCardSearch(cards: CardWithOwnership[], searchQuery: string): CardWithOwnership[] {
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) {
      return cards;
    }

    const query = searchQuery.toLowerCase().trim();

    // Determine if the query looks like a number search
    const isNumberSearch = looksLikeNumberSearch(query);

    // For number searches, prepare a normalized version of the query
    // "007" → "7", "#007" → "7", "001/159" → just check "1" against card number
    let normalizedNumberQuery = '';
    if (isNumberSearch) {
      // Remove leading # if present
      let cleaned = query.replace(/^#/, '');

      // If the query contains a slash (e.g., "001/159"), take only the part before the slash
      if (cleaned.includes('/')) {
        cleaned = cleaned.split('/')[0];
      }

      // Strip leading zeros so "007" and "7" match the same cards
      normalizedNumberQuery = stripLeadingZeros(cleaned);
    }
    
    return cards.filter((card) => {
      // Search by name using partial matching (case-insensitive)
      // "Odd" matches "Oddish", "Char" matches "Charizard", etc.
      const nameMatch = card.name.toLowerCase().includes(query);
      
      // Search by card number (e.g., "007", "7", "001/159", "TG21")
      // Normalize the card's number the same way so "007" == "7"
      let numberMatch = false;
      if (isNumberSearch && normalizedNumberQuery) {
        const cardNum = stripLeadingZeros(card.number.toLowerCase());
        // Exact match: the normalized card number equals the normalized query
        // This ensures "7" matches card #007 but not card #17 or #70
        numberMatch = cardNum === normalizedNumberQuery;
      }
      
      // Search by Pokédex number (for Region mode)
      // Also normalized so "007" matches Pokédex #7
      const pokedexMatch = card.pokedexNumber 
        ? card.pokedexNumber.toString() === normalizedNumberQuery
        : false;
      
      return nameMatch || numberMatch || pokedexMatch;
    });
  }, [cards, searchQuery]);

  return filteredCards;
}
