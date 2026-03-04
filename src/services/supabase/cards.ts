import { supabase } from './client';

// Cache the user ID to avoid repeated auth calls during rapid card toggling
let cachedUserId: string | null = null;

async function getCachedUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }
  cachedUserId = session.user.id;
  return cachedUserId;
}

// Clear cached user ID on auth state changes
supabase.auth.onAuthStateChange(() => {
  cachedUserId = null;
});

/**
 * Fast version of addCardToBinder - only 1 DB call instead of 5-7.
 * Skips user re-fetch, binder verification, and count sync.
 * Use when the binder is already loaded and verified (e.g., from BinderDetailScreen).
 */
export async function addCardToBinderFast(
  binderId: string,
  cardId: string,
  variant?: string,
): Promise<void> {
  const userId = await getCachedUserId();

  const { error } = await supabase
    .from('binder_cards')
    .upsert({
      user_id: userId,
      binder_id: binderId,
      card_id: cardId,
      variant: variant || null,
      position: null,
      is_owned: true,
    }, {
      onConflict: 'binder_id,card_id,variant',
    });

  if (error) {
    throw error;
  }
}

/**
 * Fast version of removeCardFromBinder - only 1 DB call instead of 5-7.
 * Skips user re-fetch, binder verification, and count sync.
 * Use when the binder is already loaded and verified (e.g., from BinderDetailScreen).
 */
export async function removeCardFromBinderFast(
  binderId: string,
  cardId: string,
  variant?: string,
): Promise<void> {
  const userId = await getCachedUserId();

  let query = supabase
    .from('binder_cards')
    .delete()
    .eq('user_id', userId)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);

  if (variant) {
    query = query.eq('variant', variant);
  } else {
    query = query.is('variant', null);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

/**
 * Sync the owned_cards count on the binder.
 * Call this after a batch of toggles (not after every single toggle).
 */
export { syncBinderCardCount };

/**
 * Helper to count actual cards in a binder and update owned_cards/total_cards
 * This avoids race conditions when adding/removing cards quickly
 * 
 * For Custom binders (with positions):
 * - total_cards = number of filled slots
 * - owned_cards = number of cards with is_owned = true
 * 
 * For Master Set/Region binders:
 * - total_cards = not updated here (managed by add/remove extra card functions)
 * - owned_cards = number of cards with is_owned = true (includes extras)
 */
async function syncBinderCardCount(binderId: string): Promise<void> {
  // First, check if this is a Custom binder (has cards with positions)
  const { data: binderData, error: binderError } = await supabase
    .from('binders')
    .select('collection_mode')
    .eq('id', binderId)
    .single();

  if (binderError) {
    console.error('Failed to get binder mode:', binderError);
    return;
  }

  const isCustomBinder = binderData?.collection_mode === 'custom';

  if (isCustomBinder) {
    // Custom binder: count filled slots (total) and owned cards separately
    const { count: filledCount, error: filledError } = await supabase
      .from('binder_cards')
      .select('*', { count: 'exact', head: true })
      .eq('binder_id', binderId)
      .not('position', 'is', null);

    if (filledError) {
      console.error('Failed to count filled slots:', filledError);
      return;
    }

    const { count: ownedCount, error: ownedError } = await supabase
      .from('binder_cards')
      .select('*', { count: 'exact', head: true })
      .eq('binder_id', binderId)
      .not('position', 'is', null)
      .eq('is_owned', true);

    if (ownedError) {
      console.error('Failed to count owned cards:', ownedError);
      return;
    }

    // Update binder with both counts
    const { error: updateError } = await supabase
      .from('binders')
      .update({ 
        total_cards: filledCount || 0,
        owned_cards: ownedCount || 0 
      })
      .eq('id', binderId);

    if (updateError) {
      console.error('Failed to update card counts:', updateError);
    }
  } else {
    // Master Set / Region binder: count all cards marked as owned (regular + extra)
    const { count, error: countError } = await supabase
      .from('binder_cards')
      .select('*', { count: 'exact', head: true })
      .eq('binder_id', binderId)
      .eq('is_owned', true);

    if (countError) {
      console.error('Failed to count binder cards:', countError);
      return;
    }

    // Update binder with owned count (total_cards is fixed for these modes)
    const { error: updateError } = await supabase
      .from('binders')
      .update({ owned_cards: count || 0 })
      .eq('id', binderId);

    if (updateError) {
      console.error('Failed to update owned_cards count:', updateError);
    }
  }
}

/**
 * Add a card to a binder
 * @param binderId - The binder ID
 * @param cardId - The card ID
 * @param variant - Optional variant (e.g., 'reverse-holo')
 * @param position - Optional position for Custom binders (0-based slot index)
 */
export async function addCardToBinder(
  binderId: string,
  cardId: string,
  variant?: string,
  position?: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Insert card (or update if exists)
  // For Custom binders (with position), cards start as "missing" (is_owned: false)
  // For Master Set/Region binders, cards are "owned" when added (is_owned: true)
  const isCustomBinder = position !== undefined && position !== null;
  
  const { error } = await supabase
    .from('binder_cards')
    .upsert({
      user_id: user.id,
      binder_id: binderId,
      card_id: cardId,
      variant: variant || null,
      position: position ?? null,
      is_owned: !isCustomBinder, // false for Custom, true for others
    }, {
      onConflict: 'binder_id,card_id,variant',
    });

  if (error) {
    throw error;
  }

  // Sync the owned_cards count by counting actual cards (race-condition safe)
  await syncBinderCardCount(binderId);
}

/**
 * Remove a card from a binder
 */
export async function removeCardFromBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Delete the card
  // Note: We must use .is('variant', null) for null values, not .eq('variant', null)
  // because SQL requires IS NULL for null comparisons, not = NULL
  let query = supabase
    .from('binder_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);
  
  // Handle variant matching correctly for null values
  if (variant) {
    query = query.eq('variant', variant);
  } else {
    query = query.is('variant', null);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }

  // Sync the owned_cards count by counting actual cards (race-condition safe)
  await syncBinderCardCount(binderId);
}

/**
 * Get all card IDs in a binder
 */
export async function getBinderCardIds(binderId: string): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  const { data, error } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .eq('binder_id', binderId);

  if (error) {
    throw error;
  }

  return data?.map((row) => row.card_id) || [];
}

