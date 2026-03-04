// src/services/supabase/customCards.ts
import { supabase } from './client';
import type { Card } from '../../types';

const CUSTOM_CARD_PREFIX = 'custom-';

/**
 * Preset colors available for custom cards.
 * textColor is the contrasting text color for readability.
 */
export const CUSTOM_CARD_COLORS: { name: string; hex: string; textColor: string }[] = [
  { name: 'Black',  hex: '#000000', textColor: '#FFFFFF' },
  { name: 'White',  hex: '#FFFFFF', textColor: '#000000' },
  { name: 'Grey',   hex: '#808080', textColor: '#FFFFFF' },
  { name: 'Red',    hex: '#DC2626', textColor: '#FFFFFF' },
  { name: 'Blue',   hex: '#2563EB', textColor: '#FFFFFF' },
  { name: 'Green',  hex: '#16A34A', textColor: '#FFFFFF' },
  { name: 'Yellow', hex: '#EAB308', textColor: '#000000' },
  { name: 'Orange', hex: '#EA580C', textColor: '#FFFFFF' },
  { name: 'Pink',   hex: '#EC4899', textColor: '#FFFFFF' },
  { name: 'Gold',   hex: '#D4A017', textColor: '#000000' },
  { name: 'Silver', hex: '#C0C0C0', textColor: '#000000' },
  { name: 'Purple', hex: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Brown',  hex: '#78350F', textColor: '#FFFFFF' },
];

/**
 * Check if a card ID belongs to a custom placeholder card
 */
export function isCustomCard(id: string): boolean {
  return id.startsWith(CUSTOM_CARD_PREFIX);
}

/**
 * Extract the background color hex from a custom card's set field.
 * The set field is encoded as "Custom|#hexcolor".
 * Returns black as fallback.
 */
export function getCustomCardColor(card: Card): string {
  if (card.set && card.set.startsWith('Custom|')) {
    return card.set.split('|')[1] || '#000000';
  }
  return '#000000';
}

/**
 * Get the contrasting text color for a custom card's background.
 */
export function getCustomCardTextColor(card: Card): string {
  const bgColor = getCustomCardColor(card);
  const preset = CUSTOM_CARD_COLORS.find(c => c.hex === bgColor);
  if (preset) return preset.textColor;
  // Fallback: use luminance to decide
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Create a new custom placeholder card and save it to Supabase.
 * Returns a Card object ready to be placed in a binder.
 */
export async function createCustomCard(name: string, color: string): Promise<Card> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const id = `${CUSTOM_CARD_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;

  const { error } = await supabase
    .from('custom_cards')
    .insert({
      id,
      user_id: user.user.id,
      name: name.trim(),
      color,
    });

  if (error) {
    console.error('[CustomCards] Failed to create custom card:', error);
    throw error;
  }

  console.log('[CustomCards] Created custom card:', { id, name, color });

  return {
    id,
    name: name.trim(),
    number: '',
    set: `Custom|${color}`,
    rarity: '',
    illustrator: '',
    imageUrl: undefined,
    imageUrlHiRes: undefined,
  };
}

/**
 * Fetch a custom card from Supabase by ID.
 * Returns a Card object or null if not found.
 */
export async function getCustomCard(id: string): Promise<Card | null> {
  const { data, error } = await supabase
    .from('custom_cards')
    .select('id, name, color')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.warn('[CustomCards] Custom card not found:', id, error?.message);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    number: '',
    set: `Custom|${data.color}`,
    rarity: '',
    illustrator: '',
    imageUrl: undefined,
    imageUrlHiRes: undefined,
  };
}
