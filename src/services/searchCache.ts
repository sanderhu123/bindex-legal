import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';
import { isStorageFullError, emergencyStorageCleanup } from './cacheManager';

/**
 * Search Cache Service (Step 32B)
 * 
 * Provides persistent caching for card search results to improve performance.
 * Features:
 * - In-memory cache for instant access during session
 * - Persistent storage for faster app restarts
 * - Configurable cache duration
 * - Automatic cache cleanup for expired entries
 * - LRU-like behavior (limits number of cached searches)
 */

// Storage key prefix
const SEARCH_CACHE_PREFIX = '@search_cache_';
const SEARCH_CACHE_INDEX_KEY = '@search_cache_index';

// Cache configuration
const MEMORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in memory
const PERSISTENT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes on disk
const MAX_CACHED_SEARCHES = 20; // Maximum number of different searches to cache

/**
 * In-memory cache for fastest access
 * Key: normalized query string
 * Value: { cards: Card[], timestamp: number }
 */
const memoryCache = new Map<string, { cards: Card[]; timestamp: number }>();

/**
 * Index of cached search queries (for LRU management)
 */
let cacheIndex: { queries: string[]; lastCleanup: number } = {
  queries: [],
  lastCleanup: 0,
};

/**
 * Whether the cache index has been loaded from storage
 */
let indexLoaded = false;

/**
 * Normalize a search query for consistent cache keys
 * Converts to lowercase and trims whitespace
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * Generate a cache key for a search
 */
function getCacheKey(query: string, pokemonOnly: boolean, exactMatch: boolean): string {
  const normalized = normalizeQuery(query);
  return `${normalized}-${pokemonOnly ? 'p' : 'a'}-${exactMatch ? 'e' : 'f'}`;
}

/**
 * Load the cache index from storage
 */
async function loadCacheIndex(): Promise<void> {
  if (indexLoaded) return;
  
  try {
    const data = await AsyncStorage.getItem(SEARCH_CACHE_INDEX_KEY);
    if (data) {
      cacheIndex = JSON.parse(data);
    }
    indexLoaded = true;
    console.log('[SearchCache] Index loaded:', { queryCount: cacheIndex.queries.length });
  } catch (error) {
    console.warn('[SearchCache] Failed to load index:', error);
    indexLoaded = true;
  }
}

/**
 * Save the cache index to storage
 */
async function saveCacheIndex(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEARCH_CACHE_INDEX_KEY, JSON.stringify(cacheIndex));
  } catch (error) {
    console.warn('[SearchCache] Failed to save index:', error);
    if (isStorageFullError(error)) {
      await emergencyStorageCleanup();
    }
  }
}

/**
 * Check if memory cache entry is valid
 */
function isMemoryCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < MEMORY_CACHE_DURATION;
}

/**
 * Check if persistent cache entry is valid
 */
function isPersistentCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < PERSISTENT_CACHE_DURATION;
}

/**
 * Get cached search results
 * Checks memory cache first, then persistent storage
 * 
 * @param query - Search query
 * @param pokemonOnly - Whether search was filtered to Pokemon only
 * @param exactMatch - Whether exact word matching was used
 * @returns Cached cards array or null if not found/expired
 */
export async function getCachedSearchResults(
  query: string,
  pokemonOnly: boolean = false,
  exactMatch: boolean = false
): Promise<Card[] | null> {
  const cacheKey = getCacheKey(query, pokemonOnly, exactMatch);
  
  // Check memory cache first (fastest)
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && isMemoryCacheValid(memoryEntry.timestamp)) {
    console.log('[SearchCache] Memory cache hit:', { query, count: memoryEntry.cards.length });
    return memoryEntry.cards;
  }
  
  // Check persistent storage
  await loadCacheIndex();
  
  try {
    const data = await AsyncStorage.getItem(SEARCH_CACHE_PREFIX + cacheKey);
    if (data) {
      const entry = JSON.parse(data);
      if (isPersistentCacheValid(entry.timestamp)) {
        console.log('[SearchCache] Persistent cache hit:', { query, count: entry.cards.length });
        
        // Refresh memory cache
        memoryCache.set(cacheKey, {
          cards: entry.cards,
          timestamp: Date.now(), // Use current time for memory cache
        });
        
        return entry.cards;
      } else {
        // Clean up expired entry
        console.log('[SearchCache] Persistent cache expired:', { query });
        await AsyncStorage.removeItem(SEARCH_CACHE_PREFIX + cacheKey);
      }
    }
  } catch (error) {
    console.warn('[SearchCache] Error reading persistent cache:', error);
  }
  
  console.log('[SearchCache] Cache miss:', { query });
  return null;
}

