import { Linking } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import { supabase } from '../services/supabase/client';

/**
 * Parse URL hash fragments (used by OAuth callbacks)
 * Format: trackerapp://auth/callback#access_token=xxx&refresh_token=xxx
 */
function parseHashParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
  
  const hash = url.substring(hashIndex + 1);
  const params: Record<string, string> = {};
  
  // Handle both URL-encoded and plain parameters
  hash.split('&').forEach((param) => {
    const equalIndex = param.indexOf('=');
    if (equalIndex === -1) return;
    
    const key = param.substring(0, equalIndex);
    const value = param.substring(equalIndex + 1);
    
    if (key && value) {
      try {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      } catch {
        // If decoding fails, use raw values
        params[key] = value;
      }
    }
  });
  
  return params;
}

/**
 * Handle OAuth callback and email confirmation deep links
 * Formats:
 * - OAuth: trackerapp://auth/callback#access_token=xxx&refresh_token=xxx&type=token
 * - Email: trackerapp://auth/callback?access_token=xxx&refresh_token=xxx&type=signup
 * - Alternative: trackerapp://#access_token=xxx&refresh_token=xxx (path might be null)
 */
export async function handleAuthCallback(url: string): Promise<boolean> {
  try {
    console.log('[Auth Handler] Received URL:', url);
    const parsed = LinkingExpo.parse(url);
    console.log('[Auth Handler] Parsed URL:', JSON.stringify(parsed, null, 2));
    
    // Check if URL contains auth callback indicators
    // Also check for localhost:3000 which might be a fallback redirect from Supabase
    const isAuthCallback = 
      url.includes('auth/callback') ||
      url.includes('access_token') ||
      url.includes('refresh_token') ||
      url.includes('localhost:3000') || // Expo Go fallback
      parsed.path === 'auth/callback' ||
      parsed.path?.includes('auth/callback');
    
    if (isAuthCallback) {
      console.log('[Auth Handler] Detected auth callback');
      
      // OAuth callbacks use hash fragments (#), email confirmations use query params (?)
      const hashParams = parseHashParams(url);
      const queryParams = parsed.queryParams || {};
      
      console.log('[Auth Handler] Hash params:', Object.keys(hashParams).length > 0 ? 'found' : 'none');
      console.log('[Auth Handler] Query params:', Object.keys(queryParams).length > 0 ? 'found' : 'none');
      
      if (Object.keys(hashParams).length > 0) {
        console.log('[Auth Handler] Hash params keys:', Object.keys(hashParams));
      }
      if (Object.keys(queryParams).length > 0) {
        console.log('[Auth Handler] Query params keys:', Object.keys(queryParams));
      }
      
      // Try hash params first (OAuth), then query params (email confirmation)
      const accessToken = (hashParams.access_token || queryParams.access_token) as string;
      const refreshToken = (hashParams.refresh_token || queryParams.refresh_token) as string;
      const type = (hashParams.type || queryParams.type) as string;
      
      console.log('[Auth Handler] Tokens found:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        type 
      });
      
      if (accessToken && refreshToken) {
        console.log('[Auth Handler] Setting session with tokens...');
        try {
          // Create a timeout wrapper that properly handles cancellation
          const setSessionWithTimeout = async () => {
            return new Promise(async (resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('setSession timeout after 15 seconds'));
              }, 15000);
              
              try {
                const result = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                clearTimeout(timeoutId);
                resolve(result);
              } catch (err) {
                clearTimeout(timeoutId);
                reject(err);
              }
            });
          };
          
          const { data, error } = await setSessionWithTimeout() as any;
          
          if (error) {
            console.error('[Auth Handler] Error setting session:', error);
            console.error('[Auth Handler] Error message:', error.message);
            console.error('[Auth Handler] Error details:', JSON.stringify(error, null, 2));
            
            // If setSession fails, try to get the session anyway (Supabase might have stored it)
            console.log('[Auth Handler] Attempting to get session as fallback...');
            const { data: fallbackSession, error: fallbackError } = await supabase.auth.getSession();
            if (fallbackSession?.session) {
              console.log('[Auth Handler] ✅ Found session on fallback, user:', fallbackSession.session.user.email);
              return true;
            }
            if (fallbackError) {
              console.error('[Auth Handler] Fallback session error:', fallbackError);
            }
            return false;
          }
          
          if (data?.session) {
            // Session set successfully - AuthContext will pick this up
            console.log('[Auth Handler] ✅ Session set successfully, user:', data.session.user.email);
            // Force trigger auth state change by getting user
            await supabase.auth.getUser();
            console.log('[Auth Handler] ✅ Auth state change triggered');
            return true;
          } else {
            console.warn('[Auth Handler] ⚠️  Session set but no session data returned');
            // Try to get session anyway
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (sessionCheck?.session) {
              console.log('[Auth Handler] ✅ Session found on retry, user:', sessionCheck.session.user.email);
              await supabase.auth.getUser();
              return true;
            } else {
              console.warn('[Auth Handler] ⚠️  No session found after setSession');
              return false;
            }
          }
        } catch (err: any) {
          console.error('[Auth Handler] Exception setting session:', err);
          console.error('[Auth Handler] Exception message:', err?.message);
          
          // If timeout or other error, try to get session anyway
          if (err?.message?.includes('timeout')) {
            console.log('[Auth Handler] Timeout occurred, checking if session was set anyway...');
            const { data: timeoutSession } = await supabase.auth.getSession();
            if (timeoutSession?.session) {
              console.log('[Auth Handler] ✅ Session found despite timeout, user:', timeoutSession.session.user.email);
              await supabase.auth.getUser();
              return true;
            }
          }
          return false;
        }
      } else {
        console.warn('[Auth Handler] Missing tokens in URL');
        console.warn('[Auth Handler] Full URL for debugging:', url);
        console.warn('[Auth Handler] Hash index:', url.indexOf('#'));
        console.warn('[Auth Handler] Query index:', url.indexOf('?'));
        
        // Sometimes Supabase stores the session automatically, try to get it
        console.log('[Auth Handler] Attempting to get current session as fallback...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Auth Handler] Error getting session:', sessionError);
        }
        if (sessionData.session) {
          console.log('[Auth Handler] Found existing session after callback, user:', sessionData.session.user.email);
          return true;
        } else {
          console.warn('[Auth Handler] No session found after callback');
          // Try waiting a bit and checking again (session might be setting up)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retrySession } = await supabase.auth.getSession();
          if (retrySession.session) {
            console.log('[Auth Handler] Found session on retry, user:', retrySession.session.user.email);
            return true;
          }
        }
      }
    } else {
      console.log('[Auth Handler] URL doesn\'t match auth callback pattern');
      console.log('[Auth Handler] Path:', parsed.path, 'Scheme:', parsed.scheme, 'Hostname:', parsed.hostname);
      
      // Even if it doesn't look like an auth callback, if it's our app scheme, 
      // check if Supabase has a session (it might have been set automatically)
      if (parsed.scheme === 'trackerapp' || url.startsWith('trackerapp://')) {
        console.log('[Auth Handler] This is our app scheme, checking for session anyway...');
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('[Auth Handler] Found session! User:', sessionData.session.user.email);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Auth Handler] Error handling auth callback:', error);
    return false;
  }
}

/**
 * Check for initial auth callback URL (when app launches from email link)
 */
export async function checkInitialAuthCallback(): Promise<boolean> {
  try {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      return await handleAuthCallback(initialUrl);
    }
    return false;
  } catch (error) {
    console.error('Error checking initial auth callback:', error);
    return false;
  }
}




