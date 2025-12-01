import { supabase } from './client';
import type { Binder, CollectionMode, VariantPlacement, LayoutPreference } from '../../types';

/**
 * Database representation of a binder (matches database schema)
 */
interface BinderRow {
  id: string;
  user_id: string;
  name: string;
  collection_mode: CollectionMode;
  set: string | null;
  region: string | null;
  variants_to_track: string[] | null;
  variant_placement: VariantPlacement | null;
  layout_preference: LayoutPreference | null;
  nfc_tag_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Binder interface
 */
function rowToBinder(row: BinderRow, cardIds: string[]): Binder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    collectionMode: row.collection_mode,
    set: row.set || undefined,
    region: row.region || undefined,
    variantsToTrack: row.variants_to_track || undefined,
    variantPlacement: row.variant_placement || undefined,
    layoutPreference: row.layout_preference || undefined,
    nfcTagId: row.nfc_tag_id || undefined,
    cardIds,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get all binders for the current user
 */
export async function getBinders(): Promise<Binder[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch binders
  const { data: binders, error } = await supabase
    .from('binders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Fetch card IDs for each binder
  const bindersWithCards = await Promise.all(
    (binders || []).map(async (binder) => {
      const { data: binderCards } = await supabase
        .from('binder_cards')
        .select('card_id')
        .eq('binder_id', binder.id);

      const cardIds = binderCards?.map((bc) => bc.card_id) || [];
      return rowToBinder(binder as BinderRow, cardIds);
    })
  );

  return bindersWithCards;
}

/**
 * Get a single binder by ID
 */
export async function getBinderById(binderId: string): Promise<Binder | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch binder
  const { data: binder, error } = await supabase
    .from('binders')
    .select('*')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw error;
  }

  // Fetch card IDs
  const { data: binderCards } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('binder_id', binderId);

  const cardIds = binderCards?.map((bc) => bc.card_id) || [];
  return rowToBinder(binder as BinderRow, cardIds);
}

/**
 * Get a binder by NFC tag ID
 */
export async function getBinderByNfcTagId(nfcTagId: string): Promise<Binder | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch binder by NFC tag ID
  const { data: binder, error } = await supabase
    .from('binders')
    .select('*')
    .eq('nfc_tag_id', nfcTagId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw error;
  }

  // Check if binder belongs to current user
  if (binder.user_id !== user.id) {
    throw new Error('NFC tag belongs to another user');
  }

  // Fetch card IDs
  const { data: binderCards } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('binder_id', binder.id);

  const cardIds = binderCards?.map((bc) => bc.card_id) || [];
  return rowToBinder(binder as BinderRow, cardIds);
}

/**
 * Check if an NFC tag ID belongs to the current user
 */
export async function checkNfcTagOwnership(nfcTagId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('binders')
    .select('user_id')
    .eq('nfc_tag_id', nfcTagId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === user.id;
}

/**
 * Create a new binder
 */
export async function createBinder(binder: {
  name: string;
  collectionMode: CollectionMode;
  set?: string;
  region?: string;
  variantsToTrack?: string[];
  variantPlacement?: VariantPlacement;
  layoutPreference?: LayoutPreference;
  nfcTagId?: string;
}): Promise<Binder> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('binders')
    .insert({
      user_id: user.id,
      name: binder.name,
      collection_mode: binder.collectionMode,
      set: binder.set || null,
      region: binder.region || null,
      variants_to_track: binder.variantsToTrack || null,
      variant_placement: binder.variantPlacement || null,
      layout_preference: binder.layoutPreference || null,
      nfc_tag_id: binder.nfcTagId || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return rowToBinder(data as BinderRow, []);
}

/**
 * Update an existing binder
 */
export async function updateBinder(
  binderId: string,
  updates: {
    name?: string;
    variantsToTrack?: string[];
    variantPlacement?: VariantPlacement;
    layoutPreference?: LayoutPreference;
    nfcTagId?: string;
  }
): Promise<Binder> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.variantsToTrack !== undefined) updateData.variants_to_track = updates.variantsToTrack;
  if (updates.variantPlacement !== undefined) updateData.variant_placement = updates.variantPlacement;
  if (updates.layoutPreference !== undefined) updateData.layout_preference = updates.layoutPreference;
  if (updates.nfcTagId !== undefined) updateData.nfc_tag_id = updates.nfcTagId || null;

  const { data, error } = await supabase
    .from('binders')
    .update(updateData)
    .eq('id', binderId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Fetch card IDs
  const { data: binderCards } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('binder_id', binderId);

  const cardIds = binderCards?.map((bc) => bc.card_id) || [];
  return rowToBinder(data as BinderRow, cardIds);
}

/**
 * Delete a binder
 */
export async function deleteBinder(binderId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('binders')
    .delete()
    .eq('id', binderId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

