import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@binder_toggle_queue';
const PENDING_SYNCS_KEY = '@binder_pending_count_syncs';

// --- Toggle Queue ---
// Stores failed card toggle operations so they can be retried later.

export interface ToggleQueueEntry {
  id: string;
  type: 'add_card' | 'remove_card' | 'set_position_owned' | 'set_extra_owned';
  binderId: string;
  cardId: string;
  variant?: string | null;
  position?: number;
  isOwned: boolean;
  timestamp: number;
}

async function getQueue(): Promise<ToggleQueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: ToggleQueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Deduplicate: for each unique (binderId + cardId + variant + position),
 * only keep the most recent entry.
 */
function deduplicateQueue(queue: ToggleQueueEntry[]): ToggleQueueEntry[] {
  const latest = new Map<string, ToggleQueueEntry>();
  for (const entry of queue) {
    const key = `${entry.type}_${entry.binderId}_${entry.cardId}_${entry.variant ?? 'null'}_${entry.position ?? 'null'}`;
    const existing = latest.get(key);
    if (!existing || entry.timestamp > existing.timestamp) {
      latest.set(key, entry);
    }
  }
  return [...latest.values()];
}

export async function enqueueToggle(
  entry: Omit<ToggleQueueEntry, 'id' | 'timestamp'>
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...entry,
    id: `${entry.binderId}_${entry.cardId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
  await saveQueue(queue);
}

/**
 * Process all queued toggle operations.
 * Uses idempotent operations so replaying is safe.
 */
export async function processToggleQueue(): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  const deduplicated = deduplicateQueue(queue);
  let processed = 0;
  let failed = 0;
  const affectedBinders = new Set<string>();

  const {
    addCardToBinderFast,
    removeCardFromBinderFast,
    setCardOwnedAtPosition,
    setExtraCardOwned,
  } = await import('./supabase/cards');

  for (const entry of deduplicated) {
    try {
      switch (entry.type) {
        case 'add_card':
          await addCardToBinderFast(entry.binderId, entry.cardId, entry.variant || undefined);
          break;
        case 'remove_card':
          await removeCardFromBinderFast(entry.binderId, entry.cardId, entry.variant || undefined);
          break;
        case 'set_position_owned':
          if (entry.position !== undefined) {
            await setCardOwnedAtPosition(entry.binderId, entry.position, entry.isOwned);
          }
          break;
        case 'set_extra_owned':
          await setExtraCardOwned(
            entry.binderId,
            entry.cardId,
            entry.variant ?? null,
            entry.isOwned,
          );
          break;
      }
      affectedBinders.add(entry.binderId);
      processed++;
    } catch (err) {
      console.error('[OfflineQueue] Failed to process entry:', entry.id, err);
      failed++;
    }
  }

  if (processed > 0) {
    await saveQueue([]);

    const { syncBinderCardCount } = await import('./supabase/cards');
    for (const binderId of affectedBinders) {
      try {
        await syncBinderCardCount(binderId);
        await clearPendingCountSync(binderId);
      } catch {
        // Count sync will be retried via pending syncs
      }
    }
  }

  if (processed > 0) {
    console.log(`[OfflineQueue] Processed ${processed} queued operations (${failed} failed)`);
  }
  return { processed, failed };
}

// --- Pending Count Syncs ---
// Tracks binder IDs whose owned_cards count needs recalculating.
// Persists across app restarts so the count is always eventually corrected.

export async function markPendingCountSync(binderId: string): Promise<void> {
  try {
    const syncs = await getPendingSyncIds();
    if (!syncs.includes(binderId)) {
      syncs.push(binderId);
      await AsyncStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(syncs));
    }
  } catch {
    // Non-critical: sync will happen next time
  }
}

export async function clearPendingCountSync(binderId: string): Promise<void> {
  try {
    const syncs = await getPendingSyncIds();
    const filtered = syncs.filter((id: string) => id !== binderId);
    await AsyncStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(filtered));
  } catch {
    // Non-critical
  }
}

async function getPendingSyncIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SYNCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Run syncBinderCardCount for every binder that was marked as pending.
 * Call this before loading the binder list so counts are accurate.
 */
export async function processPendingCountSyncs(): Promise<void> {
  const syncs = await getPendingSyncIds();
  if (syncs.length === 0) return;

  const { syncBinderCardCount } = await import('./supabase/cards');

  for (const binderId of syncs) {
    try {
      await syncBinderCardCount(binderId);
      await clearPendingCountSync(binderId);
    } catch (err) {
      console.error('[PendingSync] Failed to sync count for binder:', binderId, err);
    }
  }
}
