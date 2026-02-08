import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { getBinderById } from '../../services/supabase/binders';
import { getBinderCardsWithPositions } from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, getCardById, type Region } from '../../services/api/pokemonApi';
import { getAllSelectedCardsForBinder } from '../../services/supabase/regionCards';
import { CardSlot, CardPlaceholder, SelectedCardBar, InsertButton, type PlaceholderCard } from '../../components/BinderEdit';
import type { DragStartData } from '../../components/BinderEdit/CardSlot';
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
 * Currently selected card info (tap-to-select mode)
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
 * Currently dragged card info (drag & drop mode)
 */
interface DraggedCard {
  cardId: string;
  cardName: string;
  imageUrl?: string;
  sourceSlot: number | 'placeholder';
  sourceIndex: number;
}

/**
 * Layout rectangle for hit testing
 */
interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Drop target detected during drag
 */
interface DropTarget {
  type: 'card' | 'empty' | 'placeholder' | 'trash';
  slotIndex?: number;
}

const TOTAL_PAGES = 20; // Fixed 20 pages for binder edit
const PLACEHOLDER_MAX = 18; // Maximum cards in placeholder tray
const FLOATING_CARD_WIDTH = 70; // Width of the floating drag card
const FLOATING_CARD_HEIGHT = 100; // Height of the floating drag card

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

  // Selection state (tap-to-select)
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);

  // ── Drag & Drop state ──
  const [draggedCard, setDraggedCard] = useState<DraggedCard | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);

  // Animated position for the floating drag card
  const dragAnimX = useRef(new RNAnimated.Value(0)).current;
  const dragAnimY = useRef(new RNAnimated.Value(0)).current;

  // Container offset (SafeAreaView position on screen) for coordinate translation
  const containerRef = useRef<View>(null);
  const containerOffsetRef = useRef({ x: 0, y: 0 });

  // Layout measurement refs for drop target detection
  const slotMeasurementsRef = useRef<Map<number, LayoutRect>>(new Map());
  const placeholderMeasurementRef = useRef<LayoutRect | null>(null);
  const trashMeasurementRef = useRef<LayoutRect | null>(null);

  // View refs for measuring slot positions
  const slotViewRefs = useRef<Map<number, View>>(new Map());
  const placeholderAreaViewRef = useRef<View | null>(null);
  const trashZoneViewRef = useRef<View | null>(null);

  // Refs for accessing current state in callbacks
  const cardPositionsRef = useRef(cardPositions);
  const placeholderCardsRef = useRef(placeholderCards);
  const draggedCardRef = useRef<DraggedCard | null>(null);
  const hoverTargetRef = useRef<DropTarget | null>(null);

  // Undo stack
  const [undoStack, setUndoStack] = useState<CardPosition[][]>([]);

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);

  // Card picker state
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [insertMode, setInsertMode] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false); // true = picker replaces selected card in-place
  const [placeholderPickerIndex, setPlaceholderPickerIndex] = useState<number | null>(null); // index in placeholder to add card to

  // Screen dimensions
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Calculated values
  const cardsPerPage = binder?.layoutPreference === '4x3' ? 12 : 9;
  const columnsPerRow = binder?.layoutPreference === '4x3' ? 4 : 3;
  const totalSlots = cardsPerPage * TOTAL_PAGES;

  // ── Keep refs in sync with state ──
  useEffect(() => { cardPositionsRef.current = cardPositions; }, [cardPositions]);
  useEffect(() => { placeholderCardsRef.current = placeholderCards; }, [placeholderCards]);
  useEffect(() => { draggedCardRef.current = draggedCard; }, [draggedCard]);
  useEffect(() => { hoverTargetRef.current = hoverTarget; }, [hoverTarget]);

  /**
   * Re-measure the trash zone and placeholder AFTER a drag starts.
   * The trash zone is conditionally rendered (only when isDragging is true),
   * so it isn't in the layout tree when the initial measureAllLayouts() runs
   * during handleDragStart. This effect fires after the re-render that makes
   * the trash zone visible, giving us a chance to measure it.
   */
  useEffect(() => {
    if (draggedCard) {
      const timer = setTimeout(() => {
        // Measure trash zone (just appeared because isDragging became true)
        if (trashZoneViewRef.current) {
          try {
            (trashZoneViewRef.current as any).measureInWindow?.(
              (x: number, y: number, width: number, height: number) => {
                if (width > 0 && height > 0) {
                  trashMeasurementRef.current = { x, y, width, height };
                }
              },
            );
          } catch { /* ignore */ }
        }
        // Re-measure placeholder area (layout may have shifted when trash zone appeared)
        if (placeholderAreaViewRef.current) {
          try {
            (placeholderAreaViewRef.current as any).measureInWindow?.(
              (x: number, y: number, width: number, height: number) => {
                if (width > 0 && height > 0) {
                  placeholderMeasurementRef.current = { x, y, width, height };
                }
              },
            );
          } catch { /* ignore */ }
        }
      }, 150); // Wait for React Native to complete the layout
      return () => clearTimeout(timer);
    }
  }, [draggedCard]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => { loadBinderData(); }, [binderId]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasChanges) {
        showSavePrompt();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [hasChanges]);

  /**
   * Measure the container's screen position (called once on layout)
   */
  const handleContainerLayout = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      containerOffsetRef.current = { x: x || 0, y: y || 0 };
    });
  }, []);

  const loadBinderData = async () => {
    try {
      setLoading(true);
      setError(null);

      const binderData = await getBinderById(binderId);
      if (!binderData) {
        setError('Binder not found');
        setLoading(false);
        return;
      }
      setBinder(binderData);

      const slotsPerPage = binderData.layoutPreference === '4x3' ? 12 : 9;
      const totalSlotCount = slotsPerPage * TOTAL_PAGES;

      const positions: CardPosition[] = [];
      for (let i = 0; i < totalSlotCount; i++) {
        positions.push({ cardId: null, cardName: undefined, imageUrl: undefined, slotIndex: i });
      }

      let cardsToPlace: Card[] = [];

      if (binderData.collectionMode === 'master-set' && binderData.set) {
        console.log('[BinderEdit] Loading Master Set cards for:', binderData.set);
        cardsToPlace = await getCardsBySet(binderData.set);

        if (binderData.variantsToTrack && binderData.variantsToTrack.length > 0) {
          cardsToPlace = cardsToPlace.filter((card) => {
            const cardVariant = card.variant || 'base';
            return binderData.variantsToTrack!.includes(cardVariant);
          });
        }

        cardsToPlace.sort((a, b) => {
          const getSetNumber = (numberStr: string): number => {
            const match = numberStr.match(/^(\d+)\//);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getSetNumber(a.number) - getSetNumber(b.number);
        });

        if (binderData.variantPlacement === 'grouped') {
          const isBaseCard = (card: Card) => !card.variant || card.variant === 'base';
          const getBaseId = (card: Card) => `${card.name}-${card.number}`;
          const baseCards: Card[] = [];
          const variantMap = new Map<string, Card[]>();

          cardsToPlace.forEach((card) => {
            if (isBaseCard(card)) {
              baseCards.push(card);
            } else {
              const baseId = getBaseId(card);
              if (!variantMap.has(baseId)) variantMap.set(baseId, []);
              variantMap.get(baseId)!.push(card);
            }
          });

          const grouped: Card[] = [];
          baseCards.forEach((base) => {
            grouped.push(base);
            const variants = variantMap.get(getBaseId(base)) || [];
            variants.sort((a, b) => {
              const order: Record<string, number> = { 'reverse-holo': 1, 'poke-ball': 2, 'master-ball': 3 };
              return (order[a.variant || 'base'] || 0) - (order[b.variant || 'base'] || 0);
            });
            grouped.push(...variants);
          });
          variantMap.forEach((variants, baseId) => {
            if (!baseCards.some((c) => getBaseId(c) === baseId)) grouped.push(...variants);
          });
          cardsToPlace = grouped;
        } else if (binderData.variantPlacement === 'end') {
          const isBaseCard = (card: Card) => !card.variant || card.variant === 'base';
          const bases = cardsToPlace.filter(isBaseCard);
          const variants = cardsToPlace.filter((c) => !isBaseCard(c));
          variants.sort((a, b) => {
            const getSetNumber = (n: string) => { const m = n.match(/^(\d+)\//); return m ? parseInt(m[1], 10) : 0; };
            return getSetNumber(a.number) - getSetNumber(b.number);
          });
          cardsToPlace = [...bases, ...variants];
        }

        console.log('[BinderEdit] Master Set: placing', cardsToPlace.length, 'cards');
      } else if (binderData.collectionMode === 'region' && binderData.region) {
        console.log('[BinderEdit] Loading Region cards for:', binderData.region);
        const pokemonList = await getCardsByRegion(binderData.region as Region, binderData.pokemonArtStyle);

        const selectedCards = await getAllSelectedCardsForBinder(binderData.id);
        if (selectedCards.size > 0) {
          cardsToPlace = await Promise.all(
            pokemonList.map(async (pokemon) => {
              const pokedexNumber = pokemon.pokedexNumber;
              if (pokedexNumber) {
                const selectedCardId = selectedCards.get(pokedexNumber);
                if (selectedCardId) {
                  try {
                    const tcgCard = await getCardById(selectedCardId);
                    if (tcgCard?.imageUrl) {
                      return { ...pokemon, imageUrl: tcgCard.imageUrl, imageUrlHiRes: tcgCard.imageUrlHiRes };
                    }
                  } catch { /* fall back to default sprite */ }
                }
              }
              return pokemon;
            })
          );
        } else {
          cardsToPlace = pokemonList;
        }

        cardsToPlace.sort((a, b) => (a.pokedexNumber ?? 0) - (b.pokedexNumber ?? 0));
        console.log('[BinderEdit] Region: placing', cardsToPlace.length, 'cards');
      } else if (binderData.collectionMode === 'custom') {
        console.log('[BinderEdit] Loading Custom binder cards');
        const savedPositions = await getBinderCardsWithPositions(binderData.id);

        if (savedPositions.size > 0) {
          const results = await Promise.all(
            Array.from(savedPositions.entries()).map(async ([position, data]) => {
              try {
                const card = await getCardById(data.cardId);
                return card ? { position, card } : null;
              } catch { return null; }
            })
          );

          results.forEach((result) => {
            if (result && result.position < totalSlotCount) {
              positions[result.position] = {
                ...positions[result.position],
                cardId: result.card.id,
                cardName: result.card.name,
                imageUrl: result.card.imageUrl,
              };
            }
          });

          console.log('[BinderEdit] Custom: placed', results.filter(Boolean).length, 'cards from saved positions');
        }
      }

      if (binderData.collectionMode !== 'custom') {
        cardsToPlace.forEach((card, index) => {
          if (index < totalSlotCount) {
            positions[index] = {
              ...positions[index],
              cardId: card.id,
              cardName: card.name,
              imageUrl: card.imageUrl,
            };
          }
        });
      }

      setCardPositions(positions);
      setOriginalPositions(positions.map(p => ({ ...p })));
      setLoading(false);
    } catch (err) {
      console.error('[BinderEdit] Error loading binder:', err);
      setError('Failed to load binder data');
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CURRENT PAGE CARDS
  // ─────────────────────────────────────────────────────────────────────────────

  const currentPageCards = useMemo(() => {
    const startIndex = (currentPage - 1) * cardsPerPage;
    return cardPositions.slice(startIndex, startIndex + cardsPerPage);
  }, [cardPositions, currentPage, cardsPerPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // UNDO
  // ─────────────────────────────────────────────────────────────────────────────

  const saveUndoState = useCallback(() => {
    setUndoStack(prev => [...prev, [...cardPositions]]);
  }, [cardPositions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE / EXIT
  // ─────────────────────────────────────────────────────────────────────────────

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

  const saveAndExit = async () => {
    // TODO: Step 34I - Save to database
    console.log('[BinderEdit] Saving positions...');
    navigation.goBack();
  };

  const handleBack = () => {
    if (hasChanges) {
      showSavePrompt();
    } else {
      navigation.goBack();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TAP-TO-SELECT HANDLERS (existing behavior, unchanged)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSlotPress = (slot: CardPosition) => {
    // Don't process taps while dragging
    if (draggedCard) return;

    const { slotIndex, cardId, cardName, imageUrl } = slot;

    if (selectedCard) {
      if (selectedCard.sourceSlot === slotIndex) {
        setSelectedCard(null);
      } else if (cardId) {
        handleSwapCards(slot);
      } else {
        handleMoveCardToSlot(slotIndex);
      }
    } else if (cardId) {
      const pageNumber = Math.floor(slotIndex / cardsPerPage) + 1;
      setSelectedCard({
        cardId,
        cardName: cardName || 'Unknown Card',
        imageUrl,
        sourceSlot: slotIndex,
        sourceIndex: slotIndex,
        sourcePage: pageNumber,
      });
    } else {
      setTargetSlotIndex(slotIndex);
      setShowCardPicker(true);
    }
  };

  const handleSwapCards = (targetSlot: CardPosition) => {
    if (!selectedCard || selectedCard.sourceSlot === 'placeholder') return;

    saveUndoState();
    const sourceSlotIndex = selectedCard.sourceSlot as number;

    setCardPositions(prev => {
      const newPositions = [...prev];
      const targetData = {
        cardId: targetSlot.cardId,
        cardName: targetSlot.cardName,
        imageUrl: targetSlot.imageUrl,
      };
      newPositions[sourceSlotIndex] = {
        ...newPositions[sourceSlotIndex],
        cardId: targetData.cardId,
        cardName: targetData.cardName,
        imageUrl: targetData.imageUrl,
      };
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

  const handleMoveCardToSlot = (targetSlotIndex: number) => {
    if (!selectedCard) return;

    saveUndoState();

    if (selectedCard.sourceSlot === 'placeholder') {
      setPlaceholderCards(p => p.filter((_, i) => i !== selectedCard.sourceIndex));
    }

    setCardPositions(prev => {
      const newPositions = [...prev];
      if (selectedCard.sourceSlot !== 'placeholder') {
        newPositions[selectedCard.sourceSlot] = {
          ...newPositions[selectedCard.sourceSlot],
          cardId: null, cardName: undefined, imageUrl: undefined,
        };
      }
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

  const handlePlaceholderCardPress = (index: number, cardId: string) => {
    // Don't process taps while dragging
    if (draggedCard) return;

    const card = placeholderCards[index];

    if (selectedCard && selectedCard.sourceSlot === 'placeholder' && selectedCard.sourceIndex === index) {
      setSelectedCard(null);
    } else {
      setSelectedCard({
        cardId: card.cardId,
        cardName: card.cardName || 'Unknown Card',
        imageUrl: card.imageUrl,
        sourceSlot: 'placeholder',
        sourceIndex: index,
      });
    }
  };

  const handleCancelSelection = () => { setSelectedCard(null); };

  const handleRemoveCard = () => {
    if (!selectedCard) return;

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
              setPlaceholderCards(prev => prev.filter((_, i) => i !== selectedCard.sourceIndex));
            } else {
              setCardPositions(prev => {
                const newPositions = [...prev];
                newPositions[selectedCard.sourceSlot as number] = {
                  ...newPositions[selectedCard.sourceSlot as number],
                  cardId: null, cardName: undefined, imageUrl: undefined,
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

  const handleTrashPress = () => { handleRemoveCard(); };

  /**
   * Replace selected card: open the Card Picker to choose a replacement.
   * The picked card takes the slot of the currently selected card.
   */
  const handleReplaceCard = () => {
    if (!selectedCard) return;

    if (selectedCard.sourceSlot === 'placeholder') {
      // Replacing a placeholder card — remember the index
      setPlaceholderPickerIndex(selectedCard.sourceIndex);
      setTargetSlotIndex(null);
    } else {
      // Replacing a binder card — target the same slot
      setTargetSlotIndex(selectedCard.sourceSlot as number);
      setPlaceholderPickerIndex(null);
    }

    setReplaceMode(true);
    setInsertMode(false);
    setShowCardPicker(true);
  };

  /**
   * Add a card to a specific empty slot in the placeholder tray.
   * Opens the Card Picker; when a card is chosen it goes into that placeholder slot.
   */
  const handlePlaceholderEmptySlotPress = (index: number) => {
    setPlaceholderPickerIndex(index);
    setTargetSlotIndex(null);
    setInsertMode(false);
    setReplaceMode(false);
    setShowCardPicker(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CARD PICKER
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCardPickerSelect = (card: Card) => {
    // ── Placeholder-add mode: card goes into the placeholder tray ──
    if (placeholderPickerIndex !== null) {
      addCardToPlaceholder(card);
      return;
    }

    if (targetSlotIndex === null) return;

    const existingSlot = cardPositions.find(pos => pos.cardId === card.id);

    if (existingSlot) {
      const existingPage = Math.floor(existingSlot.slotIndex / cardsPerPage) + 1;
      const slotOnPage = (existingSlot.slotIndex % cardsPerPage) + 1;
      Alert.alert(
        'Card Already Placed',
        `${card.name} is already on Page ${existingPage} (Slot ${slotOnPage}). Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {
            closeCardPicker();
          }},
          { text: 'Add Anyway', onPress: () => {
            if (replaceMode) {
              replaceCardInSlot(card);
            } else if (insertMode) {
              insertCardFromPicker(card);
            } else {
              placeCardInSlot(card);
            }
          }},
        ]
      );
    } else {
      if (replaceMode) {
        replaceCardInSlot(card);
      } else if (insertMode) {
        insertCardFromPicker(card);
      } else {
        placeCardInSlot(card);
      }
    }
  };

  /**
   * Helper to reset all card picker state
   */
  const closeCardPicker = () => {
    setShowCardPicker(false);
    setTargetSlotIndex(null);
    setInsertMode(false);
    setReplaceMode(false);
    setPlaceholderPickerIndex(null);
    setSelectedCard(null);
  };

  /**
   * Replace the card in the target binder slot with the picked card.
   * Used by the "Replace" button flow.
   */
  const replaceCardInSlot = (card: Card) => {
    if (targetSlotIndex === null) return;
    saveUndoState();
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: card.id, cardName: card.name, imageUrl: card.imageUrl,
      };
      return newPositions;
    });
    setHasChanges(true);
    closeCardPicker();
  };

  /**
   * Add a picked card into the placeholder tray.
   * Used when tapping an empty placeholder slot or replacing a placeholder card.
   */
  const addCardToPlaceholder = (card: Card) => {
    const idx = placeholderPickerIndex!;
    saveUndoState();

    if (replaceMode && idx < placeholderCards.length) {
      // Replace an existing placeholder card
      setPlaceholderCards(prev => {
        const updated = [...prev];
        updated[idx] = { cardId: card.id, cardName: card.name, imageUrl: card.imageUrl };
        return updated;
      });
    } else {
      // Add to the placeholder (append — the slot index doesn't determine array position)
      if (placeholderCards.length >= PLACEHOLDER_MAX) {
        Alert.alert('Placeholder Full', 'The placeholder tray can hold a maximum of 18 cards.');
        closeCardPicker();
        return;
      }
      setPlaceholderCards(prev => [...prev, { cardId: card.id, cardName: card.name, imageUrl: card.imageUrl }]);
    }

    setHasChanges(true);
    closeCardPicker();
  };

  const placeCardInSlot = (card: Card) => {
    if (targetSlotIndex === null) return;
    saveUndoState();
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: card.id, cardName: card.name, imageUrl: card.imageUrl,
      };
      return newPositions;
    });
    setHasChanges(true);
    closeCardPicker();
  };

  const insertCardFromPicker = (card: Card) => {
    if (targetSlotIndex === null) return;

    const insertAtIndex = targetSlotIndex;
    const newPositions = cardPositions.map(p => ({ ...p }));

    const lastCard = newPositions[newPositions.length - 1];
    let overflowCard: PlaceholderCard | null = null;

    if (lastCard.cardId) {
      if (placeholderCards.length >= PLACEHOLDER_MAX) {
        Alert.alert('Binder is full', 'Cannot insert — all binder slots and placeholder are full.');
        closeCardPicker();
        return;
      }
      overflowCard = { cardId: lastCard.cardId, cardName: lastCard.cardName, imageUrl: lastCard.imageUrl };
    }

    saveUndoState();

    for (let i = newPositions.length - 1; i > insertAtIndex; i--) {
      newPositions[i] = {
        ...newPositions[i],
        cardId: newPositions[i - 1].cardId,
        cardName: newPositions[i - 1].cardName,
        imageUrl: newPositions[i - 1].imageUrl,
      };
    }

    newPositions[insertAtIndex] = {
      ...newPositions[insertAtIndex],
      cardId: card.id, cardName: card.name, imageUrl: card.imageUrl,
    };

    setCardPositions(newPositions);
    if (overflowCard) setPlaceholderCards(prev => [...prev, overflowCard!]);
    setHasChanges(true);
    closeCardPicker();
  };

  const handleInsertButtonPress = (insertAtIndex: number) => {
    setSelectedCard(null);
    setTargetSlotIndex(insertAtIndex);
    setInsertMode(true);
    setShowCardPicker(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INSERT (tap-selected card into "+" position)
  // ─────────────────────────────────────────────────────────────────────────────

  const performInsert = (insertAtIndex: number) => {
    if (!selectedCard) return;

    console.log('[BinderEdit] performInsert:', selectedCard.cardId, 'from slot', selectedCard.sourceSlot, '→ insert at', insertAtIndex);

    const sourceIsInBinder = selectedCard.sourceSlot !== 'placeholder';
    const newPositions = cardPositions.map(p => ({ ...p }));

    if (sourceIsInBinder) {
      const sourceIdx = selectedCard.sourceSlot as number;
      for (let i = sourceIdx; i < newPositions.length - 1; i++) {
        newPositions[i] = {
          ...newPositions[i],
          cardId: newPositions[i + 1].cardId,
          cardName: newPositions[i + 1].cardName,
          imageUrl: newPositions[i + 1].imageUrl,
        };
      }
      newPositions[newPositions.length - 1] = {
        ...newPositions[newPositions.length - 1],
        cardId: null, cardName: undefined, imageUrl: undefined,
      };
      if (insertAtIndex > sourceIdx) insertAtIndex--;
    }

    const lastCard = newPositions[newPositions.length - 1];
    let overflowCard: PlaceholderCard | null = null;

    if (lastCard.cardId) {
      const currentPlaceholderCount = !sourceIsInBinder
        ? placeholderCards.length - 1
        : placeholderCards.length;

      if (currentPlaceholderCount >= PLACEHOLDER_MAX) {
        Alert.alert('Binder is full', 'Cannot insert — all binder slots and placeholder are full.');
        return;
      }

      overflowCard = { cardId: lastCard.cardId, cardName: lastCard.cardName, imageUrl: lastCard.imageUrl };
    }

    saveUndoState();

    for (let i = newPositions.length - 1; i > insertAtIndex; i--) {
      newPositions[i] = {
        ...newPositions[i],
        cardId: newPositions[i - 1].cardId,
        cardName: newPositions[i - 1].cardName,
        imageUrl: newPositions[i - 1].imageUrl,
      };
    }

    newPositions[insertAtIndex] = {
      ...newPositions[insertAtIndex],
      cardId: selectedCard.cardId,
      cardName: selectedCard.cardName,
      imageUrl: selectedCard.imageUrl,
    };

    setCardPositions(newPositions);

    if (!sourceIsInBinder) {
      const newPlaceholder = placeholderCards.filter((_, i) => i !== selectedCard.sourceIndex);
      if (overflowCard) newPlaceholder.push(overflowCard);
      setPlaceholderCards(newPlaceholder);
    } else if (overflowCard) {
      setPlaceholderCards(prev => [...prev, overflowCard!]);
    }

    setHasChanges(true);
    setSelectedCard(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAG & DROP SYSTEM
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Measure all slot positions on screen for drop target detection.
   * Called once at the start of each drag.
   */
  const measureAllLayouts = useCallback(async () => {
    const measurements = new Map<number, LayoutRect>();
    const promises: Promise<void>[] = [];

    // Measure all visible card slots
    for (const [index, view] of slotViewRefs.current.entries()) {
      promises.push(
        new Promise<void>((resolve) => {
          try {
            view.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) {
                measurements.set(index, { x, y, width, height });
              }
              resolve();
            });
          } catch {
            resolve();
          }
        }),
      );
    }

    // Measure placeholder area
    if (placeholderAreaViewRef.current) {
      promises.push(
        new Promise<void>((resolve) => {
          try {
            (placeholderAreaViewRef.current as any).measureInWindow?.((x: number, y: number, width: number, height: number) => {
              placeholderMeasurementRef.current = { x, y, width, height };
              resolve();
            }) || resolve();
          } catch {
            resolve();
          }
        }),
      );
    }

    // Measure trash zone
    if (trashZoneViewRef.current) {
      promises.push(
        new Promise<void>((resolve) => {
          try {
            (trashZoneViewRef.current as any).measureInWindow?.((x: number, y: number, width: number, height: number) => {
              trashMeasurementRef.current = { x, y, width, height };
              resolve();
            }) || resolve();
          } catch {
            resolve();
          }
        }),
      );
    }

    // Also re-measure container offset
    if (containerRef.current) {
      promises.push(
        new Promise<void>((resolve) => {
          containerRef.current!.measureInWindow((x, y) => {
            containerOffsetRef.current = { x: x || 0, y: y || 0 };
            resolve();
          });
        }),
      );
    }

    await Promise.all(promises);
    slotMeasurementsRef.current = measurements;
  }, []);

  /**
   * Determine what drop target is at the given screen coordinates
   */
  const getDropTarget = useCallback((absoluteX: number, absoluteY: number): DropTarget | null => {
    // Check trash zone first (highest priority)
    const trash = trashMeasurementRef.current;
    if (trash && absoluteX >= trash.x && absoluteX <= trash.x + trash.width &&
        absoluteY >= trash.y && absoluteY <= trash.y + trash.height) {
      return { type: 'trash' };
    }

    // Check placeholder area
    const ph = placeholderMeasurementRef.current;
    if (ph && absoluteX >= ph.x && absoluteX <= ph.x + ph.width &&
        absoluteY >= ph.y && absoluteY <= ph.y + ph.height) {
      return { type: 'placeholder' };
    }

    // Check card slots
    for (const [index, layout] of slotMeasurementsRef.current.entries()) {
      if (absoluteX >= layout.x && absoluteX <= layout.x + layout.width &&
          absoluteY >= layout.y && absoluteY <= layout.y + layout.height) {
        const hasCard = cardPositionsRef.current[index]?.cardId != null;
        return { type: hasCard ? 'card' : 'empty', slotIndex: index };
      }
    }

    return null;
  }, []);

  /**
   * Called when a long-press drag starts on a binder card slot.
   * Measures all layouts and initializes the floating card.
   */
  const handleDragStart = useCallback((data: DragStartData, touchX: number, touchY: number) => {
    console.log('[BinderEdit] Drag start:', data.cardName, 'from slot', data.slotIndex);

    // Clear any tap-selected card
    setSelectedCard(null);

    // Set dragged card state
    const dragged: DraggedCard = {
      cardId: data.cardId,
      cardName: data.cardName || 'Unknown Card',
      imageUrl: data.imageUrl,
      sourceSlot: data.slotIndex,
      sourceIndex: data.slotIndex,
    };
    setDraggedCard(dragged);
    draggedCardRef.current = dragged;

    // Position the floating card centered on the finger
    const offsetX = containerOffsetRef.current.x;
    const offsetY = containerOffsetRef.current.y;
    dragAnimX.setValue(touchX - offsetX - FLOATING_CARD_WIDTH / 2);
    dragAnimY.setValue(touchY - offsetY - FLOATING_CARD_HEIGHT / 2);

    // Measure all layout positions for drop detection
    measureAllLayouts();
  }, [dragAnimX, dragAnimY, measureAllLayouts]);

  /**
   * Called when a long-press drag starts on a placeholder card.
   */
  const handlePlaceholderDragStart = useCallback((
    data: { cardId: string; cardName?: string; imageUrl?: string; index: number },
    touchX: number,
    touchY: number,
  ) => {
    console.log('[BinderEdit] Placeholder drag start:', data.cardName, 'from index', data.index);

    setSelectedCard(null);

    const dragged: DraggedCard = {
      cardId: data.cardId,
      cardName: data.cardName || 'Unknown Card',
      imageUrl: data.imageUrl,
      sourceSlot: 'placeholder',
      sourceIndex: data.index,
    };
    setDraggedCard(dragged);
    draggedCardRef.current = dragged;

    const offsetX = containerOffsetRef.current.x;
    const offsetY = containerOffsetRef.current.y;
    dragAnimX.setValue(touchX - offsetX - FLOATING_CARD_WIDTH / 2);
    dragAnimY.setValue(touchY - offsetY - FLOATING_CARD_HEIGHT / 2);

    measureAllLayouts();
  }, [dragAnimX, dragAnimY, measureAllLayouts]);

  /**
   * Called on each drag movement.
   * Updates the floating card position and determines hover target.
   */
  const handleDragUpdate = useCallback((touchX: number, touchY: number) => {
    // Update floating card position (no React state update = no re-render)
    const offsetX = containerOffsetRef.current.x;
    const offsetY = containerOffsetRef.current.y;
    dragAnimX.setValue(touchX - offsetX - FLOATING_CARD_WIDTH / 2);
    dragAnimY.setValue(touchY - offsetY - FLOATING_CARD_HEIGHT / 2);

    // Determine hover target (only update state if it changed)
    const target = getDropTarget(touchX, touchY);
    const prev = hoverTargetRef.current;

    // Skip self-hover (hovering over the source slot)
    const dragged = draggedCardRef.current;
    if (target && dragged) {
      if (target.slotIndex !== undefined && dragged.sourceSlot === target.slotIndex) {
        if (prev !== null) {
          hoverTargetRef.current = null;
          setHoverTarget(null);
        }
        return;
      }
    }

    const changed =
      target?.type !== prev?.type || target?.slotIndex !== prev?.slotIndex;

    if (changed) {
      hoverTargetRef.current = target;
      setHoverTarget(target);
    }
  }, [dragAnimX, dragAnimY, getDropTarget]);

  /**
   * Called when the drag ends (finger lifts).
   * Determines the drop target and performs the appropriate action.
   */
  const handleDragEnd = useCallback((touchX: number, touchY: number) => {
    const dragged = draggedCardRef.current;
    if (!dragged) return;

    const target = getDropTarget(touchX, touchY);
    console.log('[BinderEdit] Drag end at target:', target?.type, target?.slotIndex);

    if (!target) {
      // No valid target — cancel the drag (card returns to original position)
      console.log('[BinderEdit] Drag cancelled — no valid drop target');
      setDraggedCard(null);
      setHoverTarget(null);
      draggedCardRef.current = null;
      hoverTargetRef.current = null;
      return;
    }

    // Don't do anything if dropped on source
    if (target.slotIndex !== undefined && dragged.sourceSlot === target.slotIndex) {
      setDraggedCard(null);
      setHoverTarget(null);
      draggedCardRef.current = null;
      hoverTargetRef.current = null;
      return;
    }

    // Perform the drop action
    performDragAction(dragged, target);

    // Clean up drag state
    setDraggedCard(null);
    setHoverTarget(null);
    draggedCardRef.current = null;
    hoverTargetRef.current = null;
  }, [getDropTarget]);

  /**
   * Called when the gesture finalizes (end or cancel).
   * Ensures drag state is always cleaned up.
   */
  const handleDragFinalize = useCallback(() => {
    if (draggedCardRef.current) {
      setDraggedCard(null);
      setHoverTarget(null);
      draggedCardRef.current = null;
      hoverTargetRef.current = null;
    }
  }, []);

  /**
   * Execute the appropriate action when a card is dropped on a target.
   */
  const performDragAction = (dragged: DraggedCard, target: DropTarget) => {
    switch (target.type) {
      case 'card':
        if (target.slotIndex !== undefined) {
          performDragSwap(dragged, target.slotIndex);
        }
        break;

      case 'empty':
        if (target.slotIndex !== undefined) {
          performDragMove(dragged, target.slotIndex);
        }
        break;

      case 'placeholder':
        performDragToPlaceholder(dragged);
        break;

      case 'trash':
        performDragToTrash(dragged);
        break;
    }
  };

  /**
   * SWAP: Drag a card onto another card → they swap positions.
   */
  const performDragSwap = (dragged: DraggedCard, targetSlotIndex: number) => {
    saveUndoState();

    const positions = cardPositionsRef.current;
    const targetSlot = positions[targetSlotIndex];

    if (dragged.sourceSlot === 'placeholder') {
      // Placeholder card ↔ binder card
      const newPlaceholder = [...placeholderCardsRef.current];
      newPlaceholder[dragged.sourceIndex] = {
        cardId: targetSlot.cardId!,
        cardName: targetSlot.cardName,
        imageUrl: targetSlot.imageUrl,
      };
      setPlaceholderCards(newPlaceholder);

      setCardPositions(prev => {
        const newPositions = [...prev];
        newPositions[targetSlotIndex] = {
          ...newPositions[targetSlotIndex],
          cardId: dragged.cardId,
          cardName: dragged.cardName,
          imageUrl: dragged.imageUrl,
        };
        return newPositions;
      });
    } else {
      // Binder card ↔ binder card
      const sourceIdx = dragged.sourceSlot as number;

      setCardPositions(prev => {
        const newPositions = [...prev];

        // Put target card in source slot
        newPositions[sourceIdx] = {
          ...newPositions[sourceIdx],
          cardId: targetSlot.cardId,
          cardName: targetSlot.cardName,
          imageUrl: targetSlot.imageUrl,
        };

        // Put dragged card in target slot
        newPositions[targetSlotIndex] = {
          ...newPositions[targetSlotIndex],
          cardId: dragged.cardId,
          cardName: dragged.cardName,
          imageUrl: dragged.imageUrl,
        };

        return newPositions;
      });
    }

    setHasChanges(true);
    console.log('[BinderEdit] Drag swap complete');
  };

  /**
   * MOVE: Drag a card to an empty slot → card moves there.
   */
  const performDragMove = (dragged: DraggedCard, targetSlotIndex: number) => {
    saveUndoState();

    if (dragged.sourceSlot === 'placeholder') {
      // Remove from placeholder
      setPlaceholderCards(p => p.filter((_, i) => i !== dragged.sourceIndex));
    } else {
      // Clear source binder slot
      setCardPositions(prev => {
        const newPositions = [...prev];
        const sourceIdx = dragged.sourceSlot as number;
        newPositions[sourceIdx] = {
          ...newPositions[sourceIdx],
          cardId: null, cardName: undefined, imageUrl: undefined,
        };
        // Place in target slot
        newPositions[targetSlotIndex] = {
          ...newPositions[targetSlotIndex],
          cardId: dragged.cardId,
          cardName: dragged.cardName,
          imageUrl: dragged.imageUrl,
        };
        return newPositions;
      });
      setHasChanges(true);
      console.log('[BinderEdit] Drag move complete');
      return;
    }

    // Place from placeholder into binder slot
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: dragged.cardId,
        cardName: dragged.cardName,
        imageUrl: dragged.imageUrl,
      };
      return newPositions;
    });

    setHasChanges(true);
    console.log('[BinderEdit] Drag move (from placeholder) complete');
  };

  /**
   * PLACEHOLDER: Drag a binder card to the placeholder area.
   */
  const performDragToPlaceholder = (dragged: DraggedCard) => {
    // If it's already in the placeholder, ignore
    if (dragged.sourceSlot === 'placeholder') return;

    if (placeholderCardsRef.current.length >= PLACEHOLDER_MAX) {
      Alert.alert('Placeholder Full', 'The placeholder tray can hold a maximum of 18 cards.');
      return;
    }

    saveUndoState();

    // Add to placeholder
    setPlaceholderCards(prev => [...prev, {
      cardId: dragged.cardId,
      cardName: dragged.cardName,
      imageUrl: dragged.imageUrl,
    }]);

    // Clear source binder slot
    const sourceIdx = dragged.sourceSlot as number;
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[sourceIdx] = {
        ...newPositions[sourceIdx],
        cardId: null, cardName: undefined, imageUrl: undefined,
      };
      return newPositions;
    });

    setHasChanges(true);
    console.log('[BinderEdit] Drag to placeholder complete');
  };

  /**
   * TRASH: Drag a card to the trash zone → confirm removal.
   */
  const performDragToTrash = (dragged: DraggedCard) => {
    Alert.alert(
      'Remove Card',
      `Remove ${dragged.cardName} from the binder? The slot will become empty.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            saveUndoState();

            if (dragged.sourceSlot === 'placeholder') {
              setPlaceholderCards(prev => prev.filter((_, i) => i !== dragged.sourceIndex));
            } else {
              const sourceIdx = dragged.sourceSlot as number;
              setCardPositions(prev => {
                const newPositions = [...prev];
                newPositions[sourceIdx] = {
                  ...newPositions[sourceIdx],
                  cardId: null, cardName: undefined, imageUrl: undefined,
                };
                return newPositions;
              });
            }

            setHasChanges(true);
            console.log('[BinderEdit] Drag to trash complete');
          },
        },
      ],
    );
  };

  /**
   * Register a slot view ref for layout measurement
   */
  const registerSlotRef = useCallback((slotIndex: number, ref: View | null) => {
    if (ref) {
      slotViewRefs.current.set(slotIndex, ref);
    } else {
      slotViewRefs.current.delete(slotIndex);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Card Grid
  // ─────────────────────────────────────────────────────────────────────────────

  const renderCardGrid = () => {
    const rows: CardPosition[][] = [];
    for (let i = 0; i < currentPageCards.length; i += columnsPerRow) {
      rows.push(currentPageCards.slice(i, i + columnsPerRow));
    }

    const pageStartIndex = (currentPage - 1) * cardsPerPage;

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => {
          const rowStartIndex = pageStartIndex + rowIndex * columnsPerRow;

          return (
            <View key={rowIndex} style={styles.row}>
              {/* Plus sign at start of row — always visible */}
              <InsertButton
                onPress={() => handleInsertButtonPress(rowStartIndex)}
              />

              {row.map((slot, colIndex) => {
                const isDraggedOver =
                  hoverTarget?.type === 'card' && hoverTarget?.slotIndex === slot.slotIndex ||
                  hoverTarget?.type === 'empty' && hoverTarget?.slotIndex === slot.slotIndex;

                const isDragSource =
                  draggedCard !== null &&
                  draggedCard.sourceSlot !== 'placeholder' &&
                  draggedCard.sourceSlot === slot.slotIndex;

                return (
                  <React.Fragment key={`${slot.slotIndex}-${slot.cardId || 'empty'}`}>
                    {/* Card slot with drag support and ref for measurement */}
                    <View
                      ref={(ref) => registerSlotRef(slot.slotIndex, ref)}
                      style={{ flex: 1 }}
                    >
                      <CardSlot
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
                        isDraggedOver={isDraggedOver}
                        isDragSource={isDragSource}
                        onDragStart={handleDragStart}
                        onDragUpdate={handleDragUpdate}
                        onDragEnd={handleDragEnd}
                        onDragFinalize={handleDragFinalize}
                      />
                    </View>

                    {/* Plus sign between cards (skip last — next row's start "+" covers it) */}
                    {colIndex < row.length - 1 && (
                      <InsertButton
                        onPress={() => handleInsertButtonPress(rowStartIndex + colIndex + 1)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Main Screen
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <LoadingScreen message="Loading binder..." />;
  }

  if (error || !binder) {
    return (
      <ErrorScreen
        message={error || 'Unable to load binder'}
        onRetry={loadBinderData}
      />
    );
  }

  const selectedPlaceholderIndex = selectedCard?.sourceSlot === 'placeholder'
    ? selectedCard.sourceIndex
    : -1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View
        ref={containerRef}
        style={{ flex: 1 }}
        onLayout={handleContainerLayout}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Edit: {binder.name}</Text>
          <View style={styles.headerRight}>
            {hasChanges && (
              <TouchableOpacity style={styles.saveButton} onPress={saveAndExit}>
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

        {/* Selected Card Bar (tap-selected) */}
        {selectedCard && !draggedCard && (
          <SelectedCardBar
            cardName={selectedCard.cardName}
            sourcePage={selectedCard.sourcePage}
            onCancel={handleCancelSelection}
            onReplace={handleReplaceCard}
            onRemove={handleRemoveCard}
          />
        )}

        {/* Card Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!draggedCard} // Disable scroll while dragging
        >
          {renderCardGrid()}
        </ScrollView>

        {/* Card Placeholder Tray */}
        <CardPlaceholder
          cards={placeholderCards}
          maxCards={PLACEHOLDER_MAX}
          selectedIndex={selectedPlaceholderIndex}
          onCardPress={handlePlaceholderCardPress}
          onEmptySlotPress={handlePlaceholderEmptySlotPress}
          onTrashPress={handleTrashPress}
          hasSelectedCard={selectedCard !== null}
          isDragging={draggedCard !== null}
          isDragOverPlaceholder={hoverTarget?.type === 'placeholder'}
          isDragOverTrash={hoverTarget?.type === 'trash'}
          placeholderAreaRef={(ref) => { placeholderAreaViewRef.current = ref; }}
          trashZoneRef={(ref) => { trashZoneViewRef.current = ref; }}
          onCardDragStart={handlePlaceholderDragStart}
          onCardDragUpdate={handleDragUpdate}
          onCardDragEnd={handleDragEnd}
          onCardDragFinalize={handleDragFinalize}
        />

        {/* ── Floating Drag Card Overlay ── */}
        {draggedCard && (
          <RNAnimated.View
            style={[
              styles.floatingCard,
              {
                transform: [
                  { translateX: dragAnimX },
                  { translateY: dragAnimY },
                ],
              },
            ]}
            pointerEvents="none" // Don't interfere with gesture tracking
          >
            {draggedCard.imageUrl ? (
              <Image
                source={{ uri: draggedCard.imageUrl }}
                style={styles.floatingCardImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.floatingCardPlaceholder}>
                <Text style={styles.floatingCardIcon}>🃏</Text>
                <Text style={styles.floatingCardText} numberOfLines={2}>
                  {draggedCard.cardName}
                </Text>
              </View>
            )}
          </RNAnimated.View>
        )}
      </View>

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
        onClose={closeCardPicker}
        onSelectCard={handleCardPickerSelect}
        title={replaceMode ? 'Replace Card' : 'Add Card'}
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
  // ── Floating drag card ──
  floatingCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FLOATING_CARD_WIDTH,
    height: FLOATING_CARD_HEIGHT,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    opacity: 0.85,
    zIndex: 9999,
    elevation: 20,
    // Shadow for "lifted" effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  floatingCardImage: {
    width: '100%',
    height: '100%',
  },
  floatingCardPlaceholder: {
    flex: 1,
    backgroundColor: '#1a5fb4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  floatingCardIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  floatingCardText: {
    fontSize: 9,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
});
