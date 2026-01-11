import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Image, ImageSource } from 'expo-image';

// Track failed image URLs for debugging
const failedImageUrls: Set<string> = new Set();
let failedImageCount = 0;

/**
 * Get a summary of failed image loads for debugging
 */
export function getFailedImageSummary(): { count: number; urls: string[] } {
  return {
    count: failedImageCount,
    urls: Array.from(failedImageUrls).slice(0, 50), // Limit to first 50
  };
}

/**
 * Log a summary of failed images to console
 */
export function logFailedImageSummary(): void {
  const summary = getFailedImageSummary();
  if (summary.count === 0) {
    console.log('[IMAGE-DEBUG] No failed images recorded');
    return;
  }
  
  console.log('[IMAGE-DEBUG] ========================================');
  console.log('[IMAGE-DEBUG] FAILED IMAGE SUMMARY');
  console.log('[IMAGE-DEBUG] Total failed:', summary.count);
  console.log('[IMAGE-DEBUG] Unique URLs:', failedImageUrls.size);
  console.log('[IMAGE-DEBUG] ========================================');
  
  // Group by set ID for easier analysis
  const bySet: Record<string, string[]> = {};
  for (const url of summary.urls) {
    // Extract set ID from URL like: https://assets.tcgdex.net/en/sm/smp/198/low.png
    const match = url.match(/assets\.tcgdex\.net\/en\/([^/]+(?:\/[^/]+)?)\//);
    const setPath = match ? match[1] : 'unknown';
    if (!bySet[setPath]) bySet[setPath] = [];
    bySet[setPath].push(url);
  }
  
  for (const [setPath, urls] of Object.entries(bySet)) {
    console.log(`[IMAGE-DEBUG] Set "${setPath}": ${urls.length} failed`);
    urls.slice(0, 3).forEach(url => console.log(`[IMAGE-DEBUG]   - ${url}`));
    if (urls.length > 3) console.log(`[IMAGE-DEBUG]   ... and ${urls.length - 3} more`);
  }
  console.log('[IMAGE-DEBUG] ========================================');
}

interface CardImageProps {
  source?: string | ImageSource; // Optional - Region mode doesn't have images
  style?: any;
  isMissing?: boolean;
  aspectRatio?: number;
  onError?: () => void;
  priority?: 'low' | 'normal' | 'high'; // Image loading priority
  cardInfo?: { id?: string; name?: string; set?: string }; // Optional card info for better error logging
}

/**
 * CardImage component for displaying Pokémon card images
 * Features:
 * - Image caching (via expo-image with memory-disk policy)
 * - Loading placeholder with spinner
 * - Error handling with fallback placeholder
 * - Missing card opacity (50% transparency)
 * - Optimized loading with priority support
 * - Performance optimizations (Step 24G)
 */
export default function CardImage({
  source,
  style,
  isMissing = false,
  aspectRatio = 0.7, // Default card aspect ratio (height/width)
  onError,
  priority = 'normal', // Default priority
  cardInfo,
}: CardImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0); // Key to force image remount on retry
  const MAX_RETRIES = 2;

  const handleLoadEnd = () => {
    // Only log on first successful load (not retries that eventually worked)
    if (retryCount === 0) {
      // Successful load on first try - no need to log
    } else {
      console.log('[24G] Image loaded after retry:', { 
        source: typeof source === 'string' ? source.substring(0, 80) : 'ImageSource object',
        attempts: retryCount + 1,
      });
    }
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    // Check if we can still retry
    if (retryCount < MAX_RETRIES) {
      // Silent retry - don't log errors for retries that might succeed
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      setHasError(false);
      // Use setTimeout to give network a moment, then change key to force remount
      setTimeout(() => {
        setRetryKey(prev => prev + 1);
      }, 300);
    } else {
      // Max retries reached - track and log the error
      const fullUrl = typeof source === 'string' ? source : 'ImageSource object';
      
      // Track failed URLs for summary
      if (typeof source === 'string') {
        failedImageUrls.add(source);
      }
      failedImageCount++;
      
      // Log with full URL and card info for debugging
      console.error('[IMAGE-FAIL]', { 
        url: fullUrl,
        cardId: cardInfo?.id || 'unknown',
        cardName: cardInfo?.name || 'unknown',
        cardSet: cardInfo?.set || 'unknown',
        attempts: retryCount + 1,
        error: error?.message || 'Unknown error',
        totalFailures: failedImageCount,
      });
      
      setIsLoading(false);
      setHasError(true);
      onError?.();
    }
  };

  // Handle empty/missing imageUrl (for Region mode)
  const hasImage = source && (typeof source === 'string' ? source.trim() !== '' : true);
  
  // If no image source, show placeholder immediately
  if (!hasImage) {
    const containerStyle: any[] = [styles.container];
    const hasFixedDimensions = style && typeof style === 'object' && 
      (typeof (style as any).width === 'number' || typeof (style as any).height === 'number');
    if (!hasFixedDimensions) {
      containerStyle.push({ aspectRatio });
    }
    if (isMissing) {
      containerStyle.push(styles.missing);
    }
    if (style) {
      containerStyle.push(style);
    }
    
    return (
      <View style={containerStyle}>
        <View style={styles.noImagePlaceholder}>
          <Text style={styles.noImageText}>?</Text>
        </View>
      </View>
    );
  }

  const imageSource = typeof source === 'string' ? { uri: source } : source;

  // Build container style - only apply aspectRatio if no fixed pixel width/height in style
  // Check if width/height are numeric (pixel values), not percentages or '100%'
  const hasFixedDimensions = style && typeof style === 'object' && 
    (typeof (style as any).width === 'number' || typeof (style as any).height === 'number');
  
  const containerStyle: any[] = [styles.container];
  if (!hasFixedDimensions) {
    containerStyle.push({ aspectRatio });
  }
  if (isMissing) {
    containerStyle.push(styles.missing);
  }
  if (style) {
    containerStyle.push(style);
  }

  return (
    <View style={containerStyle}>
      {!hasError ? (
        <>
          <Image
            key={retryKey} // Force remount when retrying to trigger new fetch
            source={imageSource}
            style={styles.image}
            contentFit="contain"
            transition={200} // Smooth fade-in
            cachePolicy="memory-disk" // Cache in memory and disk for offline access
            priority={priority} // Load priority (high for detail view, normal for grid)
            recyclingKey={typeof source === 'string' ? source : undefined} // Help with recycling in lists
            onLoadEnd={handleLoadEnd}
            onError={handleError}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#999" />
              {retryCount > 0 && (
                <Text style={styles.retryText}>Retry {retryCount}/{MAX_RETRIES}</Text>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.errorPlaceholder}>
          <Text style={styles.errorText}>?</Text>
          <Text style={styles.errorSubtext}>Image unavailable</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  missing: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
  },
  retryText: {
    marginTop: 4,
    fontSize: 10,
    color: '#999',
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  errorText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  errorSubtext: {
    marginTop: 4,
    fontSize: 10,
    color: '#999',
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noImageText: {
    fontSize: 32,
    color: '#ccc',
    fontWeight: 'bold',
  },
});

