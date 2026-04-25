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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { getBinderById } from '../../services/supabase/binders';
import { getBinderCardsWithPositions } from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, getCardById, getCardsByIds, getPokemonImageUrl, type Region } from '../../services/api/pokemonApi';
import { getAllSelectedCardsForBinder, setSelectedCardForPokemon, clearSelectedCardForPokemon } from '../../services/supabase/regionCards';
import { getSearchName, findPokemonByDexNumber } from '../../data/pokemonRegions';
import { getCardPositionsForBinder, saveCardPositionsForBinder, getPlaceholderCardsForBinder, savePlaceholderCardsForBinder, syncBinderCardsFromPositions } from '../../services/supabase/binderPositions';
import { CardSlot, CardPlaceholder, SelectedCardBar, InsertButton, type PlaceholderCard } from '../../components/BinderEdit';
import type { DragStartData } from '../../components/BinderEdit/CardSlot';
import EnlargedCardOverlay, { type EnlargedCardData } from '../../components/Card/EnlargedCardOverlay';
import PageNavigator from '../../components/Binder/PageNavigator';
import { JumpToPageModal } from '../../components/Binder/JumpToPageModal';
import { CardPickerModal } from '../../components/CardPicker';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import type { Binder, Card } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, type ThemeColors } from '../../constants/theme';
import { lightTap } from '../../utils/haptics';

/**
 * Position of a card in the binder grid
 * Stores all card display data to avoid lookup issues
 */
interface CardPosition {
  cardId: string | null;
  cardName?: string;
  imageUrl?: string;
  cardSet?: string; // Set name (used to carry custom card color info)
  slotIndex: number; // Global index across all pages (0-based)
  pokemonName?: string; // For region slots: the Pokémon name (used for card picker pre-fill)
  pokedexNumber?: number; // For region slots: the Pokédex number
  spriteUrl?: string; // For region slots: the default sprite URL (shown when no TCG card is selected)
}

/**
 * Build a region card ID safely. When the binder's region is missing for any
 * reason, fall back to looking the Pokémon up by its national Pokédex number
 * across all regions, so we never persist a broken `region-Unknown-XXX` ID
 * (which previously caused slots to render as "Pokémon #XXX" with no image
 * after a reload).
 */
function buildRegionCardId(
  binderRegion: string | undefined,
  pokedexNumber: number | undefined,
): string {
  if (binderRegion && pokedexNumber !== undefined) {
    return `region-${binderRegion}-${pokedexNumber}`;
  }
  if (pokedexNumber !== undefined) {
    const found = findPokemonByDexNumber(pokedexNumber);
    if (found) {
      console.warn('[BinderEdit] binder.region missing; recovered region from dex number', { pokedexNumber, region: found.region });
      return `region-${found.region}-${pokedexNumber}`;
    }
  }
  console.warn('[BinderEdit] Unable to build region card ID, falling back to Unknown', { binderRegion, pokedexNumber });
  return `region-${binderRegion || 'Unknown'}-${pokedexNumber}`;
}

/**
 * Shift all card data one slot to the left starting from removedIndex,
 * so there's no empty gap left behind when a card is removed.
 */
function shiftCardsLeft(positions: CardPosition[], removedIndex: number): CardPosition[] {
  const newPositions = [...positions];
  for (let i = removedIndex; i < newPositions.length - 1; i++) {
    newPositions[i] = {
      slotIndex: i,
      cardId: newPositions[i + 1].cardId,
      cardName: newPositions[i + 1].cardName,
      imageUrl: newPositions[i + 1].imageUrl,
      cardSet: newPositions[i + 1].cardSet,
      pokemonName: newPositions[i + 1].pokemonName,
      pokedexNumber: newPositions[i + 1].pokedexNumber,
      spriteUrl: newPositions[i + 1].spriteUrl,
    };
  }
  const lastIdx = newPositions.length - 1;
  newPositions[lastIdx] = {
    slotIndex: lastIdx,
    cardId: null,
    cardName: undefined,
    imageUrl: undefined,
    cardSet: undefined,
  };
  return newPositions;
}

/**
 * Currently selected card info (tap-to-select mode)
 */
interface SelectedCard {
  cardId: string;
  cardName: string;
  imageUrl?: string;
  cardSet?: string;
  sourceSlot: number | 'placeholder';
  sourceIndex: number;
  sourcePage?: number;
  pokemonName?: string;
  pokedexNumber?: number;
  spriteUrl?: string;
}

/**
 * Currently dragged card info (drag & drop mode)
 */
interface DraggedCard {
  cardId: string;
  cardName: string;
  imageUrl?: string;
  cardSet?: string;
  sourceSlot: number | 'placeholder';
  sourceIndex: number;
  pokemonName?: string;
  pokedexNumber?: number;
  spriteUrl?: string;
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
  type: 'card' | 'empty' | 'placeholder' | 'trash' | 'insert';
  slotIndex?: number;
  /** Index of a specific placeholder card that was dropped on (for swap) */
  placeholderCardIndex?: number;
  /** Global slot index where the dragged card should be inserted (for "+" buttons) */
  insertAtIndex?: number;
}

const MIN_PAGES = 40; // Minimum pages for binder edit (more are added if cards need it)
const PLACEHOLDER_MAX = 18; // Maximum cards in placeholder tray
const FLOATING_CARD_WIDTH = 70; // Width of the floating drag card
const FLOATING_CARD_HEIGHT = 100; // Height of the floating drag card

