import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';
import { getEras, getSetsByEra, convertSetToPokemonSet } from '../../data/pokemonEras';
import { getSpecialVariantsForCard, hasSpecialVariants } from '../../data/cardVariants';
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

// ==================== STEP 24E: CACHING & RATE LIMITING ====================

/**
 * In-memory cache for API responses
 * Key: request identifier (e.g., "sets", "cards-base1", "card-swsh11-TG21")
 * Value: { data: any, timestamp: number }
 */
const apiCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Pending requests map for request deduplication
 * Prevents multiple identical requests from being sent simultaneously
 */
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Rate limit state
 */
let rateLimitResetTime: number = 0;
let rateLimitRetryCount: number = 0;
const MAX_RATE_LIMIT_RETRIES = 3;

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Get data from cache if available and valid
 */
function getCachedData<T>(cacheKey: string): T | null {
  const cached = apiCache.get(cacheKey);
  
  if (!cached) {
    console.log('[24E] Cache miss:', { cacheKey });
    return null;
  }
  
  if (!isCacheValid(cached.timestamp)) {
    console.log('[24E] Cache expired:', { cacheKey, age: Date.now() - cached.timestamp });
    apiCache.delete(cacheKey); // Clean up expired cache
    return null;
  }
  
  console.log('[24E] Cache hit:', { cacheKey, age: Date.now() - cached.timestamp });
  return cached.data as T;
}

/**
 * Store data in cache
 */
function setCachedData(cacheKey: string, data: any): void {
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  console.log('[24E] Data cached:', { cacheKey, cacheSize: apiCache.size });
}

/**
 * Check if we're currently rate limited
 */
function isRateLimited(): boolean {
  if (rateLimitResetTime === 0) return false;
  
  const now = Date.now();
  if (now >= rateLimitResetTime) {
    // Rate limit has expired
    rateLimitResetTime = 0;
    rateLimitRetryCount = 0;
    console.log('[24E] Rate limit expired, resetting');
    return false;
  }
  
  console.log('[24E] Currently rate limited:', {
    resetIn: rateLimitResetTime - now,
    retryCount: rateLimitRetryCount,
  });
  return true;
}

/**
 * Handle rate limit error
 */
function handleRateLimitError(error: any): void {
  // TCGDEX SDK might return rate limit errors differently
  // Check for HTTP 429 or similar indicators
  const is429 = 
    error?.status === 429 || 
    error?.statusCode === 429 || 
    error?.response?.status === 429 ||
    (error?.message && error.message.toLowerCase().includes('rate limit'));
  
  if (is429) {
    rateLimitRetryCount++;
    
    // Extract retry-after header if available (in seconds)
    const retryAfter = error?.retryAfter || error?.response?.headers?.['retry-after'];
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 60 seconds
    
    rateLimitResetTime = Date.now() + waitTime;
    
    console.warn('[24E] Rate limit hit (429):', {
      retryCount: rateLimitRetryCount,
      maxRetries: MAX_RATE_LIMIT_RETRIES,
      waitTime: waitTime,
      resetTime: new Date(rateLimitResetTime).toISOString(),
    });
    
    throw new Error(
      `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again. ` +
      `(Retry ${rateLimitRetryCount}/${MAX_RATE_LIMIT_RETRIES})`
    );
  }
}

/**
 * Wait for rate limit to reset
 */
async function waitForRateLimit(): Promise<void> {
  if (!isRateLimited()) return;
  
  const waitTime = rateLimitResetTime - Date.now();
  if (waitTime <= 0) return;
  
  console.log('[24E] Waiting for rate limit to reset:', { waitTime });
  await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Deduplicate requests - if the same request is already pending, return the existing promise
 */
async function deduplicateRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    console.log('[24E] Request already pending, using existing promise:', { cacheKey });
    return pending as Promise<T>;
  }
  
  // Create new request and store in pending map
  const requestPromise = requestFn().finally(() => {
    // Remove from pending map when done
    pendingRequests.delete(cacheKey);
  });
  
  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Clear all cached data (useful for testing or manual refresh)
 */
