import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { colors, fonts, spacing, typography, borderRadius, shadows, screenPadding } from '../../constants/theme';
import SetSelector from '../../components/Binder/SetSelector';
import { getSetsBySerie, getErasList } from '../../services/api/pokemonApi';
import type { PokemonSet } from '../../services/api/pokemonApi';

interface Step2MasterSetProps {
  selectedSetId: string | null;
  selectedSetName: string | null;
  onSetChange: (setId: string | null, setName: string | null) => void;
}

interface EraItem {
  id: string;
  name: string;
  logo?: string;
}

// Individual era item component (simple text-only version, no logos)
function EraItemComponent({ 
  item, 
  onSelect 
}: { 
  item: EraItem; 
  onSelect: (name: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.eraOption}
      onPress={() => onSelect(item.name)}
    >
      <Text style={styles.eraLabel}>{item.name}</Text>
      <Text style={styles.eraSubtext}>Tap to view sets</Text>
    </TouchableOpacity>
  );
}

export default function Step2MasterSet({
  selectedSetId,
  selectedSetName,
  onSetChange,
}: Step2MasterSetProps) {
  const [setsInEra, setSetsInEra] = useState<PokemonSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEraSets, setLoadingEraSets] = useState(false);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [series, setSeries] = useState<EraItem[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load eras from hard-coded data (already ordered newest first)
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Get eras from hard-coded data (newest first)
      const fetchedSeries = getErasList();
      setSeries(fetchedSeries);
      
      console.log('[Step2MasterSet] Initial data loaded from hard-coded data:', {
        seriesCount: fetchedSeries.length,
        eras: fetchedSeries.map(s => s.name),
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
      
      // Preload all logos for this era in the background
      preloadSetLogos(fetchedSets);
    } catch (error) {
      console.error('Error loading sets for era:', error);
      setSetsInEra([]);
    } finally {
      setLoadingEraSets(false);
    }
  };

  // Preload set logo images to cache them
  const preloadSetLogos = (sets: PokemonSet[]) => {
    sets.forEach((set) => {
      if (set.logo) {
        // Start loading the image in the background
        Image.prefetch(set.logo).catch((error) => {
          console.warn(`Failed to preload logo for ${set.name}:`, error);
        });
      }
    });
    console.log('[Step2MasterSet] Preloading', sets.length, 'set logos...');
  };

  // Get set count for each era (we don't know this from minimal data, so we'll show "?" or fetch on demand)
  // For now, we'll just show the series names without counts

  // Reset set selection when era changes
  useEffect(() => {
    if (selectedEra && selectedSetId) {
      const setExistsInEra = setsInEra.some((s) => s.id === selectedSetId);
      if (!setExistsInEra) {
        onSetChange(null, null);
      }
    }
  }, [selectedEra, setsInEra, selectedSetId, onSetChange]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            <EraItemComponent
              key={serie.id}
              item={serie}
              onSelect={setSelectedEra}
            />
          ))}
        </View>
      ) : (
        // Show sets within selected era (loading or loaded)
        <View>
          <TouchableOpacity
            style={styles.backToEras}
            onPress={() => {
              setSelectedEra(null);
              onSetChange(null, null);
            }}
          >
            <Text style={styles.backToErasText}>← Back to Eras</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>{selectedEra}</Text>
          
          {loadingEraSets ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading sets for {selectedEra}...</Text>
            </View>
          ) : setsInEra.length > 0 ? (
            <SetSelector
              sets={setsInEra}
              selectedSetId={selectedSetId}
              onSelect={(setId, setName) => onSetChange(setId, setName)}
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  eraOption: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  eraLabel: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  eraSubtext: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  backToEras: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  backToErasText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
});
