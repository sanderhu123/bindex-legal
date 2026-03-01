// src/services/supabase/binderPositions.ts
import { supabase } from './client';

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
