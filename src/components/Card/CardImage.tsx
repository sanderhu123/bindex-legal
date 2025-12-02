import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Image, ImageSource } from 'expo-image';

interface CardImageProps {
  source?: string | ImageSource; // Optional - Region mode doesn't have images
  style?: any;
  isMissing?: boolean;
  aspectRatio?: number;
  onError?: () => void;
}

/**
 * CardImage component for displaying Pokémon card images
 * Features:
 * - Image caching (via expo-image)
 * - Loading placeholder
 * - Error handling with fallback
 * - Missing card opacity (50% transparency)
 */
export default function CardImage({
  source,
  style,
  isMissing = false,
  aspectRatio = 0.7, // Default card aspect ratio (height/width)
  onError,
}: CardImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
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
            source={imageSource}
            style={styles.image}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
            onLoadEnd={handleLoadEnd}
            onError={handleError}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          )}
        </>
      ) : (
        <View style={styles.errorPlaceholder}>
          <Text style={styles.errorText}>?</Text>
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

