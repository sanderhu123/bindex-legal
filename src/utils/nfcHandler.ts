import { Linking } from 'react-native';
import * as LinkingExpo from 'expo-linking';
import { getBinderByNfcTagId, checkNfcTagOwnership } from '../services/supabase/binders';
import type { Binder } from '../types';

/**
 * Result of NFC tag handling
 */
export interface NfcHandleResult {
  success: boolean;
  binder?: Binder;
  tagId?: string;
  error?: string;
  isNewTag?: boolean;
}

/**
 * Handle NFC tag scan and determine routing
 * 
 * Flow:
 * 1. Read NFC tag ID
 * 2. Check if tag is linked to a binder
 * 3. If linked: Check ownership
 *    - If owned by user: Return binder (existing tag)
 *    - If owned by another user: Return error
 * 4. If not linked: Return new tag indicator (triggers questionnaire)
 */
export async function handleNfcTag(tagId: string): Promise<NfcHandleResult> {
  try {
    // Check if tag is linked to a binder
    const binder = await getBinderByNfcTagId(tagId);

    if (binder) {
      // Tag is linked to a binder
      // getBinderByNfcTagId already checks ownership, so if we get here, it's the user's binder
      return {
        success: true,
        binder,
        tagId,
        isNewTag: false,
      };
    } else {
      // Tag is not linked to any binder - it's a new tag
      // Check if tag belongs to another user (edge case - tag might exist but not be linked)
      const belongsToUser = await checkNfcTagOwnership(tagId);
      
      if (!belongsToUser) {
        // Tag is new and available
        return {
          success: true,
          tagId,
          isNewTag: true,
        };
      } else {
        // This shouldn't happen, but handle it just in case
        return {
          success: false,
          error: 'Unable to process NFC tag',
        };
      }
    }
  } catch (error: any) {
    console.error('Error handling NFC tag:', error);
    
    // Handle specific error cases
    if (error.message?.includes('belongs to another user')) {
      return {
        success: false,
        error: 'This binder belongs to someone else',
      };
    }
    
    if (error.message?.includes('not authenticated')) {
      return {
        success: false,
        error: 'Please log in to use NFC tags',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to process NFC tag',
    };
  }
}

/**
 * Extract NFC tag ID from app launch URL/intent
 * 
 * Supports multiple URL formats:
 * 1. Web URL (NFC tag):   https://yourdomain.com/binder?tag=ABC123
 * 2. App scheme (legacy):  trackerapp://nfc?tagId=ABC123
 * 3. App scheme path:      trackerapp://nfc/ABC123
 */
export function extractNfcTagIdFromUrl(url: string): string | null {
  try {
    console.log('[NFC] Extracting tag ID from URL:', url);

    // Method 1: Check for web URL format (from NFC tag)
    // Format: https://yourdomain.com/binder?tag=TAG_ID
    if (url.includes('/binder')) {
      // Use URL constructor for https URLs
      try {
        const urlObj = new URL(url);
        const tag = urlObj.searchParams.get('tag');
        if (tag) {
          console.log('[NFC] Found tag from web URL:', tag);
          return tag;
        }
      } catch {
        // URL constructor may fail for non-standard URLs, continue to other methods
      }
    }

    // Method 2: Parse with expo-linking (handles app scheme URLs)
    const parsed = LinkingExpo.parse(url);
    
    // Check for ?tag= query param (new format, works with any URL scheme)
    if (parsed.queryParams?.tag) {
      console.log('[NFC] Found tag from query param:', parsed.queryParams.tag);
      return parsed.queryParams.tag as string;
    }

    // Check for ?tagId= query param (legacy format)
    if (parsed.queryParams?.tagId) {
      console.log('[NFC] Found tag from legacy tagId param:', parsed.queryParams.tagId);
      return parsed.queryParams.tagId as string;
    }

    // Check for ?nfcTagId= query param (legacy Android format)
    if (parsed.queryParams?.nfcTagId) {
      console.log('[NFC] Found tag from legacy nfcTagId param:', parsed.queryParams.nfcTagId);
      return parsed.queryParams.nfcTagId as string;
    }

    // Method 3: Check path-based format (trackerapp://nfc/ABC123)
    if (parsed.path === 'nfc' || parsed.path?.startsWith('nfc/')) {
      const pathParts = parsed.path.split('/');
      if (pathParts.length > 1 && pathParts[1]) {
        console.log('[NFC] Found tag from path:', pathParts[1]);
        return pathParts[1];
      }
    }

    console.log('[NFC] No tag ID found in URL');
    return null;
  } catch (error) {
    console.error('[NFC] Error extracting tag ID from URL:', error);
    return null;
  }
}

/**
 * Handle app launch from NFC tag
 * This should be called when the app launches via NFC intent
 * 
 * Usage:
 * - Call this in App.tsx or root component when app launches
 * - Check if app was launched via NFC
 * - Extract tag ID and handle routing
 */
export async function handleNfcAppLaunch(): Promise<NfcHandleResult | null> {
  try {
    // Get the initial URL (if app was launched via NFC)
    const initialUrl = await Linking.getInitialURL();
    
    if (!initialUrl) {
      // App was not launched via NFC
      return null;
    }

    // Extract tag ID from URL
    const tagId = extractNfcTagIdFromUrl(initialUrl);
    
    if (!tagId) {
      // URL doesn't contain NFC tag ID
      return null;
    }

    // Handle the NFC tag
    return await handleNfcTag(tagId);
  } catch (error) {
    console.error('Error handling NFC app launch:', error);
    return null;
  }
}

/**
 * Listen for NFC deep links while app is running
 * Returns a subscription that can be unsubscribed
 */
export function subscribeToNfcLinks(
  callback: (result: NfcHandleResult) => void
): { remove: () => void } {
  const subscription = Linking.addEventListener('url', async (event) => {
    const tagId = extractNfcTagIdFromUrl(event.url);
    
    if (tagId) {
      const result = await handleNfcTag(tagId);
      callback(result);
    }
  });

  return {
    remove: () => {
      subscription.remove();
    },
  };
}












