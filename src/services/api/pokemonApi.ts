import type { Card } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';

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
 * Get cards for a Pokédex region using hardcoded Pokémon list.
 * Returns Card objects with Pokémon names and Pokédex numbers, but no card images.
 */
export async function getCardsByRegion(region: Region): Promise<Card[]> {
  const pokemonList = getPokemonByRegion(region);
  
  // Convert Pokémon entries to Card objects
  return pokemonList.map((pokemon) => ({
    id: `region-${region}-${pokemon.number}`, // Unique ID for each Pokémon in region
    name: pokemon.name,
    number: `#${pokemon.number.toString().padStart(3, '0')}`, // Format as #001, #002, etc.
    set: `${region} Region`, // Use region name as "set"
    rarity: '', // No rarity for Region mode
    artist: '', // No artist for Region mode
    imageUrl: undefined, // No card images for Region mode
    pokedexNumber: pokemon.number,
    variant: 'base' as const, // Always base for Region mode
  }));
}

/**
 * Simple helper to get a single card by ID.
 */
export async function getCardById(id: string): Promise<Card | null> {
  const card = mockCards.find((c) => c.id === id);
  return card || null;
}