export function clearApiCache(): void {
  apiCache.clear();
  pendingRequests.clear();
  console.log('[24E] API cache cleared');
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
  const entries = Array.from(apiCache.entries());
  const validEntries = entries.filter(([_, value]) => isCacheValid(value.timestamp));
  const expiredEntries = entries.filter(([_, value]) => !isCacheValid(value.timestamp));
  
  return {
    totalEntries: apiCache.size,
    validEntries: validEntries.length,
    expiredEntries: expiredEntries.length,
    pendingRequests: pendingRequests.size,
    oldestEntry: entries.length > 0 
      ? Math.min(...entries.map(([_, v]) => v.timestamp))
      : null,
    newestEntry: entries.length > 0
      ? Math.max(...entries.map(([_, v]) => v.timestamp))
      : null,
  };
}

// ==================== END STEP 24E ====================


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
  
  const cacheKey = 'sets-minimal';
  
  // Step 1: Check cache first
  const cachedData = getCachedData<PokemonSet[]>(cacheKey);
  if (cachedData) {
    console.log('[24E] Returning cached minimal sets:', { count: cachedData.length });
    return cachedData;
  }
  
  // Step 2: Check if rate limited
  if (isRateLimited()) {
    console.warn('[24E] Rate limited, returning cached data or mock data');
    // Try to return stale cache if available
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      console.log('[24E] Returning stale cache due to rate limit');
      return staleCache.data;
    }
    // Fall back to mock data
    console.log('[24E] No cache available, returning mock data');
    return mockSets;
  }
  
  // Step 3: Deduplicate request
  return deduplicateRequest(cacheKey, async () => {
    try {
      const startTime = performance.now();
      console.log('[24E] Making SDK request for minimal sets');
      
      // Fetch minimal set data (fast - single API call)
      const tcgdexSetsMinimal = await tcgdex.set.list();
      
      const duration = performance.now() - startTime;
      console.log('[24B] SDK set.list() response received:', {
        setCount: tcgdexSetsMinimal.length,
        firstSet: tcgdexSetsMinimal[0]?.name,
        lastSet: tcgdexSetsMinimal[tcgdexSetsMinimal.length - 1]?.name,
        duration: `${duration.toFixed(2)}ms`,
      });
      
      // Transform minimal set data (no serie or releaseDate yet)
      const sets = tcgdexSetsMinimal.map(transformMinimalSetToPokemonSet);
      
      // Filter out sets with missing required fields (id or name)
      const validSets = sets.filter(set => set.id && set.name);
      
      console.log('[24B] Minimal sets transformed:', {
        transformedCount: validSets.length,
        note: 'Sets have id and name, but serie and releaseDate are empty',
      });
      
      // Cache the result
      setCachedData(cacheKey, validSets);
      
      return validSets;
    } catch (error) {
      // Handle rate limit error
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[24E] Rate limit error:', rateLimitError);
        throw rateLimitError;
      }
      
      console.error('[24B] Error in getSetsMinimal():', error);
      
      // Fallback to mock data
      console.log('[24B] Falling back to mock data');
      return mockSets;
    }
  });
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
async function transformTcgdexCardToCard(tcgdexCard: any): Promise<Card> {
  // Log the raw card data to debug field extraction
  console.log('[24C] Transforming card - raw data:', {
    id: tcgdexCard.id,
    name: tcgdexCard.name,
    localId: tcgdexCard.localId,
    imageField: tcgdexCard.image,
    rarity: tcgdexCard.rarity,
    artist: tcgdexCard.artist,
    illustrator: tcgdexCard.illustrator, // TCGDEX might use "illustrator" instead of "artist"
    category: tcgdexCard.category, // Supertype field
    set: tcgdexCard.set, // To check cardCount
    allKeys: Object.keys(tcgdexCard),
    fullCard: tcgdexCard, // Log the entire card object to see all available fields
  });
  
  // Extract card fields
  const cardId = tcgdexCard.id || '';
  const cardName = tcgdexCard.name || '';
  const cardNumber = tcgdexCard.localId || ''; // localId is the card number in the set (e.g., "001")
  const setName = tcgdexCard.set?.name || '';
  const rarity = tcgdexCard.rarity || '';
  
  // Extract supertype (TCGDEX calls it "category")
  const supertype = tcgdexCard.category || '';
  
  // Extract set total (printed number, excluding secret rares)
  // TCGDEX provides cardCount.official for the printed total (what's shown on cards)
  // and cardCount.total for the actual total including secret rares
  const setTotal = tcgdexCard.set?.cardCount?.official 
    ? String(tcgdexCard.set.cardCount.official) 
    : '';
  
  // Artist field - TCGDEX uses "illustrator" (not "artist")
  // According to the REST API, illustrator should be a direct string on full card objects
  // But the TypeScript SDK might wrap it, so we try multiple approaches
  let artist = '';
  
  // Try direct access first (should work for full cards from tcgdex.card.get())
  try {
    artist = tcgdexCard.illustrator || '';
  } catch (e) {
    console.warn('[24C] Direct illustrator access failed:', e);
  }
  
  // If still empty, try alternative approaches
  if (!artist && tcgdexCard.illustrator) {
    const ill = tcgdexCard.illustrator;
    
    // Log the illustrator object to debug
    console.log('[24C] Illustrator object details:', {
      type: typeof ill,
      value: ill,
      keys: typeof ill === 'object' ? Object.keys(ill) : [],
      string: String(ill),
    });
    
    // Try different ways to extract the value
    if (typeof ill === 'string') {
      artist = ill;
    } else if (typeof ill === 'object') {
      artist = ill?.name || ill?.value || String(ill) || '';
    }
  }
  
  // Final fallback: try getIllustrator() method if it exists
  if (!artist && typeof tcgdexCard.getIllustrator === 'function') {
    try {
      const result = await tcgdexCard.getIllustrator();
      artist = typeof result === 'string' ? result : result?.name || '';
      console.log('[24C] Got illustrator from getIllustrator():', artist);
    } catch (error) {
      console.warn('[24C] getIllustrator() failed:', error);
    }
  }
  
  console.log('[24C] Final artist value:', {
    artist,
    hasArtist: !!artist,
    cardId,
    cardName,
  });
  
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
    supertype: supertype, // Card supertype (Pokémon, Trainer, Energy)
    setTotal: setTotal, // Total cards in set
  };
}

