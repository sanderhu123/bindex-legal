import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
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
                  <ActivityIndicator size="small" color="#007AFF" />
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  itemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F0FF',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 40,
    marginRight: 12,
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
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});



