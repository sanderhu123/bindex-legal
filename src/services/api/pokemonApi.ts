import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
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
 * Generate Pokemon image URL based on Pokédex number and art style
 */
function getPokemonImageUrl(pokedexNumber: number, artStyle: PokemonArtStyle): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  
  switch (artStyle) {
    case 'sprite':
      return `${baseUrl}/${pokedexNumber}.png`;
    case 'home':
      return `${baseUrl}/other/home/${pokedexNumber}.png`;
    case 'official-artwork':
      return `${baseUrl}/other/official-artwork/${pokedexNumber}.png`;
    default:
      // Default to sprite if unknown style
      return `${baseUrl}/${pokedexNumber}.png`;
  }
}

/**
 * Get cards for a Pokédex region using hardcoded Pokémon list.
 * Returns Card objects with Pokémon names, Pokédex numbers, and images based on art style.
 */
export async function getCardsByRegion(region: Region, pokemonArtStyle?: PokemonArtStyle): Promise<Card[]> {
  const pokemonList = getPokemonByRegion(region);
  
  // Convert Pokémon entries to Card objects
  return pokemonList.map((pokemon) => ({
    id: `region-${region}-${pokemon.number}`, // Unique ID for each Pokémon in region
    name: pokemon.name,
    number: `#${pokemon.number.toString().padStart(3, '0')}`, // Format as #001, #002, etc.
    set: `${region} Region`, // Use region name as "set"
    rarity: '', // No rarity for Region mode
    artist: '', // No artist for Region mode
    imageUrl: pokemonArtStyle ? getPokemonImageUrl(pokemon.number, pokemonArtStyle) : undefined,
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



