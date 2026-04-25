import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { getCardsByRegion, getCardById, getCardsByIds, type Region } from '../../services/api/pokemonApi';
import { getSearchName } from '../../data/pokemonRegions';
import {
  getAllSelectedCardsForBinder,
  setSelectedCardForPokemon,
  clearSelectedCardForPokemon,
} from '../../services/supabase/regionCards';
import PageNavigator from '../../components/Binder/PageNavigator';
import { JumpToPageModal } from '../../components/Binder/JumpToPageModal';
import { CardPickerModal } from '../../components/CardPicker';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import type { Binder, Card } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, shadows, type ThemeColors } from '../../constants/theme';

/**
 * A single Pokémon slot in the region binder grid.
 * Stores display data + whether a custom card version has been selected.
 */
interface PokemonSlot {
  /** Card object ID (e.g. "region-Kanto-25") */
  cardId: string;
  /** Pokémon name (e.g. "Pikachu") */
  name: string;
  /** Display image URL (sprite or TCG card) */
  imageUrl?: string;
  /** National Pokédex number */
  pokedexNumber: number;
  /** If a custom TCG card is selected, its ID (e.g. "base1-58") */
  selectedTcgCardId?: string;
  /** The display number string (e.g. "#025") */
  displayNumber: string;
  /** TCG card name when a custom card is selected (e.g. "Charizard EX") */
  selectedCardName?: string;
  /** TCG card number when a custom card is selected (e.g. "006") */
  selectedCardNumber?: string;
  /** Total cards in the TCG set (e.g. "197") */
  selectedCardSetTotal?: string;
  /** TCG set name when a custom card is selected */
  selectedCardSet?: string;
}

interface RegionBinderEditViewProps {
  binder: Binder;
}

/**
 * Simplified Binder Edit view for Region binders (Step 34H).
 *
 * Key differences from Master Set / Custom edit mode:
 * - Cards are in fixed Pokédex order (no reordering)
 * - No drag & drop
 * - No Card Placeholder tray
 * - No plus signs / insert buttons
 * - Tapping a Pokémon opens a version picker to choose which TCG card to display
 * - "Clear" option reverts a slot to its default sprite
 */
