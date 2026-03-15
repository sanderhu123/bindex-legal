import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, typography, borderRadius } from '../../constants/theme';
import type { PokemonSet } from '../../services/api/pokemonApi';

interface SetSelectorProps {
  sets: PokemonSet[];
  selectedSetId: string | null;
  onSelect: (setId: string, setName: string) => void;
}

// Individual set item component with loading state
function SetItem({ item, isSelected, onSelect }: { item: PokemonSet; isSelected: boolean; onSelect: (id: string, name: string) => void }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Use logo if available, otherwise use symbol
  const imageUrl = item.logo || item.symbol || '';
  const hasImage = imageUrl.length > 0;

  return (
    <TouchableOpacity
      key={item.id}
      style={[styles.item, isSelected && styles.itemSelected]}
      onPress={() => onSelect(item.id, item.name)}
    >
      <View style={styles.itemContent}>
        <View style={styles.logoContainer}>
          {hasImage && !imageError ? (
            <>
              {imageLoading && (
                <View style={styles.logoPlaceholder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
              <Image
                source={{ 
                  uri: imageUrl,
                  cache: 'force-cache', // Cache images aggressively
                }}
                style={[styles.setLogo, imageLoading && styles.hiddenImage]}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </>
          ) : (
            // Fallback placeholder when no logo/symbol or error
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>🎴</Text>
            </View>
          )}
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>
            {item.series} • {item.releaseDate}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SetSelector({ sets, selectedSetId, onSelect }: SetSelectorProps) {
  // Sort newest → oldest by releaseDate
  const sortedSets = [...sets].sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );

  if (sortedSets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sets available (mock data not loaded).</Text>
      </View>
    );
  }

  return (
    <View>
      {sortedSets.map((item) => {
        const isSelected = selectedSetId === item.id;
        return (
          <SetItem
            key={item.id}
            item={item}
            isSelected={isSelected}
            onSelect={onSelect}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 40,
    marginRight: spacing.md,
    position: 'relative',
  },
  setLogo: {
    width: 60,
    height: 40,
  },
  hiddenImage: {
    opacity: 0,
  },
  logoPlaceholder: {
    width: 60,
    height: 40,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  logoPlaceholderText: {
    fontSize: 24,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: typography.sm,
    color: colors.textTertiary,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
  },
});



