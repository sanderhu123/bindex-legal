import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions, TouchableOpacity, Alert, TextInput, Keyboard, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCardById } from '../../services/api/pokemonApi';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder, toggleCardOwnershipAtPosition, toggleExtraCardOwnership, getBinderCardData, saveCardNote, updateCardVariant } from '../../services/supabase/cards';
import { setSelectedCardForPokemon, clearSelectedCardForPokemon } from '../../services/supabase/regionCards';
import { CardPickerModal } from '../../components/CardPicker';
import CardImage from '../../components/Card/CardImage';
import CardDetails from '../../components/Card/CardDetails';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import { getSearchName } from '../../data/pokemonRegions';
import { getAvailableVariantsForCard } from '../../data/cardVariants';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, screenPadding, shadows, type ThemeColors } from '../../constants/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { getUserFriendlyErrorMessage, isNotFoundError } from '../../utils/errorUtils';
import { showSuccess, showError } from '../../utils/toast';
import { lightTap } from '../../utils/haptics';
import type { Card, Binder, CardVariant } from '../../types';

const VARIANT_LABELS: Record<string, string> = {
  'base': 'No',
  'holo': 'H',
  'reverse-holo': 'RH',
  'poke-ball': 'PB',
  'master-ball': 'MB',
};

function getVariantColors(colors: ThemeColors): Record<string, string> {
  return {
    'base': colors.primary,
    'holo': colors.variantHolo,
    'reverse-holo': colors.variantReverseHolo,
    'poke-ball': colors.variantPokeBall,
    'master-ball': colors.variantMasterBall,
  };
}

interface CardDetailScreenProps {
  navigation: any;
  route: any;
}

/**
 * Card Detail Screen
 * Displays full details of a single card
 */
