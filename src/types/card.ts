/**
 * Card variant types
 */
export type CardVariant = 'base' | 'reverse-holo' | 'poke-ball' | 'master-ball';

/**
 * Card interface representing a Pokémon TCG card
 */
export interface Card {
  id: string;
  name: string;
  number: string; // Set number (e.g., "001/150") or Pokédex number for Region mode
  set: string; // Set name (or region name for Region mode)
  rarity: string; // Rarity (Common, Uncommon, Rare, etc.) - empty for Region mode
  artist: string; // Artist name - empty for Region mode
  imageUrl?: string; // Low-res image for grid view - Optional for Region mode
  imageUrlHiRes?: string; // High-res image for detail view - Optional
  pokedexNumber?: number; // For region mode
  variant?: CardVariant; // Card variant (defaults to 'base' if not specified)
}

