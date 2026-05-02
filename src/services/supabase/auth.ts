import { supabase } from './client';
import type { User } from '../../types';

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, displayName?: string) {
  // For mobile apps, use deep link for email confirmation
  const redirectUrl = 'trackerapp://auth/callback';
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with Google (OAuth)
 */
export async function signInWithGoogle() {
  const redirectUrl = 'trackerapp://auth/callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with Apple (OAuth)
 *
 * Note: Works on iOS when Apple provider is configured in Supabase.
 */
export async function signInWithApple() {
  const redirectUrl = 'trackerapp://auth/callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * Permanently delete the currently authenticated user's account.
 *
 * Calls the `delete_user_account` Postgres function on Supabase, which
 * removes the user from auth.users. All related rows (user_profiles,
 * binders, binder_cards, custom cards, etc.) are removed automatically
 * via ON DELETE CASCADE.
 *
 * After deletion this function also signs the user out locally so the
 * app returns to the login screen.
 */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_user_account');

  if (error) {
    throw error;
  }

  // The auth row is gone; clear any local session so the app logs out.
  try {
    await supabase.auth.signOut();
  } catch {
    // Session may already be invalid at this point — ignore.
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      // Network errors are common in Expo Go on Android
      if (error.message && error.message.includes('Network request failed')) {
        console.warn('[Auth] Network error getting user - this is normal in Expo Go on startup');
        return null;
      }
      throw error;
    }

    if (!user) {
      return null;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Profile might not exist yet, return basic user info
      return {
        id: user.id,
        email: user.email || '',
        displayName: user.user_metadata?.display_name,
        binders: [],
        userTier: 'free' as const,
        freeDeletionsUsed: 0,
        lifetimeBindersCreated: 0,
      };
    }

    // Fetch user's binder IDs
    const { data: userBinders } = await supabase
      .from('binders')
      .select('id')
      .eq('user_id', user.id);

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name || undefined,
      binders: userBinders?.map((b) => b.id) || [],
      userTier: profile.user_tier || 'free',
      freeDeletionsUsed: profile.free_deletions_used || 0,
      lifetimeBindersCreated: profile.lifetime_binders_created || 0,
      proPurchasedAt: profile.pro_purchased_at ? new Date(profile.pro_purchased_at) : undefined,
    };
  } catch (error) {
    // Catch any network errors that slip through
    if (error instanceof Error && error.message.includes('Network request failed')) {
      console.warn('[Auth] Network error getting user (caught) - returning null');
      return null;
    }
    throw error;
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      // Network errors are common in Expo Go on Android
      if (error.message && error.message.includes('Network request failed')) {
        console.warn('[Auth] Network error getting session - this is normal in Expo Go on startup');
        return null;
      }
      throw error;
    }

    return session;
  } catch (error) {
    // Catch any network errors that slip through
    if (error instanceof Error && error.message.includes('Network request failed')) {
      console.warn('[Auth] Network error getting session (caught) - returning null');
      return null;
    }
    throw error;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] onAuthStateChange event:', event);
    if (session?.user) {
      try {
        // Timeout after 6 seconds so the app never gets stuck waiting
        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 6000)
        );
        const user = await Promise.race([getCurrentUser(), timeout]);

        if (user) {
          callback(user);
        } else {
          // Timed out or getCurrentUser returned null — use basic session info
          console.warn('[Auth] getCurrentUser timed out or returned null, using basic info');
          callback({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name,
            binders: [],
            userTier: 'free' as const,
            freeDeletionsUsed: 0,
            lifetimeBindersCreated: 0,
          });
        }
      } catch (error) {
        console.warn('[Auth] Error fetching user profile during auth state change:', error);
        callback({
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.display_name,
          binders: [],
          userTier: 'free' as const,
          freeDeletionsUsed: 0,
          lifetimeBindersCreated: 0,
        });
      }
    } else {
      callback(null);
    }
  });
}

