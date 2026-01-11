import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';
import { getEras, getSetsByEra, convertSetToPokemonSet, sortCardsBySetDate } from '../../data/pokemonEras';
import { getSpecialVariantsForCard, hasSpecialVariants } from '../../data/cardVariants';
import TCGdex from '@tcgdex/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
// Enhanced with persistent storage using AsyncStorage

/**
 * In-memory cache for API responses (fast access)
 * Key: request identifier (e.g., "sets", "cards-base1", "card-swsh11-TG21")
 * Value: { data: any, timestamp: number }
 */
const apiCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Memory cache duration in milliseconds (5 minutes)
 * This is for super-fast repeated access during a session
 */
const MEMORY_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Persistent cache duration in milliseconds (7 days)
 * Card data for sets doesn't change often, so we can keep it longer
 */
const PERSISTENT_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

/**
 * AsyncStorage key prefix for card cache
 */
const CACHE_PREFIX = '@pokemon_cache_';

/**
 * Track if persistent cache has been loaded into memory
 */
let persistentCacheLoaded = false;

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
 * Check if memory cached data is still valid (5 minutes)
 */
function isMemoryCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < MEMORY_CACHE_DURATION;
}

/**
 * Check if persistent cached data is still valid (7 days)
 */
function isPersistentCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < PERSISTENT_CACHE_DURATION;
}

/**
 * Load persistent cache from AsyncStorage into memory on app start
 * Call this once when the app initializes
 */
export async function initializePersistentCache(): Promise<void> {
  if (persistentCacheLoaded) {
    console.log('[CACHE] Persistent cache already loaded');
    return;
  }

  try {
    console.log('[CACHE] Loading persistent cache from storage...');
    const startTime = performance.now();
    
    // Get all keys that start with our prefix
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    
    if (cacheKeys.length === 0) {
      console.log('[CACHE] No persistent cache found');
      persistentCacheLoaded = true;
      return;
    }
    
    // Load all cached items
    const cachedItems = await AsyncStorage.multiGet(cacheKeys);
    let loadedCount = 0;
    let expiredCount = 0;
    
    for (const [key, value] of cachedItems) {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          const cacheKey = key.replace(CACHE_PREFIX, '');
          
          // Only load if persistent cache is still valid (7 days)
          if (isPersistentCacheValid(parsed.timestamp)) {
            apiCache.set(cacheKey, parsed);
            loadedCount++;
          } else {
            // Clean up expired persistent cache
            expiredCount++;
            AsyncStorage.removeItem(key).catch(() => {});
          }
        } catch (parseError) {
          console.warn('[CACHE] Failed to parse cached item:', key);
        }
      }
    }
    
    const duration = performance.now() - startTime;
    console.log('[CACHE] Persistent cache loaded:', {
      loadedItems: loadedCount,
      expiredItems: expiredCount,
      duration: `${duration.toFixed(2)}ms`,
    });
    
    persistentCacheLoaded = true;
  } catch (error) {
    console.error('[CACHE] Failed to load persistent cache:', error);
    persistentCacheLoaded = true; // Mark as loaded to prevent retry loops
  }
}

/**
 * Get data from cache if available and valid
 * First checks memory cache, then persistent storage
 */
function getCachedData<T>(cacheKey: string): T | null {
  const cached = apiCache.get(cacheKey);
  
  if (!cached) {
    console.log('[CACHE] Miss:', { cacheKey });
    return null;
  }
  
  // Check memory cache validity (5 minutes for fastest access)
  if (!isMemoryCacheValid(cached.timestamp)) {
    // Check if persistent cache is still valid (7 days)
    if (!isPersistentCacheValid(cached.timestamp)) {
      console.log('[CACHE] Expired (>7 days):', { cacheKey, age: Date.now() - cached.timestamp });
      apiCache.delete(cacheKey);
      // Also remove from persistent storage
      AsyncStorage.removeItem(CACHE_PREFIX + cacheKey).catch(() => {});
      return null;
    }
    
    // Persistent cache valid but memory cache expired - still return data
    console.log('[CACHE] Hit (from persistent, <7 days):', { cacheKey });
    return cached.data as T;
  }
  
  console.log('[CACHE] Hit (memory):', { cacheKey });
  return cached.data as T;
}