/**
 * Check if a card is in a binder
 */
export async function isCardInBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  // Verify binder belongs to user
  const { data: binder } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (!binder) {
    return false;
  }

  let query = supabase
    .from('binder_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .limit(1);

  if (variant) {
    query = query.eq('variant', variant);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return false;
  }

  return true;
}

/**
 * Get all binder cards with variants
 */
export async function getBinderCardsWithVariants(binderId: string): Promise<Array<{
  cardId: string;
  variant: string | null;
}>> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  const { data, error } = await supabase
    .from('binder_cards')
    .select('card_id, variant')
    .eq('user_id', user.id)
    .eq('binder_id', binderId);

  if (error) {
    throw error;
  }

  return data?.map((row) => ({
    cardId: row.card_id,
    variant: row.variant,
  })) || [];
}

/**
 * Get all binder cards with positions (for Custom binders)
 * Returns a map of position -> cardId with ownership status
 */
export async function getBinderCardsWithPositions(binderId: string): Promise<Map<number, {
  cardId: string;
  variant: string | null;
  isOwned: boolean;
}>> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  const { data, error } = await supabase
    .from('binder_cards')
    .select('card_id, variant, position, is_owned')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .not('position', 'is', null);

  if (error) {
    throw error;
  }

  const positionMap = new Map<number, { cardId: string; variant: string | null; isOwned: boolean }>();
  
  data?.forEach((row) => {
    if (row.position !== null) {
      positionMap.set(row.position, {
        cardId: row.card_id,
        variant: row.variant,
        isOwned: row.is_owned ?? true, // Default to true if column doesn't exist yet
      });
    }
  });

  return positionMap;
}

/**
 * @deprecated Use removeCardAtPosition instead (cleans up both tables)
 */
export async function removeCardByPosition(
  binderId: string,
  position: number
): Promise<void> {
  return removeCardAtPosition(binderId, position);
}

/**
 * Add a card at a specific position in a binder.
 * Writes to BOTH binder_cards (ownership) AND binder_card_positions (layout)
 * so binder view and edit mode stay in sync.
 */
