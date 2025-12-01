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
  layoutPreference?: LayoutPreference; // Grid layout preference
  nfcTagId?: string; // NFC tag ID (1:1 relationship, optional for manual binders)
  cardIds: string[]; // IDs of owned cards
  createdAt: Date;
  updatedAt: Date;
}

