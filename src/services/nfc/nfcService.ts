import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { Platform } from 'react-native';

/**
 * Initialize NFC manager
 * Should be called when app starts
 */
export async function initNfc(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }
    await NfcManager.start();
    return true;
  } catch (error) {
    console.error('Error initializing NFC:', error);
    return false;
  }
}

/**
 * Check if NFC is available on the device
 */
export async function isNfcAvailable(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }
    return await NfcManager.isSupported();
  } catch (error) {
    console.error('Error checking NFC availability:', error);
    return false;
  }
}

/**
 * Check if NFC is enabled on the device
 */
export async function isNfcEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }
    return await NfcManager.isEnabled();
  } catch (error) {
    console.error('Error checking NFC enabled status:', error);
    return false;
  }
}

/**
 * Read NFC tag ID from a scanned tag
 * Returns the tag ID as a string (hex format)
 */
export async function readNfcTagId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      throw new Error('NFC is not supported on web');
    }

    // Check if NFC is available and enabled
    const available = await isNfcAvailable();
    if (!available) {
      throw new Error('NFC is not available on this device');
    }

    const enabled = await isNfcEnabled();
    if (!enabled) {
      throw new Error('NFC is not enabled. Please enable NFC in your device settings.');
    }

    // Request NFC technology (try Ndef first, fallback to NfcA)
    let tech = NfcTech.Ndef;
    try {
      await NfcManager.requestTechnology(tech);
    } catch {
      // Try NfcA if Ndef fails
      tech = NfcTech.NfcA;
      await NfcManager.requestTechnology(tech);
    }

    // Read the tag
    const tag = await NfcManager.getTag();
    
    // Extract tag ID from the tag
    // The tag ID is in tag.id (as hex string) or tag.ndefMessage
    if (tag && tag.id) {
      // Tag ID is already a hex string
      return tag.id.toUpperCase();
    }

    // Fallback: try to get ID from tag data
    if (tag && (tag as any).ndefMessage) {
      // If we have NDEF data, try to extract ID from there
      // For now, return null if we can't get a clear ID
      return null;
    }

    return null;
  } catch (error: any) {
    console.error('Error reading NFC tag:', error);
    
    // Handle specific error cases
    if (error.message?.includes('not available')) {
      throw new Error('NFC is not available on this device');
    }
    if (error.message?.includes('not enabled')) {
      throw new Error('NFC is not enabled. Please enable NFC in your device settings.');
    }
    if (error.message?.includes('timeout') || error.message?.includes('cancelled')) {
      throw new Error('NFC scan cancelled or timed out');
    }
    
    throw error;
  } finally {
    // Always cancel the NFC session
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (cancelError) {
      // Ignore cancel errors
    }
  }
}

/**
 * Write data to an NFC tag (optional - for future use)
 * Currently not needed for the app, but included for completeness
 * 
 * Note: Writing to NFC tags is not implemented yet as it's not required for the initial app.
 * This function is a placeholder for future functionality.
 */
export async function writeNfcTag(data: string): Promise<boolean> {
  // Not implemented yet - writing to NFC tags is not required for the initial app
  throw new Error('NFC tag writing is not implemented yet');
}

/**
 * Handle NFC intent from app launch (Android)
 * This extracts the NFC tag ID from the intent when app launches via NFC
 */
export function getNfcTagIdFromIntent(): string | null {
  // This will be handled by the NFC handler utility
  // which will use React Native's Linking API or expo-linking
  // For now, return null - actual implementation will be in nfcHandler.ts
  return null;
}

