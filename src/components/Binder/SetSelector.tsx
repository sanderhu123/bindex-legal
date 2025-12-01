import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PokemonSet } from '../../services/api/pokemonApi';

interface SetSelectorProps {
  sets: PokemonSet[];
  selectedSetName: string | null;
  onSelect: (setName: string) => void;
}

export default function SetSelector({ sets, selectedSetName, onSelect }: SetSelectorProps) {
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
        const isSelected = selectedSetName === item.name;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(item.name)}
          >
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>
              {item.series} • {item.releaseDate}
            </Text>
          </TouchableOpacity>
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



