import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import SetSelector from '../../components/Binder/SetSelector';
import { getSetsMinimal, getSetsBySerie } from '../../services/api/pokemonApi';
import type { PokemonSet } from '../../services/api/pokemonApi';
import TCGdex from '@tcgdex/sdk';

const tcgdex = new TCGdex('en');

interface Step2MasterSetProps {
  selectedSetName: string | null;
  onSetChange: (setName: string) => void;
}

export default function Step2MasterSet({
  selectedSetName,
  onSetChange,
}: Step2MasterSetProps) {
  const [minimalSets, setMinimalSets] = useState<PokemonSet[]>([]);
  const [setsInEra, setSetsInEra] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEraSets, setLoadingEraSets] = useState(false);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [series, setSeries] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load minimal sets and all series for era selection
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch minimal sets (fast - just id and name)
      const fetchedMinimalSets = await getSetsMinimal();
      setMinimalSets(fetchedMinimalSets);
      
      // Fetch all series to show eras (fast - maybe 10-20 series)
      const fetchedSeries = await tcgdex.serie.list();
      const seriesList = fetchedSeries.map((serie: any) => ({
        id: serie.id || '',
        name: serie.name || serie.id || 'Unknown',
      }));
      setSeries(seriesList);
      
      console.log('[Step2MasterSet] Initial data loaded:', {
        minimalSetsCount: fetchedMinimalSets.length,
        seriesCount: seriesList.length,
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // When user selects an era, fetch full details for sets in that era
  useEffect(() => {
    if (selectedEra) {
      loadSetsForEra(selectedEra);
    } else {
      setSetsInEra([]);
    }
  }, [selectedEra]);

  const loadSetsForEra = async (serieName: string) => {
    try {
      setLoadingEraSets(true);
      console.log('[Step2MasterSet] Loading sets for era:', serieName);
      
      // Fetch full details for sets in this serie
      const fetchedSets = await getSetsBySerie(serieName);
      setSetsInEra(fetchedSets);
      
      console.log('[Step2MasterSet] Sets loaded for era:', {
        serieName,
        setCount: fetchedSets.length,
      });
    } catch (error) {
      console.error('Error loading sets for era:', error);
      setSetsInEra([]);
    } finally {
      setLoadingEraSets(false);
    }
  };

  // Get set count for each era (we don't know this from minimal data, so we'll show "?" or fetch on demand)
  // For now, we'll just show the series names without counts

  // Reset set selection when era changes
  useEffect(() => {
    if (selectedEra && selectedSetName) {
      const setExistsInEra = setsInEra.some((s) => s.name === selectedSetName);
      if (!setExistsInEra) {
        onSetChange(null);
      }
    }
  }, [selectedEra, setsInEra, selectedSetName, onSetChange]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading eras...</Text>
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
        // Show eras first (from series list)
        <View>
          <Text style={styles.sectionTitle}>Select Era</Text>
          {series.map((serie) => (
            <TouchableOpacity
              key={serie.id}
              style={styles.eraOption}
              onPress={() => setSelectedEra(serie.name)}
            >
              <Text style={styles.eraLabel}>{serie.name}</Text>
              <Text style={styles.eraSubtext}>Tap to view sets</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        // Show sets within selected era (loading or loaded)
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
          
          {loadingEraSets ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading sets for {selectedEra}...</Text>
            </View>
          ) : setsInEra.length > 0 ? (
            <SetSelector
              sets={setsInEra}
              selectedSetName={selectedSetName}
              onSelect={onSetChange}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sets found for {selectedEra}</Text>
            </View>
          )}
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
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});
