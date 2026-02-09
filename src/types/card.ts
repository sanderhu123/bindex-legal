/**
 * Card variant types
 */
export type CardVariant = 'base' | 'holo' | 'reverse-holo' | 'poke-ball' | 'master-ball';

/**
 * Filters for card search in the CardPicker (add card module).
 * All fields are optional — only active filters are applied.
 */
export interface CardSearchFilters {
  /** Era name (e.g., "Scarlet & Violet"). Used for client-side filtering. */
  era?: string;
  /** TCGDEX set ID (e.g., "sv08"). Sent to API as set.id filter. */
  setId?: string;
  /** Rarity string (e.g., "Rare"). Sent to API as rarity filter. */
  rarity?: string;
  /** Illustrator name (free text). Sent to API as illustrator filter. */
  illustrator?: string;
}

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
  supertype?: string; // Card supertype (Pokémon, Trainer, Energy)
  setTotal?: string; // Total cards in set (e.g., "197")
  selectedCardId?: string; // For Region mode: ID of the custom TCG card selected for this Pokemon slot
  // For Region mode: Store TCG card details when a custom selection is made
  selectedCardRarity?: string;
  selectedCardArtist?: string;
  selectedCardSet?: string;
}

