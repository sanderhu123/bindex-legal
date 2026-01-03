import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCardById } from '../../services/api/pokemonApi';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder } from '../../services/supabase/cards';
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
  const { cardId, binderId, isOwned: initialOwnedParam } = route.params || {};
  const [card, setCard] = useState<Card | null>(null);
  const [binder, setBinder] = useState<Binder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwned, setIsOwned] = useState<boolean>(!!initialOwnedParam);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch card and binder data
  useEffect(() => {
    async function fetchData() {
      if (!cardId || !binderId) {
        setError('Missing card ID or binder ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch card and binder in parallel
        const [cardData, binderData] = await Promise.all([
          getCardById(cardId),
          getBinderById(binderId),
        ]);

        if (!cardData) {
          setError('Card not found');
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
        // Set initial ownership status
        setIsOwned(binderData.cardIds.includes(cardData.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card details');
        console.error('Error fetching card detail:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [cardId, binderId]);

  // Update header title when card loads
  useEffect(() => {
    if (card) {
      navigation.setOptions({ title: card.name });
    }
  }, [card, navigation]);

  // Keep local ownership in sync with navigation param when returning from grid
  useEffect(() => {
    if (initialOwnedParam !== undefined) {
      setIsOwned(!!initialOwnedParam);
    }
  }, [initialOwnedParam]);

  // Refresh ownership status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function refreshOwnership() {
        if (!binderId || !cardId) return;
        
        try {
          const binderData = await getBinderById(binderId);
          if (binderData) {
            setBinder(binderData);
            setIsOwned(binderData.cardIds.includes(cardId));
          }
        } catch (err) {
          console.error('Error refreshing ownership:', err);
        }
      }
      
      refreshOwnership();
    }, [binderId, cardId])
  );

  // Loading state
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

    // Update binder state optimistically (including ownedCards for sync)
    const updatedCardIds = newIsOwned
      ? [...binder.cardIds, card.id]
      : binder.cardIds.filter((id) => id !== card.id);
    const updatedOwnedCards = newIsOwned
      ? binder.ownedCards + 1
      : binder.ownedCards - 1;
    setBinder({ 
      ...binder, 
      cardIds: updatedCardIds,
      ownedCards: updatedOwnedCards
    });

    // Sync with database
    try {
      if (newIsOwned) {
        await addCardToBinder(binder.id, card.id, card.variant);
      } else {
        await removeCardFromBinder(binder.id, card.id, card.variant);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Card Image - Smaller size with high priority loading */}
      <View style={styles.imageContainer}>
        <CardImage
          source={card.imageUrlHiRes || card.imageUrl}
          isMissing={!isOwned}
          aspectRatio={0.7}
          style={[styles.cardImage, { width: imageWidth }]}
          priority="high"
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});

