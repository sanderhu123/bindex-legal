import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearApiCache, getCacheStats } from './api/pokemonApi';
import { clearPrefetchStatus } from './imagePrefetch';
import { Image } from 'expo-image';

/**
 * Cache Manager Service
 * 
 * Manages local cache for binders, including:
 * - Tracking when binders were last opened
 * - Cleaning up cache for inactive binders (30+ days)
 * - Managing storage limits
 * - Automatic cleanup when storage is full (SQLITE_FULL)
 */

/**
 * Detect if an error is a "storage full" / SQLITE_FULL error.
 * Android AsyncStorage uses SQLite under the hood and throws code 13 when full.
 */
export function isStorageFullError(error: any): boolean {
  if (!error) return false;
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('sqlite_full') ||
    msg.includes('disk is full') ||
    msg.includes('database or disk is full') ||
    msg.includes('code 13') ||
    msg.includes('no space left')
  );
}

let isEmergencyCleanupRunning = false;

/**
 * Emergency cleanup when storage is full.
 * Clears API cache, search cache, and image cache to free space.
 * Safe to call multiple times — only one cleanup runs at a time.
 */
export async function emergencyStorageCleanup(): Promise<void> {
  if (isEmergencyCleanupRunning) return;
  isEmergencyCleanupRunning = true;

  console.warn('[CacheManager] EMERGENCY: Storage full — clearing caches to free space...');

  try {
    await clearApiCache();
  } catch (e) {
    console.warn('[CacheManager] Emergency: failed to clear API cache:', e);
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const searchKeys = allKeys.filter(k => k.startsWith('@search_cache_'));
    if (searchKeys.length > 0) {
      await AsyncStorage.multiRemove(searchKeys);
      console.log('[CacheManager] Emergency: cleared search cache keys:', searchKeys.length);
    }
  } catch (e) {
    console.warn('[CacheManager] Emergency: failed to clear search cache:', e);
  }

  try {
    await Image.clearDiskCache();
    console.log('[CacheManager] Emergency: cleared image disk cache');
  } catch (e) {
    console.warn('[CacheManager] Emergency: failed to clear image cache:', e);
  }

  isEmergencyCleanupRunning = false;
  console.log('[CacheManager] Emergency cleanup complete');
}

// Storage keys
const BINDER_ACCESS_KEY = '@binder_last_accessed';
const CACHE_CLEANUP_KEY = '@cache_last_cleanup';

// 30 days in milliseconds
const INACTIVE_THRESHOLD = 30 * 24 * 60 * 60 * 1000;

// Minimum time between cleanups (1 day)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Record of when each binder was last accessed
 */
interface BinderAccessRecord {
  [binderId: string]: number; // timestamp
}

/**
 * Get the last accessed times for all binders
 */
async function getBinderAccessRecord(): Promise<BinderAccessRecord> {
  try {
    const data = await AsyncStorage.getItem(BINDER_ACCESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[CacheManager] Error reading access record:', error);
    return {};
  }
}

/**
 * Save the binder access record
 */
async function saveBinderAccessRecord(record: BinderAccessRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(BINDER_ACCESS_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('[CacheManager] Error saving access record:', error);
    if (isStorageFullError(error)) {
      await emergencyStorageCleanup();
      try {
        await AsyncStorage.setItem(BINDER_ACCESS_KEY, JSON.stringify(record));
      } catch (retryError) {
        console.error('[CacheManager] Retry after cleanup also failed:', retryError);
      }
    }
  }
}

/**
 * Record that a binder was accessed (opened)
 * Call this when a user opens a binder
 */
export async function recordBinderAccess(binderId: string): Promise<void> {
  const record = await getBinderAccessRecord();
  record[binderId] = Date.now();
  await saveBinderAccessRecord(record);
  console.log('[CacheManager] Recorded binder access:', binderId);
}

/**
 * Get the last time a binder was accessed
 * Returns null if never accessed
 */
export async function getBinderLastAccessed(binderId: string): Promise<number | null> {
  const record = await getBinderAccessRecord();
  return record[binderId] || null;
}

/**
 * Check if a binder is considered inactive (not opened in 30+ days)
 */
export async function isBinderInactive(binderId: string): Promise<boolean> {
  const lastAccessed = await getBinderLastAccessed(binderId);
  if (!lastAccessed) return true; // Never accessed = inactive
  
  const daysSinceAccess = (Date.now() - lastAccessed) / (24 * 60 * 60 * 1000);
  return daysSinceAccess > 30;
}

/**
 * Get list of inactive binder IDs (not accessed in 30+ days)
 */
export async function getInactiveBinderIds(): Promise<string[]> {
  const record = await getBinderAccessRecord();
  const now = Date.now();
  const inactiveIds: string[] = [];

  for (const [binderId, lastAccessed] of Object.entries(record)) {
    if (now - lastAccessed > INACTIVE_THRESHOLD) {
      inactiveIds.push(binderId);
    }
  }

  return inactiveIds;
}

/**
 * Get the last time cache cleanup was performed
 */
async function getLastCleanupTime(): Promise<number | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_CLEANUP_KEY);
    return data ? parseInt(data, 10) : null;
  } catch (error) {
    console.error('[CacheManager] Error reading cleanup time:', error);
    return null;
  }
}