/**
 * Generate all variant cards from a base card based on API variant data and rarity.
 * 
 * Creates separate Card objects for each available variant:
 * - Base (always)
 * - Holo (if API says holo: true)
 * - Reverse holo (if API says reverse: true AND rarity is Common/Uncommon/Rare)
 * - Pokeball holo (special sets only, follows EXACT same logic as reverse holo)
 * - Masterball holo (special sets only, follows same logic as reverse holo BUT only for Pokemon supertype)
 * 
 * VARIANT LOGIC:
 * - Reverse Holo: hasReverse === true AND rarity in [Common, Uncommon, Rare]
 * - Pokeball: hasReverse === true AND rarity in [Common, Uncommon, Rare] (same as reverse holo)
 * - Masterball: hasReverse === true AND rarity in [Common, Uncommon, Rare] AND supertype === "Pokemon"
 * 
 * @param baseCard - The base card from transformTcgdexCardToCard
 * @param tcgdexCard - The original TCGDEX card data (for variant info)
 * @returns Array of Card objects for each available variant
 */
function generateVariantCards(baseCard: Card, tcgdexCard: any): Card[] {
  const variants: Card[] = [];
  const setId = tcgdexCard.set?.id || '';
  
  // Get variant availability from API
  const hasHolo = tcgdexCard.variants?.holo === true;
  const hasReverse = tcgdexCard.variants?.reverse === true;
  const supertype = tcgdexCard.category || '';
  const rarity = tcgdexCard.rarity || '';
  
  // Check if card rarity allows reverse/special holos
  // Only Common, Uncommon, and Rare cards can have reverse/pokeball/masterball holos
  const allowsReverseHolo = (
    rarity === 'Common' || 
    rarity === 'Uncommon' || 
    rarity === 'Rare'
  );
  
  // 1. Base card (always available)
  variants.push({
    ...baseCard,
    variant: 'base',
    id: `${baseCard.id}-base`,
  });
  
  // 2. Holo variant (if available)
  if (hasHolo) {
    variants.push({
      ...baseCard,
      variant: 'holo' as any, // Note: 'holo' not in CardVariant type yet, but included for completeness
      id: `${baseCard.id}-holo`,
    });
  }
  
  // 3. Regular reverse holo (if available AND rarity allows it)
  if (hasReverse && allowsReverseHolo) {
    variants.push({
      ...baseCard,
      variant: 'reverse-holo',
      id: `${baseCard.id}-reverse`,
    });
  }
  
  // 4. Special variants (pokeball/masterball) - only for special sets
  if (hasSpecialVariants(setId)) {
    const specialVariants = getSpecialVariantsForCard(setId, hasReverse, supertype, rarity);
    
    for (const variantType of specialVariants) {
      variants.push({
        ...baseCard,
        variant: variantType,
        id: `${baseCard.id}-${variantType}`,
      });
    }
  }
  
  console.log('[VARIANT] Generated variants for card:', {
    cardName: baseCard.name,
    setId,
    rarity,
    allowsReverseHolo,
    hasHolo,
    hasReverse,
    supertype,
    variantCount: variants.length,
    variants: variants.map(v => v.variant),
  });
  
  return variants;
}