export async function addCardAtPosition(
  binderId: string,
  cardId: string,
  position: number,
  variant?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. Write to binder_cards (ownership table)
  const { error: cardError } = await supabase
    .from('binder_cards')
    .upsert({
      user_id: user.id,
      binder_id: binderId,
      card_id: cardId,
      variant: variant || null,
      position: position,
      is_owned: false,
    }, {
      onConflict: 'binder_id,card_id,variant',
    });

  if (cardError) throw cardError;

  // 2. Write to binder_card_positions (layout table) so edit mode sees it
  const { error: posError } = await supabase
    .from('binder_card_positions')
    .upsert({
      user_id: user.id,
      binder_id: binderId,
      slot_index: position,
      card_id: cardId,
    }, {
      onConflict: 'binder_id,slot_index',
    });

  if (posError) {
    console.error('[addCardAtPosition] Failed to write position:', posError);
    // Still throw — both tables must stay in sync
    throw posError;
  }

  await syncBinderCardCount(binderId);
}

/**
 * Remove a card from a binder by position.
 * Cleans up BOTH binder_cards AND binder_card_positions.
 */
export async function removeCardAtPosition(
  binderId: string,
  position: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. Remove from binder_cards
  const { error: cardError } = await supabase
    .from('binder_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('position', position);

  if (cardError) throw cardError;

  // 2. Remove from binder_card_positions
  const { error: posError } = await supabase
    .from('binder_card_positions')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('slot_index', position);

  if (posError) {
    console.error('[removeCardAtPosition] Failed to remove position:', posError);
  }

  await syncBinderCardCount(binderId);
}

/**
 * Toggle the owned/missing status of a card at a position (for Custom binders)
 * Uses fast increment/decrement instead of full recount for instant progress updates
 * @returns The new isOwned status
 */
export async function toggleCardOwnershipAtPosition(
  binderId: string,
  position: number
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user and get current owned_cards count
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id, owned_cards')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Get current ownership status
  const { data: currentCard, error: fetchError } = await supabase
    .from('binder_cards')
    .select('is_owned')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('position', position)
    .single();

  if (fetchError || !currentCard) {
    throw new Error('Card not found at this position');
  }

  // Toggle the status
  const wasOwned = currentCard.is_owned ?? true;
  const newIsOwned = !wasOwned;

  // Update the card's ownership status
  const { error: updateError } = await supabase
    .from('binder_cards')
    .update({ is_owned: newIsOwned })
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('position', position);

  if (updateError) {
    throw updateError;
  }

  // Fast update: increment or decrement owned_cards by 1 (instead of full recount)
  // This is much faster than calling syncBinderCardCount which makes 4 DB calls
  const currentOwnedCards = binder.owned_cards || 0;
  const newOwnedCards = newIsOwned 
    ? currentOwnedCards + 1 
    : Math.max(0, currentOwnedCards - 1);

  const { error: binderUpdateError } = await supabase
    .from('binders')
    .update({ owned_cards: newOwnedCards })
    .eq('id', binderId);

  if (binderUpdateError) {
    console.error('Failed to update owned_cards count:', binderUpdateError);
    // Don't throw - the card ownership was already updated successfully
  }

  return newIsOwned;
}

// ============================================================================
// EXTRA CARDS FUNCTIONS (Step 30B)
// Extra cards are cards added to a Master Set binder that aren't officially 
// part of that set (e.g., promo cards, cards from other sets)
// ============================================================================

/**
 * Add an extra card to a binder (card not officially in the set)
 * Extra cards are marked with is_extra = true in the database
 * 
 * @param binderId - The binder ID
 * @param cardId - The card ID to add
 * @param variant - Optional variant (e.g., 'reverse-holo')
 */
export async function addExtraCardToBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<void> {
  console.log('[30B] addExtraCardToBinder() called:', { binderId, cardId, variant });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id, collection_mode')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Extra cards are typically for Master Set binders
  // But we'll allow them for any non-custom binder
  if (binder.collection_mode === 'custom') {
    console.warn('[30B] Extra cards should not be used with Custom binders - use addCardAtPosition instead');
  }

  // Check if this exact card+variant already exists in the binder
  // Note: Must use .is('variant', null) for null values
  let checkQuery = supabase
    .from('binder_cards')
    .select('id, is_extra')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);
  
  if (variant) {
    checkQuery = checkQuery.eq('variant', variant);
  } else {
    checkQuery = checkQuery.is('variant', null);
  }
  
  const { data: existingCard, error: checkError } = await checkQuery.single();

  if (existingCard && !checkError) {
    // Card already exists
    if (existingCard.is_extra) {
      console.log('[30B] Card is already an extra card in this binder');
      return; // Already an extra card, nothing to do
    } else {
      // Card exists as a regular card - can't add as extra
      throw new Error('This card is already part of the official set');
    }
  }

  // Insert the extra card
  const { error } = await supabase
    .from('binder_cards')
    .insert({
      user_id: user.id,
      binder_id: binderId,
      card_id: cardId,
      variant: variant || null,
      is_owned: false, // New cards start as missing (user can mark as owned later)
      is_extra: true, // Mark as extra card
      position: null, // No position for extra cards (not positional like Custom binders)
    });

  if (error) {
    console.error('[30B] Failed to add extra card:', error);
    throw error;
  }

  // Increment total_cards so the progress bar includes the new extra card
  const { data: currentBinder } = await supabase
    .from('binders')
    .select('total_cards')
    .eq('id', binderId)
    .single();

  if (currentBinder) {
    await supabase
      .from('binders')
      .update({ total_cards: (currentBinder.total_cards || 0) + 1 })
      .eq('id', binderId);
  }

  console.log('[30B] Extra card added successfully');
}

