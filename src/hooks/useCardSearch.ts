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
    // "007" → "7", "#007" → "7", "001/159" → number "1" + set total "159"
    let normalizedNumberQuery = '';
    let normalizedTotalQuery = '';
    if (isNumberSearch) {
      const cleaned = query.replace(/^#/, '');
      const parts = cleaned.split('/');

      normalizedNumberQuery = stripLeadingZeros(parts[0]);

      if (parts.length > 1 && parts[1]) {
        normalizedTotalQuery = stripLeadingZeros(parts[1]);
      }
    }
    
    return cards.filter((card) => {
      const nameMatch = card.name.toLowerCase().includes(query);
      
      let numberMatch = false;
      if (isNumberSearch && normalizedNumberQuery) {
        const cardNum = stripLeadingZeros(card.number.toLowerCase());
        if (cardNum === normalizedNumberQuery) {
          if (normalizedTotalQuery) {
            const cardTotal = card.setTotal ? stripLeadingZeros(card.setTotal) : '';
            numberMatch = cardTotal === normalizedTotalQuery;
          } else {
            numberMatch = true;
          }
        }
      }
      
      const pokedexMatch = card.pokedexNumber 
        ? card.pokedexNumber.toString() === normalizedNumberQuery
        : false;
      
      return nameMatch || numberMatch || pokedexMatch;
    });
  }, [cards, searchQuery]);

  return filteredCards;
}
