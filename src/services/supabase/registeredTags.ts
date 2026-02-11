// src/services/supabase/registeredTags.ts
// Step 35E: Activation Code Validation Service
//
// This service handles activation code validation, claiming, and binder limit checks.
// It communicates with the registered_tags table in Supabase.

import { supabase } from './client';

// ============================================
// TYPES
// ============================================

/**
 * Info about a registered activation code
 */
export interface TagInfo {
  id: string;
  activationCode: string;
  tagUid: string | null;
  status: 'available' | 'claimed' | 'disabled';
  claimedBy: string | null;
  claimedAt: string | null;
  binderId: string | null;
}

/**
 * Binder usage info for the current user
 * Used to display binder count and limit in the UI
 */
export interface BinderUsageInfo {
  currentBinders: number;
  binderLimit: number;
  tagsActivated: number;
  isUnlimited: boolean;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate an activation code entered by the user.
 * Returns the code info if found, null if the code is not registered.
 */
export async function validateTagByCode(activationCode: string): Promise<TagInfo | null> {
  try {
    // Normalize the code (uppercase, trim whitespace)
    const normalizedCode = activationCode.trim().toUpperCase();

    const { data, error } = await supabase
      .from('registered_tags')
      .select('id, activation_code, tag_uid, status, claimed_by, claimed_at, binder_id')
      .eq('activation_code', normalizedCode)
      .single();

    if (error || !data) {
      // Code not found in database
      return null;
    }

    return {
      id: data.id,
      activationCode: data.activation_code,
      tagUid: data.tag_uid,
      status: data.status,
      claimedBy: data.claimed_by,
      claimedAt: data.claimed_at,
      binderId: data.binder_id,
    };
  } catch (error) {
    console.error('[35E] Error validating activation code:', error);
    return null;
  }
}

// ============================================
// CLAIMING FUNCTIONS
// ============================================

/**
 * Claim an available activation code for the current user.
 * Sets status to 'claimed' and links it to the user.
 * 
 * Call this AFTER the user enters a valid code and BEFORE creating the binder.
 * The binder_id can be linked later with linkCodeToBinder().
 */
export async function claimCode(codeId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[35E] Cannot claim code: user not authenticated');
      return false;
    }

    const { error } = await supabase
      .from('registered_tags')
      .update({
        status: 'claimed',
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', codeId)
      .eq('status', 'available'); // Only claim if still available (prevents race conditions)

    if (error) {
      console.error('[35E] Error claiming code:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[35E] Error claiming code:', error);
    return false;
  }
}

/**
 * Link a claimed activation code to a specific binder.
 * Call this AFTER creating the binder (in the questionnaire flow).
 */
export async function linkCodeToBinder(codeId: string, binderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('registered_tags')
      .update({ binder_id: binderId })
      .eq('id', codeId);

    if (error) {
      console.error('[35E] Error linking code to binder:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[35E] Error linking code to binder:', error);
    return false;
  }
}

// ============================================
// BINDER LIMIT FUNCTIONS
// ============================================

/**
 * Get how many activation codes the current user has activated.
 */
export async function getUserActivatedTagCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('registered_tags')
      .select('*', { count: 'exact', head: true })
      .eq('claimed_by', user.id)
      .eq('status', 'claimed');

    if (error) {
      console.error('[35E] Error counting activated codes:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[35E] Error counting activated codes:', error);
    return 0;
  }
}

/**
 * Get the current user's binder limit based on how many codes they've activated.
 * 0 codes → 1 binder
 * 1 code  → 3 binders
 * 2 codes → 5 binders
 * 3+ codes → unlimited (999)
 */
export async function getUserBinderLimit(): Promise<number> {
  const tagCount = await getUserActivatedTagCount();

  if (tagCount >= 3) return 999; // Unlimited
  if (tagCount === 2) return 5;
  if (tagCount === 1) return 3;
  return 1;
}

/**
 * Get the current user's total number of binders.
 */
async function getUserBinderCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('binders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('[35E] Error counting binders:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[35E] Error counting binders:', error);
    return 0;
  }
}

