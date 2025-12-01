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
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
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
      binders: [], // Will be populated when binders are fetched
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
  };
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

