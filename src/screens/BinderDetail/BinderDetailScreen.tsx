import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions, FlatList, SectionList, ActivityIndicator, Alert, PanResponder, Modal, Pressable, Animated, Image as RNImage, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBinderById } from '../../services/supabase/binders';
import { 
  addCardToBinderFast,
  removeCardFromBinderFast,
  syncBinderCardCount,
  getBinderCardsWithPositions, 
  toggleCardOwnershipAtPosition,
  getExtraCardsWithVariants,
  toggleExtraCardOwnership,
  getCardVariantsForBinder,
  getBinderCardData,
} from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, getCardById, getPokemonImageUrl, type Region } from '../../services/api/pokemonApi';
import { getSetSymbolByName, getSetLogoByName } from '../../data/pokemonEras';
import StatsBottomSheet, { type StatsFilter, RARITY_ORDER, RARITY_LABELS, VARIANT_ORDER, VARIANT_LABELS } from '../../components/Progress/StatsBottomSheet';
import { getAllSelectedCardsForBinder } from '../../services/supabase/regionCards';
import { getCardPositionsForBinder } from '../../services/supabase/binderPositions';
import { startBackgroundPrefetch } from '../../services/imagePrefetch';
import { recordBinderAccess } from '../../services/cacheManager';
import {
  enqueueToggle,
  markPendingCountSync,
  clearPendingCountSync,
  processToggleQueue,
  processPendingCountSyncs,
} from '../../services/offlineQueue';
import { popVariantUpdates } from '../../services/variantMailbox';
import type { Binder, Card } from '../../types';
import CardItem from '../../components/Card/CardItem';
import CardImage, { logFailedImageSummary } from '../../components/Card/CardImage';
import CardDetails from '../../components/Card/CardDetails';
import CardList from '../../components/Card/CardList';
import EmptyCardSlot from '../../components/Card/EmptyCardSlot';
import PageNavigator from '../../components/Binder/PageNavigator';
import BinderPageView from '../../components/Binder/BinderPageView';
import { JumpToPageModal } from '../../components/Binder/JumpToPageModal';
import PageHeader from '../../components/Binder/PageHeader';
import { useCardSearch } from '../../hooks/useCardSearch';
import { useCardFilter, type OwnershipFilter } from '../../hooks/useCardFilter';
import SearchBar from '../../components/Search/SearchBar';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import SkeletonCardGrid from '../../components/Loading/SkeletonCardGrid';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorScreen from '../../components/Error/ErrorScreen';
import ViewModeToggle from '../../components/ViewModeToggle';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { showSuccess, showError } from '../../utils/toast';
import { lightTap } from '../../utils/haptics';

const LOGO_OWNED = require('../../../assets/logo-icon-teal.png');
const LOGO_UNOWNED = require('../../../assets/logo-icon-white.png');

const CONTAINER_PADDING = screenPadding; // Padding from container style (24px)
const CARD_MARGIN = 2; // Margin between cards (margin: 2 means 2px on all sides, 4px gap between cards)

/** Number of cards to load per page (for infinite scroll) */
const PAGE_SIZE = 36; // 12 rows of 3, or 9 rows of 4

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * Binder-level cache for fully-resolved custom binder position cards.
 * Keyed by binder ID. Avoids re-fetching from DB + API on every open.
 * Master Set and Region modes don't need this because they use
 * a single cached API call (getCardsBySet) or hardcoded data.
 */
const customBinderCache = new Map<string, Map<number, CardWithOwnership>>();

/** Maximum slots for Custom binders based on layout */
const CUSTOM_MAX_SLOTS_3X3 = 360; // 40 pages × 9 cards
const CUSTOM_MAX_SLOTS_4X3 = 480; // 40 pages × 12 cards

/**
 * Calculate card width based on number of columns
 * Grid has negative horizontal margin that extends it CARD_MARGIN beyond container padding
 * Effective grid width = screen width - (container padding - card margin) * 2
 * Each card takes: cardWidth + (CARD_MARGIN * 2) total space
 * For N cards: N * (cardWidth + CARD_MARGIN * 2) = grid width
 * Therefore: cardWidth = (grid width / N) - (CARD_MARGIN * 2)
 */
function calculateCardWidth(screenWidth: number, columns: number): number {
  const gridWidth = screenWidth - ((CONTAINER_PADDING - CARD_MARGIN) * 2);
  return (gridWidth / columns) - (CARD_MARGIN * 2);
}

function getMaxSpreadStart(totalPages: number): number {
  if (totalPages <= 1) return 0;
  return totalPages % 2 === 0 ? totalPages : totalPages - 1;
}

function pageToSpreadStart(page: number, totalPages: number): number {
  if (page <= 1) return 0;
  const normalizedPage = page % 2 === 0 ? page : page - 1;
  return Math.min(getMaxSpreadStart(totalPages), Math.max(0, normalizedPage));
}

interface BinderDetailScreenProps {
  navigation: any;
  route: any;
}

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

/** 
 * Master Set grid item types:
 * - Regular set card
 * - Extra card (added by user, not in official set - but displayed the same way)
 * - Empty slot for adding cards
 */
type MasterSetGridItem = 
  | { type: 'card'; card: CardWithOwnership }
  | { type: 'extra'; card: CardWithOwnership };

type ViewMode = 'grid' | 'list' | 'binder';

