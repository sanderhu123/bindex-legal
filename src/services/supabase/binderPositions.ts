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
 * After saving positions in Edit mode, sync `binder_cards` to match.
 * This ensures the progress bar (which reads from binder_cards) reflects
 * cards that were added/removed via the Edit screen.
 *
 * For Custom binders: adds new binder_cards rows for newly placed cards,
 * removes rows for cards no longer in any slot.
 *
 * For Master Set binders: only adds binder_cards rows (as extras) for cards
 * that were explicitly added during the edit session (via the card picker),
 * NOT for unowned set cards that are simply missing from binder_cards.
 *
 * @param newlyAddedCardIds - Card IDs that were added during the edit session
 *   (cards in current positions but not in original positions). Used by
 *   master-set mode to avoid re-adding unowned set cards as extras.
 */
export async function syncBinderCardsFromPositions(
  binderId: string,
  collectionMode: string,
  newlyAddedCardIds: string[] = []
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  if (collectionMode === 'custom') {
    // 1. Get all filled positions from binder_card_positions
    const { data: posRows, error: posError } = await supabase
      .from('binder_card_positions')
      .select('slot_index, card_id')
      .eq('binder_id', binderId)
      .eq('user_id', userId);

    if (posError) {
      console.error('[EditSync] Error reading positions:', posError);
      return;
    }

    const positionCardIds = new Set(
      (posRows || []).map(r => r.card_id).filter(Boolean) as string[]
    );

    // 2a. Get existing binder_cards rows (Custom: cards with positions)
    const { data: existingRows, error: existError } = await supabase
      .from('binder_cards')
      .select('card_id, position, is_owned')
      .eq('binder_id', binderId)
      .eq('user_id', userId);

    if (existError) {
      console.error('[EditSync] Error reading binder_cards:', existError);
      return;
    }

    const existingCardIds = new Set(
      (existingRows || []).map(r => r.card_id)
    );

    // Build a map of existing ownership so we can preserve is_owned
    const ownershipMap = new Map<string, boolean>();
    (existingRows || []).forEach(r => {
      ownershipMap.set(r.card_id, r.is_owned ?? false);
    });

    // 3a. Cards to add (in positions but not in binder_cards)
    const toAdd = [...positionCardIds].filter(id => !existingCardIds.has(id));
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

      if (addError) {
        console.error('[EditSync] Error adding binder_cards:', addError);
      }
    }

    // 4a. Cards to remove (in binder_cards but no longer in any position)
    const toRemove = [...existingCardIds].filter(id => !positionCardIds.has(id));
    if (toRemove.length > 0) {
      const { error: rmError } = await supabase
        .from('binder_cards')
        .delete()
        .eq('binder_id', binderId)
        .eq('user_id', userId)
        .in('card_id', toRemove);

      if (rmError) {
        console.error('[EditSync] Error removing binder_cards:', rmError);
      }
    }

    // 5a. Update positions for cards that moved slots
    for (const posRow of (posRows || [])) {
      if (!posRow.card_id) continue;
      const existingRow = (existingRows || []).find(r => r.card_id === posRow.card_id);
      if (existingRow && existingRow.position !== posRow.slot_index) {
        await supabase
          .from('binder_cards')
          .update({ position: posRow.slot_index })
          .eq('binder_id', binderId)
          .eq('user_id', userId)
          .eq('card_id', posRow.card_id);
      }
    }
  } else if (collectionMode === 'master-set') {
    // For Master Set: only add cards explicitly added during edit (via card picker).
    // Unowned set cards should NOT be re-added as extras — they're managed by the
    // regular toggle flow in BinderDetailScreen.
    if (newlyAddedCardIds.length > 0) {
      const { data: existingRows, error: existError } = await supabase
        .from('binder_cards')
        .select('card_id')
        .eq('binder_id', binderId)
        .eq('user_id', userId)
        .in('card_id', newlyAddedCardIds);

      if (existError) {
        console.error('[EditSync] Error reading binder_cards:', existError);
        return;
      }

      const existingCardIds = new Set(
        (existingRows || []).map(r => r.card_id)
      );

      const toAdd = newlyAddedCardIds.filter(id => !existingCardIds.has(id));
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

        if (addError) {
          console.error('[EditSync] Error adding extra binder_cards:', addError);
        }

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

  // 6. Recount owned_cards / total_cards from actual data
  await syncBinderCardCount(binderId);
  console.log('[EditSync] Synced binder_cards with positions for binder', binderId);
}
