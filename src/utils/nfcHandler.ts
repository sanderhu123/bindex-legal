import { Linking, Platform } from 'react-native';
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
 * Handles both Android NFC intents and iOS NFC deep links
 */
export function extractNfcTagIdFromUrl(url: string): string | null {
  try {
    // Parse the URL
    const parsed = LinkingExpo.parse(url);
    
    // Check for NFC tag ID in query parameters or path
    // Format: trackerapp://nfc?tagId=ABC123 or trackerapp://nfc/ABC123
    if (parsed.path === 'nfc' || parsed.path?.startsWith('nfc/')) {
      // Try query parameter first
      if (parsed.queryParams?.tagId) {
        return parsed.queryParams.tagId as string;
      }
      
      // Try path parameter: nfc/ABC123
      const pathParts = parsed.path.split('/');
      if (pathParts.length > 1 && pathParts[1]) {
        return pathParts[1];
      }
    }

    // Android NFC intent format
    // The tag ID might be in the intent data
    if (Platform.OS === 'android') {
      // Check for NFC-related query params
      if (parsed.queryParams?.nfcTagId) {
        return parsed.queryParams.nfcTagId as string;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting NFC tag ID from URL:', error);
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






