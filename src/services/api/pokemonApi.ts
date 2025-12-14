import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';
import TCGdex from '@tcgdex/sdk';

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
 * Initialize TCGDEX SDK instance (English language)
 */
const tcgdex = new TCGdex('en');

// Log SDK initialization (Step 24A)
console.log('[24A] TCGDEX SDK initialized:', {
  language: 'en',
  sdkVersion: '@tcgdex/sdk@^2.7.1',
  timestamp: new Date().toISOString(),
});

/**
 * Transform TCGDEX SDK set response to our PokemonSet type
 */
function transformTcgdexSetToPokemonSet(tcgdexSet: { id: string; name: string; series?: string; releaseDate?: string }): PokemonSet {
  return {
    id: tcgdexSet.id,
    name: tcgdexSet.name,
    series: tcgdexSet.series || 'Unknown',
    releaseDate: tcgdexSet.releaseDate || '',
  };
}

/**
 * Sort sets by release date (newest first)
 */
function sortSetsByDate(sets: PokemonSet[]): PokemonSet[] {
  return [...sets].sort((a, b) => {
    // If releaseDate is missing, put it at the end
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    
    // Compare dates (newest first)
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
  });
}

/**
 * Get all available sets from TCGDEX API using the SDK.
 * Falls back to mock data if API call fails.
 */
export async function getSets(): Promise<PokemonSet[]> {
  console.log('[24B] getSets() called - starting fetch');
  
  try {
    // Fetch sets from TCGDEX API using SDK
    const tcgdexSets = await tcgdex.set.list();
    
    console.log('[24B] SDK response received:', {
      setCount: tcgdexSets.length,
      firstSet: tcgdexSets[0]?.name,
      lastSet: tcgdexSets[tcgdexSets.length - 1]?.name,
    });
    
    // Transform TCGDEX SDK response to our PokemonSet type
    const sets = tcgdexSets.map(transformTcgdexSetToPokemonSet);
    
    console.log('[24B] Sets transformed:', {
      transformedCount: sets.length,
      sampleSet: sets[0],
    });
    
    // Sort by release date (newest → oldest)
    const sortedSets = sortSetsByDate(sets);
    
    console.log('[24B] Sets sorted by date:', {
      newestSet: sortedSets[0]?.name,
      oldestSet: sortedSets[sortedSets.length - 1]?.name,
      totalSets: sortedSets.length,
    });
    
    return sortedSets;
  } catch (error) {
    // Log detailed error for debugging
    console.error('[24B] Error in getSets():', error);
    
    if (error instanceof Error) {
      console.warn('[24B] Failed to fetch sets from TCGDEX API:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } else {
      console.warn('[24B] Failed to fetch sets from TCGDEX API, using mock data:', error);
    }
    
    // Fallback to mock data
    console.log('[24B] Falling back to mock data');
    return mockSets;
  }
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



