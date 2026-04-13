import { supabase } from './client';

// ============================================================================
// REGION CARD SELECTION SERVICE (Step 31B + 32B Performance Optimizations)
// Manages which TCG card the user selected for each Pokémon slot in Region binders
// For example: User selects a specific Charizard card to represent Charizard
//
// Performance features (Step 32B):
// - In-memory cache for instant access to binder selections
// - Batch loading of all selections for a binder in single query
// - Cache invalidation on updates
// ============================================================================

/**
 * In-memory cache for region card selections (Step 32B)
 * Key: binderId
 * Value: { selections: Map<pokedexNumber, cardId>, timestamp: number }
 */
const selectionsCache = new Map<string, {
  selections: Map<number, string>;
  timestamp: number;
}>();

/**
 * Cache duration: 5 minutes
 * Selections don't change often, so we can keep them cached longer
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Check if cache entry is valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Clear cache for a specific binder (call after updates)
 */
function invalidateCache(binderId: string): void {
  selectionsCache.delete(binderId);
  console.log('[31B/32B] Cache invalidated for binder:', binderId);
}

/**
 * Clear all cached selections (useful for logout/cleanup)
 */
export function clearRegionCardsCache(): void {
  selectionsCache.clear();
  console.log('[31B/32B] All region cards cache cleared');
}

/**
 * Get the selected card for a Pokémon in a Region binder
 * Uses cached data if available (Step 32B optimization)
 * 
 * @param binderId - The binder ID
 * @param pokedexNumber - National Pokédex number (e.g., 1 for Bulbasaur, 25 for Pikachu)
 * @returns The selected card ID, or null if no card selected (using default sprite)
 */
export async function getSelectedCardForPokemon(
  binderId: string,
  pokedexNumber: number
): Promise<string | null> {
  console.log('[31B] getSelectedCardForPokemon() called:', { binderId, pokedexNumber });
  
  // Step 32B: Try to get from cache first
  const cached = selectionsCache.get(binderId);
  if (cached && isCacheValid(cached.timestamp)) {
    const cachedCardId = cached.selections.get(pokedexNumber);
    console.log('[31B/32B] Cache hit:', { 
      binderId, 
      pokedexNumber, 
      cardId: cachedCardId || 'none' 
    });
    return cachedCardId || null;
  }
  
  // Cache miss - load all selections for this binder (more efficient)
  const allSelections = await getAllSelectedCardsForBinder(binderId);
  return allSelections.get(pokedexNumber) || null;
}

/**
 * Set the selected card for a Pokémon in a Region binder
 * This creates a new selection or updates an existing one (upsert)
 * 
 * @param binderId - The binder ID
 * @param pokedexNumber - National Pokédex number (e.g., 1 for Bulbasaur)
 * @param cardId - The card ID to select (e.g., "base1-4" for Base Set Charizard)
 */
export async function setSelectedCardForPokemon(
  binderId: string,
  pokedexNumber: number,
  cardId: string
): Promise<void> {
  console.log('[31B] setSelectedCardForPokemon() called:', { binderId, pokedexNumber, cardId });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user and is a Region binder
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id, collection_mode')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  if (binder.collection_mode !== 'region') {
    throw new Error('Can only select cards for Region binders');
  }

  // Validate inputs
  if (!cardId || cardId.trim() === '') {
    throw new Error('Card ID is required');
  }

  if (pokedexNumber < 1 || pokedexNumber > 2000) {
    throw new Error('Invalid Pokédex number');
  }

  // Upsert the selection (insert or update if exists)
  // The UNIQUE constraint on (binder_id, pokedex_number) handles the upsert
  const { error } = await supabase
    .from('region_pokemon_cards')
    .upsert({
      user_id: user.id,
      binder_id: binderId,
      pokedex_number: pokedexNumber,
      selected_card_id: cardId,
    }, {
      onConflict: 'binder_id,pokedex_number',
    });

  if (error) {
    console.error('[31B] Failed to set selected card:', error);
    throw error;
  }

  // Step 32B: Invalidate cache so next read gets fresh data
  invalidateCache(binderId);

  console.log('[31B] Card selection saved successfully');
}

/**
 * Get all selected cards for a Region binder (with caching - Step 32B)
 * Returns a Map of pokedexNumber → cardId for all Pokémon with custom card selections
 * 
 * Performance: Batch loads all selections in a single query and caches the result
 * for 5 minutes. Subsequent calls return instantly from cache.
 * 
 * @param binderId - The binder ID
 * @returns Map where key is Pokédex number and value is the selected card ID
 */
