import { supabase } from './client';
import type { Binder, CollectionMode, VariantPlacement, LayoutPreference, PokemonArtStyle } from '../../types';
import { getCardsBySet, getCardsByRegion, type Region } from '../api/pokemonApi';
import { startBackgroundPrefetch } from '../imagePrefetch';

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
  pokemon_art_style: PokemonArtStyle | null;
  total_cards: number;
  owned_cards: number;
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
    pokemonArtStyle: row.pokemon_art_style || undefined,
    cardIds,
    totalCards: row.total_cards || 0,
    ownedCards: cardIds.length,
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

  // Fetch owned card IDs for each binder
  const bindersWithCards = await Promise.all(
    (binders || []).map(async (binder) => {
      const { data: binderCards, error: cardsError } = await supabase
        .from('binder_cards')
        .select('card_id')
        .eq('binder_id', binder.id)
        .eq('is_owned', true)
        .limit(5000);

      if (cardsError) {
        console.error('[Binders] Failed to fetch card IDs for binder', binder.id, ':', cardsError);
      }

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

  // Fetch owned card IDs only
  const { data: binderCards, error: cardsError } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('binder_id', binderId)
    .eq('is_owned', true)
    .limit(5000);

  if (cardsError) {
    console.error('[Binders] Failed to fetch card IDs for binder', binderId, ':', cardsError);
    throw new Error('Failed to load card collection data. Please check your connection and try again.');
  }

  const cardIds = binderCards?.map((bc) => bc.card_id) || [];
  return rowToBinder(binder as BinderRow, cardIds);
}

/**
 * Calculate total cards for a binder based on collection mode
 * Applies variant filtering if specified (for master-set mode)
 */
async function calculateTotalCards(
  collectionMode: CollectionMode,
  set?: string,
  region?: string,
  variantsToTrack?: string[],
  pokemonArtStyle?: PokemonArtStyle
): Promise<number> {
  try {
    if (collectionMode === 'master-set' && set) {
      let cards = await getCardsBySet(set);
      
      // Apply variant filtering if specified (just like BinderDetailScreen does)
      if (variantsToTrack && variantsToTrack.length > 0) {
        cards = cards.filter((card) => {
          // If card has no variant specified, treat it as 'base'
          const cardVariant = card.variant || 'base';
          return variantsToTrack.includes(cardVariant);
        });
      }
      
      return cards.length;
    } else if (collectionMode === 'region' && region) {
      const cards = await getCardsByRegion(region as Region, pokemonArtStyle);
      return cards.length;
    } else if (collectionMode === 'custom') {
      // Custom binders don't have a fixed total
      return 0;
    }
    return 0;
  } catch (error) {
    console.error('Error calculating total cards:', error);
    return 0;
  }
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
  pokemonArtStyle?: PokemonArtStyle;
}): Promise<Binder> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Calculate total cards for this binder (with variant filtering if applicable)
  const totalCards = await calculateTotalCards(
    binder.collectionMode,
    binder.set,
    binder.region,
    binder.variantsToTrack,
    binder.pokemonArtStyle
  );

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
      pokemon_art_style: binder.pokemonArtStyle || null,
      total_cards: totalCards,
      owned_cards: 0, // New binder starts with 0 owned cards
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const newBinder = rowToBinder(data as BinderRow, []);

  // Pre-cache card images in the background after binder creation
  // This makes the first binder open much faster
  precacheBinderImages(newBinder).catch(err => {
    console.error('[Binder] Error pre-caching images:', err);
  });

  return newBinder;
}

/**
 * Pre-cache card images for a binder in the background.
 * Called after binder creation to speed up first open.
 */
async function precacheBinderImages(binder: Binder): Promise<void> {
  console.log('[Binder] Pre-caching images for new binder:', binder.name);

  try {
    let cards: { imageUrl?: string }[] = [];

    if (binder.collectionMode === 'master-set' && binder.set) {
      cards = await getCardsBySet(binder.set);
      
      // Apply variant filtering
      if (binder.variantsToTrack && binder.variantsToTrack.length > 0) {
        cards = cards.filter((card: any) => {
          const cardVariant = card.variant || 'base';
          return binder.variantsToTrack!.includes(cardVariant);
        });
      }
    } else if (binder.collectionMode === 'region' && binder.region) {
      cards = await getCardsByRegion(binder.region as Region, binder.pokemonArtStyle);
    }

    // Extract image URLs
    const imageUrls = cards
      .map(card => card.imageUrl)
      .filter((url): url is string => !!url);

    if (imageUrls.length > 0) {
      console.log('[Binder] Starting background prefetch for', imageUrls.length, 'images');
      const result = await startBackgroundPrefetch(binder.id, imageUrls, 5);
      console.log('[Binder] Pre-cache complete:', result);
    }
  } catch (err) {
    console.error('[Binder] Failed to pre-cache images:', err);
  }
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

  // Fetch owned card IDs only
  const { data: binderCards, error: cardsError } = await supabase
    .from('binder_cards')
    .select('card_id')
    .eq('binder_id', binderId)
    .eq('is_owned', true)
    .limit(5000);

  if (cardsError) {
    console.error('[Binders] Failed to fetch card IDs after update for binder', binderId, ':', cardsError);
  }

  const cardIds = binderCards?.map((bc) => bc.card_id) || [];
  return rowToBinder(data as BinderRow, cardIds);
}

/**
 * Delete a binder and all associated data.
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

