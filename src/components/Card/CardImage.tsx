import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { fonts, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Image, ImageSource } from 'expo-image';
import { isCustomCard, getCustomCardColor, getCustomCardTextColor } from '../../services/supabase/customCards';

/**
 * CardBackPlaceholder - A styled placeholder that looks like a Pokémon card back
 * Used when card images are not available from the API.
 * Shows card name and number when available so users can identify the card.
 */
function CardBackPlaceholder({ style, cardName, cardNumber }: { style?: any; cardName?: string; cardNumber?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasCardInfo = !!(cardName || cardNumber);

  return (
    <View style={[styles.cardBackContainer, style]}>
      <View style={styles.cardBackInner}>
        <View style={styles.cardBackBorder}>
          {hasCardInfo ? (
            <View style={styles.cardInfoCenter}>
              {cardNumber ? (
                <Text style={styles.cardInfoNumber}>#{cardNumber}</Text>
              ) : null}
              {cardName ? (
                <Text style={styles.cardInfoName} numberOfLines={3}>{cardName}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.pokeballOuter}>
              <View style={styles.pokeballDivider} />
              <View style={styles.pokeballCenter}>
                <View style={styles.pokeballButton} />
              </View>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.cardBackText}>No Image</Text>
    </View>
  );
}

/**
 * CustomCardPlaceholder - Solid colored card with the user's name centered.
 * Used for user-created custom placeholder cards.
 */
function CustomCardPlaceholder({ style, cardName, backgroundColor, textColor }: {
  style?: any;
  cardName?: string;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.customCardContainer, { backgroundColor }, style]}>
      <Text
        style={[styles.customCardName, { color: textColor }]}
        numberOfLines={3}
      >
        {cardName || 'Custom Card'}
      </Text>
    </View>
  );
}

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
  lowResSource?: string; // Low-res image to show instantly while high-res loads (progressive loading)
  style?: any;
  isMissing?: boolean;
  aspectRatio?: number;
  onError?: () => void;
  priority?: 'low' | 'normal' | 'high'; // Image loading priority
  cardInfo?: { id?: string; name?: string; number?: string; set?: string };
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
  lowResSource,
  style,
  isMissing = false,
  aspectRatio = 0.716, // TCG card aspect ratio (245×342 image pixels)
  onError,
  priority = 'normal', // Default priority
  cardInfo,
}: CardImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0); // Key to force image remount on retry
  const [hiResLoaded, setHiResLoaded] = useState(false); // Tracks if high-res image has loaded
  const MAX_RETRIES = 2;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Check if we're doing progressive loading (low-res → high-res)
  const hasLowRes = !!lowResSource && typeof source === 'string' && lowResSource !== source;

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

  // Custom placeholder cards render as a solid colored rectangle
  const isCustom = cardInfo?.id ? isCustomCard(cardInfo.id) : false;
  if (isCustom && cardInfo) {
    const bgColor = getCustomCardColor({ id: cardInfo.id!, name: cardInfo.name || '', number: '', set: cardInfo.set || '', rarity: '', illustrator: '' });
    const txtColor = getCustomCardTextColor({ id: cardInfo.id!, name: cardInfo.name || '', number: '', set: cardInfo.set || '', rarity: '', illustrator: '' });
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
        <CustomCardPlaceholder
          cardName={cardInfo.name}
          backgroundColor={bgColor}
          textColor={txtColor}
        />
      </View>
    );
  }

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
        <CardBackPlaceholder cardName={cardInfo?.name} cardNumber={cardInfo?.number} />
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
          {/* Progressive loading: show low-res image instantly (from cache), then high-res on top */}
          {hasLowRes && !hiResLoaded && (
            <Image
              source={{ uri: lowResSource }}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
            />
          )}
          <Image
            key={retryKey} // Force remount when retrying to trigger new fetch
            source={imageSource}
            style={hasLowRes ? styles.imageOverlay : styles.image}
            contentFit="contain"
            transition={hasLowRes ? 300 : 200} // Slightly longer transition for hi-res swap
            cachePolicy="memory-disk" // Cache in memory and disk for offline access
            priority={priority} // Load priority (high for detail view, normal for grid)
            recyclingKey={typeof source === 'string' ? source : undefined} // Help with recycling in lists
            onLoadEnd={() => {
              handleLoadEnd();
              if (hasLowRes) setHiResLoaded(true);
            }}
            onError={handleError}
          />
          {/* Only show loading spinner if we don't have a low-res to show */}
          {isLoading && !hasLowRes && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#999" />
              {retryCount > 0 && (
                <Text style={styles.retryText}>Retry {retryCount}/{MAX_RETRIES}</Text>
              )}
            </View>
          )}
        </>
      ) : (
        <CardBackPlaceholder cardName={cardInfo?.name} cardNumber={cardInfo?.number} />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    backgroundColor: colors.overlayLight,
  },
  retryText: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textTertiary,
  },
  // Card back placeholder styles (Pokéball design)
  cardBackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a5fb4', // Classic Pokémon card back blue
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardBackInner: {
    width: '85%',
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ffd700', // Gold border
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb', // Slightly lighter blue inside
  },
  pokeballOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pokeballDivider: {
    position: 'absolute',
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceElevated,
    top: '50%',
    marginTop: -2,
  },
  pokeballCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pokeballButton: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfoCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cardInfoNumber: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: '#ffd700',
    marginBottom: 4,
  },
  cardInfoName: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 16,
  },
  cardBackText: {
    position: 'absolute',
    bottom: 8,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: fonts.semibold,
  },
  // Custom placeholder card styles
  customCardContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  customCardName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: 18,
  },
});

