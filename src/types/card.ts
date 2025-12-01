/**
 * Card interface representing a Pokémon TCG card
 */
export interface Card {
  id: string;
  name: string;
  number: string; // Set number (e.g., "001/150")
  set: string; // Set name
  rarity: string; // Rarity (Common, Uncommon, Rare, etc.)
  artist: string;
  imageUrl: string;
  pokedexNumber?: number; // For region mode
}