export default function RegionBinderEditView({ binder }: RegionBinderEditViewProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Screen state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pokémon slots (all Pokémon in this region, in Pokédex order)
  const [pokemonSlots, setPokemonSlots] = useState<PokemonSlot[]>([]);

  // Navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [pickerPokemon, setPickerPokemon] = useState<PokemonSlot | null>(null);

  // Track if any changes were made (for save prompt)
  const [hasChanges, setHasChanges] = useState(false);

  // Screen dimensions
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Layout
  const cardsPerPage = binder.layoutPreference === '4x3' ? 12 : 9;
  const columnsPerRow = binder.layoutPreference === '4x3' ? 4 : 3;
  const totalPages = useMemo(() => {
    return Math.max(40, Math.ceil(pokemonSlots.length / cardsPerPage));
  }, [pokemonSlots.length, cardsPerPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => { loadData(); }, [binder.id]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  // Android back button
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => handler.remove();
  }, [hasChanges]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!binder.region) {
        setError('Region not set on binder');
        setLoading(false);
        return;
      }

      // 1. Get all Pokémon in this region (sprites / default art)
      const regionCards = await getCardsByRegion(
        binder.region as Region,
        binder.pokemonArtStyle,
      );

      // Sort by Pokédex number
      regionCards.sort((a, b) => (a.pokedexNumber ?? 0) - (b.pokedexNumber ?? 0));

      // 2. Get any custom card selections the user has made
      const selectedCards = await getAllSelectedCardsForBinder(binder.id);

      // 3. Batch-fetch all selected TCG cards in one query
      const selectedCardIds = Array.from(selectedCards.values());
      const tcgCardsMap = selectedCardIds.length > 0
        ? await getCardsByIds(selectedCardIds)
        : new Map<string, any>();

      // 4. Build the PokemonSlot array using pre-fetched card data
      const slots: PokemonSlot[] = regionCards.map((pokemon) => {
        const pokedexNum = pokemon.pokedexNumber ?? 0;
        const selectedCardId = selectedCards.get(pokedexNum);
        let imageUrl = pokemon.imageUrl;

        let selectedCardName: string | undefined;
        let selectedCardNumber: string | undefined;
        let selectedCardSetTotal: string | undefined;
        let selectedCardSet: string | undefined;

        if (selectedCardId) {
          const tcgCard = tcgCardsMap.get(selectedCardId);
          if (tcgCard) {
            imageUrl = tcgCard.imageUrl || undefined;
            selectedCardName = tcgCard.name;
            selectedCardNumber = tcgCard.number;
            selectedCardSetTotal = tcgCard.setTotal;
            selectedCardSet = tcgCard.set;
          } else {
            imageUrl = undefined;
          }
        }

        return {
          cardId: pokemon.id,
          name: pokemon.name,
          imageUrl,
          pokedexNumber: pokedexNum,
          selectedTcgCardId: selectedCardId || undefined,
          displayNumber: pokemon.number,
          selectedCardName,
          selectedCardNumber,
          selectedCardSetTotal,
          selectedCardSet,
        };
      });

      setPokemonSlots(slots);
      setLoading(false);
    } catch (err) {
      console.error('[RegionEdit] Error loading region data:', err);
      setError('Failed to load region data');
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CURRENT PAGE
  // ─────────────────────────────────────────────────────────────────────────────

  const currentPageSlots = useMemo(() => {
    const start = (currentPage - 1) * cardsPerPage;
    return pokemonSlots.slice(start, start + cardsPerPage);
  }, [pokemonSlots, currentPage, cardsPerPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleBack = () => {
    navigation.goBack();
  };

  /**
   * Tapping a Pokémon slot → open version picker
   */
  const handlePokemonTap = (slot: PokemonSlot) => {
    setPickerPokemon(slot);
    setShowCardPicker(true);
  };

  /**
   * User picked a TCG card from the picker
   */
  const handleCardSelected = async (card: Card) => {
    if (!pickerPokemon) return;

    try {
      // Save the selection to Supabase
      await setSelectedCardForPokemon(
        binder.id,
        pickerPokemon.pokedexNumber,
        card.id,
      );

      setPokemonSlots((prev) =>
        prev.map((slot) =>
          slot.pokedexNumber === pickerPokemon.pokedexNumber
            ? {
                ...slot,
                imageUrl: card.imageUrl,
                selectedTcgCardId: card.id,
                selectedCardName: card.name,
                selectedCardNumber: card.number,
                selectedCardSetTotal: card.setTotal,
                selectedCardSet: card.set,
              }
            : slot,
        ),
      );

      setHasChanges(true);
      console.log(
        '[RegionEdit] Card selected:',
        card.name,
        'for',
        pickerPokemon.name,
      );
    } catch (err) {
      console.error('[RegionEdit] Failed to save selection:', err);
      Alert.alert('Error', 'Failed to save card selection. Please try again.');
    }

    setShowCardPicker(false);
    setPickerPokemon(null);
  };

  /**
   * Long-press a Pokémon slot → option to clear custom selection
   */
  const handlePokemonLongPress = (slot: PokemonSlot) => {
    if (!slot.selectedTcgCardId) {
      const dexId = `#${String(slot.pokedexNumber).padStart(3, '0')}`;
      Alert.alert(
        `${slot.name} (${dexId})`,
        'This Pokémon is using its default image. Tap it to choose a TCG card version.',
      );
      return;
    }

    const cardName = slot.selectedCardName || slot.name;
    const cardNum = slot.selectedCardNumber || slot.displayNumber;
    const cardNumberDisplay = slot.selectedCardSetTotal
      ? `${cardNum}/${slot.selectedCardSetTotal}`
      : cardNum;

    Alert.alert(
      `${cardName} (${cardNumberDisplay})`,
      `Set: ${slot.selectedCardSet || 'Unknown'}\nPokémon: ${slot.name}`,
      [
        {
          text: 'Change Version',
          onPress: () => handlePokemonTap(slot),
        },
        {
          text: 'Clear Selection',
          style: 'destructive',
          onPress: () => handleClearSelection(slot),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  /**
   * Clear the custom card selection → revert to default sprite
   */
  const handleClearSelection = async (slot: PokemonSlot) => {
    try {
      await clearSelectedCardForPokemon(binder.id, slot.pokedexNumber);

      // Reload the slot with original sprite by getting region card data again
      const regionCards = await getCardsByRegion(
        binder.region as Region,
        binder.pokemonArtStyle,
      );
      const originalCard = regionCards.find(
        (c) => c.pokedexNumber === slot.pokedexNumber,
      );

      setPokemonSlots((prev) =>
        prev.map((s) =>
          s.pokedexNumber === slot.pokedexNumber
            ? {
                ...s,
                imageUrl: originalCard?.imageUrl || s.imageUrl,
                selectedTcgCardId: undefined,
                selectedCardName: undefined,
                selectedCardNumber: undefined,
                selectedCardSetTotal: undefined,
                selectedCardSet: undefined,
              }
            : s,
        ),
      );

      setHasChanges(true);
      console.log('[RegionEdit] Selection cleared for', slot.name);
    } catch (err) {
      console.error('[RegionEdit] Failed to clear selection:', err);
      Alert.alert('Error', 'Failed to clear card selection. Please try again.');
    }
  };

  const closeCardPicker = () => {
    setShowCardPicker(false);
    setPickerPokemon(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Card Grid
  // ─────────────────────────────────────────────────────────────────────────────

  const cardWidth = useMemo(() => {
    // Account for padding and gaps between cards
    const totalPadding = spacing.sm * 2; // ScrollView padding
    const gapsBetween = (columnsPerRow - 1) * spacing.sm;
    return (screenWidth - totalPadding - gapsBetween) / columnsPerRow;
  }, [screenWidth, columnsPerRow]);

  const cardHeight = useMemo(() => {
    // TCG card ratio is roughly 2.5:3.5 (≈ 0.714 width:height)
    return cardWidth * 1.4;
  }, [cardWidth]);

  const renderCardGrid = () => {
    const rows: PokemonSlot[][] = [];
    for (let i = 0; i < currentPageSlots.length; i += columnsPerRow) {
      rows.push(currentPageSlots.slice(i, i + columnsPerRow));
    }

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((slot) => (
              <TouchableOpacity
                key={slot.pokedexNumber}
                style={[
                  styles.cardSlot,
                  { width: cardWidth, height: cardHeight },
                ]}
                onPress={() => handlePokemonTap(slot)}
                onLongPress={() => handlePokemonLongPress(slot)}
                activeOpacity={0.7}
                accessibilityLabel={`${slot.name} ${slot.displayNumber}${slot.selectedTcgCardId ? ' - custom card selected' : ''}`}
              >
                {slot.imageUrl ? (
                  <Image
                    source={{ uri: slot.imageUrl }}
                    style={styles.cardImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.cardPlaceholder}>
                    <Text style={styles.cardPlaceholderIcon}>?</Text>
                  </View>
                )}

                {/* Pokémon name + number label */}
                <View style={styles.cardLabel}>
                  <Text style={styles.cardNumber}>{slot.displayNumber}</Text>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {slot.name}
                  </Text>
                </View>

                {/* Custom card indicator (small badge) */}
                {slot.selectedTcgCardId && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>TCG</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Fill remaining columns with empty space if row is incomplete */}
            {row.length < columnsPerRow &&
              Array.from({ length: columnsPerRow - row.length }).map((_, i) => (
                <View
                  key={`empty-${i}`}
                  style={{ width: cardWidth, height: cardHeight }}
                />
              ))}
          </View>
        ))}
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Loading / Error States
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <LoadingScreen message="Loading region..." />;
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={loadData}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Main
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Edit: {binder.name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Instruction banner */}
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>
          Tap a Pokémon to choose a card version. Long-press to clear.
        </Text>
      </View>

      {/* Page Navigator */}
      <PageNavigator
        currentPage={currentPage}
        totalPages={totalPages}
        onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onJumpToPage={() => setShowJumpModal(true)}
      />

      {/* Card Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {renderCardGrid()}
      </ScrollView>

      {/* Jump to Page Modal */}
      <JumpToPageModal
        visible={showJumpModal}
        currentPage={currentPage}
        totalPages={totalPages}
        onClose={() => setShowJumpModal(false)}
        onJump={(page) => setCurrentPage(page)}
      />

      {/* Card Picker Modal — pre-filled with Pokémon name */}
      <CardPickerModal
        visible={showCardPicker}
        onClose={closeCardPicker}
        onSelectCard={handleCardSelected}
        title={pickerPokemon ? `Pick card for ${pickerPokemon.name}` : 'Pick Card'}
        initialQuery={pickerPokemon ? getSearchName(pickerPokemon.name) : ''}
        pokemonOnly={true}
        exactMatch={true}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: typography.base,
    color: colors.primary,
    fontFamily: fonts.medium,
  },
  title: {
    flex: 1,
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 60,
  },
  instructionBanner: {
    backgroundColor: colors.backgroundLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  instructionText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.sm,
  },
  gridContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardSlot: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    flex: 1,
    width: '100%',
  },
  cardPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
  cardPlaceholderIcon: {
    fontSize: typography['3xl'],
    color: colors.textLight,
    fontFamily: fonts.bold,
  },
  cardLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardNumber: {
    fontSize: typography['2xs'],
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: fonts.medium,
  },
  cardName: {
    fontSize: typography['2xs'],
    color: '#FFFFFF',
    fontFamily: fonts.semibold,
    flex: 1,
  },
  customBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  customBadgeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
});