/**
 * Get cards for a specific set using TCGDEX SDK.
 * Falls back to mock data if API call fails.
 * 
 * @param setIdentifier - Can be either set name or set ID
 */
export async function getCardsBySet(setIdentifier: string): Promise<Card[]> {
  console.log('[24C] getCardsBySet() called:', { setIdentifier });
  
  const cacheKey = `cards-${setIdentifier}`;
  
  // Step 1: Check cache first
  const cachedData = getCachedData<Card[]>(cacheKey);
  if (cachedData) {
    console.log('[24E] Returning cached cards:', { setIdentifier, count: cachedData.length });
    return cachedData;
  }
  
  // Step 2: Check if rate limited
  if (isRateLimited()) {
    console.warn('[24E] Rate limited, returning cached data or mock data');
    // Try to return stale cache if available
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      console.log('[24E] Returning stale cache due to rate limit');
      return staleCache.data;
    }
    // Fall back to mock data
    console.log('[24E] No cache available, returning mock data');
    return mockCards.filter((card) => card.set === setIdentifier);
  }
  
  // Step 3: Deduplicate request
  return deduplicateRequest(cacheKey, async () => {
    try {
      const startTime = performance.now();
      console.log('[24E] Making SDK request for cards');
      
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
      
      // Step 2: Extract card IDs from the set
      // TCGDEX SDK provides cards as an array of minimal card objects
      const minimalCards = tcgdexSet.cards || [];
      
      console.log('[24C] Minimal cards extracted from set:', {
        setId: tcgdexSet.id,
        setName: tcgdexSet.name,
        cardCount: minimalCards.length,
        sampleCard: minimalCards[0] ? {
          id: minimalCards[0].id,
          name: minimalCards[0].name,
          localId: minimalCards[0].localId,
          allCardKeys: Object.keys(minimalCards[0]),
        } : null,
      });
      
      // Step 3: Fetch FULL card details for each card (to get variant information)
      // We need full details because minimal cards don't include variants, category, rarity, etc.
      console.log('[24C] Fetching full details for', minimalCards.length, 'cards...');
      const fullCards = await Promise.all(
        minimalCards.map(async (minimalCard) => {
          try {
            return await tcgdex.card.get(minimalCard.id);
          } catch (error) {
            console.error('[24C] Failed to fetch full details for card:', minimalCard.id, error);
            return minimalCard; // Fallback to minimal card if fetch fails
          }
        })
      );
      
      console.log('[24C] Full cards fetched. Sample card with all fields:', {
        sampleCard: fullCards[0],
        allKeys: fullCards[0] ? Object.keys(fullCards[0]) : [],
        hasVariants: fullCards[0] ? !!fullCards[0].variants : false,
        hasCategory: fullCards[0] ? !!fullCards[0].category : false,
      });
      
      // Step 4: Transform cards to our Card type
      const transformedCards = await Promise.all(fullCards.map(transformTcgdexCardToCard));
      
      console.log('[24C] Cards transformed:', {
        transformedCount: transformedCards.length,
        sampleTransformed: transformedCards[0],
      });
      
      // Step 5: Generate variant cards for each base card
      const allVariantCards: Card[] = [];
      for (let i = 0; i < transformedCards.length; i++) {
        const baseCard = transformedCards[i];
        const tcgdexCard = fullCards[i]; // Use FULL card data for variant info
        
        const variantCards = generateVariantCards(baseCard, tcgdexCard);
        allVariantCards.push(...variantCards);
      }
      
      const duration = performance.now() - startTime;
      console.log('[24C] Variant cards generated:', {
        baseCardCount: transformedCards.length,
        totalVariantCount: allVariantCards.length,
        avgVariantsPerCard: (allVariantCards.length / transformedCards.length).toFixed(2),
        duration: `${duration.toFixed(2)}ms`,
        performance: duration < 3000 ? 'good' : duration < 10000 ? 'acceptable' : 'slow',
      });
      
      // Filter out invalid cards (missing required fields)
      const validCards = allVariantCards.filter((card: Card) => card.id && card.name);
      
      if (validCards.length < allVariantCards.length) {
        console.warn('[24C] Some cards were filtered out due to missing required fields:', {
          total: allVariantCards.length,
          valid: validCards.length,
          filtered: allVariantCards.length - validCards.length,
        });
      }
      
      // Cache the result
      setCachedData(cacheKey, validCards);
      
      return validCards;
    } catch (error) {
      // Handle rate limit error
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[24E] Rate limit error:', rateLimitError);
        throw rateLimitError;
      }
      
      console.error('[24C] Error in getCardsBySet():', {
        setIdentifier,
        error: error instanceof Error ? error.message : error,
      });
      
      // Fallback to mock data
      console.log('[24C] Falling back to mock cards filtered by set name');
      return mockCards.filter((card) => card.set === setIdentifier);
    }
  });
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
 * Get a single card by ID using TCGDEX SDK.
 * Falls back to mock data if API call fails.
 * 
 * @param id - Card ID from TCGDEX (e.g., "swsh11-TG21", "base1-4") or with variant suffix (e.g., "swsh11-TG21-base")
 */