export async function getAllSelectedCardsForBinder(
  binderId: string
): Promise<Map<number, string>> {
  console.log('[31B] getAllSelectedCardsForBinder() called:', { binderId });
  const startTime = performance.now();
  
  // Step 32B: Check cache first
  const cached = selectionsCache.get(binderId);
  if (cached && isCacheValid(cached.timestamp)) {
    const duration = performance.now() - startTime;
    console.log('[31B/32B] Cache hit for all selections:', { 
      binderId, 
      count: cached.selections.size,
      duration: `${duration.toFixed(2)}ms`,
    });
    return cached.selections;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('[31B] User not authenticated');
    return new Map();
  }

  // Verify binder belongs to user
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id, collection_mode')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    console.warn('[31B] Binder not found or access denied');
    return new Map();
  }

  // Verify this is a Region binder
  if (binder.collection_mode !== 'region') {
    console.warn('[31B] Binder is not a Region binder:', binder.collection_mode);
    return new Map();
  }

  // Get all selections for this binder (single batch query)
  const { data, error } = await supabase
    .from('region_pokemon_cards')
    .select('pokedex_number, selected_card_id')
    .eq('user_id', user.id)
    .eq('binder_id', binderId);

  if (error) {
    console.error('[31B] Error fetching selected cards:', error);
    return new Map();
  }

  // Build the Map
  const selectionsMap = new Map<number, string>();
  
  if (data) {
    data.forEach((row) => {
      selectionsMap.set(row.pokedex_number, row.selected_card_id);
    });
  }

  // Step 32B: Store in cache
  selectionsCache.set(binderId, {
    selections: selectionsMap,
    timestamp: Date.now(),
  });

  const duration = performance.now() - startTime;
  console.log('[31B/32B] Fetched and cached card selections:', { 
    binderId,
    count: selectionsMap.size,
    pokedexNumbers: Array.from(selectionsMap.keys()).slice(0, 10), // Show first 10
    duration: `${duration.toFixed(2)}ms`,
  });
  
  return selectionsMap;
}

/**
 * Clear the selected card for a Pokémon (revert to default sprite)
 * 
 * @param binderId - The binder ID
 * @param pokedexNumber - National Pokédex number to clear selection for
 */
export async function clearSelectedCardForPokemon(
  binderId: string,
  pokedexNumber: number
): Promise<void> {
  console.log('[31B] clearSelectedCardForPokemon() called:', { binderId, pokedexNumber });
  
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

  // Delete the selection
  const { error } = await supabase
    .from('region_pokemon_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId)
    .eq('pokedex_number', pokedexNumber);

  if (error) {
    console.error('[31B] Failed to clear card selection:', error);
    throw error;
  }

  // Step 32B: Invalidate cache so next read gets fresh data
  invalidateCache(binderId);

  console.log('[31B] Card selection cleared for Pokédex #' + pokedexNumber);
}

/**
 * Batch set multiple card selections at once
 * Useful when importing or bulk updating selections
 * 
 * @param binderId - The binder ID
 * @param selections - Array of { pokedexNumber, cardId } to set
 */
export async function setMultipleSelectedCards(
  binderId: string,
  selections: Array<{ pokedexNumber: number; cardId: string }>
): Promise<void> {
  console.log('[31B] setMultipleSelectedCards() called:', { 
    binderId, 
    count: selections.length 
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify binder belongs to user and is a Region binder
  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .select('id, collection_mode')
    .eq('id', binderId)
    .eq('user_id', user.id)
    .single();

  if (binderError || !binder) {
    throw new Error('Binder not found or access denied');
  }

  if (binder.collection_mode !== 'region') {
    throw new Error('Can only select cards for Region binders');
  }

  if (selections.length === 0) {
    console.log('[31B] No selections to save');
    return;
  }

  // Prepare batch upsert data
  const upsertData = selections.map((sel) => ({
    user_id: user.id,
    binder_id: binderId,
    pokedex_number: sel.pokedexNumber,
    selected_card_id: sel.cardId,
  }));

  // Batch upsert all selections
  const { error } = await supabase
    .from('region_pokemon_cards')
    .upsert(upsertData, {
      onConflict: 'binder_id,pokedex_number',
    });

  if (error) {
    console.error('[31B] Failed to batch set card selections:', error);
    throw error;
  }

  // Step 32B: Invalidate cache so next read gets fresh data
  invalidateCache(binderId);

  console.log('[31B] Batch card selections saved:', { count: selections.length });
}

/**
 * Clear all card selections for a binder
 * Useful when resetting a binder or deleting it
 * 
 * @param binderId - The binder ID to clear all selections for
 */
export async function clearAllSelectionsForBinder(
  binderId: string
): Promise<void> {
  console.log('[31B] clearAllSelectionsForBinder() called:', { binderId });
  
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

  // Delete all selections for this binder
  const { error } = await supabase
    .from('region_pokemon_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('binder_id', binderId);

  if (error) {
    console.error('[31B] Failed to clear all selections:', error);
    throw error;
  }

  // Step 32B: Invalidate cache so next read gets fresh data
  invalidateCache(binderId);

  console.log('[31B] All card selections cleared for binder');
}

/**
 * Check if a specific Pokémon has a custom card selected
 * 
 * @param binderId - The binder ID
 * @param pokedexNumber - National Pokédex number to check
 * @returns true if a custom card is selected, false if using default sprite
 */
export async function hasSelectedCard(
  binderId: string,
  pokedexNumber: number
): Promise<boolean> {
  const cardId = await getSelectedCardForPokemon(binderId, pokedexNumber);
  return cardId !== null;
}

/**
 * Get the count of custom card selections for a binder
 * Useful for showing "X Pokémon have custom cards" in the UI
 * 
 * @param binderId - The binder ID
 * @returns Number of Pokémon with custom card selections
 */
export async function getSelectionCount(binderId: string): Promise<number> {
  console.log('[31B] getSelectionCount() called:', { binderId });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return 0;
  }

  // Count selections
  const { count, error } = await supabase
    .from('region_pokemon_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('binder_id', binderId);

  if (error) {
    console.error('[31B] Error counting selections:', error);
    return 0;
  }

  console.log('[31B] Selection count:', count);
  return count || 0;
}
