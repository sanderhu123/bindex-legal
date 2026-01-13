import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Alert, BackHandler, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getBinderById } from '../../services/supabase/binders';
import { getCardsBySet, getCardsByRegion, type Region } from '../../services/api/pokemonApi';
import { CardSlot, CardPlaceholder, SelectedCardBar, type PlaceholderCard } from '../../components/BinderEdit';
import PageNavigator from '../../components/Binder/PageNavigator';
import { JumpToPageModal } from '../../components/Binder/JumpToPageModal';
import { CardPickerModal } from '../../components/CardPicker';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import type { Binder, Card } from '../../types';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

/**
 * Position of a card in the binder grid
 */
interface CardPosition {
  cardId: string | null;
  slotIndex: number; // Global index across all pages (0-based)
}

/**
 * Currently selected card info
 */
interface SelectedCard {
  cardId: string;
  cardName: string;
  imageUrl?: string;
  sourceSlot: number | 'placeholder';
  sourceIndex: number; // Index within source (slot index or placeholder index)
  sourcePage?: number; // Page number (1-based) for cross-page reference
}

/**
 * Card data with image URL for display
 */
interface CardData {
  id: string;
  name: string;
  imageUrl?: string;
  number?: string;
}

const TOTAL_PAGES = 20; // Fixed 20 pages for binder edit
const PLACEHOLDER_MAX = 18; // Maximum cards in placeholder tray

