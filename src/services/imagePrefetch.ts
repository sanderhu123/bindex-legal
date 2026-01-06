import { Image } from 'expo-image';

/**
 * Background Image Prefetch Service
 * 
 * Prefetches card images in the background so they're cached when the user
 * views them. Downloads continue even if the user navigates away from the screen.
 * 
 * Features:
 * - Batch prefetching with configurable batch size
 * - Continues in background when component unmounts
 * - Tracks progress and completion
 * - Handles errors gracefully
 */

/** Active prefetch tasks by binder ID */
const activePrefetches = new Map<string, {
  abortController: AbortController | null;
  urls: string[];
  loaded: number;
  failed: number;
  isComplete: boolean;
}>();

/** Callback type for progress updates */
type ProgressCallback = (loaded: number, total: number, failed: number) => void;

/** Callbacks registered for progress updates */
const progressCallbacks = new Map<string, ProgressCallback>();

/**
 * Get prefetch status for a binder
 */
export function getPrefetchStatus(binderId: string) {
  return activePrefetches.get(binderId) || null;
}

/**
 * Check if prefetch is active for a binder
 */
export function isPrefetching(binderId: string): boolean {
  const status = activePrefetches.get(binderId);
  return status !== undefined && !status.isComplete;
}

/**
 * Register a callback for prefetch progress updates
 */
export function onPrefetchProgress(binderId: string, callback: ProgressCallback): () => void {
  progressCallbacks.set(binderId, callback);
  
  // Return unsubscribe function
  return () => {
    progressCallbacks.delete(binderId);
  };
}

/**
 * Notify progress callbacks
 */
function notifyProgress(binderId: string, loaded: number, total: number, failed: number) {
  const callback = progressCallbacks.get(binderId);
  if (callback) {
    callback(loaded, total, failed);
  }
}

/**
 * Prefetch a batch of images
 * Returns number of successfully prefetched images
 */
async function prefetchBatch(urls: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  await Promise.all(
    urls.map(async (url) => {
      try {
        // expo-image prefetch caches the image to disk
        const result = await Image.prefetch(url);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        // Silent fail - just track the failure
        failed++;
        console.log('[ImagePrefetch] Failed to prefetch:', url.substring(0, 50) + '...');
      }
    })
  );

  return { success, failed };
}

/**
 * Start prefetching images for a binder in the background.
 * Downloads continue even if the user navigates away.
 * 
 * @param binderId - Unique identifier for the binder (used to track/cancel)
 * @param imageUrls - Array of image URLs to prefetch
 * @param batchSize - Number of images to download simultaneously (default: 5)
 * @returns Promise that resolves when all images are prefetched
 */
export async function startBackgroundPrefetch(
  binderId: string,
  imageUrls: string[],
  batchSize: number = 5
): Promise<{ loaded: number; failed: number; total: number }> {
  // Filter out empty URLs and duplicates
  const validUrls = [...new Set(imageUrls.filter(url => url && url.trim() !== ''))];
  
  if (validUrls.length === 0) {
    console.log('[ImagePrefetch] No valid URLs to prefetch for binder:', binderId);
    return { loaded: 0, failed: 0, total: 0 };
  }

  // Check if already prefetching this binder
  const existingPrefetch = activePrefetches.get(binderId);
  if (existingPrefetch && !existingPrefetch.isComplete) {
    console.log('[ImagePrefetch] Prefetch already in progress for binder:', binderId);
    return {
      loaded: existingPrefetch.loaded,
      failed: existingPrefetch.failed,
      total: existingPrefetch.urls.length,
    };
  }

  console.log('[ImagePrefetch] Starting background prefetch:', {
    binderId,
    totalUrls: validUrls.length,
    batchSize,
  });

  // Initialize tracking
  const status = {
    abortController: new AbortController(),
    urls: validUrls,
    loaded: 0,
    failed: 0,
    isComplete: false,
  };
  activePrefetches.set(binderId, status);

  // Process in batches
  for (let i = 0; i < validUrls.length; i += batchSize) {
    // Check if cancelled
    if (status.abortController?.signal.aborted) {
      console.log('[ImagePrefetch] Prefetch cancelled for binder:', binderId);
      break;
    }

    const batch = validUrls.slice(i, i + batchSize);
    const result = await prefetchBatch(batch);
    
    status.loaded += result.success;
    status.failed += result.failed;

    // Notify progress
    notifyProgress(binderId, status.loaded, validUrls.length, status.failed);

    // Log progress every 20 images
    if ((i + batchSize) % 20 === 0 || i + batchSize >= validUrls.length) {
      console.log('[ImagePrefetch] Progress:', {
        binderId,
        loaded: status.loaded,
        failed: status.failed,
        total: validUrls.length,
        percentage: Math.round((status.loaded / validUrls.length) * 100) + '%',
      });
    }
  }

  // Mark as complete
  status.isComplete = true;

  console.log('[ImagePrefetch] Prefetch complete:', {
    binderId,
    loaded: status.loaded,
    failed: status.failed,
    total: validUrls.length,
  });

  return {
    loaded: status.loaded,
    failed: status.failed,
    total: validUrls.length,
  };
}

/**
 * Cancel an active prefetch operation
 */
export function cancelPrefetch(binderId: string): boolean {
  const status = activePrefetches.get(binderId);
  if (status && !status.isComplete) {
    status.abortController?.abort();
    status.isComplete = true;
    console.log('[ImagePrefetch] Prefetch cancelled for binder:', binderId);
    return true;
  }
  return false;
}

/**
 * Clear prefetch status for a binder (free memory)
 */
export function clearPrefetchStatus(binderId: string): void {
  activePrefetches.delete(binderId);
  progressCallbacks.delete(binderId);
}

/**
 * Clear all prefetch status (useful for cleanup)
 */
export function clearAllPrefetchStatus(): void {
  // Cancel any active prefetches
  activePrefetches.forEach((status, binderId) => {
    if (!status.isComplete) {
      status.abortController?.abort();
    }
  });
  activePrefetches.clear();
  progressCallbacks.clear();
}

/**
 * Get all active prefetch statuses
 */
export function getAllPrefetchStatuses() {
  const statuses: Record<string, {
    loaded: number;
    failed: number;
    total: number;
    isComplete: boolean;
    percentage: number;
  }> = {};

  activePrefetches.forEach((status, binderId) => {
    statuses[binderId] = {
      loaded: status.loaded,
      failed: status.failed,
      total: status.urls.length,
      isComplete: status.isComplete,
      percentage: status.urls.length > 0 
        ? Math.round((status.loaded / status.urls.length) * 100)
        : 0,
    };
  });

  return statuses;
}

