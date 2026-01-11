import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCardById } from '../../services/api/pokemonApi';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder, toggleCardOwnershipAtPosition, toggleExtraCardOwnership } from '../../services/supabase/cards';
import { setSelectedCardForPokemon, clearSelectedCardForPokemon } from '../../services/supabase/regionCards';
import { CardPickerModal } from '../../components/CardPicker';
import CardImage from '../../components/Card/CardImage';
import CardDetails from '../../components/Card/CardDetails';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import { colors, spacing, typography, borderRadius, screenPadding, shadows } from '../../constants/theme';
import type { Card, Binder } from '../../types';

interface CardDetailScreenProps {
  navigation: any;
  route: any;
}

/**
 * Card Detail Screen
 * Displays full details of a single card
 */
export default function CardDetailScreen({ navigation, route }: CardDetailScreenProps) {
  const { cardId, binderId, isOwned: initialOwnedParam, position, collectionMode, isExtraCard, pokedexNumber, pokemonName, regionCardData } = route.params || {};
  const [card, setCard] = useState<Card | null>(null);
  const [binder, setBinder] = useState<Binder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwned, setIsOwned] = useState<boolean>(!!initialOwnedParam);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Region mode: card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);
  const isRegionMode = collectionMode === 'region';

  // Fetch card and binder data
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

        // For other modes, fetch card from API
        if (!cardId) {
          setError('Missing card ID');
          setLoading(false);
          return;
        }

        // Fetch card and binder in parallel
        const [cardData, binderData] = await Promise.all([
          getCardById(cardId),
          getBinderById(binderId),
        ]);

        if (!cardData) {
          setError(`Unable to load card '${cardId}'`);
          setLoading(false);
          return;
        }

        if (!binderData) {
          setError('Binder not found');
          setLoading(false);
          return;
        }

        setCard(cardData);
        setBinder(binderData);
        // Trust the navigation param if provided (supports optimistic updates from grid view)
        // Only fall back to database if no param was provided
        if (initialOwnedParam === undefined) {
          setIsOwned(binderData.cardIds.includes(cardData.id));
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
  }, [cardId, binderId, initialOwnedParam, isRegionMode, regionCardData]);

  // Update header title when card loads
  useEffect(() => {
    if (card) {
      navigation.setOptions({ title: card.name });
    }
  }, [card, navigation]);

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
  // - Card details: ~110px (name, number, set, rarity, artist with reduced spacing)
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
        <View style={styles.imageContainer}>
          <CardImage
            source={card.imageUrlHiRes || card.imageUrl}
            isMissing={!isOwned}
            aspectRatio={0.7}
            style={[styles.cardImage, { width: imageWidth }]}
            priority="high"
            cardInfo={{ id: card.id, name: card.name, set: card.set }}
          />
        </View>

        {/* Card Information */}
        <View style={styles.detailsContainer}>
          <CardDetails
            card={card}
            variant="full"
            showSet={true}
            showRarity={true}
            showArtist={true}
            showVariantBadge={true}
            showPokedex={false}
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