export default function BinderEditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { binderId } = route.params as { binderId: string };

  // Screen state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Binder and card data
  const [binder, setBinder] = useState<Binder | null>(null);
  const [allCards, setAllCards] = useState<Map<string, CardData>>(new Map()); // Card ID -> Card data
  
  // Card positions in binder slots
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [originalPositions, setOriginalPositions] = useState<CardPosition[]>([]);
  
  // Placeholder tray (temporarily removed cards)
  const [placeholderCards, setPlaceholderCards] = useState<PlaceholderCard[]>([]);
  
  // Navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [showJumpModal, setShowJumpModal] = useState(false);
  
  // Selection state
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  
  // Undo stack
  const [undoStack, setUndoStack] = useState<CardPosition[][]>([]);
  
  // Track changes
  const [hasChanges, setHasChanges] = useState(false);
  
  // Card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

  // Screen dimensions
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Calculated values
  const cardsPerPage = binder?.layoutPreference === '4x3' ? 12 : 9;
  const columnsPerRow = binder?.layoutPreference === '4x3' ? 4 : 3;
  const totalSlots = cardsPerPage * TOTAL_PAGES;

  /**
   * Load binder and cards on mount
   */
  useEffect(() => {
    loadBinderData();
  }, [binderId]);

  /**
   * Handle screen dimension changes
   */
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  /**
   * Handle Android back button
   */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasChanges) {
        showSavePrompt();
        return true; // Prevent default back
      }
      return false; // Allow default back
    });
    return () => backHandler.remove();
  }, [hasChanges]);

  /**
   * Load binder data and initialize card positions
   */
  const loadBinderData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load binder info
      const binderData = await getBinderById(binderId);
      if (!binderData) {
        setError('Binder not found');
        setLoading(false);
        return;
      }
      setBinder(binderData);

      // Load cards based on binder type
      let cards: Card[] = [];
      if (binderData.collectionMode === 'master-set' && binderData.set) {
        cards = await getCardsBySet(binderData.set);
        
        // Apply variant filtering if specified
        if (binderData.variantsToTrack && binderData.variantsToTrack.length > 0) {
          cards = cards.filter(card => {
            const cardVariant = card.variant || 'base';
            return binderData.variantsToTrack!.includes(cardVariant);
          });
        }
      } else if (binderData.collectionMode === 'region' && binderData.region) {
        cards = await getCardsByRegion(binderData.region as Region, binderData.pokemonArtStyle);
      }
      // Custom binders start empty

      // Build card data map
      const cardDataMap = new Map<string, CardData>();
      cards.forEach(card => {
        cardDataMap.set(card.id, {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          number: card.number,
        });
      });
      setAllCards(cardDataMap);

      // Calculate total slots based on layout
      const slotsPerPage = binderData.layoutPreference === '4x3' ? 12 : 9;
      const totalSlotCount = slotsPerPage * TOTAL_PAGES;

      // Initialize empty positions
      // For now, all slots start empty - later we'll load saved positions from database
      const emptyPositions: CardPosition[] = [];
      for (let i = 0; i < totalSlotCount; i++) {
        emptyPositions.push({ cardId: null, slotIndex: i });
      }
      
      setCardPositions(emptyPositions);
      setOriginalPositions(emptyPositions);
      setLoading(false);
    } catch (err) {
      console.error('[BinderEdit] Error loading binder:', err);
      setError('Failed to load binder data');
      setLoading(false);
    }
  };

  /**
   * Get cards for current page
   */
  const currentPageCards = useMemo(() => {
    const startIndex = (currentPage - 1) * cardsPerPage;
    return cardPositions.slice(startIndex, startIndex + cardsPerPage);
  }, [cardPositions, currentPage, cardsPerPage]);

  /**
   * Save current state to undo stack
   */
  const saveUndoState = useCallback(() => {
    setUndoStack(prev => [...prev, [...cardPositions]]);
  }, [cardPositions]);

  /**
   * Show save prompt when leaving with unsaved changes
   */
  const showSavePrompt = () => {
    Alert.alert(
      'Save changes?',
      'You have unsaved changes to your binder layout.',
      [
        { text: "Don't Save", style: 'destructive', onPress: () => navigation.goBack() },
        { text: 'Save', onPress: () => saveAndExit() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Save positions and exit
   */
  const saveAndExit = async () => {
    // TODO: Step 34I - Save to database
    console.log('[BinderEdit] Saving positions...');
    navigation.goBack();
  };

  /**
   * Handle back button press
   */
  const handleBack = () => {
    if (hasChanges) {
      showSavePrompt();
    } else {
      navigation.goBack();
    }
  };

  /**
   * Handle tapping a card slot
   */
  const handleSlotPress = (slotIndex: number, cardId: string | null) => {
    if (cardId) {
      // Slot has a card - select it
      const cardData = allCards.get(cardId);
      const pageNumber = Math.floor(slotIndex / cardsPerPage) + 1;
      
      setSelectedCard({
        cardId,
        cardName: cardData?.name || 'Unknown Card',
        imageUrl: cardData?.imageUrl,
        sourceSlot: slotIndex,
        sourceIndex: slotIndex,
        sourcePage: pageNumber,
      });
    } else if (selectedCard) {
      // Empty slot with a card selected - move card here
      handleMoveCardToSlot(slotIndex);
    } else {
      // Empty slot, no selection - open card picker
      setTargetSlotIndex(slotIndex);
      setShowCardPicker(true);
    }
  };

  /**
   * Move selected card to target slot
   */
  const handleMoveCardToSlot = (targetSlotIndex: number) => {
    if (!selectedCard) return;
    
    saveUndoState();
    
    setCardPositions(prev => {
      const newPositions = [...prev];
      
      // Remove from source
      if (selectedCard.sourceSlot === 'placeholder') {
        // Remove from placeholder - handled separately
        setPlaceholderCards(p => p.filter((_, i) => i !== selectedCard.sourceIndex));
      } else {
        // Remove from binder slot
        newPositions[selectedCard.sourceSlot].cardId = null;
      }
      
      // Place in target slot
      newPositions[targetSlotIndex].cardId = selectedCard.cardId;
      
      return newPositions;
    });
    
    setHasChanges(true);
    setSelectedCard(null);
  };

  /**
   * Handle tapping a card in the placeholder
   */
  const handlePlaceholderCardPress = (index: number, cardId: string) => {
    const card = placeholderCards[index];
    
    if (selectedCard && selectedCard.sourceSlot === 'placeholder' && selectedCard.sourceIndex === index) {
      // Tapped already selected card - deselect
      setSelectedCard(null);
    } else {
      // Select this placeholder card
      setSelectedCard({
        cardId: card.cardId,
        cardName: card.cardName || 'Unknown Card',
        imageUrl: card.imageUrl,
        sourceSlot: 'placeholder',
        sourceIndex: index,
      });
    }
  };

  /**
   * Cancel current selection
   */
  const handleCancelSelection = () => {
    setSelectedCard(null);
  };

  /**
   * Remove selected card (send to trash)
   */
  const handleRemoveCard = () => {
    if (!selectedCard) return;
    
    // Confirm removal
    Alert.alert(
      'Remove Card',
      `Remove ${selectedCard.cardName} from the binder? It will be moved to the placeholder tray.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            saveUndoState();
            
            if (selectedCard.sourceSlot === 'placeholder') {
              // Already in placeholder - remove completely
              setPlaceholderCards(prev => prev.filter((_, i) => i !== selectedCard.sourceIndex));
            } else {
              // Move from binder to placeholder
              if (placeholderCards.length >= PLACEHOLDER_MAX) {
                Alert.alert('Placeholder Full', 'The placeholder tray is full (18 cards max). Please move some cards back to the binder first.');
                return;
              }
              
              // Add to placeholder
              setPlaceholderCards(prev => [
                ...prev,
                {
                  cardId: selectedCard.cardId,
                  cardName: selectedCard.cardName,
                  imageUrl: selectedCard.imageUrl,
                },
              ]);
              
              // Remove from binder slot
              setCardPositions(prev => {
                const newPositions = [...prev];
                newPositions[selectedCard.sourceSlot as number].cardId = null;
                return newPositions;
              });
            }
            
            setHasChanges(true);
            setSelectedCard(null);
          },
        },
      ]
    );
  };

  /**
   * Handle trash zone press
   */
  const handleTrashPress = () => {
    handleRemoveCard();
  };

  /**
   * Handle card selection from picker
   */
  const handleCardPickerSelect = (card: Card) => {
    if (targetSlotIndex === null) return;
    
    // Check if card is already placed elsewhere
    const existingSlot = cardPositions.find(pos => pos.cardId === card.id);
    
    if (existingSlot) {
      const existingPage = Math.floor(existingSlot.slotIndex / cardsPerPage) + 1;
      Alert.alert(
        'Card Already Placed',
        `${card.name} is already in Slot ${existingSlot.slotIndex + 1} (Page ${existingPage}). Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Anyway', 
            onPress: () => placeCardInSlot(card),
          },
        ]
      );
    } else {
      placeCardInSlot(card);
    }
  };

  /**
   * Place a card in the target slot
   */
  const placeCardInSlot = (card: Card) => {
    if (targetSlotIndex === null) return;
    
    saveUndoState();
    
    // Add to allCards map if not already there
    if (!allCards.has(card.id)) {
      setAllCards(prev => {
        const newMap = new Map(prev);
        newMap.set(card.id, {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          number: card.number,
        });
        return newMap;
      });
    }
    
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex].cardId = card.id;
      return newPositions;
    });
    
    setHasChanges(true);
    setShowCardPicker(false);
    setTargetSlotIndex(null);
  };

  /**
   * Render the card grid for current page
   */
  const renderCardGrid = () => {
    const rows: CardPosition[][] = [];
    for (let i = 0; i < currentPageCards.length; i += columnsPerRow) {
      rows.push(currentPageCards.slice(i, i + columnsPerRow));
    }

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((slot) => {
              const cardData = slot.cardId ? allCards.get(slot.cardId) : undefined;
              return (
                <CardSlot
                  key={slot.slotIndex}
                  cardId={slot.cardId}
                  imageUrl={cardData?.imageUrl}
                  cardName={cardData?.name}
                  slotIndex={slot.slotIndex}
                  isSelected={
                    selectedCard !== null && 
                    selectedCard.sourceSlot !== 'placeholder' && 
                    selectedCard.sourceSlot === slot.slotIndex
                  }
                  onPress={() => handleSlotPress(slot.slotIndex, slot.cardId)}
                  layoutPreference={binder?.layoutPreference}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return <LoadingScreen message="Loading binder..." />;
  }

  // Error state
  if (error || !binder) {
    return (
      <ErrorScreen
        message={error || 'Unable to load binder'}
        onRetry={loadBinderData}
      />
    );
  }

  // Placeholder index of selected card (for highlighting)
  const selectedPlaceholderIndex = selectedCard?.sourceSlot === 'placeholder' 
    ? selectedCard.sourceIndex 
    : -1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Edit: {binder.name}</Text>
        <View style={styles.headerRight}>
          {hasChanges && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveAndExit}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Page Navigator */}
      <PageNavigator
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPreviousPage={() => setCurrentPage(p => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage(p => Math.min(TOTAL_PAGES, p + 1))}
        onJumpToPage={() => setShowJumpModal(true)}
      />

      {/* Selected Card Bar (when card is selected) */}
      {selectedCard && (
        <SelectedCardBar
          cardName={selectedCard.cardName}
          sourcePage={selectedCard.sourcePage}
          onCancel={handleCancelSelection}
          onRemove={handleRemoveCard}
        />
      )}

      {/* Card Grid */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {renderCardGrid()}
      </ScrollView>

      {/* Card Placeholder Tray */}
      <CardPlaceholder
        cards={placeholderCards}
        maxCards={PLACEHOLDER_MAX}
        selectedIndex={selectedPlaceholderIndex}
        onCardPress={handlePlaceholderCardPress}
        onTrashPress={handleTrashPress}
        hasSelectedCard={selectedCard !== null}
      />

      {/* Jump to Page Modal */}
      <JumpToPageModal
        visible={showJumpModal}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onClose={() => setShowJumpModal(false)}
        onJump={(page) => setCurrentPage(page)}
      />

      {/* Card Picker Modal */}
      <CardPickerModal
        visible={showCardPicker}
        onClose={() => {
          setShowCardPicker(false);
          setTargetSlotIndex(null);
        }}
        onSelectCard={handleCardPickerSelect}
        title="Add Card"
        pokemonOnly={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: typography.medium,
  },
  title: {
    flex: 1,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  saveButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.background,
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
  },
});
