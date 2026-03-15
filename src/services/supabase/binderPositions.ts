// src/services/supabase/binderPositions.ts
import { supabase } from './client';
import { syncBinderCardCount } from './cards';

interface CardPosition {
  slotIndex: number;
  cardId: string | null;
}

interface StoredPosition {
  id: string;
  binder_id: string;
  slot_index: number;
  card_id: string;
}

/**
 * Get all card positions for a binder
 */
export async function getCardPositionsForBinder(
  binderId: string
): Promise<CardPosition[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('binder_card_positions')
    .select('slot_index, card_id')
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id)
    .order('slot_index');
  
  if (error) {
    console.error('[34I] Error loading positions:', error);
    return [];
  }
  
  // Convert to CardPosition array
  return (data || []).map(row => ({
    slotIndex: row.slot_index,
    cardId: row.card_id,
  }));
}

/**
 * Save all card positions for a binder (batch upsert)
 */
export async function saveCardPositionsForBinder(
  binderId: string,
  positions: CardPosition[]
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  // Filter out empty slots
  const filledPositions = positions.filter(p => p.cardId !== null);
  
  // Delete existing positions for this binder
  const { error: deleteError } = await supabase
    .from('binder_card_positions')
    .delete()
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);
  
  if (deleteError) {
    console.error('[34I] Error deleting old positions:', deleteError);
    throw deleteError;
  }
  
  // Insert new positions
  if (filledPositions.length > 0) {
    const rows = filledPositions.map(p => ({
      user_id: user.user!.id,
      binder_id: binderId,
      slot_index: p.slotIndex,
      card_id: p.cardId,
    }));
    
    const { error: insertError } = await supabase
      .from('binder_card_positions')
      .insert(rows);
    
    if (insertError) {
      console.error('[34I] Error saving positions:', insertError);
      throw insertError;
    }
  }
  
  console.log(`[34I] Saved ${filledPositions.length} card positions for binder ${binderId}`);
}

/**
 * Clear all positions for a binder
 */
export async function clearAllPositionsForBinder(
  binderId: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('binder_card_positions')
    .delete()
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);
  
  if (error) {
    console.error('[34I] Error clearing positions:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER TRAY PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

interface PlaceholderCardRow {
  slot_index: number;
  card_id: string;
}

/**
 * Load placeholder tray cards for a binder (ordered by slot_index)
 */
export async function getPlaceholderCardsForBinder(
  binderId: string
): Promise<{ slotIndex: number; cardId: string }[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('binder_placeholder_cards')
    .select('slot_index, card_id')
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id)
    .order('slot_index');

  if (error) {
    console.error('[Placeholder] Error loading placeholder cards:', error);
    return [];
  }

  return (data || []).map((row: PlaceholderCardRow) => ({
    slotIndex: row.slot_index,
    cardId: row.card_id,
  }));
}

/**
 * Save placeholder tray cards for a binder (replaces all existing)
 */
export async function savePlaceholderCardsForBinder(
  binderId: string,
  cards: { cardId: string }[]
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { error: deleteError } = await supabase
    .from('binder_placeholder_cards')
    .delete()
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);

  if (deleteError) {
    console.error('[Placeholder] Error deleting old placeholder cards:', deleteError);
    throw deleteError;
  }

  if (cards.length > 0) {
    const rows = cards.map((c, index) => ({
      user_id: user.user!.id,
      binder_id: binderId,
      slot_index: index,
      card_id: c.cardId,
    }));

    const { error: insertError } = await supabase
      .from('binder_placeholder_cards')
      .insert(rows);

    if (insertError) {
      console.error('[Placeholder] Error saving placeholder cards:', insertError);
      throw insertError;
    }
  }

  console.log(`[Placeholder] Saved ${cards.length} placeholder cards for binder ${binderId}`);
}

/**
 * Get count of placed cards in a binder
 */