/**
 * Store data in both memory cache and persistent storage
 */
function setCachedData(cacheKey: string, data: any): void {
  const cacheEntry = {
    data,
    timestamp: Date.now(),
  };
  
  // Store in memory cache
  apiCache.set(cacheKey, cacheEntry);
  console.log('[CACHE] Stored in memory:', { cacheKey, cacheSize: apiCache.size });
  
  // Store in persistent storage (async, non-blocking)
  // Only persist card data (not minimal sets which change more often)
  if (cacheKey.startsWith('cards-')) {
    AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(cacheEntry))
      .then(() => {
        console.log('[CACHE] Stored in persistent storage:', { cacheKey });
      })
      .catch((error) => {
        console.warn('[CACHE] Failed to persist cache:', { cacheKey, error });
      });
  }
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
 * Clear all cached data (both memory and persistent storage)
 * Useful for testing or manual refresh
 */
export async function clearApiCache(): Promise<void> {
  // Clear memory cache
  apiCache.clear();
  pendingRequests.clear();
  
  // Clear persistent cache
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('[CACHE] Cleared persistent storage:', { keysRemoved: cacheKeys.length });
    }
  } catch (error) {
    console.warn('[CACHE] Failed to clear persistent storage:', error);
  }
  
  console.log('[CACHE] All cache cleared');
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getCacheStats() {
  const entries = Array.from(apiCache.entries());
  const validMemoryEntries = entries.filter(([_, value]) => isMemoryCacheValid(value.timestamp));
  const validPersistentEntries = entries.filter(([_, value]) => isPersistentCacheValid(value.timestamp));
  const expiredEntries = entries.filter(([_, value]) => !isPersistentCacheValid(value.timestamp));
  
  return {
    totalEntries: apiCache.size,
    validMemoryEntries: validMemoryEntries.length,
    validPersistentEntries: validPersistentEntries.length,
    expiredEntries: expiredEntries.length,
    pendingRequests: pendingRequests.size,
    persistentCacheLoaded,
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
  const startTime = performance.now();
  
  const cacheKey = 'sets-minimal';
  
  // Step 1: Check cache first
  const cachedData = getCachedData<PokemonSet[]>(cacheKey);
  if (cachedData) {
    const duration = performance.now() - startTime;
    console.log('[24G] Returning cached minimal sets (performance):', { 
      count: cachedData.length,
      duration: `${duration.toFixed(2)}ms`,
      performance: 'excellent (cached)',
    });
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
      const requestStartTime = performance.now();
      console.log('[24E] Making SDK request for minimal sets');
      
      // Fetch minimal set data (fast - single API call)
      const tcgdexSetsMinimal = await tcgdex.set.list();
      
      const duration = performance.now() - requestStartTime;
      const performanceRating = duration < 1000 ? 'excellent' : duration < 3000 ? 'good' : duration < 5000 ? 'acceptable' : 'slow';
      
      console.log('[24G] SDK set.list() performance:', {
        setCount: tcgdexSetsMinimal.length,
        duration: `${duration.toFixed(2)}ms`,
        performance: performanceRating,
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
      
      // Cache the result
      setCachedData(cacheKey, validSets);
      
      const totalDuration = performance.now() - startTime;
      console.log('[24G] getSetsMinimal() completed:', {
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        performance: totalDuration < 2000 ? 'excellent' : totalDuration < 4000 ? 'good' : 'needs improvement',
      });
      
      return validSets;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Handle rate limit error with user-friendly message
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[24G] Rate limit error (getSetsMinimal):', {
          duration: `${duration.toFixed(2)}ms`,
          error: rateLimitError,
        });
        
        // Return user-friendly error
        throw new Error(
          'Too many requests to the card database. Please wait a moment and try again.'
        );
      }
      
      console.error('[24G] Error in getSetsMinimal():', {
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Fallback to mock data with user-friendly message
      console.log('[24G] Falling back to offline data (mock sets)');
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
  
  // Log detailed info for debugging (only log occasionally to avoid spam)
  const shouldLog = Math.random() < 0.1; // Log ~10% of cards
  if (shouldLog) {
    console.log('[VARIANT] Generated variants for card:', {
      cardName: baseCard.name,
      cardNumber: baseCard.number,
      setId,
      rarity,
      supertype,
      hasHolo,
      hasReverse,
      allowsReverseHolo,
      variantCount: variants.length,
      variants: variants.map(v => v.variant),
    });
  }
  
  // Special logging for cards that should have reverse-holo but don't
  if (allowsReverseHolo && hasReverse && !variants.some(v => v.variant === 'reverse-holo')) {
    console.warn('[VARIANT] ⚠️ MISSING REVERSE-HOLO:', {
      cardName: baseCard.name,
      cardNumber: baseCard.number,
      rarity,
      hasReverse,
      allowsReverseHolo,
      variants: variants.map(v => v.variant),
    });
  }
  
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
  const overallStartTime = performance.now();
  
  const cacheKey = `cards-${setIdentifier}`;
  
  // Step 1: Check cache first
  const cachedData = getCachedData<Card[]>(cacheKey);
  if (cachedData) {
    const duration = performance.now() - overallStartTime;
    console.log('[24G] Returning cached cards (performance):', { 
      setIdentifier, 
      count: cachedData.length,
      duration: `${duration.toFixed(2)}ms`,
      performance: 'excellent (cached)',
    });
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
      const setLookupStart = performance.now();
      try {
        tcgdexSet = await tcgdex.set.get(setIdentifier);
        const setLookupDuration = performance.now() - setLookupStart;
        console.log('[24G] Set fetched by ID (performance):', {
          setId: tcgdexSet.id,
          setName: tcgdexSet.name,
          duration: `${setLookupDuration.toFixed(2)}ms`,
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
          throw new Error(`Set "${setIdentifier}" not found. Please check the set name and try again.`);
        }
        
        // Fetch the full set details
        tcgdexSet = await tcgdex.set.get(matchingSet.id);
        const setLookupDuration = performance.now() - setLookupStart;
        console.log('[24G] Set fetched by name lookup (performance):', {
          setId: tcgdexSet.id,
          setName: tcgdexSet.name,
          duration: `${setLookupDuration.toFixed(2)}ms`,
        });
      }
      
      // Check if we successfully got a set
      if (!tcgdexSet) {
        throw new Error(`Unable to load cards for "${setIdentifier}". Please try again.`);
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
      const cardFetchStart = performance.now();
      
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
      
      const cardFetchDuration = performance.now() - cardFetchStart;
      const avgCardFetchTime = cardFetchDuration / minimalCards.length;
      
      console.log('[24G] Card details fetched (performance):', {
        cardCount: fullCards.length,
        duration: `${cardFetchDuration.toFixed(2)}ms`,
        avgPerCard: `${avgCardFetchTime.toFixed(2)}ms`,
        performance: cardFetchDuration < 5000 ? 'good' : cardFetchDuration < 15000 ? 'acceptable' : 'slow',
      });
      
      console.log('[24C] Full cards fetched. Sample card with all fields:', {
        sampleCard: fullCards[0],
        allKeys: fullCards[0] ? Object.keys(fullCards[0]) : [],
        hasVariants: fullCards[0] ? !!fullCards[0].variants : false,
        hasCategory: fullCards[0] ? !!fullCards[0].category : false,
      });
      
      // Step 4: Transform cards to our Card type
      const transformStartTime = performance.now();
      const transformedCards = await Promise.all(fullCards.map(transformTcgdexCardToCard));
      const transformDuration = performance.now() - transformStartTime;
      
      console.log('[24G] Cards transformed (performance):', {
        transformedCount: transformedCards.length,
        duration: `${transformDuration.toFixed(2)}ms`,
        avgPerCard: `${(transformDuration / transformedCards.length).toFixed(2)}ms`,
      });
      
      // Step 5: Generate variant cards for each base card
      const variantStartTime = performance.now();
      const allVariantCards: Card[] = [];
      
      console.log('[VARIANT-GEN] ========================================');
      console.log('[VARIANT-GEN] GENERATING VARIANTS FOR', transformedCards.length, 'BASE CARDS');
      console.log('[VARIANT-GEN] ========================================');
      
      // Track variant statistics
      const variantStats = {
        totalCards: 0,
        withBase: 0,
        withHolo: 0,
        withReverseHolo: 0,
        withPokeballHolo: 0,
        withMasterballHolo: 0,
        cardsWithMultipleVariants: 0,
      };
      
      for (let i = 0; i < transformedCards.length; i++) {
        const baseCard = transformedCards[i];
        const tcgdexCard = fullCards[i]; // Use FULL card data for variant info
        
        const variantCards = generateVariantCards(baseCard, tcgdexCard);
        allVariantCards.push(...variantCards);
        
        // Track statistics
        variantStats.totalCards += variantCards.length;
        if (variantCards.some(c => c.variant === 'base')) variantStats.withBase++;
        if (variantCards.some(c => c.variant === 'holo')) variantStats.withHolo++;
        if (variantCards.some(c => c.variant === 'reverse-holo')) variantStats.withReverseHolo++;
        if (variantCards.some(c => c.variant === 'poke-ball')) variantStats.withPokeballHolo++;
        if (variantCards.some(c => c.variant === 'master-ball')) variantStats.withMasterballHolo++;
        if (variantCards.length > 1) variantStats.cardsWithMultipleVariants++;
      }
      
      const variantDuration = performance.now() - variantStartTime;
      const duration = performance.now() - startTime;
      const performanceRating = duration < 5000 ? 'excellent' : duration < 10000 ? 'good' : duration < 20000 ? 'acceptable' : 'slow';
      
      console.log('[VARIANT-GEN] ✓ Generation complete:');
      console.log('[VARIANT-GEN]   Base cards:', transformedCards.length);
      console.log('[VARIANT-GEN]   Total variant cards:', allVariantCards.length);
      console.log('[VARIANT-GEN]   Avg variants per card:', (allVariantCards.length / transformedCards.length).toFixed(2));
      console.log('[VARIANT-GEN] ========================================');
      console.log('[VARIANT-GEN] VARIANT BREAKDOWN:');
      console.log('[VARIANT-GEN]   Cards with base variant:', variantStats.withBase);
      console.log('[VARIANT-GEN]   Cards with holo variant:', variantStats.withHolo);
      console.log('[VARIANT-GEN]   Cards with reverse-holo variant:', variantStats.withReverseHolo);
      console.log('[VARIANT-GEN]   Cards with poke-ball variant:', variantStats.withPokeballHolo);
      console.log('[VARIANT-GEN]   Cards with master-ball variant:', variantStats.withMasterballHolo);
      console.log('[VARIANT-GEN]   Cards with multiple variants:', variantStats.cardsWithMultipleVariants);
      console.log('[VARIANT-GEN] ========================================');
      
      console.log('[24G] Variant cards generated (performance):', {
        baseCardCount: transformedCards.length,
        totalVariantCount: allVariantCards.length,
        avgVariantsPerCard: (allVariantCards.length / transformedCards.length).toFixed(2),
        variantGenDuration: `${variantDuration.toFixed(2)}ms`,
        totalDuration: `${duration.toFixed(2)}ms`,
        performance: performanceRating,
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
      
      const totalDuration = performance.now() - overallStartTime;
      console.log('[24G] getCardsBySet() completed (overall performance):', {
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        performance: totalDuration < 8000 ? 'excellent' : totalDuration < 15000 ? 'good' : 'needs improvement',
        breakdown: {
          setLookup: 'logged above',
          cardFetch: `${cardFetchDuration.toFixed(2)}ms`,
          transform: `${transformDuration.toFixed(2)}ms`,
          variantGen: `${variantDuration.toFixed(2)}ms`,
        },
      });
      
      return validCards;
    } catch (error) {
      const duration = performance.now() - overallStartTime;
      
      // Handle rate limit error with user-friendly message
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[24G] Rate limit error (getCardsBySet):', {
          setIdentifier,
          duration: `${duration.toFixed(2)}ms`,
          error: rateLimitError,
        });
        
        // Return user-friendly error
        throw new Error(
          'Too many requests to the card database. Please wait a moment and try again.'
        );
      }
      
      console.error('[24G] Error in getCardsBySet():', {
        setIdentifier,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Fallback to mock data with user-friendly message
      console.log('[24G] Falling back to offline data (mock cards)');
      const mockCardsFiltered = mockCards.filter((card) => card.set === setIdentifier);
      
      if (mockCardsFiltered.length === 0) {
        throw new Error(
          `Unable to load cards for "${setIdentifier}". Please check your internet connection and try again.`
        );
      }
      
      return mockCardsFiltered;
    }
  });
}

/**
 * Generate Pokemon image URL based on Pokédex number and art style
 */
export function getPokemonImageUrl(pokedexNumber: number, artStyle: PokemonArtStyle): string {
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
  const overallStartTime = performance.now();
  
  const cacheKey = `card-${id}`;
  
  // Step 1: Check cache first
  const cachedData = getCachedData<Card | null>(cacheKey);
  if (cachedData !== null) {
    const duration = performance.now() - overallStartTime;
    console.log('[24G] Returning cached card (performance):', { 
      cardId: id,
      duration: `${duration.toFixed(2)}ms`,
      performance: 'excellent (cached)',
    });
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
      
      // Extract variant from ID if present
      // Variant suffixes: -base, -holo, -reverse, -poke-ball, -master-ball
      const variantMatch = id.match(/-(base|holo|reverse|poke-ball|master-ball)$/);
      const variant = variantMatch ? variantMatch[1] : undefined;
      const baseId = id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
      
      // Map extracted suffix to proper variant name
      const variantMap: Record<string, string> = {
        'base': 'base',
        'holo': 'holo',
        'reverse': 'reverse-holo',
        'poke-ball': 'poke-ball',
        'master-ball': 'master-ball',
      };
      const cardVariant = variant ? variantMap[variant] : undefined;
      
      console.log('[24D] Card ID processed:', { originalId: id, baseId, extractedVariant: variant, cardVariant });
      
      // Fetch card from TCGDEX SDK using base ID
      const tcgdexCard = await tcgdex.card.get(baseId);
      
      // Check if card was found
      if (!tcgdexCard) {
        console.warn('[24D] Card not found in SDK:', { cardId: id, baseId });
        throw new Error(`Card "${id}" not found. Please try again.`);
      }
      
      const duration = performance.now() - startTime;
      const performanceRating = duration < 500 ? 'excellent' : duration < 1500 ? 'good' : duration < 3000 ? 'acceptable' : 'slow';
      
      console.log('[24G] Card fetched from SDK (performance):', {
        cardId: tcgdexCard.id,
        cardName: tcgdexCard.name,
        hasImage: !!tcgdexCard.image,
        hasVariants: !!tcgdexCard.variants,
        duration: `${duration.toFixed(2)}ms`,
        performance: performanceRating,
      });
      
      // Transform TCGDEX card to our Card type
      const transformStartTime = performance.now();
      const transformedCard = await transformTcgdexCardToCard(tcgdexCard);
      const transformDuration = performance.now() - transformStartTime;
      
      // IMPORTANT: Preserve the original ID and variant from the request
      // This ensures the card matches what the grid view expects
      if (variant) {
        transformedCard.id = id; // Use the original ID with variant suffix
        transformedCard.variant = cardVariant as any; // Set the variant property
      }
      
      console.log('[24G] Card transformed (performance):', {
        transformedId: transformedCard.id,
        transformedName: transformedCard.name,
        transformedVariant: transformedCard.variant,
        hasImageUrl: !!transformedCard.imageUrl,
        hasHiResUrl: !!transformedCard.imageUrlHiRes,
        transformDuration: `${transformDuration.toFixed(2)}ms`,
      });
      
      // Cache the result
      setCachedData(cacheKey, transformedCard);
      
      const totalDuration = performance.now() - overallStartTime;
      console.log('[24G] getCardById() completed (overall performance):', {
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        performance: totalDuration < 1000 ? 'excellent' : totalDuration < 2000 ? 'good' : 'needs improvement',
      });
      
      return transformedCard;
    } catch (error) {
      const duration = performance.now() - overallStartTime;
      
      // Handle rate limit error with user-friendly message
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[24G] Rate limit error (getCardById):', {
          cardId: id,
          duration: `${duration.toFixed(2)}ms`,
          error: rateLimitError,
        });
        
        // Return user-friendly error
        throw new Error(
          'Too many requests to the card database. Please wait a moment and try again.'
        );
      }
      
      console.error('[24G] Error in getCardById():', {
        cardId: id,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Fallback to mock data
      console.log('[24G] Falling back to offline data (mock card)');
      const mockCard = mockCards.find((c) => c.id === id);
      
      if (mockCard) {
        console.log('[24D] Using mock card as fallback:', { cardId: mockCard.id, cardName: mockCard.name });
      } else {
        console.warn('[24D] Card not found in mock data either:', { cardId: id });
        throw new Error(
          `Unable to load card "${id}". Please check your internet connection and try again.`
        );
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

// ==================== STEP 28A: GLOBAL CARD SEARCH ====================

/**
 * Search options for searchCardsByName()
 */
export interface CardSearchOptions {
  /** Maximum number of results to return (default: 50) */
  limit?: number;
  /** Number of results to skip for pagination (default: 0) */
  offset?: number;
  /** Filter to only Pokémon cards, excluding Trainers that mention Pokémon names (default: false) */
  pokemonOnly?: boolean;
  /** 
   * Use exact word matching for names (default: false)
   * When true, searching "Pidgeot" will NOT match "Pidgeotto"
   * but will still match "Pidgeot EX", "Pidgeot V", etc.
   */
  exactMatch?: boolean;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cache duration for search results (2 minutes - shorter than normal cache)
 * Search results can change more frequently as users search different terms
 */
const SEARCH_CACHE_DURATION = 2 * 60 * 1000;

/**
 * Cache for sorted search results - stores the FULL sorted list for each query
 * This allows stable pagination without re-fetching and re-sorting
 */
const sortedSearchCache = new Map<string, { cards: Card[]; timestamp: number }>();

/**
 * Check if search cache is valid (2 minutes)
 */
function isSearchCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SEARCH_CACHE_DURATION;
}

/**
 * Search for cards by Pokémon name across all sets.
 * 
 * This function enables searching the entire TCGDEX database for cards matching
 * a query. It supports partial name matching and can filter to only Pokémon cards.
 * 
 * Used by:
 * - Custom binder mode (add any card)
 * - Extra cards feature (add cards to Master Set that aren't in the set)
 * - Region card selection (pick TCG card image for a Pokémon slot)
 * 
 * @param query - Search query (Pokémon name or partial name, e.g., "Pikachu", "Char")
 * @param options - Search options (limit, offset, pokemonOnly)
 * @returns Array of matching cards
 * 
 * @example
 * // Search for all Pikachu cards
 * const pikachus = await searchCardsByName('Pikachu');
 * 
 * @example
 * // Search for Charizard, Charmander, Charmeleon (partial match)
 * const charCards = await searchCardsByName('Char');
 * 
 * @example
 * // Search for only Pokémon cards (exclude Trainers mentioning the name)
 * const pokemonOnly = await searchCardsByName('Pikachu', { pokemonOnly: true });
 */
export async function searchCardsByName(
  query: string,
  options?: CardSearchOptions
): Promise<Card[]> {
  const { limit = 50, offset = 0, pokemonOnly = false, exactMatch = false } = options || {};
  
  console.log('[28A] searchCardsByName() called:', { query, limit, offset, pokemonOnly, exactMatch });
  const startTime = performance.now();
  
  // Validate query
  if (!query || query.trim().length === 0) {
    console.log('[28A] Empty query, returning empty array');
    return [];
  }
  
  // Sanitize query - remove special characters that could cause issues
  const sanitizedQuery = query.trim().toLowerCase();
  
  // Create cache key for the FULL sorted list (does not include limit/offset)
  // This allows stable pagination from the same sorted list
  const sortedCacheKey = `sorted-search-${sanitizedQuery}-${pokemonOnly}-${exactMatch}`;
  
  // Step 1: Check if we have a cached sorted list for this query
  const cachedSorted = sortedSearchCache.get(sortedCacheKey);
  if (cachedSorted && isSearchCacheValid(cachedSorted.timestamp)) {
    // We have the full sorted list - return the requested page
    const paginatedResults = cachedSorted.cards.slice(offset, offset + limit);
    const duration = performance.now() - startTime;
    
    console.log('[28A] Returning from sorted cache:', {
      query: sanitizedQuery,
      totalCached: cachedSorted.cards.length,
      offset,
      limit,
      returned: paginatedResults.length,
      duration: `${duration.toFixed(2)}ms`,
      performance: 'excellent (cached)',
    });
    
    return paginatedResults;
  }
  
  // Step 2: Check if rate limited
  if (isRateLimited()) {
    console.warn('[28A] Rate limited during search');
    // Try to return stale cache if available
    if (cachedSorted) {
      const paginatedResults = cachedSorted.cards.slice(offset, offset + limit);
      console.log('[28A] Returning stale cache due to rate limit');
      return paginatedResults;
    }
    throw new Error('Too many requests. Please wait a moment and try again.');
  }
  
  // Step 3: Fetch ALL results, sort them, cache them, then return requested page
  // We use a deduplicated request for the full fetch
  const fullFetchCacheKey = `full-fetch-${sanitizedQuery}-${pokemonOnly}`;
  
  return deduplicateRequest(fullFetchCacheKey, async () => {
    try {
      const requestStartTime = performance.now();
      console.log('[28A] Fetching ALL results for stable sorting...');
      
      // Direct API call with name filter (fetches ALL matching cards)
      const apiUrl = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(sanitizedQuery)}`;
      
      console.log('[28A] Fetching from API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        if (response.status === 429) {
          handleRateLimitError({ status: 429 });
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const cardResults = await response.json();
      
      const fetchDuration = performance.now() - requestStartTime;
      console.log('[28A] API response received:', {
        resultCount: cardResults.length,
        fetchDuration: `${fetchDuration.toFixed(2)}ms`,
        sampleCard: cardResults[0] ? {
          id: cardResults[0].id,
          name: cardResults[0].name,
          localId: cardResults[0].localId,
        } : null,
      });
      
      // Filter results if pokemonOnly is requested
      let filteredResults = cardResults;
      if (pokemonOnly) {
        // TCGDEX uses "category" for supertype (Pokémon, Trainer, Energy)
        // Note: The lightweight list response may not include "category", so we also check
        // if category is undefined (assume it's a Pokemon card if not specified)
        // Trainer cards that mention Pokemon names in their text will still be included,
        // but that's acceptable for a more reliable search experience
        filteredResults = cardResults.filter((card: any) => {
          // If no category, include the card (assume Pokemon since we searched by name)
          if (!card.category) return true;
          // Otherwise, check if it's a Pokemon card
          return card.category === 'Pokemon' || card.category === 'Pokémon';
        });
        console.log('[28A] Filtered to Pokémon only:', {
          before: cardResults.length,
          after: filteredResults.length,
          note: 'Cards without category field are included (assumed Pokemon)',
        });
      }
      
      // Filter for exact word match if requested
      // This prevents "Pidgeot" from matching "Pidgeotto"
      if (exactMatch) {
        const beforeCount = filteredResults.length;
        const escapedQuery = escapeRegExp(sanitizedQuery);
        // Match the query as a complete word (case-insensitive)
        // "Pidgeot" matches "Pidgeot", "Pidgeot EX", "Pidgeot V" but NOT "Pidgeotto"
        const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
        
        filteredResults = filteredResults.filter((card: any) => {
          return wordBoundaryRegex.test(card.name || '');
        });
        
        console.log('[28A] Filtered for exact name match:', {
          query: sanitizedQuery,
          before: beforeCount,
          after: filteredResults.length,
          note: 'Using word boundary matching',
        });
      }
      
      // Transform ALL results to our Card type FIRST
      const transformStartTime = performance.now();
      const allTransformedCards: Card[] = filteredResults.map((card: any) => {
        // Extract set info from card ID (format: setId-localId, e.g., "swsh1-25")
        const setId = card.id?.split('-')[0] || '';
        
        // Build image URL from the image base URL
        let imageUrl = '';
        let imageUrlHiRes = '';
        if (card.image) {
          imageUrl = `${card.image}/low.png`;
          imageUrlHiRes = `${card.image}/high.png`;
        }
        
        return {
          id: card.id || '',
          name: card.name || '',
          number: card.localId || '',
          set: card.set?.name || setId, // Set name if available, otherwise set ID
          rarity: card.rarity || '',
          artist: card.illustrator || '',
          imageUrl,
          imageUrlHiRes,
          variant: 'base' as const,
          supertype: card.category || '',
          setTotal: '',
        };
      });
      
      const transformDuration = performance.now() - transformStartTime;
      
      // SORT ALL cards by set release date (newest first) ONCE
      const sortStartTime = performance.now();
      const allSortedCards = sortCardsBySetDate(allTransformedCards);
      const sortDuration = performance.now() - sortStartTime;
      
      console.log('[28A] All cards sorted by release date:', {
        totalCards: allSortedCards.length,
        sortDuration: `${sortDuration.toFixed(2)}ms`,
        newestCard: allSortedCards[0] ? { id: allSortedCards[0].id, set: allSortedCards[0].set } : null,
        oldestCard: allSortedCards[allSortedCards.length - 1] ? { 
          id: allSortedCards[allSortedCards.length - 1].id, 
          set: allSortedCards[allSortedCards.length - 1].set 
        } : null,
      });
      
      // Cache the FULL sorted list for stable pagination
      sortedSearchCache.set(sortedCacheKey, {
        cards: allSortedCards,
        timestamp: Date.now(),
      });
      
      // Return only the requested page
      const paginatedResults = allSortedCards.slice(offset, offset + limit);
      
      const totalDuration = performance.now() - startTime;
      const performanceRating = totalDuration < 1000 ? 'excellent' : 
                               totalDuration < 3000 ? 'good' : 
                               totalDuration < 5000 ? 'acceptable' : 'slow';
      
      console.log('[28A] searchCardsByName() completed:', {
        query: sanitizedQuery,
        totalAvailable: allSortedCards.length,
        offset,
        limit,
        returned: paginatedResults.length,
        duration: `${totalDuration.toFixed(2)}ms`,
        performance: performanceRating,
        breakdown: {
          fetch: `${fetchDuration.toFixed(2)}ms`,
          transform: `${transformDuration.toFixed(2)}ms`,
          sort: `${sortDuration.toFixed(2)}ms`,
        },
      });
      
      return paginatedResults;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Handle rate limit
      try {
        handleRateLimitError(error);
      } catch (rateLimitError) {
        console.error('[28A] Rate limit error during search:', {
          query,
          duration: `${duration.toFixed(2)}ms`,
          error: rateLimitError,
        });
        throw new Error('Too many requests to the card database. Please wait a moment and try again.');
      }
      
      console.error('[28A] Error in searchCardsByName():', {
        query,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return empty array on error (don't throw - let UI handle empty state)
      return [];
    }
  });
}

// ==================== END STEP 28A ====================



