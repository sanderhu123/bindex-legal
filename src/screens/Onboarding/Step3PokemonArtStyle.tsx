import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography, borderRadius, shadows, screenPadding, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { PokemonArtStyle } from '../../types';

interface Step3PokemonArtStyleProps {
  value: PokemonArtStyle | null;
  onChange: (style: PokemonArtStyle) => void;
}

const PIKACHU_ID = 25;

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    console.log('Pikachu image URLs:', PIKACHU_IMAGES);
  }, []);

  const handleOptionImageLoad = (style: PokemonArtStyle) => {
    console.log(`Image loaded successfully for ${style}`);
    setOptionImageLoadStates((prev) => ({ ...prev, [style]: true }));
  };

  const handleImageError = (error: any, style: PokemonArtStyle) => {
    console.error(`Failed to load image for ${style}:`, PIKACHU_IMAGES[style], error);
    setImageErrors((prev) => ({ ...prev, [style]: true }));
    setOptionImageLoadStates((prev) => ({ ...prev, [style]: true }));
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
                        <ActivityIndicator size="small" color={colors.textTertiary} />
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
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: screenPadding,
  },
  title: {
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.base,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  imageHidden: {
    opacity: 0,
  },
  option: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionImageContainer: {
    width: 80,
    height: 80,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
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
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  errorText: {
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
    color: colors.textLight,
  },
});
