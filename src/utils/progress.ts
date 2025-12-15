import type { Binder } from '../types';
import { getCardsBySet, getCardsByRegion, type Region } from '../services/api/pokemonApi';

/**
 * Get total number of cards expected for a binder
 * Returns the total count of cards based on collection mode
 * 
 * @deprecated This function is no longer used. Use binder.totalCards instead (cached in database)
 */
export async function getBinderTotalCards(binder: Binder): Promise<number> {
  try {
    if (binder.collectionMode === 'master-set' && binder.set) {
      const setCards = await getCardsBySet(binder.set);
      return setCards.length;
    } else if (binder.collectionMode === 'region' && binder.region) {
      const regionCards = await getCardsByRegion(binder.region as Region);
      return regionCards.length;
    } else if (binder.collectionMode === 'custom') {
      // For custom binders, we can't know the total without a target
      return 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting binder total cards:', error);
    return 0;
  }
}

/**
 * Calculate completion percentage for a binder
 * Returns a percentage (0-100)
 * 
 * @deprecated This function is no longer used. Calculate progress from cached values:
 * `Math.round((binder.ownedCards / binder.totalCards) * 100)`
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
    return Math.min(100, Math.max(0, Math.round(percentage))); // Clamp between 0-100 and round to whole number
  } catch (error) {
    console.error('Error calculating binder progress:', error);
    // Return 0 on error to avoid breaking the UI
    return 0;
  }
}

