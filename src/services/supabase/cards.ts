import { supabase } from './client';

/**
 * Add a card to a binder
 */
export async function addCardToBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<void> {
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

  // Check if card already exists to avoid double-counting
  const { data: existingCard } = await supabase
    .from('binder_cards')
    .select('id')
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('variant', variant || null)
    .maybeSingle();

  // Insert card (or update if exists)
  const { error } = await supabase
    .from('binder_cards')
    .upsert({
      user_id: user.id,
      binder_id: binderId,
      card_id: cardId,
      variant: variant || null,
    }, {
      onConflict: 'binder_id,card_id,variant',
    });

  if (error) {
    throw error;
  }

  // Only increment owned_cards if this was a new card (not already in binder)
  if (!existingCard) {
    const { error: updateError } = await supabase
      .from('binders')
      .update({ owned_cards: (binder.owned_cards || 0) + 1 })
      .eq('id', binderId);

    if (updateError) {
      console.error('Failed to update owned_cards count:', updateError);
    }
  }
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

  // Check if card exists before deleting (to know if we should decrement count)
  const { data: existingCard } = await supabase
    .from('binder_cards')
    .select('id')
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .eq('variant', variant || null)
    .maybeSingle();

  // Build delete query - always match exact variant (including null)
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

  // Only decrement owned_cards if the card was actually in the binder
  if (existingCard) {
    const newCount = Math.max(0, (binder.owned_cards || 0) - 1);
    const { error: updateError } = await supabase
      .from('binders')
      .update({ owned_cards: newCount })
      .eq('id', binderId);

    if (updateError) {
      console.error('Failed to update owned_cards count:', updateError);
    }
  }
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