export default function BinderDetailScreen({ navigation, route }: BinderDetailScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const binderId = route.params?.binderId;
  const [binder, setBinder] = useState<Binder | null>(null);
  const [cards, setCards] = useState<CardWithOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('binder');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewBeforeSearch, setViewBeforeSearch] = useState<ViewMode | null>(null);
  
  // Binder view mode state
  const [currentPage, setCurrentPage] = useState(1);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [statsFilter, setStatsFilter] = useState<StatsFilter | null>(null);
  const [expandedFilter, setExpandedFilter] = useState<'rarity' | 'set' | 'variant' | null>(null);
  const [showPageBreaks, setShowPageBreaks] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  
  // Display mode: clean binder view with just card images (no badges, names, checkboxes)
  const [displayMode, setDisplayMode] = useState(false);
  const [displaySpreadStart, setDisplaySpreadStart] = useState(0);
  const [displayViewport, setDisplayViewport] = useState({ width: 0, height: 0 });
  
  // Dropdown options panel
  // showOptions state removed — view/filter controls are now always visible on the page

  // Stats bottom sheet
  const [showStats, setShowStats] = useState(false);
  
  // Scroll-based header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [52, 0],
    extrapolate: 'clamp',
  });
  const onScrollEvent = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );
  
  // Track whether per-binder preferences have been loaded
  const prefsLoadedRef = useRef(false);
  const milestoneStorageKey = binderId ? `binder_milestones_${binderId}` : null;
  const unlockedMilestonesRef = useRef<Set<number>>(new Set());
  const previousProgressRef = useRef(0);
  const milestonesReadyRef = useRef(false);
  
  // Pagination state for infinite scroll (only used for Custom mode)
  // For Master Set and Region modes, we show all cards once loaded
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Track if cards are fully loaded (for disabling pagination in non-Custom modes)
  const [cardsFullyLoaded, setCardsFullyLoaded] = useState(false);
  
  
  
  // Custom mode: map of position -> card data
  const [positionCards, setPositionCards] = useState<Map<number, CardWithOwnership>>(new Map());
  
  // Saved slot positions from edit mode: maps slotIndex → card (for binder page view)
  const [savedPositionMap, setSavedPositionMap] = useState<Map<number, CardWithOwnership> | null>(null);

  // Keep binder-level cache in sync whenever positionCards changes (e.g. ownership toggle)
  useEffect(() => {
    if (binder?.collectionMode === 'custom' && binder?.id && positionCards.size > 0) {
      customBinderCache.set(binder.id, positionCards);
    }
  }, [positionCards, binder?.id, binder?.collectionMode]);
  
  // Load per-binder preferences (view mode, ownership filter, page breaks)
  useEffect(() => {
    if (!binderId) return;
    const loadPrefs = async () => {
      try {
        const raw = await AsyncStorage.getItem(`binder_prefs_${binderId}`);
        if (raw) {
          const prefs = JSON.parse(raw);
          if (prefs.viewMode) setViewMode(prefs.viewMode);
          if (prefs.ownershipFilter) setOwnershipFilter(prefs.ownershipFilter);
          if (prefs.showPageBreaks !== undefined) setShowPageBreaks(prefs.showPageBreaks);
        }
      } catch {}
      prefsLoadedRef.current = true;
    };
    loadPrefs();
  }, [binderId]);

  // Save per-binder preferences whenever they change
  useEffect(() => {
    if (!binderId || !prefsLoadedRef.current) return;
    const prefs = { viewMode, ownershipFilter, showPageBreaks };
    AsyncStorage.setItem(`binder_prefs_${binderId}`, JSON.stringify(prefs)).catch(() => {});
  }, [binderId, viewMode, ownershipFilter, showPageBreaks]);

  // Extra cards for Master Set binders (cards not officially in the set)
  const [extraCards, setExtraCards] = useState<CardWithOwnership[]>([]);
  
  // Ref to access current cards without causing dependency issues
  const cardsRef = useRef<CardWithOwnership[]>([]);
  // Keep ref in sync with state
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  
  // Flag to prevent concurrent refreshes
  const isRefreshingRef = useRef(false);
  
  // Flag to prevent refreshOwnershipFromDb from running while fetchCards is still loading
  const isFetchingCardsRef = useRef(false);

  // Per-card toggle lock: prevents rapid double-taps from firing overlapping DB calls
  const togglingCardsRef = useRef(new Set<string>());
  
  // Debounced count sync: waits for a pause in toggling before syncing the owned_cards count
  const countSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const binderIdForSyncRef = useRef<string | null>(null);
  const scheduleCountSync = useCallback((currentBinderId: string) => {
    binderIdForSyncRef.current = currentBinderId;
    markPendingCountSync(currentBinderId);
    if (countSyncTimerRef.current) {
      clearTimeout(countSyncTimerRef.current);
    }
    countSyncTimerRef.current = setTimeout(async () => {
      try {
        await syncBinderCardCount(currentBinderId);
        await clearPendingCountSync(currentBinderId);
      } catch (err) {
        console.error('[BinderDetail] Failed to sync card count:', err);
      }
    }, 2000);
  }, []);

  // On unmount: mark the binder for count sync so the list screen picks it up
  useEffect(() => {
    return () => {
      if (countSyncTimerRef.current) {
        clearTimeout(countSyncTimerRef.current);
        if (binderIdForSyncRef.current) {
          const id = binderIdForSyncRef.current;
          markPendingCountSync(id);
          syncBinderCardCount(id)
            .then(() => clearPendingCountSync(id))
            .catch(() => {});
        }
      }
    };
  }, []);

  // Update screen width on dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const applyOrientation = async () => {
      try {
        if (displayMode) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.unlockAsync();
        }
      } catch {
        // Ignore orientation failures so display mode still works.
      }
    };
    applyOrientation();
    return () => {
      if (displayMode) {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    };
  }, [displayMode]);

  useEffect(() => {
    async function fetchBinder() {
      if (!binderId) {
        setError('No binder ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const binderData = await getBinderById(binderId);
        
        console.log('[BinderDetail] ===== BINDER LOADED =====');
        console.log('[BinderDetail] Binder ID:', binderData.id);
        console.log('[BinderDetail] Binder Name:', binderData.name);
        console.log('[BinderDetail] Collection Mode:', binderData.collectionMode);
        console.log('[BinderDetail] Set:', binderData.set);
        console.log('[BinderDetail] variantsToTrack:', binderData.variantsToTrack);
        console.log('[BinderDetail] variantPlacement:', binderData.variantPlacement);
        console.log('[BinderDetail] ================================');
        
        // Record binder access for smart cache cleanup
        recordBinderAccess(binderData.id).catch(err => {
          console.error('[BinderDetail] Failed to record binder access:', err);
        });
        
        setBinder(binderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load binder');
        setLoading(false);
      }
    }

    fetchBinder();
  }, [binderId, retryKey]);

  // Keep binder ownership in sync when returning from CardDetail
  const refreshOwnershipFromDb = useCallback(async () => {
    if (!binderId) return;
    
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('[BinderDetail] Refresh already in progress, skipping');
      return;
    }
    
    // Don't refresh while fetchCards is still loading (prevents race condition
    // where refresh overwrites card data that fetchCards is building)
    if (isFetchingCardsRef.current) {
      console.log('[BinderDetail] Cards still loading, skipping refresh to prevent data loss');
      return;
    }
    isRefreshingRef.current = true;

    try {
      const latestBinder = await getBinderById(binderId);
      if (!latestBinder) {
        setError('Binder not found');
        return;
      }

      // Update ownership fields and settings that may have changed
      // in Binder Settings. If settings like variantsToTrack or
      // variantPlacement changed, fetchCards will re-run automatically
      // because it depends on those values.
      setBinder((prev) => {
        if (!prev) return latestBinder;
        return {
          ...prev,
          name: latestBinder.name,
          cardIds: latestBinder.cardIds,
          ownedCards: latestBinder.ownedCards,
          totalCards: latestBinder.totalCards,
          layoutPreference: latestBinder.layoutPreference,
          variantsToTrack: latestBinder.variantsToTrack,
          variantPlacement: latestBinder.variantPlacement,
          variantOrder: latestBinder.variantOrder,
          pokemonArtStyle: latestBinder.pokemonArtStyle,
        };
      });

      // For Custom binders: reload from binder_card_positions (single source of truth)
      // with ownership data from binder_cards
      if (latestBinder.collectionMode === 'custom') {
        const [editPositions, ownershipMap] = await Promise.all([
          getCardPositionsForBinder(binderId),
          getBinderCardsWithPositions(binderId),
        ]);
        
        const newPositionCards = new Map<number, CardWithOwnership>();
        
        // Use binder_card_positions as the source; fall back to binder_cards if empty
        const positionsToLoad = editPositions.length > 0
          ? editPositions.filter(p => p.cardId).map(p => ({ position: p.slotIndex, cardId: p.cardId! }))
          : Array.from(ownershipMap.entries()).map(([position, data]) => ({ position, cardId: data.cardId }));
        
        if (positionsToLoad.length > 0) {
          const results = await Promise.all(
            positionsToLoad.map(async ({ position, cardId }) => {
              try {
                const card = await getCardById(cardId);
                if (card) return { position, card };
                return null;
              } catch { return null; }
            })
          );
          
          results.forEach((result) => {
            if (result) {
              const ownershipData = ownershipMap.get(result.position);
              const isOwned = ownershipData?.isOwned
                ?? latestBinder.cardIds?.includes(result.card.id)
                ?? false;
              const variant = ownershipData?.variant
                ? ownershipData.variant as any
                : result.card.variant;
              newPositionCards.set(result.position, { ...result.card, isOwned, variant });
            }
          });
        }
        
        setPositionCards(newPositionCards);
        // Keep binder-level cache in sync
        if (newPositionCards.size > 0) {
          customBinderCache.set(binderId, newPositionCards);
        }
      } else if (latestBinder.collectionMode === 'region') {
        // For Region binders: refresh both ownership AND card selections/images
        console.log('[BinderDetail] Refreshing Region binder card selections');
        
        // Use cardsRef to avoid dependency on cards state (which would cause infinite loop)
        const currentCards = cardsRef.current;
        if (currentCards.length === 0) {
          console.log('[BinderDetail] No cards loaded yet, skipping refresh');
          return;
        }
        
        // Get latest card selections from database
        const selectedCards = await getAllSelectedCardsForBinder(binderId);
        console.log('[BinderDetail] Found', selectedCards.size, 'custom card selections on refresh');
        
        // Update cards with latest selections and ownership
        let updatedCards = await Promise.all(
          currentCards.map(async (card) => {
            const pokedexNumber = card.pokedexNumber;
            if (!pokedexNumber) return { ...card, isOwned: latestBinder.cardIds.includes(card.id) };
            
            const selectedCardId = selectedCards.get(pokedexNumber);
            
            // Check if this card already has the correct selection
            const currentSelectedId = (card as any).selectedCardId;
            if (selectedCardId === currentSelectedId) {
              // Selection unchanged — but art style may have changed,
              // so rebuild the default image URL for cards without a custom pick.
              if (!selectedCardId && pokedexNumber) {
                const artStyleUrl = latestBinder.pokemonArtStyle
                  ? getPokemonImageUrl(pokedexNumber, latestBinder.pokemonArtStyle)
                  : undefined;
                return {
                  ...card,
                  imageUrl: artStyleUrl,
                  imageUrlHiRes: artStyleUrl,
                  isOwned: latestBinder.cardIds.includes(card.id),
                };
              }
              return { ...card, isOwned: latestBinder.cardIds.includes(card.id) };
            }
            
            if (selectedCardId) {
              try {
                const tcgCard = await getCardById(selectedCardId);
                if (tcgCard) {
                  return {
                    ...card,
                    imageUrl: tcgCard.imageUrl || undefined,
                    imageUrlHiRes: tcgCard.imageUrlHiRes || undefined,
                    selectedCardId: selectedCardId,
                    isOwned: latestBinder.cardIds.includes(card.id),
                  };
                }
              } catch (err) {
                console.warn('[BinderDetail] Failed to load selected card on refresh:', err);
              }
              // API failed or card not found — still preserve the selection
              return {
                ...card,
                imageUrl: undefined,
                imageUrlHiRes: undefined,
                selectedCardId: selectedCardId,
                isOwned: latestBinder.cardIds.includes(card.id),
              };
            }
            
            // No selection - use default sprite
            const defaultImageUrl = latestBinder.pokemonArtStyle 
              ? getPokemonImageUrl(pokedexNumber, latestBinder.pokemonArtStyle)
              : undefined;
            
            return {
              ...card,
              imageUrl: defaultImageUrl,
              imageUrlHiRes: defaultImageUrl,
              selectedCardId: undefined,
              isOwned: latestBinder.cardIds.includes(card.id),
            };
          })
        );
        
        // Apply saved positions from edit view
        try {
          const dbPositions = await getCardPositionsForBinder(binderId);
          if (dbPositions.length > 0) {
            const cardLookup = new Map<string, CardWithOwnership>();
            // Index by primary ID and also by selectedCardId so positions
            // stored with TCG card IDs can still find region cards.
            const selectedIdLookup = new Map<string, CardWithOwnership>();
            updatedCards.forEach(card => {
              cardLookup.set(card.id, card);
              if (card.selectedCardId) {
                selectedIdLookup.set(card.selectedCardId, card);
              }
            });

            const maxSlot = dbPositions.reduce((max, p) => Math.max(max, p.slotIndex), 0);
            const arraySize = Math.max(maxSlot + 1, updatedCards.length);
            const reordered: (CardWithOwnership | null)[] = new Array(arraySize).fill(null);

            for (const pos of dbPositions) {
              if (pos.cardId) {
                const card = cardLookup.get(pos.cardId)
                  || selectedIdLookup.get(pos.cardId);
                if (card) {
                  reordered[pos.slotIndex] = card;
                  cardLookup.delete(card.id);
                  if (card.selectedCardId) selectedIdLookup.delete(card.selectedCardId);
                } else {
                  try {
                    const fetchedCard = await getCardById(pos.cardId);
                    if (fetchedCard) {
                      reordered[pos.slotIndex] = {
                        ...fetchedCard,
                        isOwned: latestBinder.cardIds.includes(fetchedCard.id),
                      } as CardWithOwnership;
                    }
                  } catch { /* skip card */ }
                }
              }
            }

            // Cards not in any saved position were removed by the user — don't re-add them
            const posMap = new Map<number, CardWithOwnership>();
            for (let i = 0; i < reordered.length; i++) {
              if (reordered[i] !== null) posMap.set(i, reordered[i]!);
            }

            updatedCards = reordered.filter(c => c !== null) as CardWithOwnership[];
            console.log('[BinderDetail] Applied saved positions on refresh:', dbPositions.length);

            // Apply variant changes BEFORE setting savedPositionMap so
            // the position-based rendering path shows the correct badges.
            const regionVariantMap = await getCardVariantsForBinder(binderId);
            const applyVariants = (card: CardWithOwnership) => {
              const dbVariants = regionVariantMap.get(card.id)
                || (card.selectedCardId ? regionVariantMap.get(card.selectedCardId) : undefined);
              if (!dbVariants) return card;
              let updatedVariant = card.variant;
              if (dbVariants.length === 1) {
                updatedVariant = (dbVariants[0] || 'base') as any;
              } else if (dbVariants.length > 1) {
                const nonNull = dbVariants.find((v: string | null) => v !== null && v !== 'base');
                updatedVariant = (nonNull || dbVariants[0] || 'base') as any;
              }
              return { ...card, variant: updatedVariant };
            };

            updatedCards = updatedCards.map(applyVariants);

            // Rebuild posMap with variant-merged cards
            const updatedPosMap = new Map<number, CardWithOwnership>();
            posMap.forEach((card, slot) => {
              updatedPosMap.set(slot, applyVariants(card));
            });
            setSavedPositionMap(updatedPosMap);
          } else {
            setSavedPositionMap(null);

            // Apply variant changes from DB for region cards (no positions path)
            const regionVariantMap = await getCardVariantsForBinder(binderId);
            updatedCards = updatedCards.map((card) => {
              const dbVariants = regionVariantMap.get(card.id)
                || (card.selectedCardId ? regionVariantMap.get(card.selectedCardId) : undefined);
              if (!dbVariants) return card;
              let updatedVariant = card.variant;
              if (dbVariants.length === 1) {
                updatedVariant = (dbVariants[0] || 'base') as any;
              } else if (dbVariants.length > 1) {
                const nonNull = dbVariants.find(v => v !== null && v !== 'base');
                updatedVariant = (nonNull || dbVariants[0] || 'base') as any;
              }
              return { ...card, variant: updatedVariant };
            });
          }
        } catch (dbErr) {
          console.warn('[BinderDetail] Could not load saved positions on refresh:', dbErr);
        }

        setCards(updatedCards);
        console.log('[BinderDetail] Region cards refreshed with latest selections');
      } else {
        // For Master Set binders: update ownership + variants from DB
        if (cardsRef.current.length === 0) {
          console.log('[BinderDetail] No cards loaded yet, skipping Master Set refresh');
          return;
        }

        // Fetch current variants from binder_cards in one query
        const variantMap = await getCardVariantsForBinder(binderId);

        let updatedMasterCards = cardsRef.current.map((card) => {
          const dbVariants = variantMap.get(card.id);
          let updatedVariant = card.variant;
          if (dbVariants && dbVariants.length === 1) {
            updatedVariant = (dbVariants[0] || 'base') as any;
          } else if (dbVariants && dbVariants.length > 1) {
            // Multiple rows: prefer the non-null (actual holo) variant
            const nonNull = dbVariants.find(v => v !== null && v !== 'base');
            updatedVariant = (nonNull || dbVariants[0] || 'base') as any;
          }
          return {
            ...card,
            variant: updatedVariant,
            isOwned: latestBinder.cardIds.includes(card.id),
          };
        });
        
        // Apply saved positions from edit view
        try {
          const dbPositions = await getCardPositionsForBinder(binderId);
          if (dbPositions.length > 0) {
            const cardLookup = new Map<string, CardWithOwnership>();
            updatedMasterCards.forEach(card => cardLookup.set(card.id, card));

            const maxSlot = dbPositions.reduce((max, p) => Math.max(max, p.slotIndex), 0);
            const arraySize = Math.max(maxSlot + 1, updatedMasterCards.length);
            const reordered: (CardWithOwnership | null)[] = new Array(arraySize).fill(null);

            for (const pos of dbPositions) {
              if (pos.cardId) {
                const card = cardLookup.get(pos.cardId);
                if (card) {
                  reordered[pos.slotIndex] = card;
                  cardLookup.delete(pos.cardId);
                } else {
                  try {
                    const fetchedCard = await getCardById(pos.cardId);
                    if (fetchedCard) {
                      reordered[pos.slotIndex] = {
                        ...fetchedCard,
                        isOwned: latestBinder.cardIds.includes(fetchedCard.id),
                      } as CardWithOwnership;
                    }
                  } catch { /* skip card */ }
                }
              }
            }

            // Cards not in any saved position were removed by the user — don't re-add them
            const posMap = new Map<number, CardWithOwnership>();
            for (let i = 0; i < reordered.length; i++) {
              if (reordered[i] !== null) posMap.set(i, reordered[i]!);
            }
            setSavedPositionMap(posMap);

            updatedMasterCards = reordered.filter(c => c !== null) as CardWithOwnership[];
            console.log('[BinderDetail] Applied saved positions on refresh:', dbPositions.length);
          } else {
            setSavedPositionMap(null);
          }
        } catch (dbErr) {
          console.warn('[BinderDetail] Could not load saved positions on refresh:', dbErr);
        }
        
        setCards(updatedMasterCards);
        
        // Refresh extra cards for Master Set binders — update existing
        // ones and load any newly-added extras from the database
        const extraCardsData = await getExtraCardsWithVariants(binderId);

        setExtraCards((prevExtraCards) => {
          // Update ownership on existing extras
          const updated = prevExtraCards.map((card) => {
            const dbData = extraCardsData.find(
              (ec) => ec.cardId === card.id && ec.variant === (card.variant || null)
            );
            return dbData ? { ...card, isOwned: dbData.isOwned } : card;
          });

          // Find extras in the DB that aren't in state yet
          const existingIds = new Set(
            prevExtraCards.map(c => `${c.id}|${c.variant || ''}`)
          );
          const newExtras = extraCardsData.filter(
            ec => !existingIds.has(`${ec.cardId}|${ec.variant || ''}`)
          );

          if (newExtras.length > 0) {
            // Load new extras asynchronously and merge into state
            Promise.all(
              newExtras.map(async (ec) => {
                try {
                  const card = await getCardById(ec.cardId);
                  if (card) return { ...card, isOwned: ec.isOwned } as CardWithOwnership;
                  return null;
                } catch { return null; }
              })
            ).then((loaded) => {
              const validCards = loaded.filter((c): c is CardWithOwnership => c !== null);
              if (validCards.length > 0) {
                setExtraCards(prev => [...prev, ...validCards]);
              }
            });
          }

          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to refresh binder ownership:', err);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [binderId]);

  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshOwnershipFromDb();
    } finally {
      setRefreshing(false);
    }
  }, [refreshOwnershipFromDb]);

  useFocusEffect(
    useCallback(() => {
      // Apply any variant changes from CardDetail immediately so
      // the grid shows the correct badge without waiting for a DB query.
      if (binderId) {
        const variantUpdates = popVariantUpdates(binderId);
        if (variantUpdates.length > 0) {
          const applyUpdate = (card: CardWithOwnership) => {
            const update = variantUpdates.find(
              u => u.cardId === card.id || u.cardId === card.selectedCardId
            );
            if (!update) return card;
            return { ...card, variant: update.variant as any };
          };

          setCards(prev => prev.map(applyUpdate));
          setSavedPositionMap(prev => {
            if (!prev || prev.size === 0) return prev;
            const updated = new Map<number, CardWithOwnership>();
            prev.forEach((card, slot) => updated.set(slot, applyUpdate(card)));
            return updated;
          });
        }
      }

      // Process any queued offline operations before refreshing
      processToggleQueue()
        .then(() => processPendingCountSyncs())
        .catch(() => {})
        .finally(() => refreshOwnershipFromDb());

      return () => {
        if (countSyncTimerRef.current) {
          clearTimeout(countSyncTimerRef.current);
          countSyncTimerRef.current = null;
        }
        if (binderId) {
          markPendingCountSync(binderId);
          syncBinderCardCount(binderId)
            .then(() => clearPendingCountSync(binderId))
            .catch(() => {});
        }
      };
    }, [refreshOwnershipFromDb, binderId])
  );

  const variantsKey = binder?.variantsToTrack?.join(',') ?? '';
  const variantOrderKey = binder?.variantOrder?.join(',') ?? '';

  // Fetch cards when binder is loaded
  useEffect(() => {
    async function fetchCards() {
      if (!binder) return;

      // For custom binders, check binder-level cache for instant display
      if (binder.collectionMode === 'custom') {
        const cached = customBinderCache.get(binder.id);
        if (cached && cached.size > 0) {
          console.log('[BinderDetail] Custom mode - using cached data:', cached.size, 'cards');
          setPositionCards(cached);
          setLoading(false);
          setCardsFullyLoaded(true);
          return;
        }
      }

      try {
        isFetchingCardsRef.current = true;
        setLoading(true);
        // Reset pagination state when fetching new cards
        setDisplayCount(PAGE_SIZE);
        setCardsFullyLoaded(false);
        let allCards: Card[] = [];
        let newPositionCards = new Map<number, CardWithOwnership>();

        // Get all cards based on collection mode
        if (binder.collectionMode === 'master-set' && binder.set) {
          console.log('[BinderDetail] ========================================');
          console.log('[BinderDetail] FETCHING CARDS FOR SET:', binder.set);
          console.log('[BinderDetail] ========================================');
          allCards = await getCardsBySet(binder.set);
          console.log('[BinderDetail] ✓ Fetched', allCards.length, 'total cards from API');
          
          // Count cards by variant
          const variantCounts: Record<string, number> = {};
          allCards.forEach(card => {
            const variant = card.variant || 'undefined';
            variantCounts[variant] = (variantCounts[variant] || 0) + 1;
          });
          console.log('[BinderDetail] Variant breakdown:', variantCounts);
          
          // Count unique base cards
          const uniqueBaseCards = new Set<string>();
          allCards.forEach(card => {
            // Remove variant suffix from ID to get base card ID
            const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
            uniqueBaseCards.add(baseId);
          });
          console.log('[BinderDetail] Unique base cards:', uniqueBaseCards.size);
          
          // Find cards that have reverse-holo variants
          const cardsWithReverseHolo = new Set<string>();
          allCards.forEach(card => {
            if (card.variant === 'reverse-holo') {
              const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
              cardsWithReverseHolo.add(baseId);
            }
          });
          console.log('[BinderDetail] Cards with reverse-holo variant:', cardsWithReverseHolo.size);
          
          // Log first 5 cards with all their details
          console.log('[BinderDetail] Sample cards (first 5):');
          allCards.slice(0, 5).forEach((card, index) => {
            console.log(`  ${index + 1}. ${card.name} (${card.number}) - variant: ${card.variant}, rarity: ${card.rarity}, id: ${card.id}`);
          });
        } else if (binder.collectionMode === 'region' && binder.region) {
          // Step 31C: Load Region cards with custom card selections
          console.log('[BinderDetail] Loading Region binder:', binder.region);
          
          // Get base Pokemon list for region (with sprites/art based on art style)
          const pokemonList = await getCardsByRegion(binder.region as Region, binder.pokemonArtStyle);
          console.log('[BinderDetail] Got', pokemonList.length, 'Pokemon for region');
          
          // Get all selected cards for this binder (Pokemon that have custom TCG card selections)
          const selectedCards = await getAllSelectedCardsForBinder(binder.id);
          console.log('[BinderDetail] Found', selectedCards.size, 'custom card selections');
          
          // If user has custom card selections, load the TCG card images
          if (selectedCards.size > 0) {
            // Load TCG card details for all selected cards in parallel
            const cardsWithSelections = await Promise.all(
              pokemonList.map(async (pokemon) => {
                // Get Pokedex number from the pokemon (it's stored in pokedexNumber field)
                const pokedexNumber = pokemon.pokedexNumber;
                
                if (!pokedexNumber) {
                  return pokemon;
                }
                
                // Check if user selected a custom card for this Pokemon
                const selectedCardId = selectedCards.get(pokedexNumber);
                
                if (selectedCardId) {
                  try {
                    const tcgCard = await getCardById(selectedCardId);
                    
                    if (tcgCard) {
                      console.log('[BinderDetail] Using custom card for', pokemon.name, ':', selectedCardId);
                      return {
                        ...pokemon,
                        imageUrl: tcgCard.imageUrl || undefined,
                        imageUrlHiRes: tcgCard.imageUrlHiRes || undefined,
                        selectedCardId: selectedCardId,
                        selectedCardName: tcgCard.name,
                        selectedCardNumber: tcgCard.number,
                        selectedCardRarity: tcgCard.rarity,
                        selectedCardIllustrator: tcgCard.illustrator,
                        selectedCardSet: tcgCard.set,
                        setTotal: tcgCard.setTotal,
                      };
                    }
                  } catch (err) {
                    console.warn('[BinderDetail] Failed to load selected card for', pokemon.name, ':', err);
                  }
                  // API failed or card not found — still mark the selection
                  return {
                    ...pokemon,
                    imageUrl: undefined,
                    imageUrlHiRes: undefined,
                    selectedCardId: selectedCardId,
                  };
                }
                
                return pokemon;
              })
            );
            
            allCards = cardsWithSelections;
          } else {
            // No custom selections, use default sprites
            allCards = pokemonList;
          }
        } else if (binder.collectionMode === 'custom') {
          // Custom binders: binder_card_positions is the single source of truth for positions,
          // binder_cards provides ownership data. Both tables are kept in sync by addCardAtPosition.
          console.log('[BinderDetail] Custom mode - loading cards with positions');
          
          try {
            // Load positions and ownership data in parallel (faster than sequential)
            const [editPositions, ownershipMap] = await Promise.all([
              getCardPositionsForBinder(binder.id),
              getBinderCardsWithPositions(binder.id),
            ]);
            
            console.log('[BinderDetail] Custom mode - positions:', editPositions.length, ', ownership entries:', ownershipMap.size);
            
            newPositionCards = new Map<number, CardWithOwnership>();
            
            // Use binder_card_positions as the source of truth
            const positionsToLoad = editPositions.length > 0
              ? editPositions.filter(p => p.cardId).map(p => ({ position: p.slotIndex, cardId: p.cardId! }))
              : Array.from(ownershipMap.entries()).map(([position, data]) => ({ position, cardId: data.cardId }));
            
            if (positionsToLoad.length > 0) {
              const results = await Promise.all(
                positionsToLoad.map(async ({ position, cardId }) => {
                  try {
                    const card = await getCardById(cardId);
                    if (card) return { position, card };
                    return null;
                  } catch { return null; }
                })
              );
              
              results.forEach((result) => {
                if (result) {
                  const ownershipData = ownershipMap.get(result.position);
                  const isOwned = ownershipData?.isOwned
                    ?? binder.cardIds?.includes(result.card.id)
                    ?? false;
                  const variant = ownershipData?.variant
                    ? ownershipData.variant as any
                    : result.card.variant;
                  newPositionCards.set(result.position, { ...result.card, isOwned, variant });
                }
              });
            }
            
            setPositionCards(newPositionCards);
            // Store in binder-level cache for instant loading on next open
            if (newPositionCards.size > 0) {
              customBinderCache.set(binder.id, newPositionCards);
            }
            console.log('[BinderDetail] Custom mode - loaded', newPositionCards.size, 'cards into grid');
            
            allCards = [];
          } catch (err) {
            console.error('[BinderDetail] Error loading custom binder cards:', err);
            allCards = [];
          }
        }

        // Filter cards based on variants to track (Master Set mode only)
        console.log('[BinderDetail] ========================================');
        console.log('[BinderDetail] VARIANT FILTERING');
        console.log('[BinderDetail] ========================================');
        console.log('[BinderDetail] Collection Mode:', binder.collectionMode);
        console.log('[BinderDetail] variantsToTrack:', binder.variantsToTrack);
        console.log('[BinderDetail] variantsToTrack is array?', Array.isArray(binder.variantsToTrack));
        console.log('[BinderDetail] variantsToTrack length:', binder.variantsToTrack?.length);
        
        if (binder.collectionMode === 'master-set' && binder.variantsToTrack && binder.variantsToTrack.length > 0) {
          const originalCount = allCards.length;
          console.log('[BinderDetail] BEFORE FILTER - Total cards:', originalCount);
          
          // For each base card, check if any of its variants is in the
          // tracked list. Cards whose base ID has NO tracked variants
          // (e.g. secret rares with only base) keep their base version.
          const baseCardHasTrackedVariant = new Map<string, boolean>();
          allCards.forEach(card => {
            const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
            const cardVariant = card.variant || 'base';
            if (binder.variantsToTrack!.includes(cardVariant)) {
              baseCardHasTrackedVariant.set(baseId, true);
            }
            if (!baseCardHasTrackedVariant.has(baseId)) {
              baseCardHasTrackedVariant.set(baseId, false);
            }
          });

          // Track which cards are being removed and why
          const removedCards: { name: string; variant: string; rarity: string }[] = [];
          
          allCards = allCards.filter((card) => {
            const cardVariant = card.variant || 'base';
            const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');

            // If none of this card's variants are in the tracked list,
            // always keep the base version (e.g. secret rares, illustration rares)
            if (!baseCardHasTrackedVariant.get(baseId)) {
              return cardVariant === 'base';
            }

            const shouldKeep = binder.variantsToTrack!.includes(cardVariant);
            
            if (!shouldKeep) {
              removedCards.push({
                name: card.name,
                variant: cardVariant,
                rarity: card.rarity,
              });
            }
            
            return shouldKeep;
          });
          
          console.log('[BinderDetail] AFTER FILTER - Total cards:', allCards.length);
          
          // Count filtered cards by variant
          const filteredVariantCounts: Record<string, number> = {};
          allCards.forEach(card => {
            const variant = card.variant || 'undefined';
            filteredVariantCounts[variant] = (filteredVariantCounts[variant] || 0) + 1;
          });
          console.log('[BinderDetail] ✓ Kept cards by variant:', filteredVariantCounts);
          
          // Count removed cards by variant
          const removedVariantCounts: Record<string, number> = {};
          removedCards.forEach(card => {
            const variant = card.variant || 'undefined';
            removedVariantCounts[variant] = (removedVariantCounts[variant] || 0) + 1;
          });
          console.log('[BinderDetail] ✗ Removed cards by variant:', removedVariantCounts);
          
          console.log('[BinderDetail] Filter summary:', {
            variantsToTrack: binder.variantsToTrack,
            originalCount: originalCount,
            filteredCount: allCards.length,
            removedCount: originalCount - allCards.length,
          });
        } else {
          console.log('[BinderDetail] SKIPPING FILTER - Reason:');
          console.log('  - Is master-set?', binder.collectionMode === 'master-set');
          console.log('  - Has variantsToTrack?', !!binder.variantsToTrack);
          console.log('  - variantsToTrack length > 0?', binder.variantsToTrack && binder.variantsToTrack.length > 0);
        }
        console.log('[BinderDetail] ========================================');

        // Mark which cards are owned
        const ownedCardIds = new Set(binder.cardIds);
        let cardsWithOwnership: CardWithOwnership[] = allCards.map((card) => ({
          ...card,
          isOwned: ownedCardIds.has(card.id),
        }));

        // Sort cards based on collection mode
        if (binder.collectionMode === 'master-set') {
          // Sort by set number (extract numeric part from "001/150")
          cardsWithOwnership.sort((a, b) => {
            const getSetNumber = (numberStr: string): number => {
              // Extract the number before the "/" (e.g., "001/150" -> 1)
              const match = numberStr.match(/^(\d+)\//);
              return match ? parseInt(match[1], 10) : 0;
            };
            return getSetNumber(a.number) - getSetNumber(b.number);
          });
        } else if (binder.collectionMode === 'region') {
          // Sort by Pokédex number
          cardsWithOwnership.sort((a, b) => {
            const aNum = a.pokedexNumber ?? 0;
            const bNum = b.pokedexNumber ?? 0;
            return aNum - bNum;
          });
        }
        // Custom mode: no specific sorting (keep as-is or could sort by name)

        // Apply variant placement logic (only for master-set mode with multiple variants)
        const effectivePlacement = binder.variantPlacement || 'grouped';
        if (binder.collectionMode === 'master-set' && binder.variantsToTrack && binder.variantsToTrack.length > 1) {
          const defaultOrder = ['base', 'reverse-holo', 'poke-ball', 'master-ball', 'secret-rare'];
          const effectiveOrder = binder.variantOrder && binder.variantOrder.length > 0
            ? binder.variantOrder : defaultOrder;
          const groupPosition = new Map<string, number>();
          effectiveOrder.forEach((key, idx) => groupPosition.set(key, idx));

          const getSetNumber = (numberStr: string): number => {
            const match = numberStr.match(/^(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };

          const isSecretRare = (card: CardWithOwnership): boolean => {
            const cardNum = getSetNumber(card.number);
            const total = parseInt(card.setTotal || '0', 10);
            return total > 0 && cardNum > total;
          };

          const getCardGroupKey = (card: CardWithOwnership): string => {
            if (isSecretRare(card)) return 'secret-rare';
            return card.variant || 'base';
          };

          const isBaseCard = (card: CardWithOwnership): boolean => {
            return !card.variant || card.variant === 'base';
          };

          const getBaseIdentifier = (card: CardWithOwnership): string => {
            return `${card.name}-${card.number}`;
          };

          if (effectivePlacement === 'grouped') {
            const regularCards: CardWithOwnership[] = [];
            const secretRareCards: CardWithOwnership[] = [];
            cardsWithOwnership.forEach(card => {
              if (isSecretRare(card)) {
                secretRareCards.push(card);
              } else {
                regularCards.push(card);
              }
            });

            const cardGroups = new Map<string, CardWithOwnership[]>();
            const groupOrder: string[] = [];
            regularCards.forEach((card) => {
              const baseId = getBaseIdentifier(card);
              if (!cardGroups.has(baseId)) {
                cardGroups.set(baseId, []);
                groupOrder.push(baseId);
              }
              cardGroups.get(baseId)!.push(card);
            });

            const fixedOrder: Record<string, number> = {
              'base': 0, 'reverse-holo': 1, 'poke-ball': 2, 'master-ball': 3,
            };
            const grouped: CardWithOwnership[] = [];
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
              cardsWithOwnership = [...secretRareCards, ...grouped];
            } else {
              cardsWithOwnership = [...grouped, ...secretRareCards];
            }
          } else if (effectivePlacement === 'end') {
            const groups = new Map<string, CardWithOwnership[]>();
            cardsWithOwnership.forEach(card => {
              const key = getCardGroupKey(card);
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(card);
            });

            groups.forEach(cards => {
              cards.sort((a, b) => getSetNumber(a.number) - getSetNumber(b.number));
            });

            const result: CardWithOwnership[] = [];
            effectiveOrder.forEach(key => {
              const groupCards = groups.get(key);
              if (groupCards) result.push(...groupCards);
            });
            groups.forEach((cards, key) => {
              if (!effectiveOrder.includes(key)) result.push(...cards);
            });
            cardsWithOwnership = result;
          }
        }

        // Check for saved positions from binder edit (Step 34I)
        if (binder.collectionMode !== 'custom') {
          try {
            const dbPositions = await getCardPositionsForBinder(binder.id);
            if (dbPositions.length > 0) {
              console.log('[BinderDetail] Found', dbPositions.length, 'saved positions from edit view');

              // Build a lookup map from card ID to card data.
              // Also index by selectedCardId so positions stored with
              // TCG card IDs can still find their region card.
              const cardLookup = new Map<string, CardWithOwnership>();
              const selectedIdLookup = new Map<string, CardWithOwnership>();
              cardsWithOwnership.forEach(card => {
                cardLookup.set(card.id, card);
                if (card.selectedCardId) {
                  selectedIdLookup.set(card.selectedCardId, card);
                }
              });

              // Find the highest slot index to determine array size
              const maxSlot = dbPositions.reduce((max, p) => Math.max(max, p.slotIndex), 0);
              const arraySize = Math.max(maxSlot + 1, cardsWithOwnership.length);

              // Place each card at its exact saved slot position
              const reordered: (CardWithOwnership | null)[] = new Array(arraySize).fill(null);

              for (const pos of dbPositions) {
                if (pos.cardId) {
                  const card = cardLookup.get(pos.cardId)
                    || selectedIdLookup.get(pos.cardId);
                  if (card) {
                    reordered[pos.slotIndex] = card;
                    cardLookup.delete(card.id);
                    if (card.selectedCardId) selectedIdLookup.delete(card.selectedCardId);
                  } else {
                    // Card not in lookup (replaced via edit mode) — fetch from API
                    try {
                      const fetchedCard = await getCardById(pos.cardId);
                      if (fetchedCard) {
                        reordered[pos.slotIndex] = {
                          ...fetchedCard,
                          isOwned: binder.cardIds?.includes(fetchedCard.id) ?? false,
                        } as CardWithOwnership;
                      }
                    } catch { /* skip card */ }
                  }
                }
              }

              // Cards not in any saved position were removed by the user — don't re-add them
              const posMap = new Map<number, CardWithOwnership>();
              for (let i = 0; i < reordered.length; i++) {
                if (reordered[i] !== null) {
                  posMap.set(i, reordered[i]!);
                }
              }
              setSavedPositionMap(posMap);

              cardsWithOwnership = reordered.filter(c => c !== null) as CardWithOwnership[];
              console.log('[BinderDetail] Applied saved card positions:', cardsWithOwnership.length, 'cards, positionMap:', posMap.size);
            } else {
              setSavedPositionMap(null);
            }
          } catch (dbErr) {
            console.warn('[BinderDetail] Could not load saved positions, using default order:', dbErr);
          }
        }

        // Apply any manually-changed variants from the database so the grid
        // shows the correct badge even on a fresh load (not just on refresh).
        try {
          const savedVariants = await getCardVariantsForBinder(binder.id);
          if (savedVariants.size > 0) {
            const applyVariant = (card: CardWithOwnership) => {
              const dbVariants = savedVariants.get(card.id)
                || (card.selectedCardId ? savedVariants.get(card.selectedCardId) : undefined);
              if (!dbVariants) return card;
              let updatedVariant = card.variant;
              if (dbVariants.length === 1) {
                updatedVariant = (dbVariants[0] || 'base') as any;
              } else if (dbVariants.length > 1) {
                // Multiple rows: prefer the non-null (actual holo) variant
                const nonNull = dbVariants.find(v => v !== null && v !== 'base');
                updatedVariant = (nonNull || dbVariants[0] || 'base') as any;
              }
              return { ...card, variant: updatedVariant };
            };

            cardsWithOwnership = cardsWithOwnership.map(applyVariant);

            // Also update savedPositionMap so position-based rendering
            // shows the correct holo badges.
            setSavedPositionMap((prev) => {
              if (!prev || prev.size === 0) return prev;
              const updated = new Map<number, CardWithOwnership>();
              prev.forEach((card, slot) => {
                updated.set(slot, applyVariant(card));
              });
              return updated;
            });
          }
        } catch (variantErr) {
          console.warn('[BinderDetail] Could not load saved variants:', variantErr);
        }

        setCards(cardsWithOwnership);
        
        // Load extra cards for Master Set binders
        let loadedExtraCards: CardWithOwnership[] = [];
        if (binder.collectionMode === 'master-set') {
          console.log('[BinderDetail] Loading extra cards for Master Set binder');
          try {
            const extraCardsData = await getExtraCardsWithVariants(binder.id);
            console.log('[BinderDetail] Found', extraCardsData.length, 'extra cards');
            
            if (extraCardsData.length > 0) {
              const extraCardsWithDetails = await Promise.all(
                extraCardsData.map(async (extraCardInfo) => {
                  try {
                    const card = await getCardById(extraCardInfo.cardId);
                    if (card) {
                      return {
                        ...card,
                        isOwned: extraCardInfo.isOwned,
                      } as CardWithOwnership;
                    }
                    return null;
                  } catch (err) {
                    console.warn('[BinderDetail] Failed to load extra card:', extraCardInfo.cardId, err);
                    return null;
                  }
                })
              );
              
              loadedExtraCards = extraCardsWithDetails.filter((c): c is CardWithOwnership => c !== null);
              setExtraCards(loadedExtraCards);
              console.log('[BinderDetail] Loaded', loadedExtraCards.length, 'extra cards with details');
            } else {
              setExtraCards([]);
            }
          } catch (err) {
            console.error('[BinderDetail] Failed to load extra cards:', err);
            setExtraCards([]);
          }
        } else {
          setExtraCards([]);
        }
        
        // Sync binder.ownedCards with the actual card data
        // so the progress bar doesn't briefly show stale DB values.
        if (binder.collectionMode === 'custom') {
          // Custom binders use positionCards (not cardsWithOwnership which is empty)
          const customOwned = Array.from(newPositionCards.values()).filter(c => c.isOwned).length;
          const customTotal = newPositionCards.size;
          setBinder(prev => {
            if (!prev) return prev;
            if (prev.ownedCards === customOwned && prev.totalCards === customTotal) return prev;
            return { ...prev, ownedCards: customOwned, totalCards: customTotal };
          });
        } else {
          // Master Set / Region: count from cardsWithOwnership + extras
          const regularOwnedCount = cardsWithOwnership.filter(c => c.isOwned).length;
          const mainCardIds = new Set(cardsWithOwnership.map(c => c.id));
          const extraOwnedCount = loadedExtraCards.filter(c => c.isOwned && !mainCardIds.has(c.id)).length;
          const actualOwnedCount = regularOwnedCount + extraOwnedCount;
          setBinder(prev => {
            if (!prev || prev.ownedCards === actualOwnedCount) return prev;
            return { ...prev, ownedCards: actualOwnedCount };
          });
        }

        // Start background prefetch for all card images
        // This continues even if the user leaves the screen
        if (cardsWithOwnership.length > 0 && binder.id) {
          const imageUrls = cardsWithOwnership
            .map(card => card.imageUrl)
            .filter((url): url is string => !!url);
          
          if (imageUrls.length > 0) {
            console.log('[BinderDetail] Starting background image prefetch for', imageUrls.length, 'images');
            // Start prefetch in background (don't await - let it run independently)
            startBackgroundPrefetch(binder.id, imageUrls, 5).then(result => {
              console.log('[BinderDetail] Background prefetch complete:', result);
              // Log failed image summary after prefetch completes (with delay for any remaining loads)
              setTimeout(() => {
                logFailedImageSummary();
              }, 3000);
            }).catch(err => {
              console.error('[BinderDetail] Background prefetch error:', err);
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
        isFetchingCardsRef.current = false;
        setLoading(false);
      }
    }

    fetchCards();
  }, [
    binder?.id,
    binder?.collectionMode,
    binder?.set,
    binder?.region,
    variantsKey,
    variantOrderKey,
    binder?.variantPlacement,
    binder?.pokemonArtStyle,
  ]);

  // Toggle card ownership (tap to add/remove) - with optimistic updates
  // Uses fast DB calls (1 call each) to avoid rate limiting when marking many cards
  const handleToggleCard = useCallback(async (card: CardWithOwnership) => {
    if (!binder) return;

    const lockKey = `${card.id}_${card.variant || ''}`;
    if (togglingCardsRef.current.has(lockKey)) return;
    togglingCardsRef.current.add(lockKey);

    const newIsOwned = !card.isOwned;
    const cardId = card.id;
    const cardVariant = card.variant;
    const currentBinderId = binder.id;

    // Optimistic update using functional setState to ensure we always use latest state
    setCards((prevCards) =>
      prevCards.map((c) =>
        c.id === cardId ? { ...c, isOwned: newIsOwned } : c
      )
    );

    setSavedPositionMap((prevMap) => {
      if (!prevMap) return prevMap;
      const newMap = new Map(prevMap);
      newMap.forEach((c, slot) => {
        if (c.id === cardId) {
          newMap.set(slot, { ...c, isOwned: newIsOwned });
        }
      });
      return newMap;
    });

    setBinder((prevBinder) => {
      if (!prevBinder) return prevBinder;
      const updatedCardIds = newIsOwned
        ? [...prevBinder.cardIds, cardId]
        : prevBinder.cardIds.filter((id) => id !== cardId);
      const updatedOwnedCards = newIsOwned
        ? (prevBinder.ownedCards || 0) + 1
        : Math.max(0, (prevBinder.ownedCards || 0) - 1);
      return { 
        ...prevBinder, 
        cardIds: updatedCardIds,
        ownedCards: updatedOwnedCards
      };
    });

    try {
      if (newIsOwned) {
        await addCardToBinderFast(currentBinderId, cardId, cardVariant);
      } else {
        await removeCardFromBinderFast(currentBinderId, cardId, cardVariant);
      }
      scheduleCountSync(currentBinderId);
    } catch (err) {
      console.error('[BinderDetail] Failed to save card toggle:', err);

      enqueueToggle({
        type: newIsOwned ? 'add_card' : 'remove_card',
        binderId: currentBinderId,
        cardId,
        variant: cardVariant || null,
        isOwned: newIsOwned,
      }).catch(() => {});

      setCards((prevCards) =>
        prevCards.map((c) =>
          c.id === cardId ? { ...c, isOwned: !newIsOwned } : c
        )
      );
      setSavedPositionMap((prevMap) => {
        if (!prevMap) return prevMap;
        const newMap = new Map(prevMap);
        newMap.forEach((c, slot) => {
          if (c.id === cardId) {
            newMap.set(slot, { ...c, isOwned: !newIsOwned });
          }
        });
        return newMap;
      });
      setBinder((prevBinder) => {
        if (!prevBinder) return prevBinder;
        const revertedCardIds = !newIsOwned
          ? [...prevBinder.cardIds, cardId]
          : prevBinder.cardIds.filter((id) => id !== cardId);
        const revertedOwnedCards = !newIsOwned
          ? (prevBinder.ownedCards || 0) + 1
          : Math.max(0, (prevBinder.ownedCards || 0) - 1);
        return { 
          ...prevBinder, 
          cardIds: revertedCardIds,
          ownedCards: revertedOwnedCards
        };
      });
      showError('Save failed', 'Will retry when connection is restored');
    } finally {
      togglingCardsRef.current.delete(lockKey);
    }
  }, [binder?.id, scheduleCountSync]);

  

  // Handle toggling owned/missing status for a card at a position (Custom mode)
  const handleToggleCustomCardOwnership = useCallback(async (position: number) => {
    if (!binder) return;
    
    const lockKey = `custom_pos_${position}`;
    if (togglingCardsRef.current.has(lockKey)) return;
    togglingCardsRef.current.add(lockKey);
    
    const card = positionCards.get(position);
    if (!card) {
      togglingCardsRef.current.delete(lockKey);
      return;
    }
    
    const newIsOwned = !card.isOwned;
    
    setPositionCards((prev) => {
      const updated = new Map(prev);
      updated.set(position, { ...card, isOwned: newIsOwned });
      return updated;
    });
    
    setBinder((prevBinder) => {
      if (!prevBinder) return prevBinder;
      return {
        ...prevBinder,
        ownedCards: newIsOwned 
          ? (prevBinder.ownedCards || 0) + 1 
          : Math.max(0, (prevBinder.ownedCards || 0) - 1),
      };
    });
    
    try {
      await toggleCardOwnershipAtPosition(binder.id, position);
    } catch (err) {
      console.error('[BinderDetail] Failed to toggle card ownership:', err);

      enqueueToggle({
        type: 'set_position_owned',
        binderId: binder.id,
        cardId: card.id,
        position,
        isOwned: newIsOwned,
      }).catch(() => {});

      setPositionCards((prev) => {
        const updated = new Map(prev);
        updated.set(position, card);
        return updated;
      });
      setBinder((prevBinder) => {
        if (!prevBinder) return prevBinder;
        return {
          ...prevBinder,
          ownedCards: card.isOwned 
            ? (prevBinder.ownedCards || 0) + 1 
            : Math.max(0, (prevBinder.ownedCards || 0) - 1),
        };
      });
      showError('Save failed', 'Will retry when connection is restored');
    } finally {
      togglingCardsRef.current.delete(lockKey);
    }
  }, [binder, positionCards]);

  // Toggle ownership for custom mode via card object (used by list/binder views)
  const handleCustomCardToggleByCard = useCallback((card: CardWithOwnership) => {
    for (const [pos, c] of positionCards.entries()) {
      if (c.id === card.id) {
        handleToggleCustomCardOwnership(pos);
        return;
      }
    }
  }, [positionCards, handleToggleCustomCardOwnership]);

  // === EXTRA CARDS HANDLERS (Master Set mode) ===
  
  

  const handleToggleExtraCardOwnership = useCallback(async (card: CardWithOwnership) => {
    if (!binder) return;
    
    const lockKey = `extra_${card.id}_${card.variant || ''}`;
    if (togglingCardsRef.current.has(lockKey)) return;
    togglingCardsRef.current.add(lockKey);
    
    const newIsOwned = !card.isOwned;
    const cardId = card.id;
    const cardVariant = card.variant;
    const currentBinderId = binder.id;
    
    setExtraCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isOwned: newIsOwned } : c))
    );

    setBinder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ownedCards: newIsOwned
          ? (prev.ownedCards || 0) + 1
          : Math.max(0, (prev.ownedCards || 0) - 1),
      };
    });
    
    try {
      await toggleExtraCardOwnership(currentBinderId, cardId, cardVariant);
    } catch (err) {
      console.error('[BinderDetail] Failed to toggle extra card ownership:', err);

      enqueueToggle({
        type: 'set_extra_owned',
        binderId: currentBinderId,
        cardId,
        variant: cardVariant || null,
        isOwned: newIsOwned,
      }).catch(() => {});

      setExtraCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, isOwned: !newIsOwned } : c))
      );
      setBinder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ownedCards: !newIsOwned
            ? (prev.ownedCards || 0) + 1
            : Math.max(0, (prev.ownedCards || 0) - 1),
        };
      });
      showError('Save failed', 'Will retry when connection is restored');
    } finally {
      togglingCardsRef.current.delete(lockKey);
    }
  }, [binder]);

  // === REGION MODE: Navigation based on card selection state ===
  
  // Step 34A: Enlarged card preview state (for long-press in Grid/Binder view)
  const [enlargedCard, setEnlargedCard] = useState<CardWithOwnership | null>(null);
  const [enlargedCardNote, setEnlargedCardNote] = useState<string | null>(null);
  const [enlargedCardSlotIndex, setEnlargedCardSlotIndex] = useState<number | null>(null);
  const enlargedNoteRequestRef = useRef(0);
  const enlargedNoteCacheRef = useRef<Map<string, string | null>>(new Map());

  const getCardSlotIndex = useCallback((card: CardWithOwnership): number | null => {
    const normalizeVariant = (value?: string) => value || 'base';
    const targetVariant = normalizeVariant(card.variant);

    if (binder?.collectionMode === 'custom') {
      for (const [slotIndex, slotCard] of positionCards.entries()) {
        if (slotCard.id === card.id && normalizeVariant(slotCard.variant) === targetVariant) {
          return slotIndex;
        }
      }
    }

    if (savedPositionMap && savedPositionMap.size > 0) {
      for (const [slotIndex, slotCard] of savedPositionMap.entries()) {
        if (slotCard.id === card.id && normalizeVariant(slotCard.variant) === targetVariant) {
          return slotIndex;
        }
      }
      for (const [slotIndex, slotCard] of savedPositionMap.entries()) {
        if (slotCard.id === card.id) {
          return slotIndex;
        }
      }
    }

    const exactIndex = cards.findIndex(
      (c) => c.id === card.id && normalizeVariant(c.variant) === targetVariant
    );
    if (exactIndex >= 0) return exactIndex;

    const fallbackIndex = cards.findIndex((c) => c.id === card.id);
    return fallbackIndex >= 0 ? fallbackIndex : null;
  }, [binder?.collectionMode, positionCards, savedPositionMap, cards]);
  
  // Handle tapping a Region Pokemon slot
  // - If no card selected: show hint to use edit mode
  // - If card selected: navigate to card detail
  const handleRegionCardTap = useCallback((pokemon: CardWithOwnership, index?: number) => {
    // A region slot has a custom TCG card if:
    // 1. selectedCardId is set (loaded from region_pokemon_cards table), OR
    // 2. The card ID doesn't start with "region-" (replaced with a TCG card in edit mode)
    const hasCustomCard = !!pokemon.selectedCardId || !pokemon.id.startsWith('region-');
    console.log('[BinderDetail] Region card tapped:', pokemon.name, 'hasCustomCard:', hasCustomCard);
    
    if (!hasCustomCard) {
      Alert.alert(
        pokemon.name,
        'Tap the edit button to choose a TCG card for this Pokémon.',
      );
      return;
    } else {
      // Calculate cards per page based on layout preference
      const gridCols = binder?.layoutPreference === '4x3' ? 4 : 3;
      const perPage = gridCols === 4 ? 12 : 9;
      
      // The actual TCG card ID (either from selectedCardId or the card's own ID)
      const tcgCardId = pokemon.selectedCardId || pokemon.id;

      // Custom card selected - navigate to card detail
      navigation.navigate('CardDetail', {
        cardId: tcgCardId,
        binderId: binder?.id || '',
        isOwned: pokemon.isOwned,
        collectionMode: 'region',
        pokedexNumber: pokemon.pokedexNumber,
        pokemonName: pokemon.name,
        cardIndex: index,
        cardsPerPage: perPage,
        regionSlotId: pokemon.id,
        regionCardData: {
          id: tcgCardId,
          name: pokemon.selectedCardName || pokemon.name,
          number: pokemon.selectedCardNumber || pokemon.number || '',
          set: pokemon.selectedCardSet || pokemon.set || binder?.region || '',
          rarity: pokemon.selectedCardRarity || pokemon.rarity || '',
          illustrator: pokemon.selectedCardIllustrator || pokemon.illustrator || '',
          imageUrl: pokemon.imageUrl,
          imageUrlHiRes: pokemon.imageUrlHiRes || pokemon.imageUrl,
          pokedexNumber: pokemon.pokedexNumber,
          selectedCardId: tcgCardId,
          setTotal: pokemon.setTotal,
          variant: pokemon.variant || 'base',
        },
      });
    }
  }, [binder?.id, binder?.region, binder?.layoutPreference, navigation]);

  // Step 34A: Long-press handlers for enlarged card preview
  const handleLongPressCard = useCallback((card: CardWithOwnership) => {
    const slotIndex = getCardSlotIndex(card);
    const requestId = ++enlargedNoteRequestRef.current;
    if (!binder?.id) {
      setEnlargedCard(card);
      setEnlargedCardSlotIndex(slotIndex);
      setEnlargedCardNote(null);
      return;
    }

    const normalizedVariant = card.variant || 'base';
    const isExtraForNote = extraCards.some(
      (extra) => extra.id === card.id && (extra.variant || 'base') === normalizedVariant
    ) || extraCards.some((extra) => extra.id === card.id);
    const notePosition = binder.collectionMode === 'custom' ? (slotIndex ?? undefined) : undefined;
    const noteCacheKey = `${binder.id}|${card.id}|${normalizedVariant}|${notePosition ?? 'none'}|${isExtraForNote ? 'extra' : 'regular'}`;

    if (enlargedNoteCacheRef.current.has(noteCacheKey)) {
      const cachedNote = enlargedNoteCacheRef.current.get(noteCacheKey) ?? null;
      setEnlargedCard(card);
      setEnlargedCardSlotIndex(slotIndex);
      setEnlargedCardNote(cachedNote);
      return;
    }

    getBinderCardData(binder.id, card.id, card.variant, notePosition, isExtraForNote)
      .then((data) => {
        if (enlargedNoteRequestRef.current !== requestId) return;
        const note = data?.note ?? null;
        const normalizedNote = note && note.trim().length > 0 ? note.trim() : null;
        enlargedNoteCacheRef.current.set(noteCacheKey, normalizedNote);
        // Set all preview data together so the modal opens in final state (no note pop-in re-render).
        setEnlargedCard(card);
        setEnlargedCardSlotIndex(slotIndex);
        setEnlargedCardNote(normalizedNote);
      })
      .catch(() => {
        if (enlargedNoteRequestRef.current !== requestId) return;
        enlargedNoteCacheRef.current.set(noteCacheKey, null);
        setEnlargedCard(card);
        setEnlargedCardSlotIndex(slotIndex);
        setEnlargedCardNote(null);
      });
  }, [binder?.id, binder?.collectionMode, getCardSlotIndex, extraCards]);

  const handleLongPressRelease = useCallback(() => {
    enlargedNoteRequestRef.current += 1;
    setEnlargedCard(null);
    setEnlargedCardNote(null);
    setEnlargedCardSlotIndex(null);
  }, []);

  // Update header title when binder loads
  useEffect(() => {
    if (binder) {
      navigation.setOptions({ title: binder.name });
    }
  }, [binder, navigation]);

  // Apply search filter
  const searchedCards = useCardSearch(cards, searchQuery);

  // Apply filter (ownership only)
  const ownershipFilteredCards = useCardFilter(searchedCards, {
    selectedRarities: new Set(),
    ownershipFilter,
  });

  const STATS_REGULAR_RARITIES = useMemo(() => new Set([
    'common', 'uncommon', 'rare', 'holo rare', 'rare holo',
  ]), []);

  const filteredCards = useMemo(() => {
    if (!statsFilter) return ownershipFilteredCards;
    return ownershipFilteredCards.filter((card) => {
      if (statsFilter.type === 'rarity') {
        return (card.rarity || '').toLowerCase() === statsFilter.value;
      }
      if (statsFilter.type === 'set') {
        const cardSet = (card.set || '').startsWith('Custom|') ? 'Custom Cards' : (card.set || '');
        return cardSet === statsFilter.value;
      }
      if (statsFilter.type === 'variant') {
        if (!card.variant) return false;
        let cardVariant = card.variant;
        if (cardVariant === 'base' && card.rarity && !STATS_REGULAR_RARITIES.has(card.rarity.toLowerCase())) {
          cardVariant = 'secret-rare';
        }
        return cardVariant === statsFilter.value;
      }
      return true;
    });
  }, [ownershipFilteredCards, statsFilter, STATS_REGULAR_RARITIES]);

  // Reset pagination when filters change (only affects Custom mode now)
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, ownershipFilter, statsFilter]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (viewMode === 'binder') {
      setViewBeforeSearch('binder');
      setViewMode('grid');
    }
  }, [viewMode]);

  // Restore original view when search is cleared
  useEffect(() => {
    if (searchQuery.length === 0 && viewBeforeSearch !== null) {
      setViewMode(viewBeforeSearch);
      setViewBeforeSearch(null);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setViewBeforeSearch(null);
  }, []);

  // Once cards are fully loaded, show ALL cards at once (for Master Set and Region modes)
  // This removes pagination for a better user experience - they can scroll freely
  useEffect(() => {
    const isNonCustomMode = binder && binder.collectionMode !== 'custom';
    
    if (!loading && isNonCustomMode && filteredCards.length > 0) {
      // Cards are loaded - show all cards (no pagination needed)
      setCardsFullyLoaded(true);
      setDisplayCount(filteredCards.length);
    }
  }, [loading, binder, filteredCards.length]);

  // For non-Custom modes: show all cards once loaded
  // For Custom mode: use pagination (displayCount)
  const displayedCards = useMemo(() => {
    const isNonCustomMode = binder && binder.collectionMode !== 'custom';
    
    // If cards are fully loaded in non-Custom mode, show all
    if (cardsFullyLoaded && isNonCustomMode) {
      return filteredCards;
    }
    
    // Otherwise use pagination (during loading or for Custom mode)
    return filteredCards.slice(0, displayCount);
  }, [filteredCards, displayCount, cardsFullyLoaded, binder]);

  // For non-Custom modes: no more cards once loaded
  // For Custom mode: still uses pagination
  const hasMoreCards = useMemo(() => {
    const isNonCustomMode = binder && binder.collectionMode !== 'custom';
    
    // If cards are fully loaded in non-Custom mode, no more to load
    if (cardsFullyLoaded && isNonCustomMode) {
      return false;
    }
    
    return displayCount < filteredCards.length;
  }, [cardsFullyLoaded, binder, displayCount, filteredCards.length]);

  // Load more cards handler - only used during initial loading or if pagination is still active
  const loadMoreCards = useCallback(() => {
    if (isLoadingMore || !hasMoreCards) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filteredCards.length));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasMoreCards, filteredCards.length]);

  // Determine grid columns based on layout preference (default to 3)
  const gridColumns = binder?.layoutPreference === '4x3' ? 4 : 3;
  const cardWidth = Math.max(50, calculateCardWidth(screenWidth, gridColumns)); // Ensure minimum width of 50
  
  // Binder view mode calculations
  const cardsPerPage = gridColumns === 4 ? 12 : 9; // 4×3 = 12, 3×3 = 9
  const totalPages = Math.max(40, Math.ceil(filteredCards.length / cardsPerPage));
  
  // For binder view: build a sparse array that preserves exact slot positions from edit mode.
  // Without this, cards get packed together and lose their assigned positions.
  const binderViewCards = useMemo(() => {
    if (!savedPositionMap || savedPositionMap.size === 0) {
      return filteredCards;
    }
    
    const totalSlots = totalPages * cardsPerPage;
    const result: (CardWithOwnership | undefined)[] = new Array(totalSlots);
    const query = searchQuery.toLowerCase().trim();
    
    savedPositionMap.forEach((card, slotIndex) => {
      if (slotIndex >= totalSlots) return;
      
      if (ownershipFilter === 'owned' && !card.isOwned) return;
      if (ownershipFilter === 'missing' && card.isOwned) return;
      
      if (query) {
        const nameMatch = card.name.toLowerCase().includes(query);
        const numMatch = card.number?.toLowerCase().includes(query);
        if (!nameMatch && !numMatch) return;
      }
      
      result[slotIndex] = card;
    });
    
    return result as CardWithOwnership[];
  }, [savedPositionMap, filteredCards, totalPages, cardsPerPage, searchQuery, ownershipFilter]);
  
  // Get cards for current binder page
  const pageCards = useMemo(() => {
    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;
    return filteredCards.slice(startIndex, endIndex);
  }, [filteredCards, currentPage, cardsPerPage]);

  // Group cards by page for page breaks view (grid mode with headers)
  // Each section contains rows of cards/slots (for grid layout in SectionList)
  const cardSections = useMemo(() => {
    if (!showPageBreaks) return null;
    
    type SlotEntry = CardWithOwnership | undefined;
    const sections: { title: string; pageNumber: number; data: SlotEntry[][] }[] = [];

    if (savedPositionMap && savedPositionMap.size > 0) {
      const query = searchQuery.toLowerCase().trim();
      const hasSearch = query.length > 0;
      const hasOwnershipFilter = ownershipFilter !== 'all';
      const isFiltering = hasSearch || hasOwnershipFilter;

      for (let page = 0; page < totalPages; page++) {
        const rows: SlotEntry[][] = [];
        let pageHasContent = false;

        for (let row = 0; row < 3; row++) {
          const rowSlots: SlotEntry[] = [];
          for (let col = 0; col < gridColumns; col++) {
            const slotIndex = page * cardsPerPage + row * gridColumns + col;
            const card = savedPositionMap.get(slotIndex);

            if (card) {
              if (hasSearch) {
                const nameMatch = card.name.toLowerCase().includes(query);
                const numMatch = card.number?.toLowerCase().includes(query);
                if (!nameMatch && !numMatch) { rowSlots.push(undefined); continue; }
              }
              if (ownershipFilter === 'owned' && !card.isOwned) { rowSlots.push(undefined); continue; }
              if (ownershipFilter === 'missing' && card.isOwned) { rowSlots.push(undefined); continue; }
              rowSlots.push(card);
              pageHasContent = true;
            } else {
              rowSlots.push(undefined);
              if (!isFiltering) pageHasContent = true;
            }
          }
          rows.push(rowSlots);
        }

        if (pageHasContent) {
          sections.push({
            title: `Page ${page + 1}`,
            pageNumber: page + 1,
            data: rows,
          });
        }
      }
    } else {
      let currentPageNum = 1;
      for (let i = 0; i < filteredCards.length; i += cardsPerPage) {
        const pageData = filteredCards.slice(i, i + cardsPerPage);

        const rows: SlotEntry[][] = [];
        for (let j = 0; j < pageData.length; j += gridColumns) {
          rows.push(pageData.slice(j, j + gridColumns));
        }

        sections.push({
          title: `Page ${currentPageNum}`,
          pageNumber: currentPageNum,
          data: rows,
        });
        currentPageNum++;
      }
    }
    
    return sections;
  }, [filteredCards, showPageBreaks, cardsPerPage, gridColumns, savedPositionMap, totalPages, searchQuery, ownershipFilter]);
  
  // Reset to page 1 when filtered cards change (e.g., search or filter applied)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredCards.length, totalPages, currentPage]);

  // Refs for swipe gesture (needed because PanResponder callbacks are created once)
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const displayModeRef = useRef(displayMode);
  const displaySpreadStartRef = useRef(displaySpreadStart);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);
  useEffect(() => {
    displaySpreadStartRef.current = displaySpreadStart;
  }, [displaySpreadStart]);

  // Swipe gesture handler for binder page navigation
  const SWIPE_THRESHOLD = 50; // Minimum distance to trigger a swipe
  const binderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes (not vertical scrolling)
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        
        if (dx < -SWIPE_THRESHOLD) {
          if (displayModeRef.current) {
            const maxSpreadStart = getMaxSpreadStart(totalPagesRef.current);
            if (displaySpreadStartRef.current < maxSpreadStart) {
              setDisplaySpreadStart((prev) => Math.min(maxSpreadStart, prev + 2));
            }
          } else if (currentPageRef.current < totalPagesRef.current) {
            // Swipe left → go to next page
            setCurrentPage(p => Math.min(totalPagesRef.current, p + 1));
          }
        } else if (dx > SWIPE_THRESHOLD) {
          if (displayModeRef.current) {
            if (displaySpreadStartRef.current > 0) {
              setDisplaySpreadStart((prev) => Math.max(0, prev - 2));
            }
          } else if (currentPageRef.current > 1) {
            // Swipe right → go to previous page
            setCurrentPage(p => Math.max(1, p - 1));
          }
        }
      },
    })
  ).current;

  // Render a single card for FlatList (with long-press enlarge preview)
  const renderCard = useCallback(
    ({ item, index }: { item: CardWithOwnership; index: number }) => (
      <CardItem
        card={item}
        onPress={handleToggleCard}
        onLongPress={handleLongPressCard}
        onLongPressRelease={handleLongPressRelease}
        binderId={binder?.id || ''}
        width={cardWidth}
        variant="grid"
        cardIndex={index}
        cardsPerPage={cardsPerPage}
      />
    ),
    [handleToggleCard, handleLongPressCard, handleLongPressRelease, binder?.id, cardWidth, cardsPerPage]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CardWithOwnership) => item.id, []);

  // Map card ID → true binder index (position in unfiltered cards array)
  const cardBinderIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    cards.forEach((c, i) => map.set(c.id, i));
    return map;
  }, [cards]);

  // Render a single card for list view FlatList
  const renderListCard = useCallback(
    ({ item }: { item: CardWithOwnership }) => (
      <CardItem
        card={item}
        onPress={handleToggleCard}
        onLongPress={handleLongPressCard}
        onLongPressRelease={handleLongPressRelease}
        binderId={binder?.id || ''}
        variant="list"
        listTapBehavior="toggle"
        cardIndex={cardBinderIndexMap.get(item.id) ?? 0}
        cardsPerPage={cardsPerPage}
      />
    ),
    [handleToggleCard, handleLongPressCard, handleLongPressRelease, binder?.id, cardsPerPage, cardBinderIndexMap]
  );

  // Render a card for custom mode list view (toggles ownership by position)
  const renderCustomListCard = useCallback(
    ({ item }: { item: CardWithOwnership }) => (
      <CardItem
        card={item}
        onPress={handleCustomCardToggleByCard}
        onLongPress={handleLongPressCard}
        onLongPressRelease={handleLongPressRelease}
        binderId={binder?.id || ''}
        variant="list"
        listTapBehavior="toggle"
        cardIndex={cardBinderIndexMap.get(item.id) ?? 0}
        cardsPerPage={cardsPerPage}
      />
    ),
    [handleCustomCardToggleByCard, handleLongPressCard, handleLongPressRelease, binder?.id, cardsPerPage, cardBinderIndexMap]
  );

  // === MASTER SET MODE: Combined grid with regular cards, extra cards, and empty slots ===
  
  // Filter extra cards through the same search & ownership filters as regular cards.
  // Also excludes cards that already appear in the main grid to prevent duplicates
  // (can happen when a card is added via edit mode and gets saved as both a
  // positioned card and an extra).
  const filteredExtraCards = useMemo(() => {
    if (!extraCards.length) return [];
    
    const mainCardIds = new Set(cards.map(c => c.id));
    let result = extraCards.filter(c => !mainCardIds.has(c.id));
    
    // Apply search filter (same partial-match logic as useCardSearch)
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter((card) => {
        // Partial name match
        if (card.name.toLowerCase().includes(query)) return true;
        // Number match (exact, normalized)
        const cardNum = card.number ? card.number.replace(/^0+/, '') || '0' : '';
        let searchNum = query.replace(/^#/, '');
        if (searchNum.includes('/')) searchNum = searchNum.split('/')[0];
        searchNum = searchNum.replace(/^0+/, '') || '0';
        if (/^#?\d/.test(query) || query.includes('/')) {
          if (cardNum === searchNum) return true;
        }
        return false;
      });
    }
    
    // Apply ownership filter
    if (ownershipFilter === 'owned') {
      result = result.filter((card) => card.isOwned);
    } else if (ownershipFilter === 'missing') {
      result = result.filter((card) => !card.isOwned);
    }
    
    return result;
  }, [extraCards, searchQuery, ownershipFilter, cards]);
  
  // Create combined data for Master Set mode: regular cards + extra cards
  const masterSetGridItems = useMemo((): MasterSetGridItem[] => {
    if (!binder || binder.collectionMode !== 'master-set') return [];
    
    const items: MasterSetGridItem[] = [];
    
    // Add regular cards (paginated)
    displayedCards.forEach((card) => {
      items.push({ type: 'card', card });
    });
    
    // Add extra cards when ALL regular cards have been loaded
    if (!hasMoreCards) {
      filteredExtraCards.forEach((card) => {
        items.push({ type: 'extra', card });
      });
    }
    
    return items;
  }, [binder, displayedCards, filteredExtraCards, hasMoreCards]);

  // Render function for Master Set grid items (with long-press enlarge preview)
  const renderMasterSetGridItem = useCallback(
    ({ item, index }: { item: MasterSetGridItem; index: number }) => {
      if (item.type === 'card') {
        // Regular set card
        return (
          <CardItem
            card={item.card}
            onPress={handleToggleCard}
            onLongPress={handleLongPressCard}
            onLongPressRelease={handleLongPressRelease}
            binderId={binder?.id || ''}
            width={cardWidth}
            variant="grid"
            cardIndex={index}
            cardsPerPage={cardsPerPage}
          />
        );
      }
      
      if (item.type === 'extra') {
        // Extra card (added by user, displayed the same as regular cards)
        // For extra cards, the index continues from regular cards
        return (
          <CardItem
            card={item.card}
            onPress={handleToggleExtraCardOwnership}
            onLongPress={handleLongPressCard}
            onLongPressRelease={handleLongPressRelease}
            binderId={binder?.id || ''}
            width={cardWidth}
            variant="grid"
            collectionMode="master-set"
            isExtraCard={true}
            cardIndex={index}
            cardsPerPage={cardsPerPage}
          />
        );
      }
      
      return null;
    },
    [binder?.id, cardWidth, cardsPerPage, handleToggleCard, handleToggleExtraCardOwnership, handleLongPressCard, handleLongPressRelease]
  );

  // Key extractor for Master Set grid items
  const masterSetKeyExtractor = useCallback((item: MasterSetGridItem) => {
    if (item.type === 'card') return `card-${item.card.id}`;
    return `extra-${item.card.id}`;
  }, []);

  // === CUSTOM MODE: Positional grid with slots ===
  const isCustomMode = binder?.collectionMode === 'custom';
  
  // Calculate max slots based on layout preference
  const customMaxSlots = gridColumns === 4 ? CUSTOM_MAX_SLOTS_4X3 : CUSTOM_MAX_SLOTS_3X3;
  
  // Generate array of slot positions for Custom mode (paginated)
  const customSlots = useMemo(() => {
    if (!binder || binder.collectionMode !== 'custom') return [];
    // Return array of position numbers [0, 1, 2, ..., displayCount-1]
    return Array.from({ length: Math.min(displayCount, customMaxSlots) }, (_, i) => i);
  }, [binder, displayCount, customMaxSlots]);

  // Filtered custom slots: when search or ownership filter is active, only show matching slots
  const filteredCustomSlots = useMemo(() => {
    if (!binder || binder.collectionMode !== 'custom') return [];
    
    const hasSearch = searchQuery.trim().length > 0;
    const hasOwnershipFilter = ownershipFilter !== 'all';
    
    // No filters active - show all slots (including empty ones)
    if (!hasSearch && !hasOwnershipFilter) {
      return customSlots;
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    return customSlots.filter((position) => {
      const card = positionCards.get(position);
      
      // Empty slots: hide when searching or filtering
      if (!card) return false;
      
      // Apply search filter
      if (hasSearch) {
        const nameMatch = card.name.toLowerCase().includes(query);
        const numberMatch = card.number.toLowerCase().includes(query);
        if (!nameMatch && !numberMatch) return false;
      }
      
      // Apply ownership filter
      if (ownershipFilter === 'owned' && !card.isOwned) return false;
      if (ownershipFilter === 'missing' && card.isOwned) return false;
      
      return true;
    });
  }, [binder, customSlots, positionCards, searchQuery, ownershipFilter]);

  // Custom mode cards for list/binder views: flat array of filled slots sorted by position
  const customCardsForView = useMemo(() => {
    if (!isCustomMode) return [];
    const query = searchQuery.toLowerCase().trim();
    const entries = Array.from(positionCards.entries()).sort(([a], [b]) => a - b);
    const result: CardWithOwnership[] = [];
    for (const [, card] of entries) {
      if (ownershipFilter === 'owned' && !card.isOwned) continue;
      if (ownershipFilter === 'missing' && card.isOwned) continue;
      if (query) {
        const nameMatch = card.name.toLowerCase().includes(query);
        const numMatch = card.number?.toLowerCase().includes(query);
        if (!nameMatch && !numMatch) continue;
      }
      result.push(card);
    }
    return result;
  }, [isCustomMode, positionCards, searchQuery, ownershipFilter]);

  // Custom mode binder view: sparse array preserving slot positions
  const customBinderViewCards = useMemo(() => {
    if (!isCustomMode) return [];
    const totalSlots = Math.max(customMaxSlots, cardsPerPage);
    const result: (CardWithOwnership | undefined)[] = new Array(totalSlots);
    const query = searchQuery.toLowerCase().trim();

    positionCards.forEach((card, pos) => {
      if (pos >= totalSlots) return;
      if (ownershipFilter === 'owned' && !card.isOwned) return;
      if (ownershipFilter === 'missing' && card.isOwned) return;
      if (query) {
        const nameMatch = card.name.toLowerCase().includes(query);
        const numMatch = card.number?.toLowerCase().includes(query);
        if (!nameMatch && !numMatch) return;
      }
      result[pos] = card;
    });
    return result as CardWithOwnership[];
  }, [isCustomMode, positionCards, customMaxSlots, cardsPerPage, searchQuery, ownershipFilter]);

  const customTotalPages = useMemo(() => {
    if (!isCustomMode) return 1;
    return Math.max(1, Math.ceil(customMaxSlots / cardsPerPage));
  }, [isCustomMode, customMaxSlots, cardsPerPage]);

  const totalPagesForDisplay = isCustomMode ? customTotalPages : totalPages;

  useEffect(() => {
    totalPagesRef.current = totalPagesForDisplay;
  }, [totalPagesForDisplay]);

  useEffect(() => {
    if (!displayMode) return;
    const maxSpreadStart = getMaxSpreadStart(totalPagesForDisplay);
    if (displaySpreadStart > maxSpreadStart) {
      setDisplaySpreadStart(maxSpreadStart);
    }
  }, [displayMode, displaySpreadStart, totalPagesForDisplay]);

  // Only allow loading more when no filter is active (filtered mode shows all matching at once)
  const isCustomFiltering = isCustomMode && (searchQuery.trim().length > 0 || ownershipFilter !== 'all');
  const hasMoreCustomSlots = !isCustomFiltering && displayCount < customMaxSlots;

  // Load more slots for Custom mode
  const loadMoreCustomSlots = useCallback(() => {
    if (isLoadingMore || !hasMoreCustomSlots) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, customMaxSlots));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasMoreCustomSlots, customMaxSlots]);

  // Render a slot (either card or empty slot) for Custom mode
  const renderCustomSlot = useCallback(
    ({ item: position }: { item: number }) => {
      const card = positionCards.get(position);
      
      if (card) {
        // Slot has a card - render it with toggle ownership handler
        // Pass position and collectionMode so CardDetail can toggle ownership correctly
        // For Custom mode, position IS the cardIndex
        return (
          <CardItem
            card={card}
            onPress={() => handleToggleCustomCardOwnership(position)}
            binderId={binder?.id || ''}
            width={cardWidth}
            variant="grid"
            position={position}
            collectionMode="custom"
            cardIndex={position}
            cardsPerPage={cardsPerPage}
          />
        );
      }
      
      // Empty slot - render empty placeholder (cards are added via edit mode)
      return (
        <EmptyCardSlot
          position={position}
          width={cardWidth}
        />
      );
    },
    [positionCards, handleToggleCustomCardOwnership, binder?.id, cardWidth, cardsPerPage]
  );

  // Key extractor for Custom mode slots
  const customSlotKeyExtractor = useCallback((position: number) => `slot-${position}`, []);

  // === POSITION-BASED SLOTS for Master Set / Region (when savedPositionMap exists) ===
  const hasSavedPositions = !isCustomMode && !!savedPositionMap && savedPositionMap.size > 0;
  const savedTotalSlots = totalPages * cardsPerPage;

  const savedPositionSlots = useMemo(() => {
    if (!hasSavedPositions) return [];
    return Array.from({ length: savedTotalSlots }, (_, i) => i);
  }, [hasSavedPositions, savedTotalSlots]);

  const filteredSavedSlots = useMemo(() => {
    if (!hasSavedPositions || !savedPositionMap) return [];

    const hasSearch = searchQuery.trim().length > 0;
    const hasOwnershipFilter = ownershipFilter !== 'all';

    if (!hasSearch && !hasOwnershipFilter) return savedPositionSlots;

    const query = searchQuery.toLowerCase().trim();

    return savedPositionSlots.filter((position) => {
      const card = savedPositionMap.get(position);
      if (!card) return false;

      if (hasSearch) {
        const nameMatch = card.name.toLowerCase().includes(query);
        const numberMatch = card.number.toLowerCase().includes(query);
        if (!nameMatch && !numberMatch) return false;
      }

      if (ownershipFilter === 'owned' && !card.isOwned) return false;
      if (ownershipFilter === 'missing' && card.isOwned) return false;

      return true;
    });
  }, [hasSavedPositions, savedPositionMap, savedPositionSlots, searchQuery, ownershipFilter]);

  const isSavedFiltering = hasSavedPositions && (searchQuery.trim().length > 0 || ownershipFilter !== 'all');

  const savedSlotKeyExtractor = useCallback((position: number) => `saved-slot-${position}`, []);

  // Render a position-based slot for Master Set / Region when savedPositionMap exists
  const renderSavedPositionSlot = useCallback(
    ({ item: position }: { item: number }) => {
      if (!savedPositionMap) return null;
      const card = savedPositionMap.get(position);

      if (!card) {
        return (
          <EmptyCardSlot
            position={position}
            width={cardWidth}
          />
        );
      }

      if (binder?.collectionMode === 'region') {
        const variantBadge = card.variant && card.variant !== 'base'
          ? { 'reverse-holo': { label: 'RH', color: '#FFD700' }, 'poke-ball': { label: 'PB', color: '#FF6B6B' }, 'master-ball': { label: 'MB', color: '#7B2D8E' } }[card.variant] || null
          : null;

        return (
          <TouchableOpacity
            style={[styles.regionCardItem, { width: cardWidth }]}
            onPress={() => handleRegionCardTap(card, position)}
            onLongPress={() => handleLongPressCard(card)}
            onResponderRelease={handleLongPressRelease}
            onResponderTerminate={handleLongPressRelease}
            delayLongPress={300}
            activeOpacity={0.7}
          >
            <View style={styles.regionCardImageContainer}>
              <CardImage
                source={card.imageUrl}
                isMissing={!card.isOwned}
                aspectRatio={0.716}
                style={styles.regionCardImageWrapper}
                cardInfo={{ id: card.id, name: card.name, number: card.number, set: card.set }}
              />
              <TouchableOpacity
                style={[styles.checkboxOverlay, card.isOwned ? styles.checkboxOverlayOwned : styles.checkboxOverlayMissing]}
                onPress={() => handleToggleCard(card)}
                activeOpacity={0.7}
              >
                <RNImage source={card.isOwned ? LOGO_OWNED : LOGO_UNOWNED} style={styles.checkboxLogo} resizeMode="contain" />
              </TouchableOpacity>
              {variantBadge && (
                <View style={[styles.regionVariantBadge, { backgroundColor: variantBadge.color }]}>
                  <Text style={styles.regionVariantBadgeText}>{variantBadge.label}</Text>
                </View>
              )}
            </View>
            <CardDetails
              card={card}
              variant="compact"
              showSet={false}
              showRarity={false}
              showIllustrator={false}
              showVariantBadge={false}
            />
          </TouchableOpacity>
        );
      }

      // Master Set (and fallback)
      return (
        <CardItem
          card={card}
          onPress={handleToggleCard}
          onLongPress={handleLongPressCard}
          onLongPressRelease={handleLongPressRelease}
          binderId={binder?.id || ''}
          width={cardWidth}
          variant="grid"
          cardIndex={position}
          cardsPerPage={cardsPerPage}
        />
      );
    },
    [savedPositionMap, binder?.id, binder?.collectionMode, cardWidth, cardsPerPage, handleToggleCard, handleRegionCardTap, handleLongPressCard, handleLongPressRelease]
  );

  // === REGION MODE: Custom render function for Pokemon cards ===
  
  // Render a Region Pokemon card - tap navigates to card detail, long-press enlarges
  const renderRegionCard = useCallback(
    ({ item, index }: { item: CardWithOwnership; index: number }) => {
      const variantBadge = item.variant && item.variant !== 'base'
        ? { 'reverse-holo': { label: 'RH', color: '#FFD700' }, 'poke-ball': { label: 'PB', color: '#FF6B6B' }, 'master-ball': { label: 'MB', color: '#7B2D8E' } }[item.variant] || null
        : null;

      return (
        <TouchableOpacity
          style={[styles.regionCardItem, { width: cardWidth }]}
          onPress={() => handleRegionCardTap(item, index)}
          onLongPress={() => handleLongPressCard(item)}
          onResponderRelease={handleLongPressRelease}
          onResponderTerminate={handleLongPressRelease}
          delayLongPress={300}
          activeOpacity={0.7}
        >
          <View style={styles.regionCardImageContainer}>
            <CardImage
              source={item.imageUrl}
              isMissing={!item.isOwned}
              aspectRatio={0.716}
              style={styles.regionCardImageWrapper}
              cardInfo={{ id: item.id, name: item.name, number: item.number, set: item.set }}
            />
            {/* Checkbox for ownership toggle */}
            <TouchableOpacity
              style={[styles.checkboxOverlay, item.isOwned ? styles.checkboxOverlayOwned : styles.checkboxOverlayMissing]}
              onPress={() => handleToggleCard(item)}
              activeOpacity={0.7}
            >
              <RNImage source={item.isOwned ? LOGO_OWNED : LOGO_UNOWNED} style={styles.checkboxLogo} resizeMode="contain" />
            </TouchableOpacity>
            {variantBadge && (
              <View style={[styles.regionVariantBadge, { backgroundColor: variantBadge.color }]}>
                <Text style={styles.regionVariantBadgeText}>{variantBadge.label}</Text>
              </View>
            )}
          </View>
          <CardDetails
            card={item}
            variant="compact"
            showSet={false}
            showRarity={false}
            showIllustrator={false}
            showVariantBadge={false}
          />
        </TouchableOpacity>
      );
    },
    [cardWidth, colors, handleRegionCardTap, handleToggleCard, handleLongPressCard, handleLongPressRelease]
  );

  // Step 34A: Enlarged card overlay component (for long-press preview)
  const EnlargedCardOverlay = () => {
    if (!enlargedCard) return null;
    const isDisplayPreview = displayMode;
    const cardsPerPageForPosition = binder?.layoutPreference === '4x3' ? 12 : 9;
    const binderPage = enlargedCardSlotIndex !== null
      ? Math.floor(enlargedCardSlotIndex / cardsPerPageForPosition) + 1
      : null;
    const binderSlot = enlargedCardSlotIndex !== null
      ? (enlargedCardSlotIndex % cardsPerPageForPosition) + 1
      : null;
    const isRegion = binder?.collectionMode === 'region';
    const hasSelectedCard = !!enlargedCard.selectedCardId;

    // For Region cards: show TCG card name when selected, otherwise Pokémon name
    const displayName = (isRegion && hasSelectedCard && enlargedCard.selectedCardName)
      ? enlargedCard.selectedCardName
      : enlargedCard.name;

    // For Region cards: show TCG card number/setTotal when selected, otherwise Pokédex ID
    let cardNumberText: string;
    if (isRegion && hasSelectedCard) {
      const num = enlargedCard.selectedCardNumber || enlargedCard.number;
      cardNumberText = num.includes('/')
        ? num
        : enlargedCard.setTotal
          ? `${num}/${enlargedCard.setTotal}`
          : num;
    } else if (isRegion && !hasSelectedCard) {
      const dexNum = enlargedCard.pokedexNumber;
      cardNumberText = dexNum ? `#${String(dexNum).padStart(3, '0')}` : enlargedCard.number;
    } else {
      cardNumberText = enlargedCard.number.includes('/')
        ? enlargedCard.number
        : enlargedCard.setTotal
          ? `${enlargedCard.number}/${enlargedCard.setTotal}`
          : enlargedCard.number;
    }

    const displaySetName = enlargedCard.selectedCardSet || enlargedCard.set || '';
    const infoPanelWidth = Math.min(220, screenWidth * 0.28);
    const previewMaxWidth = isDisplayPreview
      ? Math.min(screenWidth - (screenPadding * 2) - infoPanelWidth - spacing.lg, 640)
      : Math.min(screenWidth - (screenPadding * 2), 640);
    const previewMaxHeight = isDisplayPreview
      ? Math.min(screenHeight * 0.86, screenHeight - 120)
      : Math.min(screenHeight * 0.78, screenHeight - 220);
    const previewCardWidth = Math.min(previewMaxWidth, previewMaxHeight * 0.716);
    const previewCardHeight = previewCardWidth / 0.716;
    
    return (
      <Modal
        visible={!!enlargedCard}
        transparent={true}
        animationType="fade"
        onRequestClose={handleLongPressRelease}
      >
        <Pressable 
          style={styles.enlargeOverlay}
          onPress={handleLongPressRelease}
        >
          <View
            style={[
              styles.enlargedCardContainer,
              isDisplayPreview ? styles.enlargedCardContainerRow : styles.enlargedCardContainerColumn,
            ]}
          >
            <Image
              source={{ uri: enlargedCard.imageUrlHiRes || enlargedCard.imageUrl }}
              style={[styles.enlargedCard, { width: previewCardWidth, height: previewCardHeight }]}
              contentFit="contain"
            />
            <View
              style={[
                styles.enlargedInfoPanel,
                isDisplayPreview ? styles.enlargedInfoPanelSide : styles.enlargedInfoPanelBelow,
                isDisplayPreview ? { width: infoPanelWidth } : { maxWidth: Math.min(460, screenWidth - (screenPadding * 2)) },
              ]}
            >
              <Text style={[styles.enlargedCardNumber, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                {cardNumberText}
              </Text>
              <Text style={[styles.enlargedCardName, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                {displayName}
              </Text>
              {displaySetName ? (
                <View style={[styles.enlargedSetRow, isDisplayPreview ? styles.enlargedSetRowLeft : styles.enlargedSetRowCenter]}>
                  {getSetSymbolByName(displaySetName) && (
                    <Image
                      source={{ uri: getSetSymbolByName(displaySetName)! }}
                      style={styles.enlargedSetIcon}
                      contentFit="contain"
                    />
                  )}
                  <Text style={[styles.enlargedSetName, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                    {displaySetName}
                  </Text>
                </View>
              ) : null}
              {binderPage !== null && binderSlot !== null && (
                <Text style={[styles.enlargedCardPosition, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                  Page {binderPage}, Slot {binderSlot}
                </Text>
              )}
              {enlargedCardNote && (
                <View style={[styles.enlargedNoteBlock, isDisplayPreview ? styles.enlargedNoteBlockLeft : styles.enlargedNoteBlockCenter]}>
                  <Text style={[styles.enlargedNoteLabel, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                    Note
                  </Text>
                  <Text style={[styles.enlargedNoteText, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                    {enlargedCardNote}
                  </Text>
                </View>
              )}
              <Text style={[styles.enlargedHint, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                Tap anywhere to close
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  };

  // Progress counts:
  // - Custom binders use visible slot data as source of truth (prevents stale DB count drift)
  // - Other modes continue using binder cache (with cards fallback)
  const customOwnedCount = Array.from(positionCards.values()).filter(c => c.isOwned).length;
  const customTotalCount = positionCards.size;
  const ownedCount = isCustomMode
    ? customOwnedCount
    : (binder?.ownedCards ?? cards.filter(c => c.isOwned).length);
  const totalCount = isCustomMode
    ? customTotalCount
    : (binder?.totalCards ?? cards.length);
  const progressPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const reachedMilestones = MILESTONES.filter((milestone) => progressPercentage >= milestone);

  useEffect(() => {
    let isMounted = true;

    const loadMilestones = async () => {
      if (!milestoneStorageKey || !binder) return;

      try {
        const raw = await AsyncStorage.getItem(milestoneStorageKey);
        const saved: number[] = raw ? JSON.parse(raw) : [];

        if (!isMounted) return;
        unlockedMilestonesRef.current = new Set(saved);
      } catch {
        if (!isMounted) return;
        unlockedMilestonesRef.current = new Set();
      }

      previousProgressRef.current = progressPercentage;
      milestonesReadyRef.current = true;
    };

    milestonesReadyRef.current = false;
    unlockedMilestonesRef.current = new Set();
    previousProgressRef.current = 0;

    loadMilestones();

    return () => {
      isMounted = false;
    };
  }, [milestoneStorageKey, binder?.id]);

  useEffect(() => {
    if (!binder || !milestoneStorageKey || !milestonesReadyRef.current) return;

    const previous = previousProgressRef.current;
    const crossed = MILESTONES.filter((milestone) => (
      previous < milestone
      && progressPercentage >= milestone
      && !unlockedMilestonesRef.current.has(milestone)
    ));

    if (crossed.length === 0) {
      previousProgressRef.current = progressPercentage;
      return;
    }

    crossed.forEach((milestone) => {
      unlockedMilestonesRef.current.add(milestone);
      if (milestone === 100) {
        showSuccess('Binder complete! 100% collected');
        lightTap();
      } else {
        showSuccess(`Milestone reached: ${milestone}%`);
      }
    });

    AsyncStorage.setItem(
      milestoneStorageKey,
      JSON.stringify(Array.from(unlockedMilestonesRef.current))
    ).catch(() => {});

    previousProgressRef.current = progressPercentage;
  }, [progressPercentage, milestoneStorageKey, binder]);

  // Stats data: collect cards with rarity, set + ownership for the breakdown sections
  // Must be above early returns to preserve hook call order
  const statsCardsData = useMemo(() => {
    if (!binder) return [];
    if (isCustomMode) {
      return Array.from(positionCards.values()).map(c => ({
        rarity: c.rarity || '',
        set: c.set || '',
        variant: c.variant || 'base',
        isOwned: c.isOwned,
      }));
    }
    if (binder.collectionMode === 'region') {
      return cards.map(c => ({
        rarity: (c as any).selectedCardRarity || c.rarity || '',
        set: (c as any).selectedCardSet || 'No card selected',
        variant: (c as any).selectedCardId ? (c.variant || 'base') : '',
        isOwned: c.isOwned,
      }));
    }
    const mainCards = cards.map(c => ({ rarity: c.rarity || '', set: c.set || '', variant: c.variant || 'base', isOwned: c.isOwned }));
    const extras = extraCards.map(c => ({ rarity: c.rarity || '', set: 'Custom', variant: c.variant || 'base', isOwned: c.isOwned }));
    return [...mainCards, ...extras];
  }, [cards, extraCards, positionCards, isCustomMode, binder]);

  const availableRarities = useMemo(() => {
    const seen = new Set<string>();
    for (const c of statsCardsData) {
      if (c.rarity) seen.add(c.rarity.toLowerCase());
    }
    const orderIndex = (r: string) => {
      const idx = RARITY_ORDER.indexOf(r);
      return idx >= 0 ? idx : RARITY_ORDER.length;
    };
    return [...seen].sort((a, b) => orderIndex(a) - orderIndex(b)).map(r => ({
      value: r,
      label: RARITY_LABELS[r] || r.charAt(0).toUpperCase() + r.slice(1),
    }));
  }, [statsCardsData]);

  const availableSets = useMemo(() => {
    const seen = new Set<string>();
    for (const c of statsCardsData) {
      const set = (c.set || '').startsWith('Custom|') ? 'Custom Cards' : (c.set || '');
      if (set) seen.add(set);
    }
    return [...seen].sort().map(s => ({ value: s, label: s }));
  }, [statsCardsData]);

  const availableVariants = useMemo(() => {
    const seen = new Set<string>();
    for (const c of statsCardsData) {
      if (!c.variant) continue;
      let v = c.variant;
      if (v === 'base' && c.rarity && !STATS_REGULAR_RARITIES.has(c.rarity.toLowerCase())) {
        v = 'secret-rare';
      }
      seen.add(v);
    }
    const orderIndex = (v: string) => {
      const idx = VARIANT_ORDER.indexOf(v);
      return idx >= 0 ? idx : VARIANT_ORDER.length;
    };
    return [...seen].sort((a, b) => orderIndex(a) - orderIndex(b)).map(v => ({
      value: v,
      label: VARIANT_LABELS[v] || v.charAt(0).toUpperCase() + v.slice(1),
    }));
  }, [statsCardsData, STATS_REGULAR_RARITIES]);

  if (loading && !binder) {
    return <LoadingScreen message="Loading binder..." />;
  }

  if (error && !binder) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          setRetryKey(k => k + 1);
        }}
      />
    );
  }

  if (!binder) {
    return (
      <ErrorScreen
        message="Binder not found"
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  // Format collection mode for display
  const collectionModeText = 
    binder.collectionMode === 'master-set' ? 'Master Set' :
    binder.collectionMode === 'region' ? 'Region' :
    'Custom';

  const collectionModeIcon: keyof typeof Ionicons.glyphMap = 
    binder.collectionMode === 'master-set' ? 'book-outline' :
    binder.collectionMode === 'region' ? 'map-outline' :
    'grid-outline';

  const isMasterSetMode = binder.collectionMode === 'master-set';

  // IMPORTANT: listHeader must be a JSX element (not an arrow function component)
  // so that FlatList updates it in place instead of unmounting/remounting,
  // which would cause the SearchBar's TextInput to lose focus and dismiss the keyboard.
  const subtitleParts = [collectionModeText];
  if (binder.set) subtitleParts.push(binder.set);
  if (binder.region) subtitleParts.push(binder.region);

  const setSymbolUrl = binder.set ? getSetSymbolByName(binder.set) : null;
  const setLogoUrl = binder.set ? getSetLogoByName(binder.set) : null;

  const listHeader = (
    <View style={styles.headerContainer}>
      {/* Row 1: Back arrow + binder name + progress ring */}
      <View style={styles.titleRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{binder.name}</Text>
        {setLogoUrl && (
          <Image
            source={{ uri: setLogoUrl }}
            style={styles.titleSetLogo}
            contentFit="contain"
          />
        )}
      </View>

      {/* Row 2: Subtitle with set icon — collapses on scroll */}
      <Animated.View style={{ opacity: headerOpacity, height: headerHeight, overflow: 'hidden' }}>
        <View style={styles.subtitleRow}>
          <Ionicons name={collectionModeIcon} size={14} color={colors.textTertiary} style={styles.subtitleModeIcon} />
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitleParts.join(' · ')}
          </Text>
          {setSymbolUrl && (
            <Image
              source={{ uri: setSymbolUrl }}
              style={styles.subtitleSetIcon}
              contentFit="contain"
            />
          )}
        </View>
      </Animated.View>


      {/* Row 3: Toolbar — Search | Edit | Settings | Display Mode */}
      <View style={styles.toolbar}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={handleSearchFocus}
          placeholder="Search..."
          compact
        />

        <TouchableOpacity
          style={styles.toolbarIconButton}
          onPress={() => navigation.navigate('BinderEdit', { binderId: binder.id })}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarIconButton}
          onPress={() => navigation.navigate('BinderSettings', { binderId: binder.id })}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarIconButton}
          onPress={() => {
            clearSearch();
            setViewMode('binder');
            setDisplaySpreadStart(0);
            setDisplayViewport({ width: 0, height: 0 });
            setDisplayMode(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

      </View>

      {/* Options panel — always visible, same layout as the old dropdown */}
      <View style={styles.optionsPanel}>
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>View</Text>
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              setViewMode(mode);
              setViewBeforeSearch(null);
              if (mode === 'binder') {
                clearSearch();
                setOwnershipFilter('all');
                setStatsFilter(null);
                setExpandedFilter(null);
              }
            }}
          />
        </View>

        {viewMode !== 'binder' && (
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>Show</Text>
            <View style={styles.filterButtons}>
              {(['all', 'owned', 'missing'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, ownershipFilter === filter && styles.filterChipActive]}
                  onPress={() => setOwnershipFilter(filter)}
                >
                  <Text style={[styles.filterChipText, ownershipFilter === filter && styles.filterChipTextActive]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {viewMode !== 'binder' && availableRarities.length > 1 && (
          <View>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setExpandedFilter(expandedFilter === 'rarity' ? null : 'rarity')}
            >
              <Text style={styles.optionLabel}>
                Rarity
                {statsFilter?.type === 'rarity' && (
                  <Text style={styles.filterSelectionHint}>{'  '}{statsFilter.label}</Text>
                )}
              </Text>
              <Ionicons
                name={expandedFilter === 'rarity' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedFilter === 'rarity' && (
              <View style={styles.accordionContent}>
                <TouchableOpacity
                  style={[styles.accordionItem, (!statsFilter || statsFilter.type !== 'rarity') && styles.accordionItemActive]}
                  onPress={() => { setStatsFilter(null); setExpandedFilter(null); }}
                >
                  <Text style={[styles.accordionItemText, (!statsFilter || statsFilter.type !== 'rarity') && styles.accordionItemTextActive]}>All</Text>
                  {(!statsFilter || statsFilter.type !== 'rarity') && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
                {availableRarities.map((r) => {
                  const isActive = statsFilter?.type === 'rarity' && statsFilter.value === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.accordionItem, isActive && styles.accordionItemActive]}
                      onPress={() => { setStatsFilter({ type: 'rarity', value: r.value, label: r.label }); setExpandedFilter(null); }}
                    >
                      <Text style={[styles.accordionItemText, isActive && styles.accordionItemTextActive]}>{r.label}</Text>
                      {isActive && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {viewMode !== 'binder' && availableSets.length > 1 && (
          <View>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setExpandedFilter(expandedFilter === 'set' ? null : 'set')}
            >
              <Text style={[styles.optionLabel, { flex: 1 }]} numberOfLines={1}>
                Set
                {statsFilter?.type === 'set' && (
                  <Text style={styles.filterSelectionHint}>{'  '}{statsFilter.label}</Text>
                )}
              </Text>
              <Ionicons
                name={expandedFilter === 'set' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedFilter === 'set' && (
              <View style={styles.accordionContent}>
                <TouchableOpacity
                  style={[styles.accordionItem, (!statsFilter || statsFilter.type !== 'set') && styles.accordionItemActive]}
                  onPress={() => { setStatsFilter(null); setExpandedFilter(null); }}
                >
                  <Text style={[styles.accordionItemText, (!statsFilter || statsFilter.type !== 'set') && styles.accordionItemTextActive]}>All</Text>
                  {(!statsFilter || statsFilter.type !== 'set') && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
                {availableSets.map((s) => {
                  const isActive = statsFilter?.type === 'set' && statsFilter.value === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.accordionItem, isActive && styles.accordionItemActive]}
                      onPress={() => { setStatsFilter({ type: 'set', value: s.value, label: s.label }); setExpandedFilter(null); }}
                    >
                      <Text style={[styles.accordionItemText, isActive && styles.accordionItemTextActive]} numberOfLines={1}>{s.label}</Text>
                      {isActive && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {viewMode !== 'binder' && availableVariants.length > 1 && (
          <View>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setExpandedFilter(expandedFilter === 'variant' ? null : 'variant')}
            >
              <Text style={styles.optionLabel}>
                Variant
                {statsFilter?.type === 'variant' && (
                  <Text style={styles.filterSelectionHint}>{'  '}{statsFilter.label}</Text>
                )}
              </Text>
              <Ionicons
                name={expandedFilter === 'variant' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedFilter === 'variant' && (
              <View style={styles.accordionContent}>
                <TouchableOpacity
                  style={[styles.accordionItem, (!statsFilter || statsFilter.type !== 'variant') && styles.accordionItemActive]}
                  onPress={() => { setStatsFilter(null); setExpandedFilter(null); }}
                >
                  <Text style={[styles.accordionItemText, (!statsFilter || statsFilter.type !== 'variant') && styles.accordionItemTextActive]}>All</Text>
                  {(!statsFilter || statsFilter.type !== 'variant') && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
                {availableVariants.map((v) => {
                  const isActive = statsFilter?.type === 'variant' && statsFilter.value === v.value;
                  return (
                    <TouchableOpacity
                      key={v.value}
                      style={[styles.accordionItem, isActive && styles.accordionItemActive]}
                      onPress={() => { setStatsFilter({ type: 'variant', value: v.value, label: v.label }); setExpandedFilter(null); }}
                    >
                      <Text style={[styles.accordionItemText, isActive && styles.accordionItemTextActive]}>{v.label}</Text>
                      {isActive && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </View>

      {statsFilter && viewMode !== 'binder' && (
        <View style={styles.statsFilterBanner}>
          <View style={styles.statsFilterChip}>
            <Text style={styles.statsFilterLabel} numberOfLines={1}>
              {statsFilter.label}
            </Text>
            <TouchableOpacity
              onPress={() => setStatsFilter(null)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const missingCount = Math.max(0, totalCount - ownedCount);

  // Sticky progress footer (rendered outside scrollable content)
  const stickyProgressFooter = (
    <TouchableOpacity
      style={styles.stickyFooter}
      activeOpacity={0.7}
      onPress={() => setShowStats(true)}
    >
      <View style={styles.stickyFooterContent}>
        <View style={styles.stickyFooterStats}>
          <Text style={styles.stickyFooterOwned}>{ownedCount} owned</Text>
          <Text style={styles.stickyFooterDot}>·</Text>
          <Text style={styles.stickyFooterMissing}>{missingCount} missing</Text>
          <Text style={styles.stickyFooterDot}>·</Text>
          <Text style={styles.stickyFooterTotal}>{totalCount} total</Text>
          <Text style={styles.stickyFooterDot}>·</Text>
          <Text style={styles.stickyFooterPercent}>{progressPercentage}%</Text>
          <View style={styles.statsIconBadge}>
            <Text style={styles.statsIconLabel}>Details</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </View>
        </View>
        <View style={styles.stickyFooterBar}>
          <View style={[styles.stickyFooterBarFill, { width: `${progressPercentage}%`, backgroundColor: progressPercentage === 100 ? colors.success : colors.primary }]} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const statsBottomSheet = (
    <StatsBottomSheet
      visible={showStats}
      onClose={() => setShowStats(false)}
      ownedCount={ownedCount}
      totalCount={totalCount}
      missingCount={missingCount}
      progressPercentage={progressPercentage}
      cards={statsCardsData}
      onDrillDown={(filter) => {
        setStatsFilter(filter);
        setViewMode('grid');
      }}
      customSlotInfo={isCustomMode ? { filled: positionCards.size, max: customMaxSlots } : undefined}
    />
  );

  // Footer component (loading indicator for pagination)
  const ListFooterComponent = () => {
    if (loading) {
      return <SkeletonCardGrid columns={gridColumns} rows={4} />;
    }

    // Custom mode footer
    if (isCustomMode) {
      // When filtering, show count of matching cards
      if (isCustomFiltering && filteredCustomSlots.length > 0) {
        return (
          <View style={styles.footerComplete}>
            <Text style={styles.footerCompleteText}>
              {filteredCustomSlots.length} card{filteredCustomSlots.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        );
      }
      
      if (!hasMoreCustomSlots && customSlots.length > 0 && !isCustomFiltering) {
        return (
          <View style={styles.footerComplete}>
            <Text style={styles.footerCompleteText}>
              All {customMaxSlots} slots loaded
            </Text>
          </View>
        );
      }

      if (isLoadingMore) {
        return (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.footerText}>Loading more slots...</Text>
          </View>
        );
      }

      return null;
    }

    // Non-Custom mode footer
    if (!hasMoreCards && displayedCards.length > 0) {
      return (
        <View style={styles.footerComplete}>
          <Text style={styles.footerCompleteText}>
            {isMasterSetMode 
              ? `All ${filteredCards.length + filteredExtraCards.length} cards loaded`
              : `All ${filteredCards.length} cards loaded`
            }
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Loading more cards...</Text>
        </View>
      );
    }

    return null;
  };

  // Empty state component (not used for Custom mode since it always shows slots)
  const ListEmptyComponent = () => {
    if (loading) return null;
    
    // Custom mode always has slots, so this shouldn't show
    if (isCustomMode) return null;
    
    return (
      <EmptyState
        title={searchQuery.trim() ? 'No cards match your search' : 'No cards found'}
        message={
          searchQuery.trim()
            ? 'Try adjusting your search or filters'
            : 'This binder doesn\'t have any cards yet'
        }
      />
    );
  };

  // List view - uses FlatList for virtualization (much faster than ScrollView + map)
  if (viewMode === 'list') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={isCustomMode ? customCardsForView : filteredCards}
          renderItem={isCustomMode ? renderCustomListCard : renderListCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.flatListContainer}
          ListHeaderComponent={listHeader}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          removeClippedSubviews={false}
          maxToRenderPerBatch={20}
          windowSize={11}
          initialNumToRender={15}
          extraData={isCustomMode ? [positionCards, searchQuery, ownershipFilter] : cards}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
          }
        />
        {!displayMode && stickyProgressFooter}
        <EnlargedCardOverlay />
        {statsBottomSheet}
      </SafeAreaView>
    );
  }

  // Binder view mode - shows cards page by page like a physical binder
  if (viewMode === 'binder') {
    const binderCards = isCustomMode ? customBinderViewCards : binderViewCards;
    const binderTotalPages = isCustomMode ? customTotalPages : totalPages;
    const binderOnCardPress = isCustomMode ? handleCustomCardToggleByCard : handleToggleCard;
    const binderHasCards = isCustomMode ? positionCards.size > 0 : (filteredCards.length > 0 || !!savedPositionMap);
    const maxDisplaySpreadStart = getMaxSpreadStart(binderTotalPages);
    const clampedSpreadStart = Math.min(displaySpreadStart, maxDisplaySpreadStart);
    const leftSpreadPage = clampedSpreadStart === 0 ? null : clampedSpreadStart;
    const rightSpreadPage = clampedSpreadStart === 0
      ? 1
      : (clampedSpreadStart + 1 <= binderTotalPages ? clampedSpreadStart + 1 : null);
    // Use one consistent middle gutter for both 3x3 and 4x3 layouts.
    const spreadGap = spacing.xs;
    const spreadDividerWidth = 2;
    const fallbackViewportWidth = Math.max(260, screenWidth - (screenPadding * 2));
    const fallbackViewportHeight = Math.max(240, screenHeight - 220);
    const viewportWidth = displayViewport.width || fallbackViewportWidth;
    const viewportHeight = displayViewport.height || fallbackViewportHeight;
    const spreadPaneWidth = Math.max(120, (viewportWidth - spreadGap - spreadDividerWidth) / 2);
    const rows = 3;
    const displayCardWidthByWidth = Math.max(
      20,
      ((spreadPaneWidth - (spacing.sm * 2)) / gridColumns) - (spacing.xs * 2)
    );
    const displayCardHeightByHeight = Math.max(48, (viewportHeight - ((rows - 1) * spacing.sm)) / rows);
    const displayCardWidthByHeight = Math.max(20, displayCardHeightByHeight * 0.716);
    // Safety factor prevents tiny overflows on short/wide devices.
    const displayCardWidth = Math.max(20, Math.min(displayCardWidthByWidth, displayCardWidthByHeight) * 0.98);
    const displayNavigatorPage = clampedSpreadStart === 0 ? 1 : clampedSpreadStart;
    const canDisplayPrev = clampedSpreadStart > 0;
    const canDisplayNext = clampedSpreadStart < maxDisplaySpreadStart;

    if (displayMode) {
      return (
        <SafeAreaView style={[styles.safeArea, styles.displayModeSafeArea]}>
          <View style={styles.displayModeRoot}>
            <View style={styles.displayModeBar}>
              <TouchableOpacity
                style={styles.displayModeExitButton}
                onPress={() => setDisplayMode(false)}
              >
                <Text style={styles.displayModeExitIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View
              style={styles.displaySpreadViewport}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setDisplayViewport((prev) => {
                  if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
                    return prev;
                  }
                  return { width, height };
                });
              }}
            >
              {loading ? (
                <SkeletonCardGrid columns={gridColumns} rows={3} />
              ) : !binderHasCards ? (
                <ListEmptyComponent />
              ) : (
                <View style={styles.displaySpreadPanSurface} {...binderPanResponder.panHandlers}>
                  <View style={styles.displaySpreadWrapper}>
                    <View style={styles.displaySpreadPane}>
                      {leftSpreadPage ? (
                        <View style={styles.displayPagePane}>
                          <BinderPageView
                            cards={binderCards}
                            currentPage={currentPage}
                            pageOverride={leftSpreadPage}
                            totalPages={binderTotalPages}
                            cardsPerPage={cardsPerPage}
                            columns={gridColumns}
                            cardWidth={displayCardWidth}
                            binderId={binder.id}
                            onPageChange={setCurrentPage}
                            onCardPress={binderOnCardPress}
                            isCustomMode={isCustomMode}
                            onCardLongPress={handleLongPressCard}
                            onCardLongPressRelease={handleLongPressRelease}
                            collectionMode={binder.collectionMode}
                            displayMode={displayMode}
                            onCardTap={binder.collectionMode === 'region' ? handleRegionCardTap : undefined}
                            rowJustifyContent="flex-end"
                          />
                          <View style={[styles.displayPageNumberChip, styles.displayPageNumberChipLeft]}>
                            <Text style={styles.displayPageNumberText}>{leftSpreadPage}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.displaySpreadEmptyPane} />
                      )}
                    </View>
                    <View style={styles.displayCenterColumn}>
                      <View style={styles.displaySpreadDivider} />
                    </View>
                    <View style={styles.displaySpreadPane}>
                      {rightSpreadPage ? (
                        <View style={styles.displayPagePane}>
                          <BinderPageView
                            cards={binderCards}
                            currentPage={currentPage}
                            pageOverride={rightSpreadPage}
                            totalPages={binderTotalPages}
                            cardsPerPage={cardsPerPage}
                            columns={gridColumns}
                            cardWidth={displayCardWidth}
                            binderId={binder.id}
                            onPageChange={setCurrentPage}
                            onCardPress={binderOnCardPress}
                            isCustomMode={isCustomMode}
                            onCardLongPress={handleLongPressCard}
                            onCardLongPressRelease={handleLongPressRelease}
                            collectionMode={binder.collectionMode}
                            displayMode={displayMode}
                            onCardTap={binder.collectionMode === 'region' ? handleRegionCardTap : undefined}
                            rowJustifyContent="flex-start"
                          />
                          <View style={[styles.displayPageNumberChip, styles.displayPageNumberChipRight]}>
                            <Text style={styles.displayPageNumberText}>{rightSpreadPage}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.displaySpreadEmptyPane} />
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.displaySideArrowButton,
                      styles.displaySideArrowLeft,
                      !canDisplayPrev && styles.displayArrowButtonDisabled,
                    ]}
                    onPress={() => setDisplaySpreadStart((prev) => Math.max(0, prev - 2))}
                    disabled={!canDisplayPrev}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.displayArrowText, !canDisplayPrev && styles.displayArrowTextDisabled]}>◄</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.displaySideArrowButton,
                      styles.displaySideArrowRight,
                      !canDisplayNext && styles.displayArrowButtonDisabled,
                    ]}
                    onPress={() => setDisplaySpreadStart((prev) => Math.min(maxDisplaySpreadStart, prev + 2))}
                    disabled={!canDisplayNext}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.displayArrowText, !canDisplayNext && styles.displayArrowTextDisabled]}>►</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {binderHasCards && <View style={styles.displayPageHintSpacer} />}
          </View>

          <JumpToPageModal
            visible={showJumpModal}
            currentPage={displayNavigatorPage}
            totalPages={binderTotalPages}
            onClose={() => setShowJumpModal(false)}
            onJump={(page) => {
              setDisplaySpreadStart(pageToSpreadStart(page, binderTotalPages));
              setShowJumpModal(false);
            }}
          />
          <EnlargedCardOverlay />
        {statsBottomSheet}
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.safeArea, styles.binderModeSafeArea]}>
        <ScrollView
          style={[styles.scrollViewStyle, styles.binderModeScrollView]}
          contentContainerStyle={styles.container}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
          }
        >
          {listHeader}
          
          {loading ? (
            <SkeletonCardGrid columns={gridColumns} rows={3} />
          ) : !binderHasCards ? (
            <ListEmptyComponent />
          ) : (
            <View style={styles.binderPagePanel}>
              <View {...binderPanResponder.panHandlers}>
                <BinderPageView
                  cards={binderCards}
                  currentPage={currentPage}
                  totalPages={binderTotalPages}
                  cardsPerPage={cardsPerPage}
                  columns={gridColumns}
                  cardWidth={cardWidth}
                  binderId={binder.id}
                  onPageChange={setCurrentPage}
                  onCardPress={binderOnCardPress}
                  isCustomMode={isCustomMode}
                  onCardLongPress={handleLongPressCard}
                  onCardLongPressRelease={handleLongPressRelease}
                  collectionMode={binder.collectionMode}
                  displayMode={displayMode}
                  onCardTap={binder.collectionMode === 'region' ? handleRegionCardTap : undefined}
                />
              </View>
              <PageNavigator
                currentPage={currentPage}
                totalPages={binderTotalPages}
                onPreviousPage={() => setCurrentPage(p => Math.max(1, p - 1))}
                onNextPage={() => setCurrentPage(p => Math.min(binderTotalPages, p + 1))}
                onJumpToPage={() => setShowJumpModal(true)}
                subtitle={`Cards ${((currentPage - 1) * cardsPerPage) + 1}–${Math.min(currentPage * cardsPerPage, binderCards.length)} of ${binderCards.length}`}
              />
            </View>
          )}
        </ScrollView>
        <JumpToPageModal
          visible={showJumpModal}
          currentPage={currentPage}
          totalPages={binderTotalPages}
          onClose={() => setShowJumpModal(false)}
          onJump={(page) => {
            setCurrentPage(page);
            setShowJumpModal(false);
          }}
        />
        {stickyProgressFooter}
        <EnlargedCardOverlay />
        {statsBottomSheet}
      </SafeAreaView>
    );
  }

  // Grid view with FlatList for infinite scroll
  // Custom mode uses slots (positions), other modes use cards
  if (isCustomMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={filteredCustomSlots}
          renderItem={renderCustomSlot}
          keyExtractor={customSlotKeyExtractor}
          numColumns={gridColumns}
          key={`custom-grid-${gridColumns}`}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.flatListContainer}
          ListHeaderComponent={listHeader}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={
            isCustomFiltering ? (
              <EmptyState
                title="No cards match your search"
                message="Try adjusting your search or filters"
              />
            ) : null
          }
          onEndReached={loadMoreCustomSlots}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={11}
          initialNumToRender={PAGE_SIZE}
          extraData={[displayCount, positionCards, searchQuery, ownershipFilter]}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
        />
        
        {stickyProgressFooter}
        <EnlargedCardOverlay />
        {statsBottomSheet}
      </SafeAreaView>
    );
  }

  // Grid view with page breaks enabled - uses SectionList with rows for grid layout
  // This applies to Master Set and Region modes when page breaks toggle is ON
  if (viewMode === 'grid' && showPageBreaks && cardSections && !isCustomMode) {
    type SlotEntry = CardWithOwnership | undefined;

    const renderSectionRow = ({ item: row, index: rowIndex, section }: { item: SlotEntry[]; index: number; section: { pageNumber: number } }) => {
      const pageStartIndex = (section.pageNumber - 1) * cardsPerPage;
      const rowStartIndex = pageStartIndex + (rowIndex * gridColumns);
      
      return (
        <View style={styles.sectionRow}>
          {row.map((card, colIndex) => {
            const cardIndex = rowStartIndex + colIndex;
            if (!card) {
              return (
                <EmptyCardSlot
                  key={`empty-${cardIndex}`}
                  position={cardIndex}
                  width={cardWidth}
                />
              );
            }
            return (
              <CardItem
                key={card.id}
                card={card}
                onPress={handleToggleCard}
                onLongPress={handleLongPressCard}
                onLongPressRelease={handleLongPressRelease}
                binderId={binder.id}
                width={cardWidth}
                variant="grid"
                cardIndex={cardIndex}
                cardsPerPage={cardsPerPage}
              />
            );
          })}
          {row.length < gridColumns && 
            Array.from({ length: gridColumns - row.length }).map((_, i) => (
              <View key={`pad-${i}`} style={{ width: cardWidth, margin: 2 }} />
            ))
          }
        </View>
      );
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          sections={cardSections}
          renderSectionHeader={({ section }) => (
            <PageHeader pageNumber={section.pageNumber} />
          )}
          renderItem={renderSectionRow}
          keyExtractor={(row, index) => `row-${index}-${row.map((c, i) => c?.id ?? `empty-${i}`).join('-')}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.flatListContainer}
          ListHeaderComponent={listHeader}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
          }
        />
        {stickyProgressFooter}
        <EnlargedCardOverlay />
        {statsBottomSheet}
      </SafeAreaView>
    );
  }

  // Master Set mode: combined grid with regular cards, extra cards, and empty slots
  if (isMasterSetMode) {
    if (hasSavedPositions) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <FlatList
            data={filteredSavedSlots}
            renderItem={renderSavedPositionSlot}
            keyExtractor={savedSlotKeyExtractor}
            numColumns={gridColumns}
            key={`master-set-slots-${gridColumns}`}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.flatListContainer}
            ListHeaderComponent={listHeader}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={
              isSavedFiltering ? (
                <EmptyState
                  title="No cards match your search"
                  message="Try adjusting your search or filters"
                />
              ) : ListEmptyComponent
            }
            removeClippedSubviews={false}
            maxToRenderPerBatch={PAGE_SIZE}
            windowSize={11}
            initialNumToRender={PAGE_SIZE}
            extraData={[savedPositionMap, searchQuery, ownershipFilter]}
            onScroll={onScrollEvent}
            scrollEventThrottle={16}
          />
          {stickyProgressFooter}
          <EnlargedCardOverlay />
        {statsBottomSheet}
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={masterSetGridItems}
          renderItem={renderMasterSetGridItem}
          keyExtractor={masterSetKeyExtractor}
          numColumns={gridColumns}
          key={`master-set-grid-${gridColumns}`}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.flatListContainer}
          ListHeaderComponent={listHeader}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={loadMoreCards}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={11}
          initialNumToRender={PAGE_SIZE}
          extraData={[displayCount, cards, extraCards]}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
          }
        />
        
        {stickyProgressFooter}
        <EnlargedCardOverlay />
        {statsBottomSheet}
      </SafeAreaView>
    );
  }

  // Region mode: card grid with tap-to-pick functionality
  // Tapping a Pokemon opens the card picker to select a TCG card
  const isRegionMode = binder.collectionMode === 'region';
  
  if (isRegionMode) {
    if (hasSavedPositions) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <FlatList
            data={filteredSavedSlots}
            renderItem={renderSavedPositionSlot}
            keyExtractor={savedSlotKeyExtractor}
            numColumns={gridColumns}
            key={`region-slots-${gridColumns}`}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.flatListContainer}
            ListHeaderComponent={listHeader}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={
              isSavedFiltering ? (
                <EmptyState
                  title="No cards match your search"
                  message="Try adjusting your search or filters"
                />
              ) : ListEmptyComponent
            }
            removeClippedSubviews={false}
            maxToRenderPerBatch={PAGE_SIZE}
            windowSize={11}
            initialNumToRender={PAGE_SIZE}
            extraData={[savedPositionMap, searchQuery, ownershipFilter]}
            onScroll={onScrollEvent}
            scrollEventThrottle={16}
          />
          {stickyProgressFooter}
          <EnlargedCardOverlay />
        {statsBottomSheet}
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={displayedCards}
          renderItem={renderRegionCard}
          keyExtractor={keyExtractor}
          numColumns={gridColumns}
          key={`region-grid-${gridColumns}`}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.flatListContainer}
          ListHeaderComponent={listHeader}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={loadMoreCards}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={11}
          initialNumToRender={PAGE_SIZE}
          extraData={[displayCount, cards]}
          onScroll={onScrollEvent}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
          }
        />
        
        {stickyProgressFooter}
        <EnlargedCardOverlay />
        {statsBottomSheet}
      </SafeAreaView>
    );
  }

  // Fallback: regular card grid (shouldn't normally reach here)
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={displayedCards}
        renderItem={renderCard}
        keyExtractor={keyExtractor}
        numColumns={gridColumns}
        key={`grid-${gridColumns}`} // Force re-render when columns change
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.flatListContainer}
        ListHeaderComponent={listHeader}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={loadMoreCards}
        onEndReachedThreshold={0.5}
        // Performance optimizations
        // NOTE: removeClippedSubviews causes blank cards on scroll - DO NOT USE
        removeClippedSubviews={false}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={11} // Larger window = more cards kept in memory = smoother scrolling
        initialNumToRender={PAGE_SIZE}
        // Extra data to trigger re-render when cards ownership changes
        extraData={[displayCount, cards]}
        onScroll={onScrollEvent}
        scrollEventThrottle={16}
      />
      {stickyProgressFooter}
      <EnlargedCardOverlay />
        {statsBottomSheet}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  displayModeSafeArea: {
    backgroundColor: '#000000',
  },
  scrollViewStyle: {
    flex: 1,
    backgroundColor: colors.background,
  },
  displayModeScrollView: {
    backgroundColor: '#000000',
  },
  container: {
    padding: screenPadding,
    paddingBottom: spacing.md,
  },
  binderModeSafeArea: {
    backgroundColor: colors.backgroundLight,
  },
  binderModeScrollView: {
    backgroundColor: colors.backgroundLight,
  },
  binderPagePanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.primary + '25',
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  displayModeContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  flatListContainer: {
    padding: screenPadding,
    paddingBottom: 80,
  },
  headerContainer: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  backButton: {
    marginRight: spacing.sm,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.xl,
    fontFamily: fonts.semibold,
    color: colors.text,
    letterSpacing: -0.3,
    flex: 1,
  },
  titleSetLogo: {
    width: 48,
    height: 24,
    marginLeft: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginLeft: 40,
  },
  subtitleModeIcon: {
    marginRight: 4,
  },
  subtitleSetIcon: {
    width: 16,
    height: 16,
    marginLeft: 3,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontFamily: fonts.regular,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toolbarIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
  },
  optionsPanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  accordionContent: {
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    overflow: 'hidden' as const,
  },
  accordionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border + '40',
  },
  accordionItemActive: {
    backgroundColor: colors.primary + '10',
  },
  accordionItemText: {
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  accordionItemTextActive: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  filterSelectionHint: {
    fontSize: typography.xs,
    fontFamily: fonts.regular,
    color: colors.primary,
  },
  
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundDark,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  statsFilterBanner: {
    paddingTop: spacing.sm,
  },
  statsFilterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    gap: spacing.xs,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  statsFilterLabel: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.primary,
    maxWidth: 200,
  },
  checkboxIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
  },
  stickyFooterContent: {
    gap: spacing.xs,
  },
  stickyFooterStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statsIconBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  statsIconLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  stickyFooterTotal: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  stickyFooterOwned: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  stickyFooterMissing: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
  stickyFooterPercent: {
    fontSize: typography.xs,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  stickyFooterDot: {
    fontSize: typography.xs,
    color: colors.textLight,
  },
  stickyFooterSlots: {
    fontSize: typography.xs,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  stickyFooterBar: {
    height: 8,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  stickyFooterBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  milestoneBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border + '55',
    minWidth: 42,
    alignItems: 'center',
  },
  milestoneBadgeReached: {
    backgroundColor: colors.background,
    borderColor: colors.border + '85',
  },
  milestoneBadgeText: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textTertiary + 'CC',
  },
  milestoneBadgeTextReached: {
    color: colors.textSecondary + 'DD',
    fontFamily: fonts.medium,
  },
  row: {
    marginHorizontal: -CARD_MARGIN,
  },
  // Footer styles
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  footerComplete: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerCompleteText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Add Card button for Master Set binders
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20', // 20% opacity primary color
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  addCardButtonIcon: {
    fontSize: typography.base,
    marginRight: spacing.xs,
  },
  addCardButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  // Region mode card styles
  regionCardItem: {
    margin: CARD_MARGIN,
    marginBottom: 8,
    alignItems: 'center',
  },
  regionCardImageContainer: {
    width: '100%',
    position: 'relative',
  },
  regionCardImageWrapper: {
    width: '100%',
  },
  regionVariantBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  regionVariantBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 2,
    padding: 2,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOverlayOwned: {
    backgroundColor: 'rgba(170, 240, 230, 0.6)',
  },
  checkboxOverlayMissing: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  checkboxLogo: {
    width: 22,
    height: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  // Section row for page breaks grid view
  sectionRow: {
    flexDirection: 'row',
    marginHorizontal: -2, // Match the CARD_MARGIN negative margin
  },
  // Step 34A: Enlarged card overlay
  enlargeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  enlargedCardContainer: {
    width: '100%',
    maxHeight: '90%',
    paddingHorizontal: screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  enlargedCardContainerRow: {
    flexDirection: 'row',
  },
  enlargedCardContainerColumn: {
    flexDirection: 'column',
  },
  enlargedInfoPanel: {
    justifyContent: 'center',
  },
  enlargedInfoPanelSide: {
    alignItems: 'flex-start',
  },
  enlargedInfoPanelBelow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  enlargedCard: {
    borderRadius: borderRadius.lg,
  },
  enlargedCardName: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
    marginTop: spacing.xs,
  },
  enlargedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  enlargedSetRowLeft: {
    justifyContent: 'flex-start',
  },
  enlargedSetRowCenter: {
    justifyContent: 'center',
  },
  enlargedSetIcon: {
    width: 20,
    height: 20,
  },
  enlargedSetName: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  enlargedCardNumber: {
    fontSize: typography.base,
    color: colors.onPrimary,
  },
  enlargedCardPosition: {
    fontSize: typography.sm,
    color: colors.onPrimary,
    marginTop: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  enlargedNoteBlock: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  enlargedNoteBlockLeft: {
    alignSelf: 'flex-start',
  },
  enlargedNoteBlockCenter: {
    alignSelf: 'center',
  },
  enlargedNoteLabel: {
    fontSize: typography.sm,
    color: colors.onPrimary,
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  enlargedNoteText: {
    fontSize: typography.sm,
    color: colors.onPrimary,
  },
  enlargedHint: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  enlargedTextLeft: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  enlargedTextCenter: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  // Display mode styles
  displayModeRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  displayModeBar: {
    position: 'absolute',
    top: 4,
    left: 8,
    zIndex: 20,
  },
  displayModeExitButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: borderRadius.full,
  },
  displayModeExitIcon: {
    fontSize: typography.lg,
    color: '#FFFFFF',
  },
  displaySpreadWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  displaySpreadViewport: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  displaySpreadPanSurface: {
    flex: 1,
  },
  displaySpreadPane: {
    flex: 1,
    backgroundColor: '#000000',
  },
  displayPagePane: {
    flex: 1,
    position: 'relative',
    paddingBottom: 22,
  },
  displayCenterColumn: {
    width: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displaySideArrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displaySideArrowLeft: {
    left: 2,
  },
  displaySideArrowRight: {
    right: 2,
  },
  displayArrowButtonDisabled: {
    opacity: 0.35,
  },
  displayArrowText: {
    color: '#FFFFFF',
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  displayArrowTextDisabled: {
    color: '#7A7A7A',
  },
  displaySpreadEmptyPane: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#050505',
    minHeight: 0,
  },
  displaySpreadDivider: {
    width: 2,
    borderRadius: 1,
    backgroundColor: '#2A2A2A',
    flex: 1,
  },
  displayPageNumberChip: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: 'rgba(8, 8, 8, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    pointerEvents: 'none',
  },
  displayPageNumberChipLeft: {
    left: 2,
  },
  displayPageNumberChipRight: {
    right: 2,
  },
  displayPageNumberText: {
    color: '#E5E5E5',
    fontSize: 10,
    fontFamily: fonts.medium,
  },
  displayPageHintSpacer: {
    height: 0,
  },
  });
