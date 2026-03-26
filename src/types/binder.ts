/**
 * Collection mode types
 */
export type CollectionMode = 'master-set' | 'region' | 'custom';

/**
 * Variant placement preference
 */
export type VariantPlacement = 'grouped' | 'end';

/**
 * Layout preference for card grid display
 */
export type LayoutPreference = '3x3' | '4x3';

/**
 * Pokemon art style preference for region mode
 */
export type PokemonArtStyle = 'sprite' | 'home' | 'official-artwork';

/**
 * Binder interface representing a user's card collection binder
 */
export interface Binder {
  id: string;
  userId: string;
  name: string;
  collectionMode: CollectionMode;
  set?: string; // For master-set mode
  region?: string; // For region mode
  variantsToTrack?: string[]; // ['base', 'reverse-holo', 'poke-ball', 'master-ball']
  variantPlacement?: VariantPlacement; // How to display variants
  variantOrder?: string[]; // Display order of variant groups including 'secret-rare'
  layoutPreference?: LayoutPreference; // Grid layout preference
  pokemonArtStyle?: PokemonArtStyle; // Pokemon art style for region mode
  cardIds: string[]; // IDs of owned cards (for backward compatibility)
  totalCards: number; // Total number of cards expected in this binder (cached)
  ownedCards: number; // Number of cards currently owned in this binder (cached)
  createdAt: Date;
  updatedAt: Date;
}

