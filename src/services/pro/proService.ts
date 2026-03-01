import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import type { BinderUsage, UserTier } from '../../types';

// ── RevenueCat Configuration ──────────────────────────────────────────────
// Replace these with your actual RevenueCat API keys from:
// https://app.revenuecat.com → Project → API Keys
const REVENUECAT_API_KEY_APPLE = 'YOUR_APPLE_API_KEY_HERE';
const REVENUECAT_API_KEY_GOOGLE = 'YOUR_GOOGLE_API_KEY_HERE';

const PRO_ENTITLEMENT_ID = 'pro';

// Free tier limits
const FREE_MAX_LIFETIME_BINDERS = 2; // 1 original + 1 do-over recreation
const FREE_MAX_DELETIONS = 1;        // 1 do-over

/**
 * Initialize RevenueCat SDK. Call once at app startup.
 */
export async function initializeRevenueCat(): Promise<void> {
  try {
    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_APPLE
      : REVENUECAT_API_KEY_GOOGLE;

    await Purchases.configure({ apiKey });
    console.log('[Pro] RevenueCat initialized');
  } catch (error) {
    console.warn('[Pro] Failed to initialize RevenueCat:', error);
  }
}

/**
 * Identify the current user with RevenueCat (call after login).
 */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('[Pro] User identified with RevenueCat:', userId);
  } catch (error) {
    console.warn('[Pro] Failed to identify user:', error);
  }
}

/**
 * Check if the current user has Pro access.
 * Checks RevenueCat first (source of truth), then syncs with Supabase.
 */
export async function isUserPro(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const hasPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;

    // Sync with Supabase if RevenueCat says Pro
    if (hasPro) {
      await syncProStatus('pro');
    }

    return hasPro;
  } catch (error) {
    console.warn('[Pro] RevenueCat check failed, falling back to Supabase:', error);
    // Fallback: check Supabase directly
    return await checkSupabaseTier();
  }
}

/**
 * Get the user's current binder usage info.
 */
export async function getBinderUsage(): Promise<BinderUsage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('user_tier, free_deletions_used, lifetime_binders_created')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  const tier: UserTier = profile.user_tier || 'free';
  const lifetimeCreated = profile.lifetime_binders_created || 0;
  const deletionsUsed = profile.free_deletions_used || 0;

  // Count current active binders
  const { count } = await supabase
    .from('binders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const currentBinderCount = count || 0;

  const isPro = tier === 'pro' || await isUserPro();

  return {
    tier: isPro ? 'pro' : 'free',
    canCreate: isPro || lifetimeCreated < FREE_MAX_LIFETIME_BINDERS,
    canDelete: isPro || deletionsUsed < FREE_MAX_DELETIONS,
    currentBinderCount,
    lifetimeBindersCreated: lifetimeCreated,
    freeDeletionsUsed: deletionsUsed,
  };
}

/**
 * Check if the user can create a new binder.
 * Free users: lifetime_binders_created < 2 (1 original + 1 do-over)
 * Pro users: always true
 */
export async function canCreateBinder(): Promise<boolean> {
  try {
    const usage = await getBinderUsage();
    return usage.canCreate;
  } catch (error) {
    console.error('[Pro] Error checking create permission:', error);
    return true; // Fail open — don't block users on errors
  }
}

/**
 * Check if the user can delete a binder.
 * Free users: free_deletions_used < 1
 * Pro users: always true
 */
export async function canDeleteBinder(): Promise<boolean> {
  try {
    const usage = await getBinderUsage();
    return usage.canDelete;
  } catch (error) {
    console.error('[Pro] Error checking delete permission:', error);
    return true; // Fail open
  }
}

/**
 * Record that a binder was created (increments lifetime counter).
 */
export async function recordBinderCreated(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('increment_lifetime_binders', {
    user_id_input: user.id,
  });

  // Fallback if RPC doesn't exist yet: manual update
  if (error) {
    console.warn('[Pro] RPC fallback for recordBinderCreated:', error.message);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('lifetime_binders_created')
      .eq('id', user.id)
      .single();

    await supabase
      .from('user_profiles')
      .update({
        lifetime_binders_created: (profile?.lifetime_binders_created || 0) + 1,
      })
      .eq('id', user.id);
  }
}

/**
 * Record that a free deletion was used (increments do-over counter).
 */
export async function recordDeletionUsed(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('increment_free_deletions', {
    user_id_input: user.id,
  });

  // Fallback if RPC doesn't exist yet
  if (error) {
    console.warn('[Pro] RPC fallback for recordDeletionUsed:', error.message);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('free_deletions_used')
      .eq('id', user.id)
      .single();

    await supabase
      .from('user_profiles')
      .update({
        free_deletions_used: (profile?.free_deletions_used || 0) + 1,
      })
      .eq('id', user.id);
  }
}

/**
 * Purchase Pro upgrade via RevenueCat.
 * Returns true if purchase was successful.
 */
export async function purchasePro(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (!currentOffering || !currentOffering.availablePackages.length) {
      throw new Error('No offerings available');
    }

    // Get the first available package (our Pro product)
    const proPackage = currentOffering.availablePackages[0];
    const { customerInfo } = await Purchases.purchasePackage(proPackage);

    const hasPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;

    if (hasPro) {
      await syncProStatus('pro');
      console.log('[Pro] Purchase successful!');
    }

    return hasPro;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[Pro] User cancelled purchase');
      return false;
    }
    console.error('[Pro] Purchase failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases (required by Apple).
 * Returns true if Pro was restored.
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;

    if (hasPro) {
      await syncProStatus('pro');
      console.log('[Pro] Purchase restored!');
    }

    return hasPro;
  } catch (error) {
    console.error('[Pro] Restore failed:', error);
    throw error;
  }
}

/**
 * Get the Pro upgrade price string (e.g. "$4.99").
 * Returns null if unavailable.
 */
export async function getProPrice(): Promise<string | null> {
  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (!currentOffering || !currentOffering.availablePackages.length) {
      return null;
    }

    return currentOffering.availablePackages[0].product.priceString;
  } catch (error) {
    console.warn('[Pro] Failed to get price:', error);
    return null;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────

async function checkSupabaseTier(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_tier')
      .eq('id', user.id)
      .single();

    return profile?.user_tier === 'pro';
  } catch {
    return false;
  }
}

async function syncProStatus(tier: UserTier): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: Record<string, any> = { user_tier: tier };
    if (tier === 'pro') {
      updates.pro_purchased_at = new Date().toISOString();
    }

    await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);
  } catch (error) {
    console.warn('[Pro] Failed to sync pro status to Supabase:', error);
  }
}
