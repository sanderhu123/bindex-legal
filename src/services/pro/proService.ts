import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import type { BinderUsage, UserTier } from '../../types';

// ── RevenueCat Configuration ──────────────────────────────────────────────
// RevenueCat test keys only work in debug builds, not release APKs.
// Set REVENUECAT_ENABLED to true and add your goog_ / appl_ key when ready to publish.
const REVENUECAT_ENABLED = false;
const REVENUECAT_API_KEY = 'test_lGmWpspQuKtclxqeQpOoPbXKrFy';

const PRO_ENTITLEMENT_ID = 'Bindex Pro';

// Free tier limits
const FREE_MAX_LIFETIME_BINDERS = 2; // 1 original + 1 do-over recreation
const FREE_MAX_DELETIONS = 1;        // 1 do-over

/**
 * Initialize RevenueCat SDK. Call once at app startup.
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!REVENUECAT_ENABLED) {
    console.log('[Pro] RevenueCat disabled — no API key configured yet');
    return;
  }
  try {
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    console.log('[Pro] RevenueCat initialized');
  } catch (error) {
    console.warn('[Pro] Failed to initialize RevenueCat:', error);
  }
}

/**
 * Identify the current user with RevenueCat (call after login).
 * Links the RevenueCat customer to your Supabase user ID.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!REVENUECAT_ENABLED) return;
  try {
    await Purchases.logIn(userId);
    console.log('[Pro] User identified with RevenueCat:', userId);
  } catch (error) {
    console.warn('[Pro] Failed to identify user:', error);
  }
}

/**
 * Check if the current user has the "Bindex Pro" entitlement.
 * Checks RevenueCat first (source of truth), then syncs with Supabase.
 */
export async function isUserPro(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) {
    return await checkSupabaseTier();
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const hasPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;

    if (hasPro) {
      await syncProStatus('pro');
    }

    return hasPro;
  } catch (error) {
    console.warn('[Pro] RevenueCat check failed, falling back to Supabase:', error);
    return await checkSupabaseTier();
  }
}

/**
 * Present the RevenueCat Paywall modally.
 * The paywall design is configured in the RevenueCat dashboard.
 * Returns true if the user purchased or restored Pro.
 */
export async function presentProPaywall(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) {
    console.warn('[Pro] RevenueCat not configured — paywall unavailable');
    return false;
  }
  try {
    const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
    });

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        await syncProStatus('pro');
        console.log('[Pro] Paywall result: purchased/restored');
        return true;
      case PAYWALL_RESULT.NOT_PRESENTED:
        // User already has the entitlement
        console.log('[Pro] Paywall not presented — user already Pro');
        return true;
      case PAYWALL_RESULT.CANCELLED:
        console.log('[Pro] Paywall dismissed by user');
        return false;
      case PAYWALL_RESULT.ERROR:
        console.warn('[Pro] Paywall encountered an error');
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.error('[Pro] Failed to present paywall:', error);
    return false;
  }
}

/**
 * Present the paywall unconditionally (even if user is already Pro).
 * Useful for the Upgrade screen where user explicitly navigated there.
 */
export async function presentPaywallAlways(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) {
    console.warn('[Pro] RevenueCat not configured — paywall unavailable');
    return false;
  }
  try {
    const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        await syncProStatus('pro');
        return true;
      default:
        return false;
    }
  } catch (error) {
    console.error('[Pro] Failed to present paywall:', error);
    return false;
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
 * Free users: lifetime_binders_created < 2
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
    return true;
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
 * Restore previous purchases (required by Apple).
 * Returns true if Pro was restored.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!REVENUECAT_ENABLED) {
    console.warn('[Pro] RevenueCat not configured — restore unavailable');
    return false;
  }
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
  if (!REVENUECAT_ENABLED) return null;
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

/**
 * Public wrapper so screens (e.g. UpgradeScreen) can sync pro status to Supabase.
 */
export async function syncProStatusToSupabase(): Promise<void> {
  return syncProStatus('pro');
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
