import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { searchCardsByName, type CardSearchOptions } from '../../services/api/pokemonApi';
import type { Card } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { CardPickerModal } from '../../components/CardPicker';

/**
 * Test screen for global card search (Step 28A & 28B)
 * 
 * This screen allows testing:
 * - Step 28A: searchCardsByName() function (manual search)
 * - Step 28B: CardPickerModal component (bottom sheet modal)
 */
export default function CardSearchTestScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pokemonOnly, setPokemonOnly] = useState(false);
  const [searchStats, setSearchStats] = useState<{
    totalFound: number;
    duration: number;
  } | null>(null);
  
  // Step 28B: Modal state
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      Alert.alert('Enter a search term', 'Please enter a Pokémon name to search for.');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchStats(null);

    const startTime = Date.now();

    try {
      const options: CardSearchOptions = {
        limit: 50,
        offset: 0,
        pokemonOnly,
      };

      const cards = await searchCardsByName(query, options);
      
      const duration = Date.now() - startTime;
      setSearchStats({
        totalFound: cards.length,
        duration,
      });

      setResults(cards);

      if (cards.length === 0) {
        setError(`No cards found for "${query}"`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search cards');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, pokemonOnly]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setSearchStats(null);
  };

  // Step 28B: Handle card selection from modal
  const handleCardSelected = useCallback((card: Card) => {
    console.log('[Test] Card selected from modal:', card.name);
    setSelectedCard(card);
    Alert.alert(
      '✅ Card Selected!',
      `You selected: ${card.name}\n\nSet: ${card.set}\nNumber: #${card.number}`,
      [{ text: 'OK' }]
    );
  }, []);

  const renderCard = ({ item }: { item: Card }) => (
    <View style={styles.cardItem}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDetails} numberOfLines={1}>
          #{item.number} • {item.set || 'Unknown Set'}
        </Text>
        {item.rarity && (
          <Text style={styles.cardRarity}>{item.rarity}</Text>
        )}
        {item.supertype && (
          <Text style={styles.cardSupertype}>{item.supertype}</Text>
        )}
        <Text style={styles.cardId} numberOfLines={1}>ID: {item.id}</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      {searchStats && (
        <Text style={styles.statsText}>
          Found {searchStats.totalFound} card{searchStats.totalFound !== 1 ? 's' : ''} in {searchStats.duration}ms
        </Text>
      )}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🔍 Card Search Test</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            Step 28A & 28B - Global Card Search & Card Picker Modal
          </Text>
        </View>

        {/* Step 28B: Modal Test Button */}
        <View style={styles.modalTestSection}>
          <TouchableOpacity
            style={styles.modalTestButton}
            onPress={() => setShowPickerModal(true)}
          >
            <Text style={styles.modalTestButtonText}>📱 Open Card Picker Modal</Text>
          </TouchableOpacity>
          {selectedCard && (
            <View style={styles.selectedCardInfo}>
              <Text style={styles.selectedCardLabel}>Last selected:</Text>
              <Text style={styles.selectedCardName}>{selectedCard.name}</Text>
              <Text style={styles.selectedCardDetails}>
                #{selectedCard.number} • {selectedCard.set}
              </Text>
            </View>
          )}
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Pokémon name (e.g., Pikachu, Char)"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, pokemonOnly && styles.optionButtonActive]}
            onPress={() => setPokemonOnly(!pokemonOnly)}
          >
            <Text style={[styles.optionText, pokemonOnly && styles.optionTextActive]}>
              {pokemonOnly ? '✓ ' : ''}Pokémon Only
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        <FlatList
          data={results}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🔎</Text>
                <Text style={styles.emptyStateText}>
                  Enter a Pokémon name and tap Search
                </Text>
                <Text style={styles.emptyStateHint}>
                  Try: "Pikachu", "Charizard", "Bulba", "Eevee"
                </Text>
              </View>
            ) : null
          }
        />

        {/* Test Queries */}
        <View style={styles.quickSearchContainer}>
          <Text style={styles.quickSearchLabel}>Quick Test:</Text>
          <View style={styles.quickSearchButtons}>
            {['Pikachu', 'Charizard', 'Mewtwo', 'Eevee'].map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.quickSearchButton}
                onPress={() => setQuery(name)}
              >
                <Text style={styles.quickSearchText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Step 28B: Card Picker Modal */}
      <CardPickerModal
        visible={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onSelectCard={handleCardSelected}
        title="Test Card Picker"
        pokemonOnly={pokemonOnly}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backButtonText: {
    fontSize: typography.base,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  title: {
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  infoBanner: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  infoText: {
    fontSize: typography.xs,
    color: colors.primary,
    textAlign: 'center',
  },
  modalTestSection: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '30',
  },
  modalTestButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalTestButtonText: {
    color: colors.onPrimary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  selectedCardInfo: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  selectedCardLabel: {
    fontSize: typography.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  selectedCardName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  selectedCardDetails: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
  },
  clearButtonText: {
    fontSize: typography.lg,
    color: colors.textSecondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  searchButtonText: {
    color: colors.onPrimary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  statsContainer: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
  },
  statsText: {
    fontSize: typography.sm,
    color: colors.success,
    fontFamily: fonts.medium,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    fontFamily: fonts.medium,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  cardItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    marginHorizontal: screenPadding,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    width: 70,
    height: 98,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundLight,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDetails: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardRarity: {
    fontSize: typography.xs,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardSupertype: {
    fontSize: typography.xs,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  cardId: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyStateHint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  quickSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickSearchLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  quickSearchButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickSearchButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSearchText: {
    fontSize: typography.xs,
    color: colors.text,
  },
});

