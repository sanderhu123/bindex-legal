import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';
import { getEras, getSetsByEra, getAllSets, convertSetToPokemonSet, sortCardsBySetDate, getSeriesSlugFromId, getTcgdexSetId, cleanCardNumberForTcgdex, convertSetIdForUrl } from '../../data/pokemonEras';
import { getSpecialVariantsForCard, hasSpecialVariants } from '../../data/cardVariants';
import TCGdex from '@tcgdex/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStorageFullError, emergencyStorageCleanup } from '../cacheManager';

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
 * Pokémon TCG Pocket set IDs — these are from a different game and should be
 * excluded from all results in this app.
 */
const POCKET_SET_IDS = new Set([
  'a1', 'a1a', 'a2', 'a2a', 'a2b', 'a3', 'a3a', 'a3b', 'a4', 'a4a',
  'b1', 'b1a', 'p-a',
]);

function isPocketSet(setId: string): boolean {
  return POCKET_SET_IDS.has(setId.toLowerCase());
}

/**
 * McDonald's promo set IDs from TCGDEX — temporarily excluded.
 */
const MCDONALDS_SET_IDS = new Set([
  '2021swsh', '2019sm', '2018sm', '2017sm', '2016xy', '2015xy', '2014xy', '2012bw', '2011bw',
]);

function isMcDonaldsSet(setId: string): boolean {
  return MCDONALDS_SET_IDS.has(setId.toLowerCase());
}

