import { useState, useCallback } from 'react';
import { readNfcTagId, isNfcAvailable, isNfcEnabled } from '../services/nfc/nfcService';

/**
 * Hook for NFC scanning functionality
 * Provides state and functions for scanning NFC tags
 */
export function useNfcScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);

  /**
   * Scan for an NFC tag
   * Returns the tag ID if successful, null if cancelled/failed
   */
  const scanTag = useCallback(async (): Promise<string | null> => {
    setIsScanning(true);
    setError(null);
    setTagId(null);

    try {
      // Check if NFC is available
      const available = await isNfcAvailable();
      if (!available) {
        throw new Error('NFC is not available on this device');
      }

      // Check if NFC is enabled
      const enabled = await isNfcEnabled();
      if (!enabled) {
        throw new Error('NFC is not enabled. Please enable NFC in your device settings.');
      }

      // Read the tag
      const id = await readNfcTagId();
      
      if (id) {
        setTagId(id);
        return id;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to scan NFC tag';
      setError(errorMessage);
      console.error('NFC scan error:', err);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Reset the scan state
   */
  const reset = useCallback(() => {
    setIsScanning(false);
    setError(null);
    setTagId(null);
  }, []);

  return {
    scanTag,
    isScanning,
    error,
    tagId,
    reset,
  };
}