export default function CardDetailScreen({ navigation, route }: CardDetailScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const noteRef = useRef('');
  const savedNoteRef = useRef('');
  
  // Region mode: card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);
  const isRegionMode = collectionMode === 'region';

  // Button press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Owned label color animation
  const ownedColorAnim = useRef(new Animated.Value(isOwned ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(ownedColorAnim, {
      toValue: isOwned ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isOwned]);

  // Determine which variant options to show for this card
  const availableVariants = useMemo(() => {
    if (!card) return [];

    if (isRegionMode) {
      // Region mode: need a real TCG card selected
      if (!card.selectedCardId) return [];
      const rarity = card.rarity || '';
      if (!rarity) return [];
      // Region cards are always Pokémon; use selectedCardId for set extraction
      return getAvailableVariantsForCard(card.selectedCardId, rarity, 'Pokémon');
    }

    if (!card.rarity || !card.supertype) return [];
    return getAvailableVariantsForCard(card.id, card.rarity, card.supertype);
  }, [card, isRegionMode]);

  const showVariantSelector = availableVariants.length >= 2 && noteLoaded;

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

          // Region cards selected from search only have minimal data (set abbreviation, no rarity/illustrator).
          // Fetch full details in the background if key fields are missing.
          const tcgCardId = regionCardData.selectedCardId;
          if (tcgCardId) {
            const hasDetailFields = !!(regionCardData.rarity || regionCardData.illustrator);
            if (!hasDetailFields) {
              console.log('[CardDetail] Region card data is incomplete, fetching full details for:', tcgCardId);
              try {
                const fullCard = await getCardById(tcgCardId);
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
                  console.log('[CardDetail] Region card details enriched from API');
                }
              } catch (enrichErr) {
                console.warn('[CardDetail] Could not fetch full Region card details:', enrichErr);
              }
            }
          }
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
          // If key detail fields are empty, or the set name looks like an abbreviation
          // (no spaces, e.g. "swsh1" instead of "Sword & Shield"), fetch full details.
          const hasDetailFields = !!(cardData.rarity || cardData.illustrator || cardData.supertype);
          const setLooksIncomplete = cardData.set && !cardData.set.includes(' ') && cardData.set.length < 15;
          if ((!hasDetailFields || setLooksIncomplete) && cardData.id) {
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

  // Load saved variant + note from the database when card is ready
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!card || !binder) return;
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function loadBinderData() {
      try {
        const isCustom = collectionMode === 'custom' && position !== undefined && position !== null;
        const data = await getBinderCardData(
          binder!.id,
          card!.id,
          card!.variant,
          isCustom ? position : undefined,
          !!isExtraCard
        );
        if (data) {
          const savedVariant = data.variant || 'base';
          if (savedVariant !== (card!.variant || 'base')) {
            setCard(prev => prev ? { ...prev, variant: savedVariant as CardVariant } : prev);
          }
          if (data.note) {
            setNote(data.note);
            setSavedNote(data.note);
            noteRef.current = data.note;
            savedNoteRef.current = data.note;
          }
        }
      } catch (err) {
        console.error('[CardDetail] Failed to load binder card data:', err);
      } finally {
        setNoteLoaded(true);
      }
    }

    loadBinderData();
  }, [card, binder, collectionMode, position, isExtraCard]);

  // Auto-save note after the user stops typing for 1 second
  const handleNoteChange = useCallback((text: string) => {
    setNote(text);
    noteRef.current = text;

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
        savedNoteRef.current = text.trim();
        showSuccess('Note saved');
      } catch (err) {
        showError('Failed to save note');
        console.error('[CardDetail] Failed to save note:', err);
      } finally {
        setIsSavingNote(false);
      }
    }, 1000);
  }, [card, binder, savedNote, collectionMode, position]);

  // Clean up timer on unmount — fire a final save if there are unsaved changes
  const cardRef = useRef(card);
  const binderRef = useRef(binder);
  cardRef.current = card;
  binderRef.current = binder;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const unsavedNote = noteRef.current;
      const lastSaved = savedNoteRef.current;
      if (unsavedNote.trim() !== lastSaved && cardRef.current && binderRef.current) {
        const isCustom = collectionMode === 'custom' && position !== undefined && position !== null;
        saveCardNote(
          binderRef.current.id,
          cardRef.current.id,
          unsavedNote,
          cardRef.current.variant,
          isCustom ? position : undefined
        ).catch(err => console.error('[CardDetail] Final note save failed:', err));
      }
    };
  }, [collectionMode, position]);

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
      
      // Update the current card to show the new image immediately
      setCard({
        ...selectedCard,
        pokedexNumber: pokedexNumber,
        selectedCardId: selectedCard.id,
      });
      
      showSuccess('Card updated', `Now showing ${selectedCard.name}`);

      // Search results only have minimal data. Fetch full details to show set name, rarity, illustrator.
      if (!selectedCard.rarity && !selectedCard.illustrator) {
        try {
          const fullCard = await getCardById(selectedCard.id);
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
            console.log('[CardDetail] Region card enriched with full details');
          }
        } catch (enrichErr) {
          console.warn('[CardDetail] Could not enrich Region card details:', enrichErr);
        }
      }
    } catch (err) {
      console.error('[CardDetail] Failed to save card selection:', err);
      showError('Failed to save selection', 'Please try again');
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
    lightTap();

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
      showSuccess(newIsOwned ? 'Card added to collection!' : 'Card removed from collection');
    } catch (err) {
      // Rollback on error
      setIsOwned(previousIsOwned);
      setBinder(previousBinder);
      setError(err instanceof Error ? err.message : 'Failed to update card ownership');
      showError('Failed to update', 'Please try again');
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

  // Button press animation handlers
  const handleBtnPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handleBtnPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title={card?.name || 'Card Details'} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Top Section: Image (left) + Actions (right) */}
        <View style={styles.topSection}>
          <CardImage
            source={card.imageUrlHiRes || card.imageUrl}
            lowResSource={card.imageUrl}
            isMissing={!isOwned}
            aspectRatio={0.716}
            style={[styles.cardImage, { width: imageWidth }]}
            priority="high"
            cardInfo={{ id: card.id, name: card.name, number: card.number, set: card.set }}
          />

          {/* Action Panel */}
          <View style={styles.actionPanel}>
            {/* Ownership toggle */}
            <View style={styles.panelActionGroup}>
              <Animated.Text style={[styles.panelActionLabel, { color: ownedColorAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.textTertiary, colors.primary] }) }]}>{isOwned ? 'Owned' : 'Not Owned'}</Animated.Text>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.panelBtn,
                    isOwned ? styles.panelBtnOwned : styles.panelBtnMissing,
                    isUpdating && styles.panelBtnDisabled,
                  ]}
                  onPress={handleToggleOwnership}
                  onPressIn={handleBtnPressIn}
                  onPressOut={handleBtnPressOut}
                  disabled={isUpdating}
                  activeOpacity={1}
                >
                  <Image
                    source={isOwned ? require('../../../assets/logo-icon-teal.png') : require('../../../assets/logo-icon-white.png')}
                    style={[styles.panelBtnLogo, !isOwned && styles.panelBtnLogoSmall]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Region: Change */}
            {isRegionMode && pokedexNumber && (
              <View style={styles.panelActionGroup}>
                <Text style={styles.panelActionLabel}>Switch</Text>
                <TouchableOpacity
                  style={[styles.panelBtn, styles.panelBtnChange]}
                  onPress={() => setShowCardPicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Region: Delete */}
            {isRegionMode && pokedexNumber && card?.selectedCardId && (
              <View style={styles.panelActionGroup}>
                <Text style={styles.panelActionLabel}>Delete</Text>
                <TouchableOpacity
                  style={[styles.panelBtn, styles.panelBtnDelete]}
                  onPress={handleClearSelection}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}

            {/* Holo selector */}
            {showVariantSelector && (
              <View style={styles.panelVariantSection}>
                <Text style={styles.panelVariantLabel}>Holo</Text>
                <View style={styles.panelVariantRow}>
                  {availableVariants.filter((v) => v !== 'base').map((v) => {
                    const isSelected = (card.variant || 'base') === v;
                    const variantColors = getVariantColors(colors);
                    const badgeColor = variantColors[v] || colors.textTertiary;
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.panelVariantIcon,
                          { backgroundColor: badgeColor, opacity: isSelected ? 1 : 0.35 },
                        ]}
                        onPress={() => handleVariantChange((isSelected ? 'base' : v) as CardVariant)}
                        disabled={isUpdatingVariant}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.panelVariantIconText}>
                          {VARIANT_LABELS[v] || v}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Surface Card: Card Info */}
        <View style={styles.infoCard}>
          <CardDetails
            card={card}
            variant="full"
            showSet={true}
            showRarity={true}
            showIllustrator={true}
            showVariantBadge={true}
            showPokedex={false}
            binderPosition={binderPosition}
          />
          <View style={styles.noteSection}>
            <View style={styles.noteHeader}>
              {isSavingNote && (
                <Text style={styles.noteSaving}>Saving...</Text>
              )}
              {!isSavingNote && noteLoaded && note.trim().length > 0 && note.trim() === savedNote && (
                <View style={styles.noteSavedChip}>
                  <Ionicons name="checkmark" size={10} color={colors.success} style={{ marginRight: 2 }} />
                  <Text style={styles.noteSavedText}>Saved</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={handleNoteChange}
              placeholder="Add a note..."
              placeholderTextColor={colors.textLight}
              maxLength={500}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
        </View>
      </ScrollView>

      {/* Region Mode: Card Picker Modal */}
      {isRegionMode && (
        <CardPickerModal
          visible={showCardPicker}
          onClose={() => setShowCardPicker(false)}
          onSelectCard={handleRegionCardSelected}
          title={pokemonName ? `Choose a ${pokemonName} Card` : 'Choose Card'}
          initialQuery={pokemonName ? getSearchName(pokemonName) : ''}
          pokemonOnly={true}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  // Top section: image left, actions right
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardImage: {
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  // Action panel (right of image)
  actionPanel: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelActionGroup: {
    alignItems: 'center',
    gap: 2,
  },
  panelActionLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.textTertiary,
  },
  panelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    minHeight: 40,
  },
  panelBtnOwned: {
    backgroundColor: 'transparent',
    width: 48,
    height: 48,
  },
  panelBtnMissing: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panelBtnChange: {
    backgroundColor: colors.secondary,
  },
  panelBtnDelete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  panelBtnDisabled: {
    opacity: 0.6,
  },
  panelBtnLogo: {
    width: 44,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  panelBtnLogoSmall: {
    width: 32,
    height: 32,
  },
  // Variant selector in action panel
  panelVariantSection: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  panelVariantLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  panelVariantRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  panelVariantIcon: {
    width: 40,
    height: 30,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelVariantIconText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.onPrimary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  // Surface cards
  infoCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  // Note section (inside infoCard)
  noteSection: {
    marginTop: spacing.xs,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  noteSaving: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  noteSavedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  noteSavedText: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.success,
  },
  noteInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.text,
  },
});

