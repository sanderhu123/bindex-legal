import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions, TouchableOpacity, Alert, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCardById } from '../../services/api/pokemonApi';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder, toggleCardOwnershipAtPosition, toggleExtraCardOwnership, getCardNote, saveCardNote, updateCardVariant } from '../../services/supabase/cards';
import { setSelectedCardForPokemon, clearSelectedCardForPokemon } from '../../services/supabase/regionCards';
import { CardPickerModal } from '../../components/CardPicker';
import CardImage from '../../components/Card/CardImage';
import CardDetails from '../../components/Card/CardDetails';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import { getAvailableVariantsForCard } from '../../data/cardVariants';
import { colors, spacing, typography, borderRadius, screenPadding, shadows } from '../../constants/theme';
import { getUserFriendlyErrorMessage, isNotFoundError } from '../../utils/errorUtils';
import type { Card, Binder, CardVariant } from '../../types';

const VARIANT_LABELS: Record<string, string> = {
  'base': 'Standard',
  'reverse-holo': 'Reverse Holo',
  'poke-ball': 'Poke Ball',
  'master-ball': 'Master Ball',
};

interface CardDetailScreenProps {
  navigation: any;
  route: any;
}

/**
 * Card Detail Screen
 * Displays full details of a single card
 */
export default function CardDetailScreen({ navigation, route }: CardDetailScreenProps) {
  const { cardId, binderId, isOwned: initialOwnedParam, position, collectionMode, isExtraCard, pokedexNumber, pokemonName, regionCardData, cardIndex, cardsPerPage, cardData } = route.params || {};
  const [card, setCard] = useState<Card | null>(null);
  const [binder, setBinder] = useState<Binder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwned, setIsOwned] = useState<boolean>(!!initialOwnedParam);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);
  
  // Note state
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Region mode: card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);
  const isRegionMode = collectionMode === 'region';

  // Determine which variant options to show for this card
  const availableVariants = useMemo(() => {
    if (!card) return [];
    // Region mode without a real TCG card selected — no variants
    if (isRegionMode && !card.selectedCardId) return [];
    if (!card.rarity || !card.supertype) return [];
    return getAvailableVariantsForCard(card.id, card.rarity, card.supertype);
  }, [card, isRegionMode]);

  const showVariantSelector = availableVariants.length >= 2;

  // Calculate binder position (Page X, Slot Y) from card index
  const binderPosition = useMemo(() => {
    if (cardIndex === undefined || cardIndex < 0) return null;
    
    const effectiveCardsPerPage = cardsPerPage || 9; // Default to 9 (3×3 layout)
    const page = Math.floor(cardIndex / effectiveCardsPerPage) + 1;
    const slot = (cardIndex % effectiveCardsPerPage) + 1;
    
    return { page, slot };
  }, [cardIndex, cardsPerPage]);

  // Fetch card and binder data
  // If cardData was passed from the grid view, use it directly (no API call needed)
  useEffect(() => {
    async function fetchData() {
      if (!binderId) {
        setError('Missing binder ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // For Region mode with passed card data, use it directly (no API fetch needed)
        if (isRegionMode && regionCardData) {
          console.log('[CardDetail] Using passed Region card data:', regionCardData.name);
          const binderData = await getBinderById(binderId);
          
          if (!binderData) {
            setError('Binder not found');
            setLoading(false);
            return;
          }
          
          setCard(regionCardData as Card);
          setBinder(binderData);
          setLoading(false);
          return;
        }

        // If card data was passed from the grid/list view, use it directly (skip API call)
        if (cardData) {
          console.log('[CardDetail] Using passed card data (fast path):', cardData.name);
          const binderData = await getBinderById(binderId);
          
          if (!binderData) {
            setError('Binder not found');
            setLoading(false);
            return;
          }
          
          setCard(cardData as Card);
          setBinder(binderData);
          // Trust the navigation param if provided
          if (initialOwnedParam === undefined) {
            setIsOwned(binderData.cardIds.includes(cardData.id));
          }
          setLoading(false);

          // Cards from the search picker only have minimal data (id, name, image).
          // If key detail fields are empty, fetch full details in the background.
          const hasDetailFields = !!(cardData.rarity || cardData.illustrator || cardData.supertype);
          if (!hasDetailFields && cardData.id) {
            console.log('[CardDetail] Card data is incomplete, fetching full details for:', cardData.id);
            try {
              const fullCard = await getCardById(cardData.id);
              if (fullCard) {
                setCard((prev) => prev ? {
                  ...prev,
                  rarity: fullCard.rarity || prev.rarity,
                  illustrator: fullCard.illustrator || prev.illustrator,
                  set: fullCard.set || prev.set,
                  supertype: fullCard.supertype || prev.supertype,
                  setTotal: fullCard.setTotal || prev.setTotal,
                  imageUrlHiRes: fullCard.imageUrlHiRes || prev.imageUrlHiRes,
                } : fullCard);
                console.log('[CardDetail] Card details enriched from API');
              }
            } catch (enrichErr) {
              console.warn('[CardDetail] Could not fetch full card details:', enrichErr);
            }
          }
          return;
        }

        // Fallback: fetch card from API (only if cardData was not passed)
        if (!cardId) {
          setError('Missing card ID');
          setLoading(false);
          return;
        }

        console.log('[CardDetail] No card data passed, fetching from API (slow path):', cardId);

        // Fetch card and binder in parallel
        let fetchedCardData: Card | null = null;
        let binderData: Binder | null = null;
        
        try {
          [fetchedCardData, binderData] = await Promise.all([
            getCardById(cardId),
            getBinderById(binderId),
          ]);
        } catch (fetchError) {
          // Step 32C: Handle fetch errors with user-friendly messages
          console.error('[CardDetail] Fetch error:', fetchError);
          const friendlyMessage = getUserFriendlyErrorMessage(fetchError);
          setError(friendlyMessage);
          setLoading(false);
          return;
        }

        if (!fetchedCardData) {
          // Step 32C: Card not found - may have been deleted from API
          setError('This card is no longer available. It may have been removed from the database.');
          setLoading(false);
          return;
        }

        if (!binderData) {
          setError('Binder not found');
          setLoading(false);
          return;
        }

        setCard(fetchedCardData);
        setBinder(binderData);
        // Trust the navigation param if provided (supports optimistic updates from grid view)
        // Only fall back to database if no param was provided
        if (initialOwnedParam === undefined) {
          setIsOwned(binderData.cardIds.includes(fetchedCardData.id));
        }
        // If initialOwnedParam was provided, we already set it in useState, so don't override
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card details');
        console.error('Error fetching card detail:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [cardId, binderId, initialOwnedParam, isRegionMode, regionCardData, cardData]);

  // Update header title when card loads
  useEffect(() => {
    if (card) {
      navigation.setOptions({ title: card.name });
    }
  }, [card, navigation]);

  // Load existing note when card is ready
  useEffect(() => {
    if (!card || !binder) return;

    async function loadNote() {
      try {
        const isCustom = collectionMode === 'custom' && position !== undefined && position !== null;
        const existingNote = await getCardNote(
          binder!.id,
          card!.id,
          card!.variant,
          isCustom ? position : undefined
        );
        if (existingNote) {
          setNote(existingNote);
          setSavedNote(existingNote);
        }
      } catch (err) {
        console.error('[CardDetail] Failed to load note:', err);
      } finally {
        setNoteLoaded(true);
      }
    }

    loadNote();
  }, [card, binder, collectionMode, position]);

  // Auto-save note after the user stops typing for 1 second
  const handleNoteChange = useCallback((text: string) => {
    setNote(text);

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Schedule a save 1 second after the user stops typing
    saveTimerRef.current = setTimeout(async () => {
      if (!card || !binder) return;
      if (text.trim() === savedNote) return; // Nothing changed

      setIsSavingNote(true);
      try {
        const isCustom = collectionMode === 'custom' && position !== undefined && position !== null;
        await saveCardNote(
          binder.id,
          card.id,
          text,
          card.variant,
          isCustom ? position : undefined
        );
        setSavedNote(text.trim());
      } catch (err) {
        console.error('[CardDetail] Failed to save note:', err);
      } finally {
        setIsSavingNote(false);
      }
    }, 1000);
  }, [card, binder, savedNote, collectionMode, position]);

  // Clean up timer on unmount and do a final save if needed
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Handle selecting a new card for Region mode
  // NOTE: All hooks must be defined before any early returns!
  const handleRegionCardSelected = useCallback(async (selectedCard: Card) => {
    if (!binder || !pokedexNumber) {
      console.warn('[CardDetail] Missing data for Region card selection');
      return;
    }
    
    console.log('[CardDetail] Region card selected:', selectedCard.name, 'for Pokedex #' + pokedexNumber);
    
    try {
      // Save the selection to the database
      await setSelectedCardForPokemon(binder.id, pokedexNumber, selectedCard.id);
      console.log('[CardDetail] Card selection saved');
      
      // Update the current card to show the new image
      // Include selectedCardId so the "Clear Selection" button stays visible
      setCard({
        ...selectedCard,
        pokedexNumber: pokedexNumber,
        selectedCardId: selectedCard.id,
      });
      
      Alert.alert('Success', `Now showing ${selectedCard.name} for ${pokemonName || 'this Pokémon'}`);
    } catch (err) {
      console.error('[CardDetail] Failed to save card selection:', err);
      Alert.alert('Error', 'Failed to save card selection. Please try again.');
    }
  }, [binder, pokedexNumber, pokemonName]);

  // Handle clearing the card selection (revert to default sprite)
  const handleClearSelection = useCallback(async () => {
    if (!binder || !pokedexNumber) return;
    
    Alert.alert(
      'Clear Selection',
      `Revert ${pokemonName || 'this Pokémon'} to the default sprite?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearSelectedCardForPokemon(binder.id, pokedexNumber);
              console.log('[CardDetail] Card selection cleared');
              // Navigate back to refresh the binder view
              navigation.goBack();
            } catch (err) {
              console.error('[CardDetail] Failed to clear card selection:', err);
              Alert.alert('Error', 'Failed to clear selection. Please try again.');
            }
          },
        },
      ]
    );
  }, [binder, pokedexNumber, pokemonName, navigation]);

  // Handle variant change
  const handleVariantChange = useCallback(async (newVariant: CardVariant) => {
    if (!card || !binder || isUpdatingVariant) return;
    const currentVariant = card.variant || 'base';
    if (newVariant === currentVariant) return;

    const previousCard = { ...card };
    setCard({ ...card, variant: newVariant });
    setIsUpdatingVariant(true);

    try {
      const isCustom = collectionMode === 'custom' && position !== undefined && position !== null;
      await updateCardVariant(
        binder.id,
        card.id,
        currentVariant,
        newVariant,
        isCustom ? position : undefined
      );
    } catch (err) {
      setCard(previousCard);
      const message = err instanceof Error ? err.message : 'Failed to update variant.';
      Alert.alert('Could not change variant', message);
    } finally {
      setIsUpdatingVariant(false);
    }
  }, [card, binder, isUpdatingVariant, collectionMode, position]);

  // Loading state - AFTER all hooks are defined
  if (loading) {
    return <LoadingScreen message="Loading card..." />;
  }

  // Error state
  if (error || !card || !binder) {
    return (
      <ErrorScreen
        message={error || 'Card or binder not found'}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  // Handle ownership toggle
  const handleToggleOwnership = async () => {
    if (!binder || !card || isUpdating) return;

    // Store previous state for rollback
    const previousIsOwned = isOwned;
    const previousBinder = { ...binder };

    // Optimistic update
    const newIsOwned = !isOwned;
    setIsOwned(newIsOwned);
    setIsUpdating(true);

    // Determine binder type
    const isCustomBinder = collectionMode === 'custom' && position !== undefined && position !== null;

    // Update binder state optimistically
    if (isCustomBinder) {
      // Custom binders: only update ownedCards count (cards already exist at positions)
      const updatedOwnedCards = newIsOwned
        ? (binder.ownedCards || 0) + 1
        : Math.max(0, (binder.ownedCards || 0) - 1);
      setBinder({ 
        ...binder, 
        ownedCards: updatedOwnedCards
      });
    } else if (isExtraCard) {
      // Extra cards (added by user): only update ownedCards count, cardIds stay the same
      // Extra cards are tracked separately and already exist in binder_cards table
      const updatedOwnedCards = newIsOwned
        ? (binder.ownedCards || 0) + 1
        : Math.max(0, (binder.ownedCards || 0) - 1);
      setBinder({ 
        ...binder, 
        ownedCards: updatedOwnedCards
      });
    } else {
      // Master Set/Region binders: update cardIds and ownedCards
      const updatedCardIds = newIsOwned
        ? [...binder.cardIds, card.id]
        : binder.cardIds.filter((id) => id !== card.id);
      const updatedOwnedCards = newIsOwned
        ? (binder.ownedCards || 0) + 1
        : Math.max(0, (binder.ownedCards || 0) - 1);
      setBinder({ 
        ...binder, 
        cardIds: updatedCardIds,
        ownedCards: updatedOwnedCards
      });
    }

    // Sync with database
    try {
      if (isCustomBinder) {
        // Custom binders: toggle ownership status at the position
        await toggleCardOwnershipAtPosition(binder.id, position);
      } else if (isExtraCard) {
        // Extra cards (added by user): toggle ownership using extra card function
        await toggleExtraCardOwnership(binder.id, card.id, card.variant);
      } else {
        // Master Set/Region binders: add or remove from binder
        if (newIsOwned) {
          await addCardToBinder(binder.id, card.id, card.variant);
        } else {
          await removeCardFromBinder(binder.id, card.id, card.variant);
        }
      }
    } catch (err) {
      // Rollback on error
      setIsOwned(previousIsOwned);
      setBinder(previousBinder);
      setError(err instanceof Error ? err.message : 'Failed to update card ownership');
      console.error('Failed to update card ownership:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate image size to fit on screen without scrolling
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;
  
  // Estimate space needed for other elements:
  // - Header: ~60px
  // - Padding top/bottom: 24px (12px * 2)
  // - Card details: ~110px (name, number, set, rarity, illustrator with reduced spacing)
  // - Button: ~48px
  // - Spacing between elements: ~24px (8px * 3)
  const estimatedOtherContentHeight = 60 + 24 + 110 + 48 + 24; // ~266px
  const availableHeight = screenHeight - estimatedOtherContentHeight;
  
  // Card aspect ratio is 0.7 (height/width), so height = width * 0.7
  // We need: width * 0.7 <= availableHeight
  // Therefore: width <= availableHeight / 0.7
  const maxWidthFromHeight = availableHeight / 0.7;
  
  // Use the smaller of: screen width minus padding, max from height, or 250px (reduced from 280px)
  const imageWidth = Math.min(
    screenWidth - 24, // Screen width minus padding (12px * 2)
    maxWidthFromHeight,
    250 // Absolute max (reduced to ensure fit)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Card Image - Smaller size with high priority loading */}
        {/* Shows the low-res image instantly (already cached from grid), then swaps to high-res */}
        <View style={styles.imageContainer}>
          <CardImage
            source={card.imageUrlHiRes || card.imageUrl}
            lowResSource={card.imageUrl}
            isMissing={!isOwned}
            aspectRatio={0.7}
            style={[styles.cardImage, { width: imageWidth }]}
            priority="high"
            cardInfo={{ id: card.id, name: card.name, number: card.number, set: card.set }}
          />
        </View>

        {/* Card Information */}
        <View style={styles.detailsContainer}>
          <CardDetails
            card={card}
            variant="full"
            showSet={true}
            showRarity={true}
            showIllustrator={true}
            showVariantBadge={true}
            showPokedex={false}
          />
        </View>

        {/* Variant Selector */}
        {showVariantSelector && (
          <View style={styles.variantContainer}>
            <Text style={styles.variantLabel}>Variant</Text>
            <View style={styles.variantChips}>
              {availableVariants.map((v) => {
                const isSelected = (card.variant || 'base') === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.variantChip,
                      isSelected ? styles.variantChipSelected : styles.variantChipUnselected,
                    ]}
                    onPress={() => handleVariantChange(v as CardVariant)}
                    disabled={isUpdatingVariant || isSelected}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.variantChipText,
                        isSelected ? styles.variantChipTextSelected : styles.variantChipTextUnselected,
                      ]}
                    >
                      {VARIANT_LABELS[v] || v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Binder Position (Page X, Slot Y) */}
        {binderPosition && (
          <View style={styles.positionContainer}>
            <Text style={styles.positionIcon}>📍</Text>
            <Text style={styles.positionText}>
              Page {binderPosition.page}, Slot {binderPosition.slot}
            </Text>
          </View>
        )}

        {/* Personal Note */}
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteLabel}>My Note</Text>
            {isSavingNote && (
              <Text style={styles.noteSaving}>Saving...</Text>
            )}
            {!isSavingNote && noteLoaded && note.trim().length > 0 && note.trim() === savedNote && (
              <Text style={styles.noteSaved}>Saved</Text>
            )}
          </View>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={handleNoteChange}
            placeholder="Add a note about this card..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        {/* Ownership Toggle Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isOwned ? styles.toggleButtonOwned : styles.toggleButtonMissing,
              isUpdating && styles.toggleButtonDisabled,
            ]}
            onPress={handleToggleOwnership}
            disabled={isUpdating}
            activeOpacity={0.7}
          >
            {isUpdating ? (
              <Text style={styles.toggleButtonText}>Updating...</Text>
            ) : (
              <Text style={styles.toggleButtonText}>
                {isOwned ? 'Mark as Missing' : 'Mark as Owned'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Region Mode: Choose Card Button */}
        {isRegionMode && pokedexNumber && (
          <View style={styles.regionButtonContainer}>
            <TouchableOpacity
              style={styles.chooseCardButton}
              onPress={() => setShowCardPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.chooseCardButtonText}>Choose Different Card</Text>
            </TouchableOpacity>
            
            {/* Only show Clear if there's a custom selection (card has selectedCardId) */}
            {card?.selectedCardId && (
              <TouchableOpacity
                style={styles.clearSelectionButton}
                onPress={handleClearSelection}
                activeOpacity={0.7}
              >
                <Text style={styles.clearSelectionButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Region Mode: Card Picker Modal */}
      {isRegionMode && (
        <CardPickerModal
          visible={showCardPicker}
          onClose={() => setShowCardPicker(false)}
          onSelectCard={handleRegionCardSelected}
          title={pokemonName ? `Choose a ${pokemonName} Card` : 'Choose Card'}
          initialQuery={pokemonName || ''}
          pokemonOnly={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    alignItems: 'center',
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardImage: {
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  detailsContainer: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  // Variant selector
  variantContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  variantLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold as any,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  variantChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
  },
  variantChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full || 999,
    borderWidth: 1,
  },
  variantChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  variantChipUnselected: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  variantChipText: {
    fontSize: typography.sm,
    fontWeight: typography.medium as any,
  },
  variantChipTextSelected: {
    color: colors.background,
  },
  variantChipTextUnselected: {
    color: colors.textSecondary,
  },
  // Binder position display
  positionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLight || '#f5f5f5',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  positionIcon: {
    fontSize: typography.lg,
    marginRight: spacing.xs,
  },
  positionText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  // Personal note
  noteContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  noteLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  noteSaving: {
    fontSize: typography.xs,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  noteSaved: {
    fontSize: typography.xs,
    color: colors.success,
  },
  noteInput: {
    backgroundColor: colors.backgroundLight || '#f5f5f5',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    minHeight: 60,
    maxHeight: 120,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 0,
  },
  toggleButton: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  toggleButtonOwned: {
    backgroundColor: colors.success,
  },
  toggleButtonMissing: {
    backgroundColor: colors.primary,
  },
  toggleButtonDisabled: {
    opacity: 0.6,
  },
  toggleButtonText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  // Region mode buttons
  regionButtonContainer: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  chooseCardButton: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: colors.secondary || '#6366f1',
  },
  chooseCardButtonText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  clearSelectionButton: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error || '#ef4444',
  },
  clearSelectionButtonText: {
    color: colors.error || '#ef4444',
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});