/**
 * Record that cache cleanup was performed
 */
async function recordCleanup(): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_CLEANUP_KEY, Date.now().toString());
  } catch (error) {
    console.error('[CacheManager] Error recording cleanup time:', error);
    if (isStorageFullError(error)) {
      await emergencyStorageCleanup();
    }
  }
}

/**
 * Clear cache for a specific binder
 * This removes the card data cache for the binder's set
 */
async function clearBinderCache(binderId: string, setId?: string): Promise<void> {
  console.log('[CacheManager] Clearing cache for binder:', binderId);
  
  // Clear prefetch status
  clearPrefetchStatus(binderId);
  
  // Clear card data cache for the set (if we know the set ID)
  if (setId) {
    const cacheKey = `@pokemon_cache_cards-${setId}`;
    try {
      await AsyncStorage.removeItem(cacheKey);
      console.log('[CacheManager] Cleared card cache for set:', setId);
    } catch (error) {
      console.error('[CacheManager] Error clearing card cache:', error);
    }
  }
}

/**
 * Remove a binder from the access record (when binder is deleted)
 */
export async function removeBinderFromAccessRecord(binderId: string): Promise<void> {
  const record = await getBinderAccessRecord();
  delete record[binderId];
  await saveBinderAccessRecord(record);
  console.log('[CacheManager] Removed binder from access record:', binderId);
}

/**
 * Perform cache cleanup for inactive binders
 * 
 * This function:
 * 1. Checks if cleanup is needed (hasn't run in 24 hours)
 * 2. Finds binders not accessed in 30+ days
 * 3. Clears cache for those binders
 * 4. Updates the access record
 * 
 * Should be called on app startup.
 */
export async function performCacheCleanup(
  getBinderSets?: () => Promise<Array<{ binderId: string; setId?: string }>>
): Promise<{
  cleanedBinderIds: string[];
  skipped: boolean;
  reason?: string;
}> {
  // Check if we should run cleanup
  const lastCleanup = await getLastCleanupTime();
  if (lastCleanup && Date.now() - lastCleanup < CLEANUP_INTERVAL) {
    console.log('[CacheManager] Skipping cleanup - too soon since last cleanup');
    return {
      cleanedBinderIds: [],
      skipped: true,
      reason: 'Cleanup ran recently',
    };
  }

  console.log('[CacheManager] Starting cache cleanup...');

  // Get inactive binder IDs
  const inactiveIds = await getInactiveBinderIds();
  
  if (inactiveIds.length === 0) {
    console.log('[CacheManager] No inactive binders found');
    await recordCleanup();
    return {
      cleanedBinderIds: [],
      skipped: false,
    };
  }

  console.log('[CacheManager] Found', inactiveIds.length, 'inactive binders');

  // Get set IDs for binders if the function is provided
  let binderSets: Array<{ binderId: string; setId?: string }> = [];
  if (getBinderSets) {
    try {
      binderSets = await getBinderSets();
    } catch (error) {
      console.error('[CacheManager] Error getting binder sets:', error);
    }
  }

  // Clear cache for each inactive binder
  const cleanedIds: string[] = [];
  for (const binderId of inactiveIds) {
    const binderSet = binderSets.find(b => b.binderId === binderId);
    await clearBinderCache(binderId, binderSet?.setId);
    cleanedIds.push(binderId);
  }

  // Remove inactive binders from access record
  const record = await getBinderAccessRecord();
  for (const binderId of cleanedIds) {
    delete record[binderId];
  }
  await saveBinderAccessRecord(record);

  // Record cleanup time
  await recordCleanup();

  console.log('[CacheManager] Cleanup complete. Cleaned', cleanedIds.length, 'binders');
  
  return {
    cleanedBinderIds: cleanedIds,
    skipped: false,
  };
}

/**
 * Get cache statistics
 */
export async function getCacheStatistics(): Promise<{
  binderAccessCount: number;
  inactiveBinderCount: number;
  lastCleanupTime: number | null;
  apiCacheStats: ReturnType<typeof getCacheStats>;
}> {
  const record = await getBinderAccessRecord();
  const inactiveIds = await getInactiveBinderIds();
  const lastCleanup = await getLastCleanupTime();
  const apiStats = getCacheStats();

  return {
    binderAccessCount: Object.keys(record).length,
    inactiveBinderCount: inactiveIds.length,
    lastCleanupTime: lastCleanup,
    apiCacheStats: apiStats,
  };
}

/**
 * Clear all cache (for debugging/reset)
 */
export async function clearAllCache(): Promise<void> {
  console.log('[CacheManager] Clearing all cache...');
  
  // Clear API cache
  await clearApiCache();
  
  // Clear expo-image cache
  await Image.clearDiskCache();
  await Image.clearMemoryCache();
  
  // Clear access records
  await AsyncStorage.removeItem(BINDER_ACCESS_KEY);
  await AsyncStorage.removeItem(CACHE_CLEANUP_KEY);
  
  console.log('[CacheManager] All cache cleared');
}

