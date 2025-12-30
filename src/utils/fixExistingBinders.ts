/**
 * Utility to fix existing binders by recalculating their total_cards
 * Run this once after the progress caching migration to update existing binders
 */

import { supabase } from '../services/supabase/client';
import { getCardsBySet, getCardsByRegion, type Region } from '../services/api/pokemonApi';

interface BinderToFix {
  id: string;
  name: string;
  collection_mode: 'master-set' | 'region' | 'custom';
  set: string | null;
  region: string | null;
  variants_to_track: string[] | null;
  pokemon_art_style: 'all' | 'regular' | 'illustration' | null;
  total_cards: number;
  owned_cards: number;
}

/**
 * Calculate total cards for a binder based on its collection mode
 * Applies variant filtering if specified (for master-set mode)
 */
async function calculateTotalCards(
  collectionMode: 'master-set' | 'region' | 'custom',
  set?: string | null,
  region?: string | null,
  variantsToTrack?: string[] | null,
  pokemonArtStyle?: 'all' | 'regular' | 'illustration' | null
): Promise<number> {
  try {
    if (collectionMode === 'master-set' && set) {
      console.log(`Fetching cards for set: ${set}...`);
      let cards = await getCardsBySet(set);
      console.log(`  Got ${cards.length} cards from API`);
      
      // Apply variant filtering if specified (just like BinderDetailScreen does)
      if (variantsToTrack && variantsToTrack.length > 0) {
        const originalCount = cards.length;
        cards = cards.filter((card) => {
          // If card has no variant specified, treat it as 'base'
          const cardVariant = card.variant || 'base';
          return variantsToTrack.includes(cardVariant);
        });
        console.log(`  Filtered from ${originalCount} to ${cards.length} cards based on variants: ${variantsToTrack.join(', ')}`);
      }
      
      return cards.length;
    } else if (collectionMode === 'region' && region) {
      console.log(`Fetching cards for region: ${region}...`);
      const cards = await getCardsByRegion(region as Region, pokemonArtStyle || undefined);
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
 * Fix all existing binders by recalculating their total_cards
 */
export async function fixExistingBinders(): Promise<{
  success: boolean;
  fixed: number;
  errors: number;
  details: Array<{ binderId: string; binderName: string; status: string; totalCards?: number }>;
}> {
  const results: Array<{ binderId: string; binderName: string; status: string; totalCards?: number }> = [];
  let fixed = 0;
  let errors = 0;

  try {
    console.log('🔧 Starting to fix existing binders...');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch all binders for the current user
    const { data: binders, error: fetchError } = await supabase
      .from('binders')
      .select('id, name, collection_mode, set, region, variants_to_track, pokemon_art_style, total_cards, owned_cards')
      .eq('user_id', user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (!binders || binders.length === 0) {
      console.log('✅ No binders found to fix');
      return { success: true, fixed: 0, errors: 0, details: [] };
    }

    console.log(`📦 Found ${binders.length} binders to check`);

    // Process each binder
    for (const binder of binders as BinderToFix[]) {
      try {
        // Skip if already has total_cards set (unless it's 0 for a non-custom binder)
        if (binder.total_cards > 0) {
          console.log(`⏭️  Skipping "${binder.name}" (already has total_cards: ${binder.total_cards})`);
          results.push({
            binderId: binder.id,
            binderName: binder.name,
            status: 'skipped (already set)',
            totalCards: binder.total_cards,
          });
          continue;
        }

        console.log(`\n🔄 Processing binder: "${binder.name}"`);
        console.log(`   Mode: ${binder.collection_mode}`);
        if (binder.set) console.log(`   Set: ${binder.set}`);
        if (binder.region) console.log(`   Region: ${binder.region}`);
        if (binder.variants_to_track) console.log(`   Variants: ${binder.variants_to_track.join(', ')}`);

        // Calculate total cards (with variant filtering if applicable)
        const totalCards = await calculateTotalCards(
          binder.collection_mode,
          binder.set,
          binder.region,
          binder.variants_to_track,
          binder.pokemon_art_style
        );

        if (totalCards === 0 && binder.collection_mode !== 'custom') {
          console.warn(`⚠️  Warning: Got 0 cards for "${binder.name}". This might be an error.`);
        }

        // Update the binder
        const { error: updateError } = await supabase
          .from('binders')
          .update({ total_cards: totalCards })
          .eq('id', binder.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Updated "${binder.name}" with total_cards: ${totalCards}`);
        results.push({
          binderId: binder.id,
          binderName: binder.name,
          status: 'fixed',
          totalCards: totalCards,
        });
        fixed++;
      } catch (error: any) {
        console.error(`❌ Error fixing binder "${binder.name}":`, error.message);
        results.push({
          binderId: binder.id,
          binderName: binder.name,
          status: `error: ${error.message}`,
        });
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total binders: ${binders.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Skipped: ${binders.length - fixed - errors}`);

    return {
      success: errors === 0,
      fixed,
      errors,
      details: results,
    };
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    return {
      success: false,
      fixed,
      errors: errors + 1,
      details: results,
    };
  }
}

/**
 * Fix a single binder by ID
 */
export async function fixSingleBinder(binderId: string): Promise<{
  success: boolean;
  totalCards?: number;
  error?: string;
}> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch the binder
    const { data: binder, error: fetchError } = await supabase
      .from('binders')
      .select('id, name, collection_mode, set, region, variants_to_track, pokemon_art_style, total_cards, owned_cards')
      .eq('id', binderId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!binder) {
      throw new Error('Binder not found');
    }

    const binderData = binder as BinderToFix;

    // Calculate total cards (with variant filtering if applicable)
    const totalCards = await calculateTotalCards(
      binderData.collection_mode,
      binderData.set,
      binderData.region,
      binderData.variants_to_track,
      binderData.pokemon_art_style
    );

    // Update the binder
    const { error: updateError } = await supabase
      .from('binders')
      .update({ total_cards: totalCards })
      .eq('id', binderId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Fixed binder "${binderData.name}" with total_cards: ${totalCards}`);
    return { success: true, totalCards };
  } catch (error: any) {
    console.error(`❌ Error fixing binder:`, error.message);
    return { success: false, error: error.message };
  }
}