export default function BinderEditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { binderId } = route.params as { binderId: string };

  // Screen state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Binder data
  const [binder, setBinder] = useState<Binder | null>(null);

  // Card positions in binder slots
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [originalPositions, setOriginalPositions] = useState<CardPosition[]>([]);

  // Placeholder tray (temporarily removed cards)
  const [placeholderCards, setPlaceholderCards] = useState<PlaceholderCard[]>([]);

  // Navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(MIN_PAGES);
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
  const placeholderCardViewRefs = useRef<Map<number, View>>(new Map());
  const placeholderCardMeasurementsRef = useRef<Map<number, LayoutRect>>(new Map());

  // Insert button (the "+" between cards) view refs and measurements
  // Keyed by the insertAtIndex (the global slot index where insertion would happen)
  const insertButtonViewRefs = useRef<Map<number, View>>(new Map());
  const insertButtonMeasurementsRef = useRef<Map<number, LayoutRect>>(new Map());

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
  const [cardPickerInitialQuery, setCardPickerInitialQuery] = useState(''); // Pre-fill search for region Pokémon
  const [cardPickerPokemonOnly, setCardPickerPokemonOnly] = useState(false); // Filter to Pokémon cards only

  // Region mode: number of region Pokémon slots (slots 0 to regionCardCount-1 are Pokémon)
  const [regionCardCount, setRegionCardCount] = useState(0);

  // Screen dimensions
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Calculated values
  const cardsPerPage = binder?.layoutPreference === '4x3' ? 12 : 9;
  const columnsPerRow = binder?.layoutPreference === '4x3' ? 4 : 3;
  const totalSlots = cardsPerPage * totalPages;

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
        // Re-measure individual placeholder cards
        for (const [index, view] of placeholderCardViewRefs.current.entries()) {
          try {
            view.measureInWindow((x: number, y: number, width: number, height: number) => {
              if (width > 0 && height > 0) {
                placeholderCardMeasurementsRef.current.set(index, { x, y, width, height });
              }
            });
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

      // We'll determine total pages after loading cards; start with a temporary array
      let cardsToPlace: Card[] = [];
      // Region mode: stores pokedexNumber → TCG card ID for restoring metadata on reload
      let regionSelectedCards = new Map<number, string>();

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

        const editPlacement = binderData.variantPlacement || 'grouped';
        const defaultOrder = ['base', 'reverse-holo', 'poke-ball', 'master-ball', 'secret-rare'];
        const effectiveOrder = binderData.variantOrder && binderData.variantOrder.length > 0
          ? binderData.variantOrder : defaultOrder;
        const groupPosition = new Map<string, number>();
        effectiveOrder.forEach((key, idx) => groupPosition.set(key, idx));

        const getSetNumber = (numberStr: string): number => {
          const match = numberStr.match(/^(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        const isSecretRare = (card: Card): boolean => {
          const cardNum = getSetNumber(card.number);
          const total = parseInt(card.setTotal || '0', 10);
          return total > 0 && cardNum > total;
        };
        const getCardGroupKey = (card: Card): string => {
          if (isSecretRare(card)) return 'secret-rare';
          return card.variant || 'base';
        };
        const isBaseCard = (card: Card) => !card.variant || card.variant === 'base';
        const getBaseId = (card: Card) => `${card.name}-${card.number}`;

        if (editPlacement === 'grouped') {
          const regularCards: Card[] = [];
          const secretRareCards: Card[] = [];
          cardsToPlace.forEach(card => {
            if (isSecretRare(card)) {
              secretRareCards.push(card);
            } else {
              regularCards.push(card);
            }
          });

          const cardGroups = new Map<string, Card[]>();
          const groupOrder: string[] = [];
          regularCards.forEach((card) => {
            const baseId = getBaseId(card);
            if (!cardGroups.has(baseId)) {
              cardGroups.set(baseId, []);
              groupOrder.push(baseId);
            }
            cardGroups.get(baseId)!.push(card);
          });

          const fixedOrder: Record<string, number> = {
            'base': 0, 'reverse-holo': 1, 'poke-ball': 2, 'master-ball': 3,
          };
          const grouped: Card[] = [];
          groupOrder.forEach((baseId) => {
            const cards = cardGroups.get(baseId)!;
            cards.sort((a, b) => {
              return (fixedOrder[a.variant || 'base'] ?? 99)
                   - (fixedOrder[b.variant || 'base'] ?? 99);
            });
            grouped.push(...cards);
          });

          secretRareCards.sort((a, b) => getSetNumber(a.number) - getSetNumber(b.number));

          const secretFirst = effectiveOrder.length > 0 && effectiveOrder[0] === 'secret-rare';
          if (secretFirst) {
            cardsToPlace = [...secretRareCards, ...grouped];
          } else {
            cardsToPlace = [...grouped, ...secretRareCards];
          }
        } else if (editPlacement === 'end') {
          const groups = new Map<string, Card[]>();
          cardsToPlace.forEach(card => {
            const key = getCardGroupKey(card);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(card);
          });
          groups.forEach(cards => {
            cards.sort((a, b) => getSetNumber(a.number) - getSetNumber(b.number));
          });
          const result: Card[] = [];
          effectiveOrder.forEach(key => {
            const groupCards = groups.get(key);
            if (groupCards) result.push(...groupCards);
          });
          groups.forEach((cards, key) => {
            if (!effectiveOrder.includes(key)) result.push(...cards);
          });
          cardsToPlace = result;
        }

        console.log('[BinderEdit] Master Set: placing', cardsToPlace.length, 'cards');
      } else if (binderData.collectionMode === 'region' && binderData.region) {
        console.log('[BinderEdit] Loading Region cards for:', binderData.region);
        const pokemonList = await getCardsByRegion(binderData.region as Region, binderData.pokemonArtStyle);

        const selectedCards = await getAllSelectedCardsForBinder(binderData.id);
        regionSelectedCards = selectedCards;
        if (selectedCards.size > 0) {
          const selectedCardIds = Array.from(selectedCards.values());
          const tcgCardsMap = await getCardsByIds(selectedCardIds);

          cardsToPlace = pokemonList.map((pokemon) => {
            const pokedexNumber = pokemon.pokedexNumber;
            if (pokedexNumber) {
              const selectedCardId = selectedCards.get(pokedexNumber);
              if (selectedCardId) {
                const tcgCard = tcgCardsMap.get(selectedCardId);
                if (tcgCard?.imageUrl) {
                  return { ...pokemon, imageUrl: tcgCard.imageUrl, imageUrlHiRes: tcgCard.imageUrlHiRes };
                }
              }
            }
            return pokemon;
          });
        } else {
          cardsToPlace = pokemonList;
        }

        cardsToPlace.sort((a, b) => (a.pokedexNumber ?? 0) - (b.pokedexNumber ?? 0));
        setRegionCardCount(cardsToPlace.length);
        console.log('[BinderEdit] Region: placing', cardsToPlace.length, 'cards');
      } else if (binderData.collectionMode === 'custom') {
        console.log('[BinderEdit] Loading Custom binder cards');
      }

      // ── Calculate how many pages we need ──
      // For master-set / region: based on number of cards to place
      // For custom: we'll check saved positions to find the highest slot used
      let neededPages = MIN_PAGES;

      if (binderData.collectionMode !== 'custom') {
        const pagesForCards = Math.ceil(cardsToPlace.length / slotsPerPage);
        neededPages = Math.max(MIN_PAGES, pagesForCards);
      }

      // Load saved positions from binder_card_positions (single source of truth)
      let dbPositions: { slotIndex: number; cardId: string | null }[] = [];
      try {
        dbPositions = await getCardPositionsForBinder(binderData.id);
        if (dbPositions.length > 0) {
          const maxDbSlot = Math.max(...dbPositions.map(p => p.slotIndex));
          const pagesForDb = Math.ceil((maxDbSlot + 1) / slotsPerPage);
          neededPages = Math.max(neededPages, pagesForDb);
        }
      } catch (dbErr) {
        console.warn('[BinderEdit] Could not load saved positions, using defaults:', dbErr);
      }

      // For custom binders with no saved positions yet, fall back to binder_cards
      let customFallbackPositions: Map<number, { cardId: string }> | null = null;
      if (binderData.collectionMode === 'custom' && dbPositions.length === 0) {
        customFallbackPositions = await getBinderCardsWithPositions(binderData.id);
        if (customFallbackPositions.size > 0) {
          const maxPosition = Math.max(...Array.from(customFallbackPositions.keys()));
          const pagesForCustom = Math.ceil((maxPosition + 1) / slotsPerPage);
          neededPages = Math.max(MIN_PAGES, pagesForCustom);
        }
      }

      // Update the total pages state
      const computedPages = neededPages;
      setTotalPages(computedPages);
      const totalSlotCount = slotsPerPage * computedPages;

      console.log('[BinderEdit] Computed pages:', computedPages, '(slots:', totalSlotCount, ')');

      // ── Create the positions array ──
      const positions: CardPosition[] = [];
      for (let i = 0; i < totalSlotCount; i++) {
        positions.push({ cardId: null, cardName: undefined, imageUrl: undefined, slotIndex: i });
      }

      // ── Fill positions with loaded cards ──

      if (binderData.collectionMode !== 'custom') {
        // Master Set / Region: place API cards in default order first
        cardsToPlace.forEach((card, index) => {
          if (index < totalSlotCount) {
            const isRegion = binderData.collectionMode === 'region';
            positions[index] = {
              ...positions[index],
              cardId: card.id,
              cardName: card.name,
              imageUrl: card.imageUrl,
              pokemonName: isRegion ? card.name : undefined,
              pokedexNumber: isRegion ? card.pokedexNumber : undefined,
              spriteUrl: isRegion ? (card.pokedexNumber
                ? getPokemonImageUrl(card.pokedexNumber, binderData.pokemonArtStyle || 'sprite')
                : card.imageUrl) : undefined,
            };
          }
        });
      }

      // Apply saved positions from binder_card_positions (single source of truth)
      if (dbPositions.length > 0) {
        console.log('[BinderEdit] Found', dbPositions.length, 'saved positions in database');

        // Build a lookup map from all loaded cards (API cards for master-set/region)
        const cardLookup = new Map<string, { name: string; imageUrl?: string; pokemonName?: string; pokedexNumber?: number; spriteUrl?: string }>();
        positions.forEach(p => {
          if (p.cardId) {
            cardLookup.set(p.cardId, { name: p.cardName || '', imageUrl: p.imageUrl, pokemonName: p.pokemonName, pokedexNumber: p.pokedexNumber, spriteUrl: p.spriteUrl });
          }
        });

        // For region binders: build a reverse map (TCG card ID → region metadata)
        // so we can restore pokemonName/pokedexNumber/spriteUrl for slots that
        // have a real TCG card assigned instead of the default region card ID.
        const tcgToRegionMeta = new Map<string, { pokemonName: string; pokedexNumber: number; spriteUrl: string }>();
        if (binderData.collectionMode === 'region') {
          regionSelectedCards.forEach((tcgCardId, pokedexNumber) => {
            const regionCardId = `region-${binderData.region}-${pokedexNumber}`;
            const regionInfo = cardLookup.get(regionCardId);
            if (regionInfo?.pokemonName) {
              tcgToRegionMeta.set(tcgCardId, {
                pokemonName: regionInfo.pokemonName,
                pokedexNumber,
                spriteUrl: regionInfo.spriteUrl || '',
              });
            }
          });
        }

        // Reset all positions to empty
        for (let i = 0; i < totalSlotCount; i++) {
          positions[i] = { cardId: null, cardName: undefined, imageUrl: undefined, slotIndex: i };
        }

        // Place cards at their saved positions
        // Collect card IDs not in local lookup so we can batch-fetch them
        const missingIds: string[] = [];
        for (const saved of dbPositions) {
          if (saved.slotIndex < totalSlotCount && saved.cardId && !cardLookup.has(saved.cardId)) {
            missingIds.push(saved.cardId);
          }
        }
        const batchCards = missingIds.length > 0 ? await getCardsByIds(missingIds) : new Map<string, any>();

        for (const saved of dbPositions) {
          if (saved.slotIndex < totalSlotCount && saved.cardId) {
            const cardInfo = cardLookup.get(saved.cardId);
            if (cardInfo) {
              positions[saved.slotIndex] = {
                slotIndex: saved.slotIndex,
                cardId: saved.cardId,
                cardName: cardInfo.name,
                imageUrl: cardInfo.imageUrl,
                cardSet: cardInfo.set,
                pokemonName: cardInfo.pokemonName,
                pokedexNumber: cardInfo.pokedexNumber,
                spriteUrl: cardInfo.spriteUrl,
              };
            } else {
              const regionMeta = tcgToRegionMeta.get(saved.cardId);
              const card = batchCards.get(saved.cardId);
              if (card) {
                // If we recovered a default region card (e.g. legacy
                // `region-Unknown-242` data), restore the slot's region
                // metadata directly from the card so it behaves like a normal
                // default-region slot (tap opens the card picker, can't be
                // deleted) rather than like a placed TCG card.
                const isRegionCard = card.id.startsWith('region-');
                positions[saved.slotIndex] = {
                  slotIndex: saved.slotIndex,
                  cardId: card.id,
                  cardName: card.name,
                  imageUrl: card.imageUrl,
                  cardSet: card.set,
                  pokemonName: isRegionCard ? card.name : regionMeta?.pokemonName,
                  pokedexNumber: isRegionCard ? card.pokedexNumber : regionMeta?.pokedexNumber,
                  spriteUrl: isRegionCard ? card.imageUrl : regionMeta?.spriteUrl,
                };
              }
            }
          }
        }

      } else if (binderData.collectionMode === 'custom' && customFallbackPositions && customFallbackPositions.size > 0) {
        const fallbackIds = Array.from(customFallbackPositions.values()).map(d => d.cardId);
        const fallbackCards = await getCardsByIds(fallbackIds);

        for (const [position, data] of customFallbackPositions.entries()) {
          const card = fallbackCards.get(data.cardId);
          if (card && position < totalSlotCount) {
            positions[position] = {
              ...positions[position],
              cardId: card.id,
              cardName: card.name,
              imageUrl: card.imageUrl,
              cardSet: card.set,
            };
          }
        }

        console.log('[BinderEdit] Custom fallback: placed', fallbackCards.size, 'cards from binder_cards');
      }

      setCardPositions(positions);
      setOriginalPositions(positions.map(p => ({ ...p })));

      // ── Load saved placeholder cards ──
      try {
        const savedPlaceholder = await getPlaceholderCardsForBinder(binderData.id);
        if (savedPlaceholder.length > 0) {
          console.log('[BinderEdit] Loading', savedPlaceholder.length, 'saved placeholder cards');

          // Build lookup from positions already loaded above
          const cardLookupForPlaceholder = new Map<string, { name: string; imageUrl?: string }>();
          positions.forEach(p => {
            if (p.cardId) {
              cardLookupForPlaceholder.set(p.cardId, { name: p.cardName || '', imageUrl: p.imageUrl });
            }
          });

          const uncachedPlaceholderIds = savedPlaceholder
            .filter(s => !cardLookupForPlaceholder.has(s.cardId))
            .map(s => s.cardId);
          const batchPlaceholders = uncachedPlaceholderIds.length > 0
            ? await getCardsByIds(uncachedPlaceholderIds)
            : new Map<string, any>();

          const loadedPlaceholder: PlaceholderCard[] = [];
          for (const saved of savedPlaceholder) {
            const cached = cardLookupForPlaceholder.get(saved.cardId);
            if (cached) {
              loadedPlaceholder.push({ cardId: saved.cardId, cardName: cached.name, imageUrl: cached.imageUrl });
            } else {
              const card = batchPlaceholders.get(saved.cardId);
              if (card) {
                loadedPlaceholder.push({ cardId: card.id, cardName: card.name, imageUrl: card.imageUrl });
              }
            }
          }
          setPlaceholderCards(loadedPlaceholder);
        }
      } catch (phErr) {
        console.warn('[BinderEdit] Could not load placeholder cards:', phErr);
      }

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
    try {
      setIsSaving(true);
      console.log('[BinderEdit] Saving positions to database...');
      await saveCardPositionsForBinder(binderId, cardPositions);
      await savePlaceholderCardsForBinder(binderId, placeholderCards);

      // Determine which cards were added during this edit session
      // (in current positions but not in original positions)
      const originalCardIds = new Set(
        originalPositions.filter(p => p.cardId).map(p => p.cardId!)
      );
      const newlyAddedCardIds = [
        ...new Set(
          cardPositions
            .filter(p => p.cardId && !originalCardIds.has(p.cardId))
            .map(p => p.cardId!)
        ),
      ];

      // Sync binder_cards table so progress bar reflects added/removed cards
      if (binder) {
        await syncBinderCardsFromPositions(binderId, binder.collectionMode, newlyAddedCardIds);
      }

      setOriginalPositions(cardPositions.map(p => ({ ...p })));
      setHasChanges(false);
      setUndoStack([]);
      console.log('[BinderEdit] Positions, placeholders, and card counts saved successfully');
      navigation.goBack();
    } catch (err) {
      setIsSaving(false);
      console.error('[BinderEdit] Error saving positions:', err);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
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
    } else if (slot.pokemonName && cardId?.startsWith('region-')) {
      // Region sprite slot (no TCG card selected) — open card picker directly
      setTargetSlotIndex(slotIndex);
      setCardPickerInitialQuery(getSearchName(slot.pokemonName));
      setCardPickerPokemonOnly(true);
      setReplaceMode(true);
      setShowCardPicker(true);
    } else if (cardId) {
      const pageNumber = Math.floor(slotIndex / cardsPerPage) + 1;
      const slotPos = cardPositions[slotIndex];
      setSelectedCard({
        cardId,
        cardName: cardName || 'Unknown Card',
        imageUrl,
        cardSet: slotPos?.cardSet,
        sourceSlot: slotIndex,
        sourceIndex: slotIndex,
        sourcePage: pageNumber,
        pokemonName: slotPos?.pokemonName,
        pokedexNumber: slotPos?.pokedexNumber,
        spriteUrl: slotPos?.spriteUrl,
      });
    } else {
      // Empty slot tapped — open card picker
      setTargetSlotIndex(slotIndex);
      if (slot.pokemonName) {
        setCardPickerInitialQuery(getSearchName(slot.pokemonName));
        setCardPickerPokemonOnly(true);
      } else {
        setCardPickerInitialQuery('');
        setCardPickerPokemonOnly(false);
      }
      setShowCardPicker(true);
    }
  };

  const handleSwapCards = (targetSlot: CardPosition) => {
    if (!selectedCard) return;

    saveUndoState();

    if (selectedCard.sourceSlot === 'placeholder') {
      // Placeholder card → binder card: swap them
      const placeholderIdx = selectedCard.sourceIndex;

      // Put the binder card into the placeholder slot
      setPlaceholderCards(prev => {
        const updated = [...prev];
        updated[placeholderIdx] = {
          cardId: targetSlot.cardId!,
          cardName: targetSlot.cardName,
          imageUrl: targetSlot.imageUrl,
        };
        return updated;
      });

      // Put the placeholder card into the binder slot
      setCardPositions(prev => {
        const newPositions = [...prev];
        newPositions[targetSlot.slotIndex] = {
          ...newPositions[targetSlot.slotIndex],
          cardId: selectedCard.cardId,
          cardName: selectedCard.cardName,
          imageUrl: selectedCard.imageUrl,
          cardSet: selectedCard.cardSet,
        };
        return newPositions;
      });
    } else {
      // Binder card → binder card: swap them (including Pokémon metadata)
      const sourceSlotIndex = selectedCard.sourceSlot as number;

      setCardPositions(prev => {
        const newPositions = [...prev];
        const sourcePos = newPositions[sourceSlotIndex];
        const targetPos = newPositions[targetSlot.slotIndex];

        const sourceData = {
          cardId: sourcePos.cardId,
          cardName: sourcePos.cardName,
          imageUrl: sourcePos.imageUrl,
          cardSet: sourcePos.cardSet,
          pokemonName: sourcePos.pokemonName,
          pokedexNumber: sourcePos.pokedexNumber,
          spriteUrl: sourcePos.spriteUrl,
        };
        const targetData = {
          cardId: targetPos.cardId,
          cardName: targetPos.cardName,
          imageUrl: targetPos.imageUrl,
          cardSet: targetPos.cardSet,
          pokemonName: targetPos.pokemonName,
          pokedexNumber: targetPos.pokedexNumber,
          spriteUrl: targetPos.spriteUrl,
        };

        newPositions[sourceSlotIndex] = {
          slotIndex: sourceSlotIndex,
          ...targetData,
        };
        newPositions[targetSlot.slotIndex] = {
          slotIndex: targetSlot.slotIndex,
          ...sourceData,
        };
        return newPositions;
      });
    }

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
        const srcIdx = selectedCard.sourceSlot as number;
        const isBareSprite = selectedCard.cardId?.startsWith('region-') &&
          selectedCard.imageUrl === selectedCard.spriteUrl;

        if (isBareSprite) {
          // Bare sprite: reposition entirely (clear source, move all data to target)
          newPositions[srcIdx] = {
            ...newPositions[srcIdx],
            cardId: null, cardName: undefined, imageUrl: undefined, cardSet: undefined,
            pokemonName: undefined, pokedexNumber: undefined, spriteUrl: undefined,
          };
          newPositions[targetSlotIndex] = {
            ...newPositions[targetSlotIndex],
            cardId: selectedCard.cardId,
            cardName: selectedCard.cardName,
            imageUrl: selectedCard.imageUrl,
            cardSet: selectedCard.cardSet,
            pokemonName: selectedCard.pokemonName,
            pokedexNumber: selectedCard.pokedexNumber,
            spriteUrl: selectedCard.spriteUrl,
          };
          return newPositions;
        }

        // TCG card: source reverts to sprite (from latest state in prev)
        const slot = newPositions[srcIdx];
        if (slot?.pokemonName) {
          const regionCardId = buildRegionCardId(binder?.region, slot.pokedexNumber);
          newPositions[srcIdx] = {
            slotIndex: srcIdx,
            cardId: regionCardId,
            cardName: slot.pokemonName,
            imageUrl: slot.spriteUrl,
            pokemonName: slot.pokemonName,
            pokedexNumber: slot.pokedexNumber,
            spriteUrl: slot.spriteUrl,
          };

          if (slot.pokedexNumber && binder?.id) {
            clearSelectedCardForPokemon(binder.id, slot.pokedexNumber).catch(err => {
              console.error('[BinderEdit] Failed to clear region card selection:', err);
            });
          }
        } else {
          newPositions[srcIdx] = {
            ...newPositions[srcIdx],
            cardId: null, cardName: undefined, imageUrl: undefined, cardSet: undefined,
            pokemonName: undefined, pokedexNumber: undefined, spriteUrl: undefined,
          };
        }
      }
      // Target gets only TCG card data — pokemon identity stays with the slot
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: selectedCard.cardId,
        cardName: selectedCard.cardName,
        imageUrl: selectedCard.imageUrl,
        cardSet: selectedCard.cardSet,
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

    if (selectedCard) {
      // ── A card is already selected ──

      // Tap the same placeholder card again → deselect
      if (selectedCard.sourceSlot === 'placeholder' && selectedCard.sourceIndex === index) {
        setSelectedCard(null);
        return;
      }

      saveUndoState();

      if (selectedCard.sourceSlot === 'placeholder') {
        // Swap two placeholder cards
        const srcIdx = selectedCard.sourceIndex;
        setPlaceholderCards(prev => {
          const updated = [...prev];
          const temp = { ...updated[srcIdx] };
          updated[srcIdx] = { ...updated[index] };
          updated[index] = temp;
          return updated;
        });
      } else {
        // Selected card is from binder → swap: binder card goes to placeholder, placeholder card goes to binder slot
        const binderSlot = selectedCard.sourceSlot as number;

        // Put the tapped placeholder card into the binder slot
        setCardPositions(prev => {
          const newPositions = [...prev];
          newPositions[binderSlot] = {
            ...newPositions[binderSlot],
            cardId: card.cardId,
            cardName: card.cardName,
            imageUrl: card.imageUrl,
          };
          return newPositions;
        });

        // Replace the placeholder card with the selected binder card
        setPlaceholderCards(prev => {
          const updated = [...prev];
          updated[index] = {
            cardId: selectedCard.cardId,
            cardName: selectedCard.cardName,
            imageUrl: selectedCard.imageUrl,
          };
          return updated;
        });
      }

      setHasChanges(true);
      setSelectedCard(null);
    } else {
      // ── No card selected → select this placeholder card ──
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

  // ── Enlarged "View" preview (mirrors long-press preview from BinderDetail) ──
  const [viewCard, setViewCard] = useState<EnlargedCardData | null>(null);
  // Tracks the latest View request so a slow network response for a previously
  // viewed card can't overwrite a newer selection.
  const viewCardRequestRef = useRef(0);

  /**
   * Returns true when the selected card is a bare region sprite (a Pokémon
   * slot in a region binder that has no real TCG card chosen yet). For these
   * slots the View button is hidden because there is no card to preview.
   */
  const isBareRegionSprite = (card: SelectedCard | null): boolean => {
    if (!card) return false;
    return !!card.cardId?.startsWith('region-') && card.imageUrl === card.spriteUrl;
  };

  const handleViewDetails = () => {
    if (!selectedCard) return;
    if (isBareRegionSprite(selectedCard)) return;

    const cardId = selectedCard.cardId;
    const requestId = ++viewCardRequestRef.current;

    // Open immediately with low-res so there's no perceived delay. The
    // CardImage inside the overlay will progressively swap to hi-res once
    // we patch in the larger URL below.
    setViewCard({
      id: cardId,
      name: selectedCard.cardName,
      imageUrl: selectedCard.imageUrl,
      set: selectedCard.cardSet,
      pokedexNumber: selectedCard.pokedexNumber,
    });

    // Fetch hi-res + extra metadata in the background. CardPosition only
    // stores the low-res URL, so we need this lookup to make the preview crisp.
    getCardById(cardId)
      .then((full) => {
        if (!full) return;
        if (viewCardRequestRef.current !== requestId) return; // stale response
        setViewCard((prev) => {
          if (!prev || prev.id !== cardId) return prev;
          return {
            ...prev,
            number: full.number || prev.number,
            set: full.set || prev.set,
            setTotal: full.setTotal || prev.setTotal,
            imageUrl: full.imageUrl || prev.imageUrl,
            imageUrlHiRes: full.imageUrlHiRes || prev.imageUrlHiRes,
            pokedexNumber: full.pokedexNumber ?? prev.pokedexNumber,
          };
        });
      })
      .catch((err) => {
        console.warn('[BinderEdit] Failed to fetch hi-res card data for View:', err);
      });
  };

  const handleCloseViewDetails = () => {
    viewCardRequestRef.current += 1;
    setViewCard(null);
  };

  /**
   * Reset a region Pokémon slot back to its default sprite.
   * Returns the reverted position data, or null if the slot is not a region slot.
   */
  const revertRegionSlot = useCallback((slotIndex: number): CardPosition | null => {
    const slot = cardPositions[slotIndex];
    if (!slot?.pokemonName) return null;

    // Clear the TCG card selection from the database
    if (slot.pokedexNumber && binder?.id) {
      clearSelectedCardForPokemon(binder.id, slot.pokedexNumber).catch(err => {
        console.error('[BinderEdit] Failed to clear region card selection:', err);
      });
    }

    const regionCardId = buildRegionCardId(binder?.region, slot.pokedexNumber);
    return {
      slotIndex,
      cardId: regionCardId,
      cardName: slot.pokemonName,
      imageUrl: slot.spriteUrl,
      pokemonName: slot.pokemonName,
      pokedexNumber: slot.pokedexNumber,
      spriteUrl: slot.spriteUrl,
    };
  }, [cardPositions, binder?.id, binder?.region]);

  const handleRemoveCard = () => {
    if (!selectedCard) return;

    // Use ref for latest state (avoids stale closure in alert callback)
    const currentSlot = cardPositionsRef.current[selectedCard.sourceSlot as number];
    const isRegionSlot = selectedCard.sourceSlot !== 'placeholder' && currentSlot?.pokemonName;

    Alert.alert(
      isRegionSlot ? 'Clear Card Selection' : 'Remove Card',
      isRegionSlot
        ? `Revert ${selectedCard.cardName} back to its default sprite?`
        : `Remove ${selectedCard.cardName} from the binder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isRegionSlot ? 'Clear' : 'Remove',
          style: 'destructive',
          onPress: () => {
            saveUndoState();
            if (selectedCard.sourceSlot === 'placeholder') {
              setPlaceholderCards(prev => prev.filter((_, i) => i !== selectedCard.sourceIndex));
            } else {
              const slotIdx = selectedCard.sourceSlot as number;

              setCardPositions(prev => {
                const newPositions = [...prev];
                const slot = newPositions[slotIdx];

                if (slot?.pokemonName) {
                  // Region slot: revert to sprite (compute from latest state)
                  const regionCardId = buildRegionCardId(binder?.region, slot.pokedexNumber);
                  newPositions[slotIdx] = {
                    slotIndex: slotIdx,
                    cardId: regionCardId,
                    cardName: slot.pokemonName,
                    imageUrl: slot.spriteUrl,
                    pokemonName: slot.pokemonName,
                    pokedexNumber: slot.pokedexNumber,
                    spriteUrl: slot.spriteUrl,
                  };

                  if (slot.pokedexNumber && binder?.id) {
                    clearSelectedCardForPokemon(binder.id, slot.pokedexNumber).catch(err => {
                      console.error('[BinderEdit] Failed to clear region card selection:', err);
                    });
                  }
                } else {
                  return shiftCardsLeft(newPositions, slotIdx);
                }

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
      const slotIdx = selectedCard.sourceSlot as number;
      setTargetSlotIndex(slotIdx);
      setPlaceholderPickerIndex(null);

      // Pre-fill card picker with Pokémon name for region slots
      const slot = cardPositions[slotIdx];
      if (slot?.pokemonName) {
        setCardPickerInitialQuery(getSearchName(slot.pokemonName));
        setCardPickerPokemonOnly(true);
      }
    }

    setReplaceMode(true);
    setInsertMode(false);
    setShowCardPicker(true);
  };

  /**
   * Empty placeholder slot tapped.
   * - If a card is already selected: move that card into the placeholder.
   * - If no card selected: open the Card Picker to add a new card.
   */
  const handlePlaceholderEmptySlotPress = (index: number) => {
    if (selectedCard) {
      // Move the selected card into the placeholder
      if (placeholderCards.length >= PLACEHOLDER_MAX) {
        Alert.alert('Placeholder Full', 'The placeholder tray can hold a maximum of 18 cards.');
        return;
      }

      saveUndoState();

      const newPlaceholderCard: PlaceholderCard = {
        cardId: selectedCard.cardId,
        cardName: selectedCard.cardName,
        imageUrl: selectedCard.imageUrl,
      };

      // Remove from source
      if (selectedCard.sourceSlot === 'placeholder') {
        // Moving from one placeholder position — remove old, add new
        setPlaceholderCards(prev => {
          const updated = prev.filter((_, i) => i !== selectedCard.sourceIndex);
          return [...updated, newPlaceholderCard];
        });
      } else {
        // Moving from binder slot — clear the binder slot (revert for region), add to placeholder
        const srcIdx = selectedCard.sourceSlot as number;
        const reverted = revertRegionSlot(srcIdx);
        setCardPositions(prev => {
          const newPositions = [...prev];
          if (reverted) {
            newPositions[srcIdx] = reverted;
          } else {
            newPositions[srcIdx] = {
              ...newPositions[srcIdx],
              cardId: null, cardName: undefined, imageUrl: undefined,
            };
          }
          return newPositions;
        });
        setPlaceholderCards(prev => [...prev, newPlaceholderCard]);
      }

      setHasChanges(true);
      setSelectedCard(null);
    } else {
      // No card selected — open Card Picker to add a new card
      setPlaceholderPickerIndex(index);
      setTargetSlotIndex(null);
      setInsertMode(false);
      setReplaceMode(false);
      setShowCardPicker(true);
    }
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
    setCardPickerInitialQuery('');
    setCardPickerPokemonOnly(false);
  };

  /**
   * Replace the card in the target binder slot with the picked card.
   * Used by the "Replace" button flow.
   */
  const replaceCardInSlot = (card: Card) => {
    if (targetSlotIndex === null) return;
    saveUndoState();

    const slot = cardPositions[targetSlotIndex];

    // For region Pokémon slots: also save the TCG card selection to the database
    if (slot?.pokedexNumber && binder?.id) {
      setSelectedCardForPokemon(binder.id, slot.pokedexNumber, card.id).catch(err => {
        console.error('[BinderEdit] Failed to save region card selection:', err);
      });
    }

    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: card.id, cardName: card.name, imageUrl: card.imageUrl, cardSet: card.set,
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

    const slot = cardPositions[targetSlotIndex];

    // For region Pokémon slots: also save the TCG card selection to the database
    if (slot?.pokedexNumber && binder?.id) {
      setSelectedCardForPokemon(binder.id, slot.pokedexNumber, card.id).catch(err => {
        console.error('[BinderEdit] Failed to save region card selection:', err);
      });
    }

    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex] = {
        ...newPositions[targetSlotIndex],
        cardId: card.id, cardName: card.name, imageUrl: card.imageUrl, cardSet: card.set,
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
        ...newPositions[i - 1],
        slotIndex: i,
      };
    }

    newPositions[insertAtIndex] = {
      slotIndex: insertAtIndex,
      cardId: card.id,
      cardName: card.name,
      imageUrl: card.imageUrl,
      cardSet: card.set,
    };

    setCardPositions(newPositions);
    if (overflowCard) setPlaceholderCards(prev => [...prev, overflowCard!]);
    setHasChanges(true);
    closeCardPicker();
  };

  const handleInsertButtonPress = (insertAtIndex: number) => {
    if (selectedCard) {
      // A card is already tap-selected — insert it at this position
      // (works for both placeholder cards and binder cards)
      performInsert(insertAtIndex);
      return;
    }
    // No card selected — open the Card Picker to add a new one
    setTargetSlotIndex(insertAtIndex);
    setInsertMode(true);
    setShowCardPicker(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INSERT (tap-selected card into "+" position)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Source card descriptor for insertCardAt.
   * Both SelectedCard (tap flow) and DraggedCard (drag flow) are compatible
   * with this shape.
   */
  interface InsertSource {
    cardId: string;
    cardName: string;
    imageUrl?: string;
    cardSet?: string;
    sourceSlot: number | 'placeholder';
    sourceIndex: number;
    pokemonName?: string;
    pokedexNumber?: number;
    spriteUrl?: string;
  }

  /**
   * Shared insert logic used by both the tap flow (performInsert) and the
   * drag flow (performDragInsert). Inserts `source` at `insertAtIndex`,
   * shifting later cards right and overflowing the last slot to the
   * placeholder tray if needed.
   *
   * Returns true on success, false if the operation was aborted (e.g. the
   * binder is full or the insert would push a Pokémon slot off the end).
   */
  const insertCardAt = (source: InsertSource, insertAtIndex: number): boolean => {
    console.log('[BinderEdit] insertCardAt:', source.cardId, 'from slot', source.sourceSlot, '→ insert at', insertAtIndex);

    // Use refs for the latest state — this function may be called from drag
    // callbacks (handleDragEnd) that captured stale closures via useCallback.
    const currentPositions = cardPositionsRef.current;
    const currentPlaceholder = placeholderCardsRef.current;

    const sourceIsInBinder = source.sourceSlot !== 'placeholder';
    const newPositions = currentPositions.map(p => ({ ...p }));

    // Classify the source card
    let sourceIsBareSprite = false;
    let sourceIsTcgOnRegion = false;
    if (sourceIsInBinder) {
      const sourceIdx = source.sourceSlot as number;
      const sourceSlot = newPositions[sourceIdx];
      sourceIsBareSprite = !!(
        source.cardId?.startsWith('region-') &&
        source.imageUrl === source.spriteUrl
      );
      sourceIsTcgOnRegion = !sourceIsBareSprite && !!sourceSlot?.pokemonName;
    }

    // ── Step 1: Update the source slot ──
    if (sourceIsInBinder) {
      const sourceIdx = source.sourceSlot as number;

      if (sourceIsTcgOnRegion) {
        // Region slot with a TCG overlay: revert source slot to its sprite.
        // Don't compact — the slot still holds the Pokémon's sprite.
        const sourceSlot = newPositions[sourceIdx];
        const regionCardId = buildRegionCardId(binder?.region, sourceSlot.pokedexNumber);
        newPositions[sourceIdx] = {
          slotIndex: sourceIdx,
          cardId: regionCardId,
          cardName: sourceSlot.pokemonName,
          imageUrl: sourceSlot.spriteUrl,
          pokemonName: sourceSlot.pokemonName,
          pokedexNumber: sourceSlot.pokedexNumber,
          spriteUrl: sourceSlot.spriteUrl,
        };
        if (sourceSlot.pokedexNumber && binder?.id) {
          clearSelectedCardForPokemon(binder.id, sourceSlot.pokedexNumber).catch(err => {
            console.error('[BinderEdit] Failed to clear region card selection:', err);
          });
        }
      } else {
        // Bare sprite or plain card: compact (shift all later slots one to the left)
        for (let i = sourceIdx; i < newPositions.length - 1; i++) {
          newPositions[i] = {
            ...newPositions[i + 1],
            slotIndex: i,
          };
        }
        const lastIdx = newPositions.length - 1;
        newPositions[lastIdx] = {
          slotIndex: lastIdx,
          cardId: null, cardName: undefined, imageUrl: undefined, cardSet: undefined,
          pokemonName: undefined, pokedexNumber: undefined, spriteUrl: undefined,
        };
        if (insertAtIndex > sourceIdx) insertAtIndex--;
      }
    }

    // ── Step 2: Check whether the shift-right would push something off the end ──
    const lastCard = newPositions[newPositions.length - 1];
    let overflowCard: PlaceholderCard | null = null;

    if (lastCard.cardId) {
      // Don't allow pushing a region Pokémon slot off the end of the binder
      const lastIsBareSprite = lastCard.cardId.startsWith('region-') &&
        lastCard.imageUrl === lastCard.spriteUrl;
      const lastIsTcgOnRegion = !lastIsBareSprite && !!lastCard.pokemonName;

      if (lastIsBareSprite || lastIsTcgOnRegion) {
        Alert.alert(
          'Cannot insert here',
          'Inserting at this position would push a Pokémon slot off the end of the binder. Try a different position.',
        );
        return false;
      }

      const currentPlaceholderCount = !sourceIsInBinder
        ? currentPlaceholder.length - 1
        : currentPlaceholder.length;

      if (currentPlaceholderCount >= PLACEHOLDER_MAX) {
        Alert.alert('Binder is full', 'Cannot insert — all binder slots and placeholder are full.');
        return false;
      }

      overflowCard = { cardId: lastCard.cardId, cardName: lastCard.cardName, imageUrl: lastCard.imageUrl };
    }

    saveUndoState();

    // ── Step 3: Shift right from end down to insertAtIndex to make room ──
    for (let i = newPositions.length - 1; i > insertAtIndex; i--) {
      newPositions[i] = {
        ...newPositions[i - 1],
        slotIndex: i,
      };
    }

    // ── Step 4: Place the moved card at insertAtIndex ──
    if (sourceIsBareSprite) {
      // Bare region sprite: the entire Pokémon identity moves with the slot
      newPositions[insertAtIndex] = {
        slotIndex: insertAtIndex,
        cardId: source.cardId,
        cardName: source.cardName,
        imageUrl: source.imageUrl,
        cardSet: source.cardSet,
        pokemonName: source.pokemonName,
        pokedexNumber: source.pokedexNumber,
        spriteUrl: source.spriteUrl,
      };
    } else {
      // TCG card from placeholder, plain binder slot, or extracted from a region overlay
      newPositions[insertAtIndex] = {
        slotIndex: insertAtIndex,
        cardId: source.cardId,
        cardName: source.cardName,
        imageUrl: source.imageUrl,
        cardSet: source.cardSet,
      };
    }

    setCardPositions(newPositions);

    if (!sourceIsInBinder) {
      const newPlaceholder = currentPlaceholder.filter((_, i) => i !== source.sourceIndex);
      if (overflowCard) newPlaceholder.push(overflowCard);
      setPlaceholderCards(newPlaceholder);
    } else if (overflowCard) {
      setPlaceholderCards(prev => [...prev, overflowCard!]);
    }

    setHasChanges(true);
    return true;
  };

  const performInsert = (insertAtIndex: number) => {
    if (!selectedCard) return;
    insertCardAt(selectedCard, insertAtIndex);
    setSelectedCard(null);
  };

  /**
   * Drag-flow equivalent of performInsert.
   * Called when the user drops a dragged card onto a "+" insert button.
   */
  const performDragInsert = (dragged: DraggedCard, insertAtIndex: number) => {
    insertCardAt(dragged, insertAtIndex);
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

    // Measure individual placeholder cards
    const phCardMeasurements = new Map<number, LayoutRect>();
    for (const [index, view] of placeholderCardViewRefs.current.entries()) {
      promises.push(
        new Promise<void>((resolve) => {
          try {
            view.measureInWindow((x: number, y: number, width: number, height: number) => {
              if (width > 0 && height > 0) {
                phCardMeasurements.set(index, { x, y, width, height });
              }
              resolve();
            });
          } catch {
            resolve();
          }
        }),
      );
    }

    // Measure all insert ("+") buttons
    const insertMeasurements = new Map<number, LayoutRect>();
    for (const [insertAtIndex, view] of insertButtonViewRefs.current.entries()) {
      promises.push(
        new Promise<void>((resolve) => {
          try {
            view.measureInWindow((x: number, y: number, width: number, height: number) => {
              if (width > 0 && height > 0) {
                insertMeasurements.set(insertAtIndex, { x, y, width, height });
              }
              resolve();
            });
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
    placeholderCardMeasurementsRef.current = phCardMeasurements;
    insertButtonMeasurementsRef.current = insertMeasurements;
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

    // Check individual placeholder cards first (higher priority than general area)
    for (const [index, layout] of placeholderCardMeasurementsRef.current.entries()) {
      if (absoluteX >= layout.x && absoluteX <= layout.x + layout.width &&
          absoluteY >= layout.y && absoluteY <= layout.y + layout.height) {
        return { type: 'placeholder', placeholderCardIndex: index };
      }
    }

    // Check general placeholder area (for empty space / empty slots)
    const ph = placeholderMeasurementRef.current;
    if (ph && absoluteX >= ph.x && absoluteX <= ph.x + ph.width &&
        absoluteY >= ph.y && absoluteY <= ph.y + ph.height) {
      return { type: 'placeholder' };
    }

    // Check insert ("+") buttons BEFORE card slots so they take priority
    // when the finger is in the narrow gap between cards. We expand the hit
    // zone by INSERT_HIT_PAD pixels on each side because the button itself
    // is only 12px wide — too thin for comfortable drag-targeting.
    const INSERT_HIT_PAD = 12;
    for (const [insertAtIndex, layout] of insertButtonMeasurementsRef.current.entries()) {
      if (
        absoluteX >= layout.x - INSERT_HIT_PAD &&
        absoluteX <= layout.x + layout.width + INSERT_HIT_PAD &&
        absoluteY >= layout.y &&
        absoluteY <= layout.y + layout.height
      ) {
        return { type: 'insert', insertAtIndex };
      }
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

    // Set dragged card state (look up cardSet and Pokémon metadata from positions)
    const slotData = cardPositionsRef.current[data.slotIndex];
    const dragged: DraggedCard = {
      cardId: data.cardId,
      cardName: data.cardName || 'Unknown Card',
      imageUrl: data.imageUrl,
      cardSet: slotData?.cardSet,
      sourceSlot: data.slotIndex,
      sourceIndex: data.slotIndex,
      pokemonName: slotData?.pokemonName,
      pokedexNumber: slotData?.pokedexNumber,
      spriteUrl: slotData?.spriteUrl,
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
      target?.type !== prev?.type ||
      target?.slotIndex !== prev?.slotIndex ||
      target?.insertAtIndex !== prev?.insertAtIndex ||
      target?.placeholderCardIndex !== prev?.placeholderCardIndex;

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
    lightTap();

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
        performDragToPlaceholder(dragged, target.placeholderCardIndex);
        break;

      case 'trash':
        performDragToTrash(dragged);
        break;

      case 'insert':
        if (target.insertAtIndex !== undefined) {
          performDragInsert(dragged, target.insertAtIndex);
        }
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
          cardSet: dragged.cardSet,
        };
        return newPositions;
      });
    } else {
      // Binder card ↔ binder card (including Pokémon metadata)
      const sourceIdx = dragged.sourceSlot as number;

      setCardPositions(prev => {
        const newPositions = [...prev];
        const sourcePos = newPositions[sourceIdx];
        const targetPos = newPositions[targetSlotIndex];

        const sourceData = {
          cardId: sourcePos.cardId,
          cardName: sourcePos.cardName,
          imageUrl: sourcePos.imageUrl,
          cardSet: sourcePos.cardSet,
          pokemonName: sourcePos.pokemonName,
          pokedexNumber: sourcePos.pokedexNumber,
          spriteUrl: sourcePos.spriteUrl,
        };
        const targetData = {
          cardId: targetPos.cardId,
          cardName: targetPos.cardName,
          imageUrl: targetPos.imageUrl,
          cardSet: targetPos.cardSet,
          pokemonName: targetPos.pokemonName,
          pokedexNumber: targetPos.pokedexNumber,
          spriteUrl: targetPos.spriteUrl,
        };

        newPositions[sourceIdx] = {
          slotIndex: sourceIdx,
          ...targetData,
        };
        newPositions[targetSlotIndex] = {
          slotIndex: targetSlotIndex,
          ...sourceData,
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
      const sourceIdx = dragged.sourceSlot as number;
      const isBareSprite = dragged.cardId?.startsWith('region-') &&
        dragged.imageUrl === dragged.spriteUrl;

      if (isBareSprite) {
        // Bare sprite: reposition entirely (all data moves to target, source cleared)
        setCardPositions(prev => {
          const newPositions = [...prev];
          newPositions[sourceIdx] = {
            ...newPositions[sourceIdx],
            cardId: null, cardName: undefined, imageUrl: undefined, cardSet: undefined,
            pokemonName: undefined, pokedexNumber: undefined, spriteUrl: undefined,
          };
          newPositions[targetSlotIndex] = {
            ...newPositions[targetSlotIndex],
            cardId: dragged.cardId,
            cardName: dragged.cardName,
            imageUrl: dragged.imageUrl,
            cardSet: dragged.cardSet,
            pokemonName: dragged.pokemonName,
            pokedexNumber: dragged.pokedexNumber,
            spriteUrl: dragged.spriteUrl,
          };
          return newPositions;
        });
      } else {
        // TCG card: source reverts to sprite (from latest state), target gets only card data
        setCardPositions(prev => {
          const newPositions = [...prev];
          const slot = newPositions[sourceIdx];

          if (slot?.pokemonName) {
            const regionCardId = buildRegionCardId(binder?.region, slot.pokedexNumber);
            newPositions[sourceIdx] = {
              slotIndex: sourceIdx,
              cardId: regionCardId,
              cardName: slot.pokemonName,
              imageUrl: slot.spriteUrl,
              pokemonName: slot.pokemonName,
              pokedexNumber: slot.pokedexNumber,
              spriteUrl: slot.spriteUrl,
            };

            if (slot.pokedexNumber && binder?.id) {
              clearSelectedCardForPokemon(binder.id, slot.pokedexNumber).catch(err => {
                console.error('[BinderEdit] Failed to clear region card selection:', err);
              });
            }
          } else {
            newPositions[sourceIdx] = {
              ...newPositions[sourceIdx],
              cardId: null, cardName: undefined, imageUrl: undefined, cardSet: undefined,
              pokemonName: undefined, pokedexNumber: undefined, spriteUrl: undefined,
            };
          }

          newPositions[targetSlotIndex] = {
            ...newPositions[targetSlotIndex],
            cardId: dragged.cardId,
            cardName: dragged.cardName,
            imageUrl: dragged.imageUrl,
            cardSet: dragged.cardSet,
          };
          return newPositions;
        });
      }

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
        cardSet: dragged.cardSet,
      };
      return newPositions;
    });

    setHasChanges(true);
    console.log('[BinderEdit] Drag move (from placeholder) complete');
  };

  /**
   * PLACEHOLDER: Drag a card to the placeholder area.
   * If dropped on a specific filled placeholder card, swap with it.
   * Otherwise, add to placeholder.
   */
  const performDragToPlaceholder = (dragged: DraggedCard, targetCardIndex?: number) => {
    const currentPlaceholder = placeholderCardsRef.current;

    // Dropped on a specific filled placeholder card → swap
    if (targetCardIndex !== undefined && targetCardIndex < currentPlaceholder.length) {
      const targetCard = currentPlaceholder[targetCardIndex];

      // Ignore if dragging a placeholder card onto itself
      if (dragged.sourceSlot === 'placeholder' && dragged.sourceIndex === targetCardIndex) return;

      saveUndoState();

      if (dragged.sourceSlot === 'placeholder') {
        // Placeholder card → placeholder card: swap positions
        setPlaceholderCards(prev => {
          const updated = [...prev];
          const temp = { ...updated[dragged.sourceIndex] };
          updated[dragged.sourceIndex] = { ...updated[targetCardIndex] };
          updated[targetCardIndex] = temp;
          return updated;
        });
      } else {
        // Binder card → placeholder card: swap them
        const binderSlotIdx = dragged.sourceSlot as number;

        // Put the placeholder card into the binder slot
        setCardPositions(prev => {
          const newPositions = [...prev];
          newPositions[binderSlotIdx] = {
            ...newPositions[binderSlotIdx],
            cardId: targetCard.cardId,
            cardName: targetCard.cardName,
            imageUrl: targetCard.imageUrl,
          };
          return newPositions;
        });

        // Put the binder card into the placeholder slot
        setPlaceholderCards(prev => {
          const updated = [...prev];
          updated[targetCardIndex] = {
            cardId: dragged.cardId,
            cardName: dragged.cardName,
            imageUrl: dragged.imageUrl,
          };
          return updated;
        });
      }

      setHasChanges(true);
      console.log('[BinderEdit] Drag swap with placeholder card complete');
      return;
    }

    // Dropped on empty placeholder area — add to placeholder
    // If it's already in the placeholder, ignore
    if (dragged.sourceSlot === 'placeholder') return;

    // Bare region sprites can't go to placeholder — only TCG cards can
    if (dragged.cardId?.startsWith('region-') && dragged.imageUrl === dragged.spriteUrl) return;

    saveUndoState();

    const sourceIdx = dragged.sourceSlot as number;
    const currentSlot = cardPositionsRef.current[sourceIdx];

    if (currentSlot?.pokemonName) {
      // Region slot: just revert to sprite, don't add to placeholder
      setCardPositions(prev => {
        const newPositions = [...prev];
        const slot = newPositions[sourceIdx];
        const regionCardId = buildRegionCardId(binder?.region, slot?.pokedexNumber);
        newPositions[sourceIdx] = {
          slotIndex: sourceIdx,
          cardId: regionCardId,
          cardName: slot?.pokemonName || '',
          imageUrl: slot?.spriteUrl,
          pokemonName: slot?.pokemonName,
          pokedexNumber: slot?.pokedexNumber,
          spriteUrl: slot?.spriteUrl,
        };
        if (slot?.pokedexNumber && binder?.id) {
          clearSelectedCardForPokemon(binder.id, slot.pokedexNumber).catch(err => {
            console.error('[BinderEdit] Failed to clear region card selection:', err);
          });
        }
        return newPositions;
      });
    } else {
      // Non-region slot: add card to placeholder tray
      if (currentPlaceholder.length >= PLACEHOLDER_MAX) {
        Alert.alert('Placeholder Full', 'The placeholder tray can hold a maximum of 18 cards.');
        return;
      }

      setPlaceholderCards(prev => [...prev, {
        cardId: dragged.cardId,
        cardName: dragged.cardName,
        imageUrl: dragged.imageUrl,
      }]);

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
    console.log('[BinderEdit] Drag to placeholder complete');
  };

  /**
   * TRASH: Drag a card to the trash zone → confirm removal.
   */
  const performDragToTrash = (dragged: DraggedCard) => {
    // Bare region sprites can't be trashed — only TCG cards can
    if (dragged.cardId?.startsWith('region-') && dragged.imageUrl === dragged.spriteUrl) return;

    // Use ref for latest state (avoids stale closure in alert callback)
    const currentSlot = cardPositionsRef.current[dragged.sourceSlot as number];
    const isRegionSlot = dragged.sourceSlot !== 'placeholder' && currentSlot?.pokemonName;

    Alert.alert(
      isRegionSlot ? 'Clear Card Selection' : 'Remove Card',
      isRegionSlot
        ? `Revert ${dragged.cardName} back to its default sprite?`
        : `Remove ${dragged.cardName} from the binder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isRegionSlot ? 'Clear' : 'Remove',
          style: 'destructive',
          onPress: () => {
            saveUndoState();

            if (dragged.sourceSlot === 'placeholder') {
              setPlaceholderCards(prev => prev.filter((_, i) => i !== dragged.sourceIndex));
            } else {
              const slotIdx = dragged.sourceSlot as number;

              setCardPositions(prev => {
                const newPositions = [...prev];
                const slot = newPositions[slotIdx];

                if (slot?.pokemonName) {
                  // Region slot: revert to sprite (compute from latest state)
                  const regionCardId = buildRegionCardId(binder?.region, slot.pokedexNumber);
                  newPositions[slotIdx] = {
                    slotIndex: slotIdx,
                    cardId: regionCardId,
                    cardName: slot.pokemonName,
                    imageUrl: slot.spriteUrl,
                    pokemonName: slot.pokemonName,
                    pokedexNumber: slot.pokedexNumber,
                    spriteUrl: slot.spriteUrl,
                  };

                  if (slot.pokedexNumber && binder?.id) {
                    clearSelectedCardForPokemon(binder.id, slot.pokedexNumber).catch(err => {
                      console.error('[BinderEdit] Failed to clear region card selection:', err);
                    });
                  }
                } else {
                  return shiftCardsLeft(newPositions, slotIdx);
                }

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
   * Register a placeholder card view ref for layout measurement during drag
   */
  const registerPlaceholderCardRef = useCallback((index: number, ref: View | null) => {
    if (ref) {
      placeholderCardViewRefs.current.set(index, ref);
    } else {
      placeholderCardViewRefs.current.delete(index);
    }
  }, []);

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

  /**
   * Register an insert button ("+") view ref for layout measurement.
   * insertAtIndex is the global slot index where insertion would happen.
   */
  const registerInsertButtonRef = useCallback((insertAtIndex: number, ref: View | null) => {
    if (ref) {
      insertButtonViewRefs.current.set(insertAtIndex, ref);
    } else {
      insertButtonViewRefs.current.delete(insertAtIndex);
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
                viewRef={(ref) => registerInsertButtonRef(rowStartIndex, ref)}
                onPress={() => handleInsertButtonPress(rowStartIndex)}
                isDragHover={
                  hoverTarget?.type === 'insert' &&
                  hoverTarget?.insertAtIndex === rowStartIndex
                }
              />

              {row.map((slot, colIndex) => {
                const isDraggedOver =
                  hoverTarget?.type === 'card' && hoverTarget?.slotIndex === slot.slotIndex ||
                  hoverTarget?.type === 'empty' && hoverTarget?.slotIndex === slot.slotIndex;

                const isDragSource =
                  draggedCard !== null &&
                  draggedCard.sourceSlot !== 'placeholder' &&
                  draggedCard.sourceSlot === slot.slotIndex;

                const nextInsertIndex = rowStartIndex + colIndex + 1;

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
                        cardSet={slot.cardSet}
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
                        viewRef={(ref) => registerInsertButtonRef(nextInsertIndex, ref)}
                        onPress={() => handleInsertButtonPress(nextInsertIndex)}
                        isDragHover={
                          hoverTarget?.type === 'insert' &&
                          hoverTarget?.insertAtIndex === nextInsertIndex
                        }
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
          <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isSaving}>
            <Text style={[styles.backButtonText, isSaving && { opacity: 0.5 }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Edit: {binder.name}</Text>
          <View style={styles.headerRight}>
            {hasChanges && (
              <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.5 }]} onPress={saveAndExit} disabled={isSaving}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selected Card Bar — always reserves space so grid doesn't shift */}
        <View style={styles.selectedCardBarContainer}>
          {selectedCard && !draggedCard && (
            <SelectedCardBar
              cardName={selectedCard.cardName}
              sourcePage={selectedCard.sourcePage}
              onCancel={handleCancelSelection}
              onReplace={handleReplaceCard}
              onRemove={handleRemoveCard}
              onViewDetails={isBareRegionSprite(selectedCard) ? undefined : handleViewDetails}
            />
          )}
        </View>

        {/* Card Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!draggedCard} // Disable scroll while dragging
        >
          {renderCardGrid()}
        </ScrollView>

        {/* Page Navigator */}
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={() => setCurrentPage(p => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          onJumpToPage={() => setShowJumpModal(true)}
        />

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
          registerCardRef={registerPlaceholderCardRef}
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
        totalPages={totalPages}
        onClose={() => setShowJumpModal(false)}
        onJump={(page) => setCurrentPage(page)}
      />

      {/* Card Picker Modal */}
      <CardPickerModal
        visible={showCardPicker}
        onClose={closeCardPicker}
        onSelectCard={handleCardPickerSelect}
        title={cardPickerInitialQuery ? `Choose ${cardPickerInitialQuery} Card` : (replaceMode ? 'Replace Card' : 'Add Card')}
        initialQuery={cardPickerInitialQuery}
        pokemonOnly={cardPickerPokemonOnly}
      />

      {/* Saving Overlay */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        </View>
      )}

      {/* Enlarged "View" preview for the currently selected card */}
      <EnlargedCardOverlay
        visible={viewCard !== null}
        card={viewCard}
        onClose={handleCloseViewDetails}
        screenWidth={Dimensions.get('window').width}
        screenHeight={Dimensions.get('window').height}
        isRegion={binder?.collectionMode === 'region'}
        showPosition={false}
        showNote={false}
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
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.sm,
  },
  selectedCardBarContainer: {
    height: 74,
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
    backgroundColor: colors.primary,
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
    color: colors.onPrimary,
    textAlign: 'center',
    fontFamily: fonts.medium,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  savingBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  savingText: {
    marginTop: spacing.sm,
    fontSize: typography.md,
    color: colors.text,
    fontFamily: fonts.medium,
  },
});