/**
 * Get all extra card IDs in a binder
 * Returns only the card IDs that are marked as extra (is_extra = true)
 * 
 * @param binderId - The binder ID
 * @returns Array of card IDs that are extra cards
 */
export async function getExtraCardsInBinder(binderId: string): Promise<string[]> {
  console.log('[30B] getExtraCardsInBinder() called:', { binderId });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Get all cards marked as extra
  const { data, error } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('is_extra', true);

  if (error) {
    console.error('[30B] Failed to get extra cards:', error);
    throw error;
  }

  const extraCardIds = data?.map((row) => row.card_id) || [];
  console.log('[30B] Found extra cards:', { count: extraCardIds.length });
  
  return extraCardIds;
}

/**
 * Get all extra cards with their variants in a binder
 * Returns full details including card ID, variant, and ownership status
 * 
 * @param binderId - The binder ID
 * @returns Array of extra card details
 */
export async function getExtraCardsWithVariants(binderId: string): Promise<Array<{
  cardId: string;
  variant: string | null;
  isOwned: boolean;
}>> {
  console.log('[30B] getExtraCardsWithVariants() called:', { binderId });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Get all extra cards with their details
  const { data, error } = await supabase
    .from('binder_cards')
    .select('card_id, variant, is_owned')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('is_extra', true);

  if (error) {
    console.error('[30B] Failed to get extra cards with variants:', error);
    throw error;
  }

  const extraCards = data?.map((row) => ({
    cardId: row.card_id,
    variant: row.variant,
    isOwned: row.is_owned ?? true,
  })) || [];
  
  console.log('[30B] Found extra cards with variants:', { count: extraCards.length });
  
  return extraCards;
}

/**
 * Check if a card is an extra card in a binder
 * 
 * @param binderId - The binder ID
 * @param cardId - The card ID to check
 * @param variant - Optional variant to check
 * @returns true if the card is marked as extra, false otherwise
 */
