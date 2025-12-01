import type { Card } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';

export type PokemonSet = MockSet;

// Region names we'll use later for Region-mode binders
export type Region =
  | 'Kanto'
  | 'Johto'
  | 'Hoenn'
  | 'Sinnoh'
  | 'Unova'
  | 'Kalos'
  | 'Alola'
  | 'Galar'
  | 'Paldea';

/**
 * Get all available sets (mock data for now).
 */
export async function getSets(): Promise<PokemonSet[]> {
  // In Step 24 we'll try the real Pokémon TCG API first and fall back to this.
  return mockSets;
}

/**
 * Get cards for a specific set.
 * For mock data, we match by set name.
 */
export async function getCardsBySet(setName: string): Promise<Card[]> {
  // Later we can switch this to use real API set IDs.
  return mockCards.filter((card) => card.set === setName);
}

/**
 * Get cards for a Pokédex region using simple number ranges.
 * This is enough for testing Region mode.
 */
export async function getCardsByRegion(region: Region): Promise<Card[]> {
  const byRegion = (card: Card) => {
    if (!card.pokedexNumber) return false;

    const n = card.pokedexNumber;

    switch (region) {
      case 'Kanto':
        return n >= 1 && n <= 151;
      case 'Johto':
        return n >= 152 && n <= 251;
      case 'Hoenn':
        return n >= 252 && n <= 386;
      case 'Sinnoh':
        return n >= 387 && n <= 493;
      case 'Unova':
        return n >= 494 && n <= 649;
      case 'Kalos':
        return n >= 650 && n <= 721;
      case 'Alola':
        return n >= 722 && n <= 809;
      case 'Galar':
        return n >= 810 && n <= 898;
      case 'Paldea':
        return n >= 906; // Simple check; good enough for testing
      default:
        return false;
    }
  };

  return mockCards.filter(byRegion);
}

/**
 * Simple helper to get a single card by ID.
 */
export async function getCardById(id: string): Promise<Card | null> {
  const card = mockCards.find((c) => c.id === id);
  return card || null;
}