export async function getPlacedCardCount(
  binderId: string
): Promise<number> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return 0;
  
  const { count, error } = await supabase
    .from('binder_card_positions')
    .select('*', { count: 'exact', head: true })
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);
  
  if (error) {
    console.error('[34I] Error counting positions:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * After saving positions in Edit mode, sync `binder_cards` to match
 * `binder_card_positions`. This keeps both tables in sync so the binder
 * view and progress bar reflect what was changed in edit mode.
 *
 * For Custom binders: adds/removes/updates binder_cards rows to match
 * binder_card_positions exactly, preserving existing ownership status.
 *
 * For Master Set / Region binders: updates positions in binder_cards for
 * cards that were rearranged, and adds newly-placed cards (from card picker)
 * as extras.
 */
export async function syncBinderCardsFromPositions(
  binderId: string,
  collectionMode: string,
  newlyAddedCardIds: string[] = []
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  // Read the current state of binder_card_positions (just saved by edit mode)
  const { data: posRows, error: posError } = await supabase
    .from('binder_card_positions')
    .select('slot_index, card_id')
    .eq('binder_id', binderId)
    .eq('user_id', userId);

  if (posError) {
    console.error('[EditSync] Error reading positions:', posError);
    throw new Error(`Failed to sync binder: ${posError.message}`);
  }

  // Read existing binder_cards for this binder
  const { data: existingRows, error: existError } = await supabase
    .from('binder_cards')
    .select('card_id, position, is_owned, is_extra')
    .eq('binder_id', binderId)
    .eq('user_id', userId);

  if (existError) {
    console.error('[EditSync] Error reading binder_cards:', existError);
    throw new Error(`Failed to sync binder: ${existError.message}`);
  }

  // Build lookup maps
  const positionCardIds = new Set(
    (posRows || []).map(r => r.card_id).filter(Boolean) as string[]
  );
  const existingByCardId = new Map<string, { position: number | null; isOwned: boolean; isExtra: boolean }>();
  (existingRows || []).forEach(r => {
    existingByCardId.set(r.card_id, {
      position: r.position,
      isOwned: r.is_owned ?? false,
      isExtra: r.is_extra ?? false,
    });
  });

  // Clear all positions first to avoid unique constraint violations when
  // cards swap slots (e.g. card A pos 1 → 2 while card B pos 2 → 1).
  const { error: clearError } = await supabase
    .from('binder_cards')
    .update({ position: null })
    .eq('binder_id', binderId)
    .eq('user_id', userId)
    .not('position', 'is', null);

  if (clearError) {
    console.error('[EditSync] Error clearing positions:', clearError);
    throw new Error(`Failed to sync binder: ${clearError.message}`);
  }

  if (collectionMode === 'custom') {
    // Custom binders: binder_card_positions is the single source of truth
    // for which cards are in the binder and where they sit.

    // Cards to remove (in binder_cards but no longer in any position)
    const toRemove = [...existingByCardId.keys()].filter(id => !positionCardIds.has(id));
    if (toRemove.length > 0) {
      const { error: rmError } = await supabase
        .from('binder_cards')
        .delete()
        .eq('binder_id', binderId)
        .eq('user_id', userId)
        .in('card_id', toRemove);
      if (rmError) console.error('[EditSync] Error removing binder_cards:', rmError);
    }

    // Cards to add (in positions but not in binder_cards yet)
    const toAdd = [...positionCardIds].filter(id => !existingByCardId.has(id));
    if (toAdd.length > 0) {
      const addRows = toAdd.map(cardId => {
        const pos = (posRows || []).find(r => r.card_id === cardId);
        return {
          user_id: userId,
          binder_id: binderId,
          card_id: cardId,
          position: pos?.slot_index ?? null,
          is_owned: false,
          variant: null,
        };
      });
      const { error: addError } = await supabase
        .from('binder_cards')
        .upsert(addRows, { onConflict: 'binder_id,card_id,variant' });
      if (addError) console.error('[EditSync] Error adding binder_cards:', addError);
    }

    // Set final positions for all existing cards (positions were cleared above)
    for (const posRow of (posRows || [])) {
      if (!posRow.card_id) continue;
      if (toAdd.includes(posRow.card_id)) continue; // already set during add
      await supabase
        .from('binder_cards')
        .update({ position: posRow.slot_index })
        .eq('binder_id', binderId)
        .eq('user_id', userId)
        .eq('card_id', posRow.card_id);
    }
  } else {
    // Master Set / Region: positions are for display order only.
    // binder_cards manages ownership. We only need to sync positions
    // and add cards that were explicitly added via the card picker.

    // Set positions from the layout (positions were cleared above)
    for (const posRow of (posRows || [])) {
      if (!posRow.card_id) continue;
      const existing = existingByCardId.get(posRow.card_id);
      if (existing) {
        await supabase
          .from('binder_cards')
          .update({ position: posRow.slot_index })
          .eq('binder_id', binderId)
          .eq('user_id', userId)
          .eq('card_id', posRow.card_id);
      }
    }

    // Add newly-added cards (from card picker in edit mode) as extras
    if (newlyAddedCardIds.length > 0) {
      const toAdd = newlyAddedCardIds.filter(id => !existingByCardId.has(id));
      if (toAdd.length > 0) {
        const addRows = toAdd.map(cardId => ({
          user_id: userId,
          binder_id: binderId,
          card_id: cardId,
          is_owned: false,
          is_extra: true,
          variant: null,
          position: null,
        }));
        const { error: addError } = await supabase
          .from('binder_cards')
          .upsert(addRows, { onConflict: 'binder_id,card_id,variant' });
        if (addError) console.error('[EditSync] Error adding extra binder_cards:', addError);

        // Increment total_cards for each new extra card
        const { data: binderData } = await supabase
          .from('binders')
          .select('total_cards')
          .eq('id', binderId)
          .single();

        if (binderData) {
          await supabase
            .from('binders')
            .update({ total_cards: (binderData.total_cards || 0) + toAdd.length })
            .eq('id', binderId);
        }
      }
    }
  }

  // Final recount to make sure owned_cards / total_cards are correct
  await syncBinderCardCount(binderId);
  console.log('[EditSync] Synced binder_cards with positions for binder', binderId);
}