export async function isExtraCard(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<boolean> {
  console.log('[30B] isExtraCard() called:', { binderId, cardId, variant });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  // Query for the specific card with is_extra check
  // Note: Must use .is('variant', null) for null values
  let query = supabase
    .from('binder_cards')
    .select('is_extra')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('is_extra', true)
    .limit(1);

  if (variant !== undefined) {
    if (variant) {
      query = query.eq('variant', variant);
    } else {
      query = query.is('variant', null);
    }
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    console.log('[30B] Card is not an extra card');
    return false;
  }

  console.log('[30B] Card is an extra card');
  return true;
}

/**
 * Remove an extra card from a binder
 * Only removes cards that are marked as extra (is_extra = true)
 * 
 * @param binderId - The binder ID
 * @param cardId - The card ID to remove
 * @param variant - Optional variant to remove
 */
export async function removeExtraCardFromBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<void> {
  console.log('[30B] removeExtraCardFromBinder() called:', { binderId, cardId, variant });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user and get current counts
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id, total_cards, owned_cards')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  // Check if the card being removed was owned (needed to update owned_cards)
  let checkQuery = supabase
    .from('binder_cards')
    .select('is_owned')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('is_extra', true);

  if (variant) {
    checkQuery = checkQuery.eq('variant', variant);
  } else {
    checkQuery = checkQuery.is('variant', null);
  }

  const { data: cardData } = await checkQuery.single();
  const wasOwned = cardData?.is_owned ?? false;

  // Delete only the extra card (is_extra = true)
  let deleteQuery = supabase
    .from('binder_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('is_extra', true);
  
  if (variant) {
    deleteQuery = deleteQuery.eq('variant', variant);
  } else {
    deleteQuery = deleteQuery.is('variant', null);
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error('[30B] Failed to remove extra card:', error);
    throw error;
  }

  // Decrement total_cards (and owned_cards if the card was owned)
  const updates: { total_cards: number; owned_cards?: number } = {
    total_cards: Math.max(0, (binder.total_cards || 0) - 1),
  };
  if (wasOwned) {
    updates.owned_cards = Math.max(0, (binder.owned_cards || 0) - 1);
  }
  await supabase.from('binders').update(updates).eq('id', binderId);

  console.log('[30B] Extra card removed successfully');
}

/**
 * Toggle the ownership status of an extra card
 * 
 * @param binderId - The binder ID
 * @param cardId - The card ID
 * @param variant - Optional variant
 * @returns The new ownership status
 */
export async function toggleExtraCardOwnership(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<boolean> {
  console.log('[30B] toggleExtraCardOwnership() called:', { binderId, cardId, variant });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current ownership status
  // Note: Must use .is('variant', null) for null values
  let fetchQuery = supabase
    .from('binder_cards')
    .select('is_owned')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('is_extra', true);
  
  if (variant) {
    fetchQuery = fetchQuery.eq('variant', variant);
  } else {
    fetchQuery = fetchQuery.is('variant', null);
  }

  const { data: currentCard, error: fetchError } = await fetchQuery.single();

  if (fetchError || !currentCard) {
    throw new Error('Extra card not found in binder');
  }

  // Toggle the status
  const wasOwned = currentCard.is_owned ?? true;
  const newIsOwned = !wasOwned;

  // Update the card's ownership status
  // Note: Must use .is('variant', null) for null values
  let updateQuery = supabase
    .from('binder_cards')
    .update({ is_owned: newIsOwned })
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('is_extra', true);
  
  if (variant) {
    updateQuery = updateQuery.eq('variant', variant);
  } else {
    updateQuery = updateQuery.is('variant', null);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error('[30B] Failed to toggle extra card ownership:', updateError);
    throw updateError;
  }

  // Update owned_cards on the binder to keep progress bar in sync
  const { data: binderData } = await supabase
    .from('binders')
    .select('owned_cards')
    .eq('id', binderId)
    .single();

  if (binderData) {
    const currentOwned = binderData.owned_cards || 0;
    const newOwned = newIsOwned
      ? currentOwned + 1
      : Math.max(0, currentOwned - 1);

    await supabase
      .from('binders')
      .update({ owned_cards: newOwned })
      .eq('id', binderId);
  }

  console.log('[30B] Extra card ownership toggled:', { newIsOwned });
  return newIsOwned;
}

// ============================================================================
// CARD NOTES FUNCTIONS
// Allow users to save a personal note on any card in their binder
// ============================================================================

/**
 * Get the note for a specific card in a binder.
 * Returns the note text, or null if no note exists.
 *
 * @param binderId - The binder ID
 * @param cardId - The card ID
 * @param variant - Optional variant
 * @param position - Optional position (for Custom binders)
 */
export async function getCardNote(
  binderId: string,
  cardId: string,
  variant?: string,
  position?: number
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('binder_cards')
    .select('note')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);

  // If a position is provided (Custom binder), match by position
  if (position !== undefined && position !== null) {
    query = query.eq('position', position);
  } else {
    // Match by variant for non-Custom binders
    if (variant) {
      query = query.eq('variant', variant);
    } else {
      query = query.is('variant', null);
    }
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[CardNote] Failed to get note:', error);
    return null;
  }

  return data?.note ?? null;
}

/**
 * Load the saved variant and note for a card from binder_cards.
 * Queries without variant filter so it works even if the variant
 * was changed since the card data was last loaded.
 */
export async function getBinderCardData(
  binderId: string,
  cardId: string,
  expectedVariant?: string,
  position?: number,
  isExtra?: boolean
): Promise<{ variant: string | null; note: string | null } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let query = supabase
    .from('binder_cards')
    .select('variant, note')
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);

  if (position !== undefined && position !== null) {
    query = query.eq('position', position);
  }

  if (isExtra) {
    query = query.eq('is_extra', true);
  } else {
    query = query.or('is_extra.is.null,is_extra.eq.false');
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getBinderCardData] Query error:', error);
    return null;
  }
  if (!data || data.length === 0) return null;

  // Single row — return it directly (variant may have been updated)
  if (data.length === 1) return data[0];

  // Multiple rows (binder tracks several variants for the same card).
  // Find the one matching the expected variant; fall back to the first row.
  const expectedValue = (!expectedVariant || expectedVariant === 'base') ? null : expectedVariant;
  return data.find(d => d.variant === expectedValue) || data[0];
}

