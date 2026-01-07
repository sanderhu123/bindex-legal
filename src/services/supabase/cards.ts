import { supabase } from './client';

/**
 * Helper to count actual cards in a binder and update owned_cards
 * This avoids race conditions when adding/removing cards quickly
 */
async function syncBinderCardCount(binderId: string): Promise<void> {
  // Count actual cards in binder_cards table
  const { count, error: countError } = await supabase
    .from('binder_cards')
    .select('*', { count: 'exact', head: true })
    .eq('binder_id', binderId);

  if (countError) {
    console.error('Failed to count binder cards:', countError);
    return;
  }

  // Update binder with actual count
  const { error: updateError } = await supabase
    .from('binders')
    .update({ owned_cards: count || 0 })
    .eq('id', binderId);

  if (updateError) {
    console.error('Failed to update owned_cards count:', updateError);
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
  const { error } = await supabase
    .from('binder_cards')
    .upsert({
      user_id: user.id,
      binder_id: binderId,
      card_id: cardId,
      variant: variant || null,
      position: position ?? null, // NULL for non-Custom binders
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
  const { error } = await supabase
    .from('binder_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('variant', variant || null);

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
 * Remove a card from a binder by position (for Custom binders)
 */
export async function removeCardByPosition(
  binderId: string,
  position: number
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

  // Delete the card at this position
  const { error } = await supabase
    .from('binder_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('position', position);

  if (error) {
    throw error;
  }

  // Sync the owned_cards count
  await syncBinderCardCount(binderId);
}

/**
 * Add a card at a specific position in a Custom binder
 * This is a convenience wrapper that handles the position parameter
 */
export async function addCardAtPosition(
  binderId: string,
  cardId: string,
  position: number,
  variant?: string
): Promise<void> {
  return addCardToBinder(binderId, cardId, variant, position);
}

/**
 * Toggle the owned/missing status of a card at a position (for Custom binders)
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
  const newIsOwned = !(currentCard.is_owned ?? true);

  const { error: updateError } = await supabase
    .from('binder_cards')
    .update({ is_owned: newIsOwned })
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('position', position);

  if (updateError) {
    throw updateError;
  }

  // Sync the owned_cards count
  await syncBinderCardCount(binderId);

  return newIsOwned;
}







