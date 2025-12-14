import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';
import { getEras, getSetsByEra, convertSetToPokemonSet } from '../../data/pokemonEras';
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
 * Transform minimal TCGDEX SDK set response (from set.list()) to our PokemonSet type
 * Minimal sets only have id and name - serie and releaseDate will be empty
 */
function transformMinimalSetToPokemonSet(tcgdexSet: any): PokemonSet {
  return {
    id: tcgdexSet.id || '',
    name: tcgdexSet.name || '',
    series: 'Unknown', // Will be filled in when full details are loaded
    releaseDate: '', // Will be filled in when full details are loaded
  };
}

/**
 * Transform TCGDEX SDK full set response to our PokemonSet type
 * When fetching full set details via set.get(), we get releaseDate and serie info
 */
async function transformTcgdexSetToPokemonSet(tcgdexSet: any): Promise<PokemonSet> {
  // Extract ID - always present
  const setId = tcgdexSet.id || '';
  
  // Extract name - always present
  const setName = tcgdexSet.name || '';
  
  // Extract release date - only available in full set details (set.get())
  const releaseDate = tcgdexSet.releaseDate || '';
  
  // Extract series/era - TCGDEX uses 'serie' (singular)
  // In full set details, serie might be a string ID or an object, or we need to call getSerie()
  let series = '';
  
  // Try to get serie information
  if (tcgdexSet.serie) {
    if (typeof tcgdexSet.serie === 'string') {
      // If it's a string ID, try to get the full serie object
      try {
        const serieObj = await tcgdexSet.getSerie?.();
        series = serieObj?.name || tcgdexSet.serie;
      } catch (error) {
        // If getSerie() fails, use the ID as fallback
        series = tcgdexSet.serie;
      }
    } else if (tcgdexSet.serie.name) {
      // If serie is already an object with name property
      series = tcgdexSet.serie.name;
    } else if (tcgdexSet.serie.id) {
      // If serie has ID but no name, try to get it
      try {
        const serieObj = await tcgdexSet.getSerie?.();
        series = serieObj?.name || tcgdexSet.serie.id;
      } catch (error) {
        series = tcgdexSet.serie.id;
      }
    }
  }
  
  // If serie is still empty, try calling getSerie() method if it exists
  if ((!series || series === '') && typeof tcgdexSet.getSerie === 'function') {
    try {
      const serieObj = await tcgdexSet.getSerie();
      series = serieObj?.name || '';
    } catch (error) {
      // Silently fail - we'll use 'Unknown' as fallback
    }
  }
  
  // Default to 'Unknown' if no series found
  if (!series || series === '') {
    series = 'Unknown';
  }
  
  return {
    id: setId,
    name: setName,
    series: series,
    releaseDate: releaseDate,
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
 * Get minimal set data (fast - just id and name) for initial display.
 * This is used for lazy loading - returns sets with incomplete data (no releaseDate or serie).
 * Falls back to mock data if API call fails.
 */
export async function getSetsMinimal(): Promise<PokemonSet[]> {
  console.log('[24B] getSetsMinimal() called - fetching minimal set data');
  
  try {
    // Fetch minimal set data (fast - single API call)
    const tcgdexSetsMinimal = await tcgdex.set.list();
    
    console.log('[24B] SDK set.list() response received:', {
      setCount: tcgdexSetsMinimal.length,
      firstSet: tcgdexSetsMinimal[0]?.name,
      lastSet: tcgdexSetsMinimal[tcgdexSetsMinimal.length - 1]?.name,
    });
    
    // Transform minimal set data (no serie or releaseDate yet)
    const sets = tcgdexSetsMinimal.map(transformMinimalSetToPokemonSet);
    
    // Filter out sets with missing required fields (id or name)
    const validSets = sets.filter(set => set.id && set.name);
    
    console.log('[24B] Minimal sets transformed:', {
      transformedCount: validSets.length,
      note: 'Sets have id and name, but serie and releaseDate are empty',
    });
    
    return validSets;
  } catch (error) {
    console.error('[24B] Error in getSetsMinimal():', error);
    
    // Fallback to mock data
    console.log('[24B] Falling back to mock data');
    return mockSets;
  }
}

/**
 * Get full set details for sets in a specific serie/era using hard-coded data.
 * Sets are already ordered newest first in the hard-coded data.
 * This is reliable and works offline.
 */
export async function getSetsBySerie(serieName: string): Promise<PokemonSet[]> {
  console.log('[24B] getSetsBySerie() called (using hard-coded data):', { serieName });
  
  try {
    // Get sets for the era from hard-coded data (already sorted newest first)
    const setDefinitions = getSetsByEra(serieName);
    
    // Convert SetDefinition to PokemonSet format
    const sets = setDefinitions.map(setDef => convertSetToPokemonSet(setDef, serieName));
    
    console.log('[24B] Sets by serie fetched from hard-coded data:', {
      serieName,
      setCount: sets.length,
      sampleSet: sets[0],
    });
    
    return sets;
  } catch (error) {
    console.error('[24B] Error in getSetsBySerie():', error);
    return [];
  }
}

/**
 * Get all available sets with full details from TCGDEX API using the SDK.
 * This fetches all sets with complete data (id, name, releaseDate, serie).
 * Note: This is slow (197 API calls). Use getSetsMinimal() + getSetsBySerie() for lazy loading instead.
 * Falls back to mock data if API call fails.
 * 
 * @deprecated Use getSetsMinimal() + getSetsBySerie() for better performance
 */
export async function getSets(): Promise<PokemonSet[]> {
  console.log('[24B] getSets() called - fetching ALL sets with full details (slow)');
  console.warn('[24B] Consider using getSetsMinimal() + getSetsBySerie() for better performance');
  
  try {
    // Step 1: Get list of sets (minimal data - just id, name, logo, cardCount)
    const tcgdexSetsMinimal = await tcgdex.set.list();
    
    console.log('[24B] SDK set.list() response received:', {
      setCount: tcgdexSetsMinimal.length,
      firstSet: tcgdexSetsMinimal[0]?.name,
      lastSet: tcgdexSetsMinimal[tcgdexSetsMinimal.length - 1]?.name,
    });
    
    // Step 2: Fetch full details for each set to get releaseDate and serie
    // We'll do this in batches to avoid overwhelming the API
    console.log('[24B] Fetching full set details (this may take a moment)...');
    const BATCH_SIZE = 20; // Fetch 20 sets at a time
    const fullSets: any[] = [];
    
    for (let i = 0; i < tcgdexSetsMinimal.length; i += BATCH_SIZE) {
      const batch = tcgdexSetsMinimal.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(set => tcgdex.set.get(set.id));
      const batchResults = await Promise.all(batchPromises);
      fullSets.push(...batchResults);
      
      // Log progress every 50 sets
      if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= tcgdexSetsMinimal.length) {
        console.log('[24B] Fetched full details for', Math.min(i + BATCH_SIZE, tcgdexSetsMinimal.length), 'of', tcgdexSetsMinimal.length, 'sets');
      }
    }
    
    // Log the first full set's structure
    if (fullSets.length > 0) {
      console.log('[24B] SDK response - First full set structure:', {
        allKeys: Object.keys(fullSets[0]),
        hasReleaseDate: 'releaseDate' in fullSets[0],
        hasSerie: 'serie' in fullSets[0],
        serieType: typeof fullSets[0].serie,
        firstSetData: fullSets[0],
      });
    }
    
    // Step 3: Transform full set details to our PokemonSet type
    const sets = await Promise.all(fullSets.map(transformTcgdexSetToPokemonSet));
    
    // Filter out sets with missing required fields (id or name)
    const validSets = sets.filter(set => set.id && set.name);
    
    if (validSets.length < sets.length) {
      console.warn('[24B] Some sets were filtered out due to missing id/name:', {
        total: sets.length,
        valid: validSets.length,
        filtered: sets.length - validSets.length,
      });
    }
    
    console.log('[24B] Sets transformed:', {
      transformedCount: validSets.length,
      sampleSet: validSets[0],
      sampleSetKeys: validSets[0] ? Object.keys(validSets[0]) : [],
      setsWithReleaseDate: validSets.filter(s => s.releaseDate).length,
      setsWithSeries: validSets.filter(s => s.series && s.series !== 'Unknown').length,
      uniqueSeries: [...new Set(validSets.map(s => s.series))],
    });
    
    // Sort by release date (newest → oldest)
    const sortedSets = sortSetsByDate(validSets);
    
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
 * Transform TCGDEX SDK card response to our Card type
 */
function transformTcgdexCardToCard(tcgdexCard: any): Card {
  // Log the raw card data to debug image URL issues
  console.log('[24C] Transforming card - raw data:', {
    id: tcgdexCard.id,
    name: tcgdexCard.name,
    imageField: tcgdexCard.image,
    allKeys: Object.keys(tcgdexCard),
  });
  
  // Extract card fields
  const cardId = tcgdexCard.id || '';
  const cardName = tcgdexCard.name || '';
  const cardNumber = tcgdexCard.localId || ''; // localId is the card number in the set (e.g., "001")
  const setName = tcgdexCard.set?.name || '';
  const rarity = tcgdexCard.rarity || '';
  const artist = tcgdexCard.artist || '';
  
  // Image URL - TCGDEX provides image in different ways:
  // 1. As a string URL directly (base URL without quality/format)
  // 2. As an object with different resolutions
  // TCGDEX images format: [base-url]/[quality].[format]
  // Quality options: high, low, small
  // Format options: webp, png, jpg
  // We use 'low' quality for grid view (better performance)
  // We use 'high' quality for detail view (better quality)
  // We use PNG for better compatibility (WebP not supported everywhere)
  let imageUrl = ''; // Low-res for grid
  let imageUrlHiRes = ''; // High-res for detail view
  
  const baseImageUrl = typeof tcgdexCard.image === 'string' 
    ? tcgdexCard.image 
    : '';
  
  if (typeof tcgdexCard.image === 'string') {
    // Direct URL string - add quality and format
    imageUrl = `${tcgdexCard.image}/low.png`; // Low-res for grid
    imageUrlHiRes = `${tcgdexCard.image}/high.png`; // High-res for detail
  } else if (tcgdexCard.image && typeof tcgdexCard.image === 'object') {
    // Image object with resolutions
    const lowUrl = tcgdexCard.image.low || tcgdexCard.image.small || '';
    const highUrl = tcgdexCard.image.high || '';
    
    // Process low-res URL
    if (lowUrl && !lowUrl.match(/\.(png|jpg|jpeg|webp)$/i)) {
      imageUrl = `${lowUrl}/low.png`;
    } else {
      imageUrl = lowUrl;
    }
    
    // Process high-res URL
    if (highUrl && !highUrl.match(/\.(png|jpg|jpeg|webp)$/i)) {
      imageUrlHiRes = `${highUrl}/high.png`;
    } else {
      imageUrlHiRes = highUrl;
    }
    
    // Fallback: if no high-res, use low-res
    if (!imageUrlHiRes && imageUrl) {
      imageUrlHiRes = imageUrl.replace('/low.png', '/high.png');
    }
  }
  
  // If still no image, try to construct it manually from TCGDEX assets
  // Format: https://assets.tcgdex.net/[lang]/[set-id]/[card-id]/[quality].[format]
  if (!imageUrl && cardId) {
    const setId = tcgdexCard.set?.id || '';
    if (setId && cardNumber) {
      imageUrl = `https://assets.tcgdex.net/en/${setId}/${cardNumber}/low.png`;
      imageUrlHiRes = `https://assets.tcgdex.net/en/${setId}/${cardNumber}/high.png`;
    }
  }
  
  console.log('[24C] Image URLs extracted:', {
    cardId,
    cardName,
    imageUrl,
    imageUrlHiRes,
    hasImage: !!imageUrl,
  });
  
  // Convert to our Card type
  return {
    id: cardId,
    name: cardName,
    number: cardNumber,
    set: setName,
    rarity: rarity,
    artist: artist,
    imageUrl: imageUrl, // Low-res for grid view
    imageUrlHiRes: imageUrlHiRes, // High-res for detail view
    variant: 'base' as const, // Default to base variant for now (Step 24F will handle variants)
  };
}

/**
 * Get cards for a specific set using TCGDEX SDK.
 * Falls back to mock data if API call fails.
 * 
 * @param setIdentifier - Can be either set name or set ID
 */
export async function getCardsBySet(setIdentifier: string): Promise<Card[]> {
  console.log('[24C] getCardsBySet() called:', { setIdentifier });
  
  try {
    // Step 1: Determine if we have a set ID or name
    // TCGDEX uses lowercase IDs with hyphens (e.g., "base1", "swsh1", "sv01")
    // Set names are human-readable (e.g., "Base Set", "Sword & Shield")
    
    // First, try to fetch the set directly assuming it's an ID
    let tcgdexSet: any = null;
    try {
      tcgdexSet = await tcgdex.set.get(setIdentifier);
      console.log('[24C] Set fetched using identifier as ID:', {
        setId: tcgdexSet.id,
        setName: tcgdexSet.name,
      });
    } catch (error) {
      // If that fails, we might have a set name, so we need to find the set ID
      console.log('[24C] Failed to fetch set by ID, trying to find by name...');
      
      // Get all sets and find the one matching the name
      const allSets = await tcgdex.set.list();
      const matchingSet = allSets.find(
        (s: any) => s.name === setIdentifier || s.id === setIdentifier.toLowerCase().replace(/\s+/g, '-')
      );
      
      if (!matchingSet) {
        throw new Error(`Set not found: ${setIdentifier}`);
      }
      
      // Fetch the full set details
      tcgdexSet = await tcgdex.set.get(matchingSet.id);
      console.log('[24C] Set fetched using name lookup:', {
        setId: tcgdexSet.id,
        setName: tcgdexSet.name,
      });
    }
    
    // Check if we successfully got a set
    if (!tcgdexSet) {
      throw new Error(`Failed to fetch set: ${setIdentifier}`);
    }
    
    // Step 2: Extract cards from the set
    // TCGDEX SDK provides cards as an array
    const cards = tcgdexSet.cards || [];
    
    console.log('[24C] Cards extracted from set:', {
      setId: tcgdexSet.id,
      setName: tcgdexSet.name,
      cardCount: cards.length,
      sampleCard: cards[0] ? {
        id: cards[0].id,
        name: cards[0].name,
        localId: cards[0].localId,
        image: cards[0].image,
        allCardKeys: Object.keys(cards[0]),
      } : null,
    });
    
    // Step 3: Transform cards to our Card type
    const transformedCards = cards.map(transformTcgdexCardToCard);
    
    console.log('[24C] Cards transformed:', {
      transformedCount: transformedCards.length,
      sampleTransformed: transformedCards[0],
    });
    
    // Filter out invalid cards (missing required fields)
    const validCards = transformedCards.filter((card: Card) => card.id && card.name);
    
    if (validCards.length < transformedCards.length) {
      console.warn('[24C] Some cards were filtered out due to missing required fields:', {
        total: transformedCards.length,
        valid: validCards.length,
        filtered: transformedCards.length - validCards.length,
      });
    }
    
    return validCards;
  } catch (error) {
    console.error('[24C] Error in getCardsBySet():', {
      setIdentifier,
      error: error instanceof Error ? error.message : error,
    });
    
    // Fallback to mock data
    console.log('[24C] Falling back to mock cards filtered by set name');
    return mockCards.filter((card) => card.set === setIdentifier);
  }
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

/**
 * Get all eras using hard-coded data (ordered newest first).
 * This replaces the need to call tcgdx.serie.list() from the API.
 */
export function getErasList(): Array<{ id: string; name: string }> {
  return getEras();
}