/**
 * Save a note for a specific card in a binder.
 * Pass an empty string or null to remove the note.
 *
 * @param binderId - The binder ID
 * @param cardId - The card ID
 * @param note - The note text (empty string / null to clear)
 * @param variant - Optional variant
 * @param position - Optional position (for Custom binders)
 */
export async function saveCardNote(
  binderId: string,
  cardId: string,
  note: string | null,
  variant?: string,
  position?: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Normalise: treat empty string as null (removes the note)
  const noteValue = note && note.trim().length > 0 ? note.trim() : null;

  let query = supabase
    .from('binder_cards')
    .update({ note: noteValue })
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);

  // If a position is provided (Custom binder), match by position
  if (position !== undefined && position !== null) {
    query = query.eq('position', position);
  } else {
    // Match by variant for non-Custom binders
    if (variant) {
      query = query.eq('variant', variant);
    } else {
      query = query.is('variant', null);
    }
  }

  const { error } = await query;

  if (error) {
    console.error('[CardNote] Failed to save note:', error);
    throw error;
  }

  console.log('[CardNote] Note saved successfully');
}

/**
 * Change a card's variant in a binder (e.g. base → reverse-holo).
 * For Custom binders the row is matched by position instead of variant.
 */
export async function updateCardVariant(
  binderId: string,
  cardId: string,
  oldVariant: string | undefined,
  newVariant: string,
  position?: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const isPositionBased = position !== undefined && position !== null;

  // Check for an existing row with the target variant to avoid unique-constraint violations
  if (!isPositionBased) {
    let conflictQuery = supabase
      .from('binder_cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('binder_id', binderId)
      .eq('card_id', cardId);

    if (newVariant && newVariant !== 'base') {
      conflictQuery = conflictQuery.eq('variant', newVariant);
    } else {
      conflictQuery = conflictQuery.is('variant', null);
    }

    const { data: existing } = await conflictQuery.maybeSingle();
    if (existing) {
      throw new Error(`This card already has a ${newVariant === 'base' ? 'Standard' : newVariant} entry in the binder.`);
    }
  }

  // Build the update — store 'base' as null to match existing convention
  const variantValue = (newVariant && newVariant !== 'base') ? newVariant : null;

  let query = supabase
    .from('binder_cards')
    .update({ variant: variantValue })
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId);

  if (isPositionBased) {
    query = query.eq('position', position);
  } else {
    if (oldVariant && oldVariant !== 'base') {
      query = query.eq('variant', oldVariant);
    } else {
      query = query.is('variant', null);
    }
  }

  const { data, error } = await query.select('id');
  if (error) {
    console.error('[CardVariant] Failed to update variant:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Card must be marked as owned before you can change its variant.');
  }

  console.log(`[CardVariant] Updated variant from ${oldVariant || 'base'} to ${newVariant}`);
}