/**
 * Store search results in cache
 * Stores in both memory and persistent storage
 * 
 * @param query - Search query
 * @param cards - Search results to cache
 * @param pokemonOnly - Whether search was filtered to Pokemon only
 * @param exactMatch - Whether exact word matching was used
 */
export async function setCachedSearchResults(
  query: string,
  cards: Card[],
  pokemonOnly: boolean = false,
  exactMatch: boolean = false
): Promise<void> {
  const cacheKey = getCacheKey(query, pokemonOnly, exactMatch);
  const timestamp = Date.now();
  
  // Store in memory cache
  memoryCache.set(cacheKey, { cards, timestamp });
  console.log('[SearchCache] Stored in memory:', { query, count: cards.length });
  
  // Store in persistent storage
  await loadCacheIndex();
  
  try {
    // Add to index if not already there
    if (!cacheIndex.queries.includes(cacheKey)) {
      cacheIndex.queries.push(cacheKey);
      
      // Enforce max cached searches (remove oldest)
      if (cacheIndex.queries.length > MAX_CACHED_SEARCHES) {
        const oldestKey = cacheIndex.queries.shift();
        if (oldestKey) {
          await AsyncStorage.removeItem(SEARCH_CACHE_PREFIX + oldestKey);
          memoryCache.delete(oldestKey);
          console.log('[SearchCache] Evicted oldest entry:', { oldestKey });
        }
      }
      
      await saveCacheIndex();
    }
    
    // Store the actual data
    await AsyncStorage.setItem(
      SEARCH_CACHE_PREFIX + cacheKey,
      JSON.stringify({ cards, timestamp })
    );
    console.log('[SearchCache] Stored in persistent storage:', { query });
  } catch (error) {
    console.warn('[SearchCache] Failed to persist cache:', error);
    if (isStorageFullError(error)) {
      await emergencyStorageCleanup();
    }
  }
}

/**
 * Clear all search cache (both memory and persistent)
 */
export async function clearSearchCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear persistent storage
  try {
    await loadCacheIndex();
    
    // Remove all cached search entries
    const keysToRemove = cacheIndex.queries.map(q => SEARCH_CACHE_PREFIX + q);
    keysToRemove.push(SEARCH_CACHE_INDEX_KEY);
    
    await AsyncStorage.multiRemove(keysToRemove);
    
    // Reset index
    cacheIndex = { queries: [], lastCleanup: Date.now() };
    
    console.log('[SearchCache] All cache cleared');
  } catch (error) {
    console.warn('[SearchCache] Error clearing cache:', error);
  }
}

/**
 * Get cache statistics for debugging
 */
export function getSearchCacheStats(): {
  memoryEntries: number;
  persistentEntries: number;
  validMemoryEntries: number;
  oldestMemoryEntry: number | null;
} {
  const now = Date.now();
  let validMemoryCount = 0;
  let oldestTimestamp: number | null = null;
  
  memoryCache.forEach((entry) => {
    if (isMemoryCacheValid(entry.timestamp)) {
      validMemoryCount++;
    }
    if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
  });
  
  return {
    memoryEntries: memoryCache.size,
    persistentEntries: cacheIndex.queries.length,
    validMemoryEntries: validMemoryCount,
    oldestMemoryEntry: oldestTimestamp,
  };
}

/**
 * Preload search results into memory cache
 * Useful for commonly searched terms
 * 
 * @param queries - Array of queries to preload
 */
export async function preloadSearchCache(
  queries: Array<{ query: string; pokemonOnly?: boolean; exactMatch?: boolean }>
): Promise<number> {
  let loadedCount = 0;
  
  for (const { query, pokemonOnly = false, exactMatch = false } of queries) {
    const cached = await getCachedSearchResults(query, pokemonOnly, exactMatch);
    if (cached) {
      loadedCount++;
    }
  }
  
  console.log('[SearchCache] Preloaded queries:', { loaded: loadedCount, total: queries.length });
  return loadedCount;
}
