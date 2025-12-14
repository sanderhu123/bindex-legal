import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import type { PokemonArtStyle } from '../../types';

interface Step3PokemonArtStyleProps {
  value: PokemonArtStyle | null;
  onChange: (style: PokemonArtStyle) => void;
}

// Pikachu's Pokemon ID is 25
const PIKACHU_ID = 25;

// PokeAPI image URLs for Pikachu in different art styles
const PIKACHU_IMAGES = {
  sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${PIKACHU_ID}.png`,
  home: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${PIKACHU_ID}.png`,
  'official-artwork': `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${PIKACHU_ID}.png`,
};

const ART_STYLE_OPTIONS: { key: PokemonArtStyle; label: string; description: string }[] = [
  {
    key: 'sprite',
    label: 'Sprite',
    description: 'Classic pixel-style artwork from the original games',
  },
  {
    key: 'home',
    label: '3D',
    description: 'Modern 3D-style artwork from Pokémon Home',
  },
  {
    key: 'official-artwork',
    label: 'Detailed',
    description: 'High-quality official illustrations',
  },
];

export default function Step3PokemonArtStyle({ value, onChange }: Step3PokemonArtStyleProps) {
  const [optionImageLoadStates, setOptionImageLoadStates] = useState<Record<PokemonArtStyle, boolean>>({
    sprite: false,
    home: false,
    'official-artwork': false,
  });
  const [imageErrors, setImageErrors] = useState<Record<PokemonArtStyle, boolean>>({
    sprite: false,
    home: false,
    'official-artwork': false,
  });

  React.useEffect(() => {
    // Log image URLs for debugging
    console.log('Pikachu image URLs:', PIKACHU_IMAGES);
  }, []);

  const handleOptionImageLoad = (style: PokemonArtStyle) => {
    console.log(`Image loaded successfully for ${style}`);
    setOptionImageLoadStates((prev) => ({ ...prev, [style]: true }));
  };

  const handleImageError = (error: any, style: PokemonArtStyle) => {
    console.error(`Failed to load image for ${style}:`, PIKACHU_IMAGES[style], error);
    setImageErrors((prev) => ({ ...prev, [style]: true }));
    setOptionImageLoadStates((prev) => ({ ...prev, [style]: true })); // Stop loading indicator
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose Pokémon Art Style</Text>
      <Text style={styles.description}>
        Select how you want Pokémon to appear in your binder:
      </Text>

      {ART_STYLE_OPTIONS.map((option) => {
        const isSelected = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(option.key)}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionImageContainer}>
                {imageErrors[option.key] ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>?</Text>
                  </View>
                ) : (
                  <>
                    {!optionImageLoadStates[option.key] && (
                      <View style={styles.optionImagePlaceholder}>
                        <ActivityIndicator size="small" color="#666" />
                      </View>
                    )}
                    <Image
                      source={{ uri: PIKACHU_IMAGES[option.key] }}
                      style={[
                        styles.optionImage,
                        !optionImageLoadStates[option.key] && { opacity: 0 }
                      ]}
                      contentFit="contain"
                      transition={200}
                      cachePolicy="memory-disk"
                      onLoadStart={() => console.log(`Loading image for ${option.key}...`)}
                      onLoadEnd={() => handleOptionImageLoad(option.key)}
                      onError={(error) => handleImageError(error, option.key)}
                    />
                  </>
                )}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  imageHidden: {
    opacity: 0,
  },
  option: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F0FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionImageContainer: {
    width: 80,
    height: 80,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionImagePlaceholder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
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
});

