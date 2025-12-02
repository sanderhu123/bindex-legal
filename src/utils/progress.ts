import type { Binder } from '../types';
import { getCardsBySet, getCardsByRegion, type Region } from '../services/api/pokemonApi';

/**
 * Calculate completion percentage for a binder
 * Returns a percentage (0-100)
 */
export async function calculateBinderProgress(binder: Binder): Promise<number> {
  try {
    let totalExpectedCards = 0;
    let ownedCards = binder.cardIds.length;

    if (binder.collectionMode === 'master-set' && binder.set) {
      // Get all cards in the set
      const setCards = await getCardsBySet(binder.set);
      
      // For now, we only track unique cards (not variants separately)
      // TODO: When variant tracking is implemented, multiply by variantsToTrack.length
      totalExpectedCards = setCards.length;
    } else if (binder.collectionMode === 'region' && binder.region) {
      // Get all cards in the region
      const regionCards = await getCardsByRegion(binder.region as Region);
      totalExpectedCards = regionCards.length;
    } else if (binder.collectionMode === 'custom') {
      // For custom binders, we can't calculate progress without knowing the target
      // Return 0 for now, or we could let users set a target manually later
      return 0;
    } else {
      // Unknown mode or missing data
      return 0;
    }

    // Calculate percentage
    if (totalExpectedCards === 0) {
      return 0;
    }

    const percentage = (ownedCards / totalExpectedCards) * 100;
    return Math.min(100, Math.max(0, percentage)); // Clamp between 0-100
  } catch (error) {
    console.error('Error calculating binder progress:', error);
    // Return 0 on error to avoid breaking the UI
    return 0;
  }
}