function isExcludedSet(setId: string): boolean {
  return isPocketSet(setId) || isMcDonaldsSet(setId);
}

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
  // Persist set card lists (cards-...) and individual card lookups (card-...)
  // but not minimal sets which change more often
  if (cacheKey.startsWith('cards-') || cacheKey.startsWith('card-')) {
    AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(cacheEntry))
      .then(() => {
        console.log('[CACHE] Stored in persistent storage:', { cacheKey });
      })
      .catch(async (error) => {
        console.warn('[CACHE] Failed to persist cache:', { cacheKey, error });
        if (isStorageFullError(error)) {
          await emergencyStorageCleanup();
        }
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
      
      // Filter out sets with missing required fields and excluded sets
      const validSets = sets.filter(set => set.id && set.name && !isExcludedSet(set.id));
      
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
    
    // Filter out sets with missing required fields and excluded sets
    const validSets = sets.filter(set => set.id && set.name && !isExcludedSet(set.id));
    
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
    illustrator: tcgdexCard.illustrator,
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
  
  // Illustrator field - TCGDEX uses "illustrator"
  // According to the REST API, illustrator should be a direct string on full card objects
  // But the TypeScript SDK might wrap it, so we try multiple approaches
  let illustratorName = '';
  
  // Try direct access first (should work for full cards from tcgdex.card.get())
  try {
    illustratorName = tcgdexCard.illustrator || '';
  } catch (e) {
    console.warn('[24C] Direct illustrator access failed:', e);
  }
  
  // If still empty, try alternative approaches
  if (!illustratorName && tcgdexCard.illustrator) {
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
      illustratorName = ill;
    } else if (typeof ill === 'object') {
      illustratorName = ill?.name || ill?.value || String(ill) || '';
    }
  }
  
  // Final fallback: try getIllustrator() method if it exists
  if (!illustratorName && typeof tcgdexCard.getIllustrator === 'function') {
    try {
      const result = await tcgdexCard.getIllustrator();
      illustratorName = typeof result === 'string' ? result : result?.name || '';
      console.log('[24C] Got illustrator from getIllustrator():', illustratorName);
    } catch (error) {
      console.warn('[24C] getIllustrator() failed:', error);
    }
  }
  
  console.log('[24C] Final illustrator value:', {
    illustrator: illustratorName,
    hasIllustrator: !!illustratorName,
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
  // Format: https://assets.tcgdex.net/{lang}/{series}/{set}/{card}/{quality}.{format}
  // Only try fallback if the API had an image field we couldn't parse.
  // If the API returned no image at all, TCGDex genuinely doesn't have one —
  // skip the fallback to avoid wasted 404 requests and retries.
  const apiProvidedImage = tcgdexCard.image !== undefined && tcgdexCard.image !== null;
  if (!imageUrl && cardId && apiProvidedImage) {
    const appSetId = tcgdexCard.set?.id || '';
    if (appSetId && cardNumber) {
      // Get the series slug for this set
      // Returns 'NO_IMAGES' if this set doesn't have images on TCGDEX
      const seriesSlug = getSeriesSlugFromId(appSetId);
      
      // Skip fallback if this set doesn't have images on TCGDEX
      if (seriesSlug === 'NO_IMAGES') {
        console.log('[24C] Set has no images on TCGDEX, skipping fallback:', {
          appSetId,
          cardNumber,
        });
      } else {
        // Convert set ID for URL (e.g., 'sm3.5' -> 'sm35')
        const urlSetId = convertSetIdForUrl(appSetId);
        // Also try app-to-TCGDEX mapping (e.g., if needed)
        const tcgdexSetId = getTcgdexSetId(urlSetId);
        // Clean card number for promo sets (e.g., 'SM198' -> '198')
        const cleanedCardNumber = cleanCardNumberForTcgdex(cardNumber, tcgdexSetId);
        
        if (seriesSlug) {
          // Modern sets: include series in path
          imageUrl = `https://assets.tcgdex.net/en/${seriesSlug}/${tcgdexSetId}/${cleanedCardNumber}/low.png`;
          imageUrlHiRes = `https://assets.tcgdex.net/en/${seriesSlug}/${tcgdexSetId}/${cleanedCardNumber}/high.png`;
        } else {
          // Sets without explicit series - use set ID directly
          imageUrl = `https://assets.tcgdex.net/en/${tcgdexSetId}/${cleanedCardNumber}/low.png`;
          imageUrlHiRes = `https://assets.tcgdex.net/en/${tcgdexSetId}/${cleanedCardNumber}/high.png`;
        }
        
        console.log('[24C] Fallback image URL constructed:', {
          appSetId,
          urlSetId,
          tcgdexSetId,
          originalCardNumber: cardNumber,
          cleanedCardNumber,
          seriesSlug: seriesSlug || '(no series)',
          imageUrl,
        });
      }
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
    illustrator: illustratorName,
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
 * - Reverse holo (if API says reverse: true AND rarity is Common/Uncommon/Rare/Holo Rare)
 * - Pokeball holo (special sets only, follows EXACT same logic as reverse holo)
 * - Masterball holo (special sets only, follows same logic as reverse holo BUT only for Pokemon supertype)
 * 
 * VARIANT LOGIC:
 * - Reverse Holo: hasReverse === true AND rarity in [Common, Uncommon, Rare, Holo Rare]
 * - Pokeball: hasReverse === true AND rarity in [Common, Uncommon, Rare, Holo Rare] (same as reverse holo)
 * - Masterball: hasReverse === true AND rarity in [Common, Uncommon, Rare, Holo Rare] AND supertype === "Pokemon"
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
  // Only Common, Uncommon, Rare, and Holo Rare cards can have reverse/pokeball/masterball holos
  // Note: TCGDEX API uses "Holo Rare" for SWSH era, "Rare Holo" for older DP/HGSS era
  const allowsReverseHolo = (
    rarity === 'Common' || 
    rarity === 'Uncommon' || 
    rarity === 'Rare' ||
    rarity === 'Holo Rare' ||
    rarity === 'Rare Holo'
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
    illustrator: '', // No illustrator for Region mode
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

  // Custom placeholder cards are stored in Supabase, not the TCGDEX API
  if (id.startsWith('custom-')) {
    const { getCustomCard } = require('../supabase/customCards');
    return getCustomCard(id);
  }

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
  /** Optional filters for era, set, rarity, illustrator (arrays for multi-select) */
  filters?: {
    eras?: string[];
    setIds?: string[];
    rarities?: string[];
    illustrators?: string[];
  };
}

/**
 * Metadata about all matching cards from a search (not just the current page).
 * Used by filter components to show accurate filter options.
 */
export interface SearchFilterMeta {
  /** All unique set IDs found across all matching cards */
  setIds: string[];
  /** All unique era names found across all matching cards */
  eras: string[];
}

/**
 * Return type for searchCardsByName()
 */
export interface CardSearchResult {
  /** Paginated card results */
  cards: Card[];
  /** Metadata derived from ALL matching cards (for filter dropdowns) */
  filterMeta: SearchFilterMeta;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip leading zeros from a purely numeric string.
 * "007" → "7", "001" → "1", "0" → "0".
 * Non-numeric strings like "TG21" are returned as-is.
 */
function stripLeadingZeros(value: string): string {
  if (/^\d+$/.test(value)) {
    return String(Number(value));
  }
  return value;
}

/**
 * Check if a search query looks like a card number rather than a card name.
 * Returns true for "7", "007", "001/159", "#7", "TG21".
 * Returns false for "oddish", "pikachu".
 */
function looksLikeCardNumber(query: string): boolean {
  return /^#?\d/.test(query) || query.includes('/') || /^[a-z]{1,3}\d/i.test(query);
}

/**
 * Check if a search query looks like a full TCGDEX card ID.
 * Card IDs have the format "setId-localId", e.g.:
 *   "swsh1-25", "base1-4", "sv01-001", "swsh11-TG21", "sm3.5-1"
 *
 * We require at least one letter, then a dash, then at least one character after the dash.
 * This avoids matching plain numbers or names.
 */
function looksLikeCardId(query: string): boolean {
  return /^[a-z0-9.]+[-][a-z0-9]+$/i.test(query);
}

/**
 * Extract set ID from a full card ID.
 * Card IDs are "setId-localId", and setId can include hyphens.
 * Example: "tk-xy-b-12" -> "tk-xy-b"
 */
function extractSetIdFromCardId(cardId: string): string {
  const lastDashIndex = cardId.lastIndexOf('-');
  if (lastDashIndex <= 0) return '';
  return cardId.slice(0, lastDashIndex);
}

/**
 * Whitelisted set IDs from hard-coded app data.
 * Cards outside this list are blocked from picker/search results.
 */
const ALLOWED_SET_IDS = new Set(getAllSets().map((set) => set.id.toLowerCase()));

function isAllowedSetId(setId: string): boolean {
  return ALLOWED_SET_IDS.has(setId.toLowerCase());
}

/**
 * Cached map of set ID → official card count (the printed total on cards, e.g. 159).
 * Populated lazily on first number search that includes a slash (e.g. "1/159").
 */
let setOfficialCountCache: Map<string, number> | null = null;

/**
 * Fetch (and cache) the official card count for every set from TCGDEX.
 * The set list endpoint returns { id, name, logo, cardCount: { total, official } }
 * for each set. We only keep id → cardCount.official.
 */
async function getSetOfficialCounts(): Promise<Map<string, number>> {
  if (setOfficialCountCache) return setOfficialCountCache;

  try {
    console.log('[28A] Fetching set list for official card counts...');
    const response = await fetch('https://api.tcgdex.net/v2/en/sets');
    if (!response.ok) {
      console.warn('[28A] Failed to fetch set list:', response.status);
      return new Map();
    }
    const sets: any[] = await response.json();
    const map = new Map<string, number>();
    for (const s of sets) {
      if (s.id && s.cardCount?.official != null) {
        map.set(s.id, Number(s.cardCount.official));
      }
    }
    setOfficialCountCache = map;
    console.log('[28A] Set official counts cached:', { setCount: map.size });
    return map;
  } catch (error) {
    console.warn('[28A] Error fetching set counts:', error);
    return new Map();
  }
}

/**
 * Cache duration for search results (2 minutes - shorter than normal cache)
 * Search results can change more frequently as users search different terms
 */
const SEARCH_CACHE_DURATION = 2 * 60 * 1000;

/**
 * Cache for sorted search results - stores the FULL sorted list and filter metadata
 * This allows stable pagination without re-fetching and re-sorting
 */
const sortedSearchCache = new Map<string, { cards: Card[]; filterMeta: SearchFilterMeta; timestamp: number }>();
const searchCardDetailsCache = new Map<string, Partial<Card>>();

/**
 * Check if search cache is valid (2 minutes)
 */
function isSearchCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SEARCH_CACHE_DURATION;
}

/**
 * Enrich lightweight search cards with missing fields from full card details.
 * TCGDEX list search responses often omit rarity/illustrator/category fields.
 */
async function enrichSearchCards(cards: Card[]): Promise<Card[]> {
  return Promise.all(cards.map(async (card) => {
    const hasCoreDetails = !!(card.rarity && card.rarity.trim().length > 0);
    if (hasCoreDetails) return card;

    const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/i, '');
    const cached = searchCardDetailsCache.get(baseId);
    if (cached) {
      return {
        ...card,
        rarity: card.rarity || cached.rarity || '',
        illustrator: card.illustrator || cached.illustrator || '',
        supertype: card.supertype || cached.supertype || '',
        set: card.set || cached.set || '',
        setTotal: card.setTotal || cached.setTotal || '',
      };
    }

    try {
      const fullCard = await getCardById(baseId);
      if (fullCard) {
        const detailPatch: Partial<Card> = {
          rarity: fullCard.rarity || '',
          illustrator: fullCard.illustrator || '',
          supertype: fullCard.supertype || '',
          set: fullCard.set || '',
          setTotal: fullCard.setTotal || '',
        };
        searchCardDetailsCache.set(baseId, detailPatch);
        return {
          ...card,
          rarity: card.rarity || detailPatch.rarity || '',
          illustrator: card.illustrator || detailPatch.illustrator || '',
          supertype: card.supertype || detailPatch.supertype || '',
          set: card.set || detailPatch.set || '',
          setTotal: card.setTotal || detailPatch.setTotal || '',
        };
      }
    } catch {
      // If detail fetch fails, keep the lightweight card shape.
    }

    return card;
  }));
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
): Promise<CardSearchResult> {
  const { limit = 50, offset = 0, pokemonOnly = false, exactMatch = false, filters } = options || {};
  
  console.log('[28A] searchCardsByName() called:', { query, limit, offset, pokemonOnly, exactMatch, filters });
  const startTime = performance.now();
  
  // Allow empty query when filters are active (browse by filter only)
  const hasFilters = filters && (
    (filters.eras && filters.eras.length > 0) ||
    (filters.setIds && filters.setIds.length > 0) ||
    (filters.rarities && filters.rarities.length > 0) ||
    (filters.illustrators && filters.illustrators.length > 0)
  );
  
  const emptyResult: CardSearchResult = { cards: [], filterMeta: { setIds: [], eras: [] } };

  // Validate: need at least a query or a filter
  if ((!query || query.trim().length === 0) && !hasFilters) {
    console.log('[28A] Empty query and no filters, returning empty result');
    return emptyResult;
  }
  
  // Sanitize query - remove special characters that could cause issues
  const sanitizedQuery = query ? query.trim().toLowerCase() : '';
  
  // Build a cache key that includes filters so different filter combos are cached separately
  const filterKey = filters 
    ? `-era:${(filters.eras || []).sort().join(',')}-set:${(filters.setIds || []).sort().join(',')}-rar:${(filters.rarities || []).sort().join(',')}-ill:${(filters.illustrators || []).sort().join(',')}`
    : '';
  
  // Create cache key for the FULL sorted list (does not include limit/offset)
  // This allows stable pagination from the same sorted list
  const sortedCacheKey = `sorted-search-${sanitizedQuery}-${pokemonOnly}-${exactMatch}${filterKey}`;
  
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
    
    return { cards: paginatedResults, filterMeta: cachedSorted.filterMeta };
  }
  
  // Step 2: Check if rate limited
  if (isRateLimited()) {
    console.warn('[28A] Rate limited during search');
    // Try to return stale cache if available
    if (cachedSorted) {
      const paginatedResults = cachedSorted.cards.slice(offset, offset + limit);
      console.log('[28A] Returning stale cache due to rate limit');
      return { cards: paginatedResults, filterMeta: cachedSorted.filterMeta };
    }
    throw new Error('Too many requests. Please wait a moment and try again.');
  }
  
  // Step 3: Fetch ALL results, sort them, cache them, then return requested page
  // We use a deduplicated request for the full fetch
  const fullFetchCacheKey = `full-fetch-${sanitizedQuery}-${pokemonOnly}${filterKey}`;
  
  return deduplicateRequest(fullFetchCacheKey, async () => {
    try {
      const requestStartTime = performance.now();
      console.log('[28A] Fetching ALL results for stable sorting...');
      
      // Detect if the query looks like a full card ID (e.g., "swsh1-25", "base1-4")
      const isCardIdSearch = sanitizedQuery ? looksLikeCardId(sanitizedQuery) : false;
      // Detect if the query looks like a card number (e.g., "007", "TG21", "001/159")
      const isNumberSearch = sanitizedQuery && !isCardIdSearch ? looksLikeCardNumber(sanitizedQuery) : false;
      
      // Helper to build common filter params (shared between name and number searches)
      const buildFilterParams = (): URLSearchParams => {
        const p = new URLSearchParams();
        if (filters?.rarities && filters.rarities.length === 1) {
          p.append('rarity', `eq:${filters.rarities[0]}`);
        }
        if (filters?.illustrators && filters.illustrators.length === 1) {
          p.append('illustrator', `like:${filters.illustrators[0]}`);
        }
        if (filters?.setIds && filters.setIds.length === 1) {
          p.append('set.id', `eq:${filters.setIds[0]}`);
        }
        return p;
      };
      
      let cardResults: any[];
      let fetchDuration = 0;
      
      if (isCardIdSearch && sanitizedQuery) {
        // ---- CARD ID SEARCH ----
        // User typed a full TCGDEX ID like "swsh1-25" — fetch the card directly
        console.log('[28A] Card ID search detected:', { query: sanitizedQuery });
        
        try {
          const url = `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(sanitizedQuery)}`;
          console.log('[28A] Fetching card by ID:', url);
          
          const resp = await fetch(url);
          fetchDuration = performance.now() - requestStartTime;
          
          if (resp.ok) {
            const card = await resp.json();
            cardResults = card ? [card] : [];
            console.log('[28A] Card ID search result:', {
              found: cardResults.length > 0,
              cardName: card?.name,
              fetchDuration: `${fetchDuration.toFixed(2)}ms`,
            });
          } else if (resp.status === 404) {
            cardResults = [];
            console.log('[28A] Card ID not found:', { query: sanitizedQuery });
          } else {
            if (resp.status === 429) {
              handleRateLimitError({ status: 429 });
            }
            cardResults = [];
            console.warn('[28A] Card ID search failed:', { status: resp.status });
          }
        } catch (idError) {
          console.warn('[28A] Card ID fetch error, falling back to name search:', idError);
          cardResults = [];
        }
      } else if (isNumberSearch && sanitizedQuery) {
        // ---- NUMBER SEARCH ----
        // Strip "#" prefix and extract set total from slash format
        // "001/159" → cardNumber "001", setTotal 159
        // "1"       → cardNumber "1",   setTotal undefined
        let cleaned = sanitizedQuery.replace(/^#/, '');
        let setTotal: number | undefined; // The printed total on the card (e.g. 159)
        if (cleaned.includes('/')) {
          const parts = cleaned.split('/');
          cleaned = parts[0];
          const parsedTotal = parseInt(parts[1], 10);
          if (!isNaN(parsedTotal) && parsedTotal > 0) {
            setTotal = parsedTotal;
          }
        }
        
        // Get both normalized (no leading zeros) and 3-digit padded versions
        const normalized = stripLeadingZeros(cleaned);
        const padded = /^\d+$/.test(normalized) ? normalized.padStart(3, '0') : normalized;
        
        // Build unique localId values to search (avoid duplicate API calls)
        const localIdValues = new Set([cleaned, normalized, padded]);
        
        console.log('[28A] Number search detected:', {
          raw: sanitizedQuery,
          cleaned,
          normalized,
          padded,
          setTotal: setTotal ?? '(none)',
          localIdValues: Array.from(localIdValues),
        });
        
        // If a set total was provided (e.g. "/159"), fetch the set list so we can
        // narrow results to only sets whose official card count matches.
        let allowedSetIds: Set<string> | null = null;
        if (setTotal != null) {
          const officialCounts = await getSetOfficialCounts();
          allowedSetIds = new Set<string>();
          for (const [setId, count] of officialCounts) {
            if (count === setTotal) {
              allowedSetIds.add(setId);
            }
          }
          console.log('[28A] Sets with official count', setTotal, ':', {
            matchingSetCount: allowedSetIds.size,
            sampleIds: Array.from(allowedSetIds).slice(0, 5),
          });
        }
        
        // Make parallel API calls for each localId format
        const fetchPromises = Array.from(localIdValues).map(async (localId) => {
          const p = buildFilterParams();
          p.append('localId', localId);
          const url = `https://api.tcgdex.net/v2/en/cards?${p.toString()}`;
          console.log('[28A] Fetching number search URL:', url);
          
          const resp = await fetch(url);
          if (!resp.ok) {
            if (resp.status === 429) {
              handleRateLimitError({ status: 429 });
            }
            // Non-fatal: if one format returns an error, we still have the other
            console.warn('[28A] Number search request failed:', { localId, status: resp.status });
            return [];
          }
          return resp.json();
        });
        
        const allResults = await Promise.all(fetchPromises);
        
        // Merge results and deduplicate by card ID
        const seenIds = new Set<string>();
        const mergedResults: any[] = [];
        for (const resultSet of allResults) {
          for (const card of resultSet) {
            if (card.id && !seenIds.has(card.id)) {
              seenIds.add(card.id);
              mergedResults.push(card);
            }
          }
        }
        
        // Client-side exact match filter:
        // 1. Normalize each card's localId and only keep cards that match exactly.
        //    This ensures "1" returns card #1 but NOT #10, #11, #100, etc.
        // 2. If a set total was provided (e.g. "/159"), also filter to only
        //    cards from sets whose official printed count matches.
        cardResults = mergedResults.filter((card) => {
          const cardLocalId = stripLeadingZeros((card.localId || '').toLowerCase());
          if (cardLocalId !== normalized) return false;
          
          // If set total filter is active, check the card's set ID
          if (allowedSetIds) {
            // Card ID format: "setId-localId" (e.g. "swsh5-1")
            // Extract set ID (everything before the last dash+localId)
            const cardSetId = extractSetIdFromCardId(card.id || '');
            if (!allowedSetIds.has(cardSetId)) return false;
          }
          
          return true;
        });
        
        fetchDuration = performance.now() - requestStartTime;
        console.log('[28A] Number search results:', {
          apiResults: mergedResults.length,
          afterExactFilter: cardResults.length,
          normalized,
          setTotal: setTotal ?? '(none)',
          fetchDuration: `${fetchDuration.toFixed(2)}ms`,
        });
      } else {
        // ---- NAME SEARCH (existing behavior) ----
        const params = buildFilterParams();
        if (sanitizedQuery) {
          params.append('name', sanitizedQuery);
        }
        
        const apiUrl = `https://api.tcgdex.net/v2/en/cards?${params.toString()}`;
        console.log('[28A] Fetching from API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          if (response.status === 429) {
            handleRateLimitError({ status: 429 });
          }
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        cardResults = await response.json();
        
        fetchDuration = performance.now() - requestStartTime;
        console.log('[28A] API response received:', {
          resultCount: cardResults.length,
          fetchDuration: `${fetchDuration.toFixed(2)}ms`,
          sampleCard: cardResults[0] ? {
            id: cardResults[0].id,
            name: cardResults[0].name,
            localId: cardResults[0].localId,
          } : null,
        });
      }
      
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
      
      // "Starts with" filter: only keep cards whose name starts with the query.
      // The API does a "contains" search, so "cha" would match "Machamp".
      // This filter narrows results to names starting with the query (e.g. "Charizard").
      if (sanitizedQuery && !isNumberSearch && !isCardIdSearch) {
        const beforeStartsWith = filteredResults.length;
        filteredResults = filteredResults.filter((card: any) => {
          return (card.name || '').toLowerCase().startsWith(sanitizedQuery);
        });
        console.log('[28A] Filtered to "starts with":', {
          query: sanitizedQuery,
          before: beforeStartsWith,
          after: filteredResults.length,
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
      
      // Filter out excluded sets (Pocket, McDonald's)
      filteredResults = filteredResults.filter((card: any) => {
        const cardSetId = card?.set?.id || extractSetIdFromCardId(card?.id || '');
        if (!cardSetId) return false;
        return isAllowedSetId(cardSetId) && !isExcludedSet(cardSetId);
      });
      
      // Transform ALL results to our Card type FIRST
      const transformStartTime = performance.now();
      const allTransformedCards: Card[] = filteredResults.map((card: any) => {
        // Extract set info from card ID (format: setId-localId, e.g., "swsh1-25")
        // Use robust extraction to support set IDs that include hyphens.
        const setId = extractSetIdFromCardId(card.id || '');
        
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
          illustrator: card.illustrator || '',
          imageUrl,
          imageUrlHiRes,
          variant: 'base' as const,
          supertype: card.category || '',
          setTotal: '',
        };
      });
      
      const transformDuration = performance.now() - transformStartTime;
      
      // Client-side filtering for multi-select values
      // (The API only supports single values per param)
      let clientFilteredCards = allTransformedCards;
      
      // Era filter (always client-side — API doesn't support era)
      if (filters?.eras && filters.eras.length > 0) {
        // Collect all set IDs and names across all selected eras
        const eraSetIds = new Set<string>();
        const eraSetNames = new Set<string>();
        for (const eraName of filters.eras) {
          const eraSetDefs = getSetsByEra(eraName);
          for (const s of eraSetDefs) {
            eraSetIds.add(s.id.toLowerCase());
            eraSetNames.add(s.name.toLowerCase());
          }
        }
        
        clientFilteredCards = clientFilteredCards.filter(card => {
          const cardSetId = extractSetIdFromCardId(card.id || '').toLowerCase();
          if (eraSetIds.has(cardSetId)) return true;
          if (card.set && eraSetNames.has(card.set.toLowerCase())) return true;
          return false;
        });
        
        console.log('[28A] Filtered by eras:', {
          eras: filters.eras,
          before: allTransformedCards.length,
          after: clientFilteredCards.length,
        });
      }
      
      // Multi-set filter (client-side when >1 set selected)
      if (filters?.setIds && filters.setIds.length > 1) {
        const setIdSet = new Set(filters.setIds.map(s => s.toLowerCase()));
        clientFilteredCards = clientFilteredCards.filter(card => {
          const cardSetId = extractSetIdFromCardId(card.id || '').toLowerCase();
          return setIdSet.has(cardSetId);
        });
        console.log('[28A] Filtered by multiple sets (client-side):', {
          setIds: filters.setIds,
          remaining: clientFilteredCards.length,
        });
      }
      
      // Multi-rarity filter (client-side when >1 rarity selected)
      if (filters?.rarities && filters.rarities.length > 1) {
        const raritySet = new Set(filters.rarities.map(r => r.toLowerCase()));
        clientFilteredCards = clientFilteredCards.filter(card => {
          return card.rarity && raritySet.has(card.rarity.toLowerCase());
        });
        console.log('[28A] Filtered by multiple rarities (client-side):', {
          rarities: filters.rarities,
          remaining: clientFilteredCards.length,
        });
      }
      
      // Multi-illustrator filter (client-side when >1 illustrator selected)
      if (filters?.illustrators && filters.illustrators.length > 1) {
        const illLower = filters.illustrators.map(i => i.toLowerCase());
        clientFilteredCards = clientFilteredCards.filter(card => {
          if (!card.illustrator) return false;
          const illustratorLower = card.illustrator.toLowerCase();
          return illLower.some(ill => illustratorLower.includes(ill));
        });
        console.log('[28A] Filtered by multiple illustrators (client-side):', {
          illustrators: filters.illustrators,
          remaining: clientFilteredCards.length,
        });
      }
      
      // SORT ALL cards by set release date (newest first) ONCE
      const sortStartTime = performance.now();
      const allSortedCards = sortCardsBySetDate(clientFilteredCards);
      const sortDuration = performance.now() - sortStartTime;
      
      // Extract filter metadata from ALL matching cards (not just the page).
      // This lets the filter component show all relevant eras/sets.
      const metaSetIds = new Set<string>();
      const metaEras = new Set<string>();
      for (const card of allSortedCards) {
        const cardSetId = extractSetIdFromCardId(card.id || '').toLowerCase();
        if (cardSetId) {
          metaSetIds.add(cardSetId);
          const setMeta = ALLOWED_SET_IDS.has(cardSetId)
            ? getAllSets().find(s => s.id.toLowerCase() === cardSetId)
            : null;
          if (setMeta) {
            const eraForSet = getEras().find(era => {
              const eraSets = getSetsByEra(era.name);
              return eraSets.some(s => s.id.toLowerCase() === cardSetId);
            });
            if (eraForSet) metaEras.add(eraForSet.name);
          }
        }
      }
      const filterMeta: SearchFilterMeta = {
        setIds: Array.from(metaSetIds),
        eras: Array.from(metaEras),
      };
      
      console.log('[28A] All cards sorted by release date:', {
        totalCards: allSortedCards.length,
        sortDuration: `${sortDuration.toFixed(2)}ms`,
        filterMeta: { setCount: filterMeta.setIds.length, eraCount: filterMeta.eras.length },
        newestCard: allSortedCards[0] ? { id: allSortedCards[0].id, set: allSortedCards[0].set } : null,
        oldestCard: allSortedCards[allSortedCards.length - 1] ? { 
          id: allSortedCards[allSortedCards.length - 1].id, 
          set: allSortedCards[allSortedCards.length - 1].set 
        } : null,
      });
      
      // Cache the FULL sorted list and metadata for stable pagination
      sortedSearchCache.set(sortedCacheKey, {
        cards: allSortedCards,
        filterMeta,
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
      
      return { cards: paginatedResults, filterMeta };
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
      
      // Return empty result on error (don't throw - let UI handle empty state)
      return emptyResult;
    }
  });
}

// ==================== END STEP 28A ====================

/**
 * Fetch all available card rarities from the TCGDEX API.
 * Results are cached so the API is only called once per session.
 */
let cachedRarities: string[] | null = null;

export async function getRarities(): Promise<string[]> {
  if (cachedRarities) {
    return cachedRarities;
  }

  try {
    const response = await fetch('https://api.tcgdex.net/v2/en/rarities');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const rarities: string[] = await response.json();
    cachedRarities = rarities.sort((a, b) => a.localeCompare(b));
    return cachedRarities;
  } catch (error) {
    console.warn('[RARITY] Failed to fetch rarities from API:', error);
    return [];
  }
}

/**
 * Fetch which rarities actually exist in specific set(s).
 * For each rarity from the global list, checks if any cards with that rarity
 * exist in the given set via the API. Results are cached per set.
 */
const setRarityCache: Record<string, string[]> = {};

export async function getRaritiesForSets(setIds: string[]): Promise<string[]> {
  if (setIds.length === 0) {
    return getRarities();
  }

  const allRarities = await getRarities();
  if (allRarities.length === 0) return [];

  const uncachedSetIds = setIds.filter(id => !setRarityCache[id]);
  
  if (uncachedSetIds.length > 0) {
    await Promise.all(uncachedSetIds.map(async (setId) => {
      const found: string[] = [];
      await Promise.all(allRarities.map(async (rarity) => {
        try {
          const url = `https://api.tcgdex.net/v2/en/cards?rarity=${encodeURIComponent(rarity)}&set.id=${encodeURIComponent(setId)}`;
          const res = await fetch(url);
          if (res.ok) {
            const cards = await res.json();
            if (Array.isArray(cards) && cards.length > 0) {
              found.push(rarity);
            }
          }
        } catch {
          // skip this rarity on error
        }
      }));
      setRarityCache[setId] = found.sort((a, b) => a.localeCompare(b));
    }));
  }

  const merged = new Set<string>();
  for (const setId of setIds) {
    const rarities = setRarityCache[setId] || [];
    for (const r of rarities) merged.add(r);
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}



