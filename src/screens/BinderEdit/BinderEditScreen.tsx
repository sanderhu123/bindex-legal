import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Alert, BackHandler, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getBinderById } from '../../services/supabase/binders';
import { CardSlot, CardPlaceholder, SelectedCardBar, type PlaceholderCard } from '../../components/BinderEdit';
import PageNavigator from '../../components/Binder/PageNavigator';
import { JumpToPageModal } from '../../components/Binder/JumpToPageModal';
import { CardPickerModal } from '../../components/CardPicker';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import type { Binder, Card } from '../../types';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

/**
 * Position of a card in the binder grid
 * Stores all card display data to avoid lookup issues
 */
interface CardPosition {
  cardId: string | null;
  cardName?: string;
  imageUrl?: string;
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

const TOTAL_PAGES = 20; // Fixed 20 pages for binder edit
const PLACEHOLDER_MAX = 18; // Maximum cards in placeholder tray

export default function BinderEditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { binderId } = route.params as { binderId: string };

  // Screen state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Binder data
  const [binder, setBinder] = useState<Binder | null>(null);
  
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

      // Calculate total slots based on layout
      const slotsPerPage = binderData.layoutPreference === '4x3' ? 12 : 9;
      const totalSlotCount = slotsPerPage * TOTAL_PAGES;

      // Initialize empty positions
      // For now, all slots start empty - later we'll load saved positions from database (Step 34I)
      const emptyPositions: CardPosition[] = [];
      for (let i = 0; i < totalSlotCount; i++) {
        emptyPositions.push({ 
          cardId: null, 
          cardName: undefined,
          imageUrl: undefined,
          slotIndex: i 
        });
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
  const handleSlotPress = (slot: CardPosition) => {
    const { slotIndex, cardId, cardName, imageUrl } = slot;
    
    if (selectedCard) {
      // A card is already selected
      if (selectedCard.sourceSlot === slotIndex) {
        // Tapped the same slot - deselect
        setSelectedCard(null);
      } else if (cardId) {
        // Tapped another filled slot - SWAP the cards
        handleSwapCards(slot);
      } else {
        // Tapped empty slot - move card here
        handleMoveCardToSlot(slotIndex);
      }
    } else if (cardId) {
      // No selection, slot has a card - select it
      const pageNumber = Math.floor(slotIndex / cardsPerPage) + 1;
      
      setSelectedCard({
        cardId,
        cardName: cardName || 'Unknown Card',
        imageUrl: imageUrl,
        sourceSlot: slotIndex,
        sourceIndex: slotIndex,
        sourcePage: pageNumber,
      });
    } else {
      // Empty slot, no selection - open card picker
      setTargetSlotIndex(slotIndex);
      setShowCardPicker(true);
    }
  };

  /**
   * Swap selected card with card in target slot
   */
  const handleSwapCards = (targetSlot: CardPosition) => {
    if (!selectedCard || selectedCard.sourceSlot === 'placeholder') return;
    
    saveUndoState();
    
    const sourceSlotIndex = selectedCard.sourceSlot as number;
    
    setCardPositions(prev => {
      const newPositions = [...prev];
      
      // Store target slot data before swap
      const targetData = {
        cardId: targetSlot.cardId,
        cardName: targetSlot.cardName,
        imageUrl: targetSlot.imageUrl,
      };
      
      // Move target card to source slot
      newPositions[sourceSlotIndex] = {
        ...newPositions[sourceSlotIndex],
        cardId: targetData.cardId,
        cardName: targetData.cardName,
        imageUrl: targetData.imageUrl,
      };
      
      // Move source card to target slot
      newPositions[targetSlot.slotIndex] = {
        ...newPositions[targetSlot.slotIndex],
        cardId: selectedCard.cardId,
        cardName: selectedCard.cardName,
        imageUrl: selectedCard.imageUrl,
      };
      
      return newPositions;
    });
    
    setHasChanges(true);
    setSelectedCard(null);
  };

  /**
   * Move selected card to target slot
   */
  const handleMoveCardToSlot = (targetSlotIndex: number) => {
    if (!selectedCard) return;
    
    saveUndoState();
    
    // Handle placeholder source separately
    if (selectedCard.sourceSlot === 'placeholder') {
      setPlaceholderCards(p => p.filter((_, i) => i !== selectedCard.sourceIndex));
    }
    
    setCardPositions(prev => {
      const newPositions = [...prev];
      
      // Remove from source binder slot (if from binder, not placeholder)
      if (selectedCard.sourceSlot !== 'placeholder') {
        newPositions[selectedCard.sourceSlot] = {
          ...newPositions[selectedCard.sourceSlot],
          cardId: null,
          cardName: undefined,
          imageUrl: undefined,
        };
      }
      
      // Place in target slot with card data
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: selectedCard.cardId,
        cardName: selectedCard.cardName,
        imageUrl: selectedCard.imageUrl,
      };
      
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
   * Remove selected card from binder entirely
   */
  const handleRemoveCard = () => {
    if (!selectedCard) return;
    
    // Confirm removal
    Alert.alert(
      'Remove Card',
      `Remove ${selectedCard.cardName} from the binder? The slot will become empty.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            saveUndoState();
            
            if (selectedCard.sourceSlot === 'placeholder') {
              // Remove from placeholder
              setPlaceholderCards(prev => prev.filter((_, i) => i !== selectedCard.sourceIndex));
            } else {
              // Remove from binder slot - clear all card data
              setCardPositions(prev => {
                const newPositions = [...prev];
                newPositions[selectedCard.sourceSlot as number] = {
                  ...newPositions[selectedCard.sourceSlot as number],
                  cardId: null,
                  cardName: undefined,
                  imageUrl: undefined,
                };
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
    
    // Check if card is already placed elsewhere in the binder
    const existingSlot = cardPositions.find(pos => pos.cardId === card.id);
    
    if (existingSlot) {
      const existingPage = Math.floor(existingSlot.slotIndex / cardsPerPage) + 1;
      const slotOnPage = (existingSlot.slotIndex % cardsPerPage) + 1;
      Alert.alert(
        'Card Already Placed',
        `${card.name} is already on Page ${existingPage} (Slot ${slotOnPage}). Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {
            setShowCardPicker(false);
            setTargetSlotIndex(null);
          }},
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
    
    // Update positions with card data stored directly
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: card.id,
        cardName: card.name,
        imageUrl: card.imageUrl,
      };
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
            {row.map((slot) => (
              <CardSlot
                key={slot.slotIndex}
                cardId={slot.cardId}
                imageUrl={slot.imageUrl}
                cardName={slot.cardName}
                slotIndex={slot.slotIndex}
                isSelected={
                  selectedCard !== null && 
                  selectedCard.sourceSlot !== 'placeholder' && 
                  selectedCard.sourceSlot === slot.slotIndex
                }
                onPress={() => handleSlotPress(slot)}
                layoutPreference={binder?.layoutPreference}
              />
            ))}
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