export async function getCardById(id: string): Promise<Card | null> {
  console.log('[24D] getCardById() called:', { cardId: id });
  
  const cacheKey = `card-${id}`;
  
  // Step 1: Check cache first
  const cachedData = getCachedData<Card | null>(cacheKey);
  if (cachedData !== null) {
    console.log('[24E] Returning cached card:', { cardId: id });
    return cachedData;
  }
  
  // Step 2: Check if rate limited
  if (isRateLimited()) {
    console.warn('[24E] Rate limited, returning cached data or mock data');
    // Try to return stale cache if available
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) {
      console.log('[24E] Returning stale cache due to rate limit');
      return staleCache.data;
    }
    // Fall back to mock data
    console.log('[24E] No cache available, returning mock data');
    return mockCards.find((c) => c.id === id) || null;
  }
  
  // Step 3: Deduplicate request
  return deduplicateRequest(cacheKey, async () => {
    try {
      const startTime = performance.now();
      console.log('[24E] Making SDK request for single card');
      
      // Strip variant suffix from ID if present
      // Variant suffixes: -base, -holo, -reverse, -poke-ball, -master-ball
      const baseId = id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
      
      console.log('[24D] Card ID processed:', { originalId: id, baseId });
      
      // Fetch card from TCGDEX SDK using base ID
      const tcgdexCard = await tcgdex.card.get(baseId);
      
      // Check if card was found
      if (!tcgdexCard) {
        console.warn('[24D] Card not found in SDK:', { cardId: id, baseId });
        throw new Error(`Card not found: ${id}`);
      }
      
      const duration = performance.now() - startTime;
      console.log('[24D] Card fetched from SDK:', {
        cardId: tcgdexCard.id,
        cardName: tcgdexCard.name,
        hasImage: !!tcgdexCard.image,
        hasVariants: !!tcgdexCard.variants,
        allKeys: Object.keys(tcgdexCard),
        duration: `${duration.toFixed(2)}ms`,
      });
      
      // Transform TCGDEX card to our Card type
      const transformedCard = await transformTcgdexCardToCard(tcgdexCard);
      
      console.log('[24D] Card transformed:', {
        transformedId: transformedCard.id,
        transformedName: transformedCard.name,
        hasImageUrl: !!transformedCard.imageUrl,
        hasHiResUrl: !!transformedCard.imageUrlHiRes,
      });
      
      // Cache the result
      setCachedData(cacheKey, transformedCard);
      
      return transformedCard;
    } catch (error) {
      // Handle rate limit error
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[24E] Rate limit error:', rateLimitError);
        throw rateLimitError;
      }
      
      console.error('[24D] Error in getCardById():', {
        cardId: id,
        error: error instanceof Error ? error.message : error,
      });
      
      // Fallback to mock data
      console.log('[24D] Falling back to mock card data');
      const mockCard = mockCards.find((c) => c.id === id);
      
      if (mockCard) {
        console.log('[24D] Using mock card as fallback:', { cardId: mockCard.id, cardName: mockCard.name });
      } else {
        console.warn('[24D] Card not found in mock data either:', { cardId: id });
      }
      
      return mockCard || null;
    }
  });
}

/**
 * Get all eras using hard-coded data (ordered newest first).
 * This replaces the need to call tcgdx.serie.list() from the API.
 */
export function getErasList(): Array<{ id: string; name: string }> {
  return getEras();
}