/**
 * Check if the current user can create a new binder.
 * Returns true if they haven't reached their limit.
 */
export async function canUserCreateBinder(): Promise<boolean> {
  const [currentBinders, binderLimit] = await Promise.all([
    getUserBinderCount(),
    getUserBinderLimit(),
  ]);

  return currentBinders < binderLimit;
}

/**
 * Get full binder usage info for the current user.
 * Useful for displaying the binder count indicator in the UI.
 */
export async function getUserBinderInfo(): Promise<BinderUsageInfo> {
  const [currentBinders, tagsActivated] = await Promise.all([
    getUserBinderCount(),
    getUserActivatedTagCount(),
  ]);

  let binderLimit: number;
  if (tagsActivated >= 3) {
    binderLimit = 999; // Unlimited
  } else if (tagsActivated === 2) {
    binderLimit = 5;
  } else if (tagsActivated === 1) {
    binderLimit = 3;
  } else {
    binderLimit = 1;
  }

  return {
    currentBinders,
    binderLimit,
    tagsActivated,
    isUnlimited: tagsActivated >= 3,
  };
}

// ============================================
// CODE INFO FOR BINDER
// ============================================

/**
 * Get the activation code info linked to a specific binder.
 * Returns null if the binder has no activation code linked.
 */
export async function getCodeForBinder(binderId: string): Promise<TagInfo | null> {
  try {
    const { data, error } = await supabase
      .from('registered_tags')
      .select('id, activation_code, tag_uid, status, claimed_by, claimed_at, binder_id')
      .eq('binder_id', binderId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      activationCode: data.activation_code,
      tagUid: data.tag_uid,
      status: data.status,
      claimedBy: data.claimed_by,
      claimedAt: data.claimed_at,
      binderId: data.binder_id,
    };
  } catch (error) {
    console.error('[35E] Error getting code for binder:', error);
    return null;
  }
}

// ============================================
// TRANSFER FUNCTIONS (Step 35I)
// ============================================

/**
 * Transfer a binder's activation code to make it available for a new owner.
 * - Resets the code to 'available'
 * - Removes the code link from the binder (binder data stays)
 * - Records the transfer in previous_owners
 * 
 * Returns true on success, false on failure.
 */
export async function transferBinderCode(binderId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[35I] Cannot transfer: user not authenticated');
      return false;
    }

    // Find the code linked to this binder
    const codeInfo = await getCodeForBinder(binderId);
    if (!codeInfo) {
      console.error('[35I] No activation code linked to this binder');
      return false;
    }

    // Make sure the current user owns this code
    if (codeInfo.claimedBy !== user.id) {
      console.error('[35I] User does not own this activation code');
      return false;
    }

    // Reset the code to 'available' and add current owner to previous_owners
    // We need to first get the current previous_owners array
    const { data: currentTag, error: fetchError } = await supabase
      .from('registered_tags')
      .select('previous_owners')
      .eq('id', codeInfo.id)
      .single();

    if (fetchError) {
      console.error('[35I] Error fetching code data:', fetchError);
      return false;
    }

    const previousOwners = currentTag?.previous_owners || [];
    previousOwners.push(user.id);

    // Update the code: reset to available
    const { error: updateError } = await supabase
      .from('registered_tags')
      .update({
        status: 'available',
        claimed_by: null,
        claimed_at: null,
        binder_id: null,
        previous_owners: previousOwners,
      })
      .eq('id', codeInfo.id);

    if (updateError) {
      console.error('[35I] Error resetting code:', updateError);
      return false;
    }

    // Remove the NFC tag link from the binder (keep binder data)
    const { error: binderError } = await supabase
      .from('binders')
      .update({ nfc_tag_id: null })
      .eq('id', binderId)
      .eq('user_id', user.id);

    if (binderError) {
      console.error('[35I] Error unlinking binder:', binderError);
      // Code was already reset, so this is a partial failure
      // The transfer still "worked" from the code's perspective
    }

    console.log('[35I] Binder transfer successful');
    return true;
  } catch (error) {
    console.error('[35I] Error transferring binder:', error);
    return false;
  }
}
