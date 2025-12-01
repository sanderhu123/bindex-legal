import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import SetSelector from '../../components/Binder/SetSelector';
import { getSets } from '../../services/api/pokemonApi';
import type { PokemonSet } from '../../services/api/pokemonApi';

interface Step2MasterSetProps {
  selectedSetName: string | null;
  onSetChange: (setName: string) => void;
}

export default function Step2MasterSet({
  selectedSetName,
  onSetChange,
}: Step2MasterSetProps) {
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      const fetchedSets = await getSets();
      setSets(fetchedSets);
    } catch (error) {
      console.error('Error loading sets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group sets by era (series)
  const eras = React.useMemo(() => {
    const eraMap = new Map<string, PokemonSet[]>();
    sets.forEach((set) => {
      const era = set.series;
      if (!eraMap.has(era)) {
        eraMap.set(era, []);
      }
      eraMap.get(era)!.push(set);
    });
    
    // Convert to array and sort sets within each era (newest first)
    return Array.from(eraMap.entries()).map(([era, eraSets]) => ({
      era,
      sets: eraSets.sort(
        (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      ),
    }));
  }, [sets]);

  // Get sets for selected era
  const setsInSelectedEra = React.useMemo(() => {
    if (!selectedEra) return [];
    const eraData = eras.find((e) => e.era === selectedEra);
    return eraData?.sets || [];
  }, [selectedEra, eras]);

  // Reset set selection when era changes
  useEffect(() => {
    if (selectedEra && selectedSetName) {
      const setExistsInEra = setsInSelectedEra.some((s) => s.name === selectedSetName);
      if (!setExistsInEra) {
        onSetChange(null);
      }
    }
  }, [selectedEra]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sets...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Select Set</Text>
      <Text style={styles.description}>
        Choose the Pokémon TCG set you want to collect.
      </Text>

      {!selectedEra ? (
        // Show eras first
        <View>
          <Text style={styles.sectionTitle}>Select Era</Text>
          {eras.map(({ era }) => (
            <TouchableOpacity
              key={era}
              style={styles.eraOption}
              onPress={() => setSelectedEra(era)}
            >
              <Text style={styles.eraLabel}>{era}</Text>
              <Text style={styles.eraSubtext}>
                {eras.find((e) => e.era === era)?.sets.length || 0} sets
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        // Show sets within selected era
        <View>
          <TouchableOpacity
            style={styles.backToEras}
            onPress={() => {
              setSelectedEra(null);
              onSetChange(null);
            }}
          >
            <Text style={styles.backToErasText}>← Back to Eras</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>{selectedEra}</Text>
          <SetSelector
            sets={setsInSelectedEra}
            selectedSetName={selectedSetName}
            onSelect={onSetChange}
          />
        </View>
      )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  eraOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  eraLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eraSubtext: {
    fontSize: 14,
    color: '#666',
  },
  backToEras: {
    padding: 12,
    marginBottom: 16,
  },
  backToErasText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
