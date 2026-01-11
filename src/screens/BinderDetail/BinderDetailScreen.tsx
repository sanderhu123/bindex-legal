import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getBinderById } from '../../services/supabase/binders';
import { 
  addCardToBinder, 
  removeCardFromBinder, 
  getBinderCardsWithPositions, 
  addCardAtPosition, 
  removeCardByPosition, 
  toggleCardOwnershipAtPosition,
  getExtraCardsWithVariants,
  addExtraCardToBinder,
  toggleExtraCardOwnership,
} from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, getCardById, type Region } from '../../services/api/pokemonApi';
import { getAllSelectedCardsForBinder, setSelectedCardForPokemon } from '../../services/supabase/regionCards';
import { startBackgroundPrefetch } from '../../services/imagePrefetch';
import { recordBinderAccess } from '../../services/cacheManager';
import type { Binder, Card } from '../../types';
import CardItem from '../../components/Card/CardItem';
import CardImage from '../../components/Card/CardImage';
import CardDetails from '../../components/Card/CardDetails';
import CardList from '../../components/Card/CardList';
import EmptyCardSlot from '../../components/Card/EmptyCardSlot';
import { CardPickerModal } from '../../components/CardPicker';
import { useCardSearch } from '../../hooks/useCardSearch';
import { useCardFilter, type OwnershipFilter } from '../../hooks/useCardFilter';
import SearchBar from '../../components/Search/SearchBar';
import FilterPanel from '../../components/Filter/FilterPanel';
import ProgressBar from '../../components/Progress/ProgressBar';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import LoadingSpinner from '../../components/Loading/LoadingSpinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorScreen from '../../components/Error/ErrorScreen';
import { colors, spacing, typography, borderRadius, screenPadding } from '../../constants/theme';

const CONTAINER_PADDING = screenPadding; // Padding from container style (24px)
const CARD_MARGIN = 2; // Margin between cards (margin: 2 means 2px on all sides, 4px gap between cards)

/** Number of cards to load per page (for infinite scroll) */
const PAGE_SIZE = 36; // 12 rows of 3, or 9 rows of 4

/** Maximum slots for Custom binders based on layout */
const CUSTOM_MAX_SLOTS_3X3 = 360; // 40 pages × 9 cards
const CUSTOM_MAX_SLOTS_4X3 = 480; // 40 pages × 12 cards

/** Number of empty slots to show at end of Master Set binders for adding extra cards */
const EXTRA_CARD_SLOTS = 9; // 1 page worth (3x3)

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
  | { type: 'extra'; card: CardWithOwnership }
  | { type: 'empty-slot'; slotIndex: number };

type ViewMode = 'grid' | 'list';

export default function BinderDetailScreen({ navigation, route }: BinderDetailScreenProps) {
  const binderId = route.params?.binderId;
  const [binder, setBinder] = useState<Binder | null>(null);
  const [cards, setCards] = useState<CardWithOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Pagination state for infinite scroll (only used for Custom mode)
  // For Master Set and Region modes, we show all cards once loaded
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Track if cards are fully loaded (for disabling pagination in non-Custom modes)
  const [cardsFullyLoaded, setCardsFullyLoaded] = useState(false);
  
  // Card picker modal state (for Custom binders)
  const [showCardPicker, setShowCardPicker] = useState(false);
  
  // Custom mode: position being filled (when card picker is open)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  
  // Custom mode: map of position -> card data
  const [positionCards, setPositionCards] = useState<Map<number, CardWithOwnership>>(new Map());
  
  // Extra cards for Master Set binders (cards not officially in the set)
  const [extraCards, setExtraCards] = useState<CardWithOwnership[]>([]);
  const [showExtraCardPicker, setShowExtraCardPicker] = useState(false);
  

  // Update screen width on dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

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
  }, [binderId]);

  // Keep binder ownership in sync when returning from CardDetail
  const refreshOwnershipFromDb = useCallback(async () => {
    if (!binderId) return;

    try {
      const latestBinder = await getBinderById(binderId);
      if (!latestBinder) {
        setError('Binder not found');
        return;
      }

      // Update binder counts/cardIds
      setBinder((prev) => prev ? { ...prev, ...latestBinder } : latestBinder);

      // For Custom binders: refresh positionCards with latest ownership status from database
      if (latestBinder.collectionMode === 'custom') {
        const cardsWithPositionsMap = await getBinderCardsWithPositions(binderId);
        
        // Update positionCards with latest ownership status
        setPositionCards((prevPositionCards) => {
          const updatedMap = new Map(prevPositionCards);
          
          // Update ownership status for each position from database
          cardsWithPositionsMap.forEach((dbData, position) => {
            const existingCard = prevPositionCards.get(position);
            if (existingCard) {
              updatedMap.set(position, {
                ...existingCard,
                isOwned: dbData.isOwned,
              });
            }
          });
          
          return updatedMap;
        });
      } else {
        // For Master Set/Region binders: update based on cardIds
        setCards((prevCards) =>
          prevCards.map((card) => ({
            ...card,
            isOwned: latestBinder.cardIds.includes(card.id),
          }))
        );
        
        // For Master Set binders: also refresh extra cards ownership
        if (latestBinder.collectionMode === 'master-set') {
          const extraCardsData = await getExtraCardsWithVariants(binderId);
          
          // Update extraCards with latest ownership status from database
          setExtraCards((prevExtraCards) =>
            prevExtraCards.map((card) => {
              // Find matching extra card data from database
              const dbData = extraCardsData.find(
                (ec) => ec.cardId === card.id && ec.variant === (card.variant || null)
              );
              return dbData ? { ...card, isOwned: dbData.isOwned } : card;
            })
          );
        }
      }
    } catch (err) {
      console.error('Failed to refresh binder ownership:', err);
    }
  }, [binderId]);

  useFocusEffect(
    useCallback(() => {
      refreshOwnershipFromDb();
    }, [refreshOwnershipFromDb])
  );

  const variantsKey = binder?.variantsToTrack?.join(',') ?? '';

  // Fetch cards when binder is loaded
  useEffect(() => {
    async function fetchCards() {
      if (!binder) return;

      try {
        setLoading(true);
        // Reset pagination state when fetching new cards
        setDisplayCount(PAGE_SIZE);
        setCardsFullyLoaded(false);
        let allCards: Card[] = [];

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
                    // Load the selected TCG card
                    const tcgCard = await getCardById(selectedCardId);
                    
                    if (tcgCard?.imageUrl) {
                      console.log('[BinderDetail] Using custom card for', pokemon.name, ':', selectedCardId);
                      return {
                        ...pokemon,
                        imageUrl: tcgCard.imageUrl,
                        imageUrlHiRes: tcgCard.imageUrlHiRes,
                        // Store the selected card ID so we know this has a custom selection
                        selectedCardId: selectedCardId,
                      };
                    }
                  } catch (err) {
                    console.warn('[BinderDetail] Failed to load selected card for', pokemon.name, ':', err);
                    // Fall back to default sprite
                  }
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
          // For Custom binders, load cards with their positions
          console.log('[BinderDetail] Custom mode - loading cards with positions');
          
          try {
            // Get all cards with their positions from the database
            const cardsWithPositionsMap = await getBinderCardsWithPositions(binder.id);
            console.log('[BinderDetail] Custom mode - found', cardsWithPositionsMap.size, 'cards with positions');
            
            // Fetch card details for each position
            const newPositionCards = new Map<number, CardWithOwnership>();
            const cardPromises = Array.from(cardsWithPositionsMap.entries()).map(
              async ([position, cardData]) => {
                try {
                  const card = await getCardById(cardData.cardId);
                  if (card) {
                    return { position, card };
                  }
                  return null;
                } catch (err) {
                  console.warn('[BinderDetail] Failed to load card at position', position, ':', err);
                  return null;
                }
              }
            );
            
            const results = await Promise.all(cardPromises);
            
            // Build the position map with ownership status from database
            results.forEach((result) => {
              if (result) {
                const positionData = cardsWithPositionsMap.get(result.position);
                newPositionCards.set(result.position, {
                  ...result.card,
                  isOwned: positionData?.isOwned ?? true, // Use stored ownership status
                });
              }
            });
            
            setPositionCards(newPositionCards);
            console.log('[BinderDetail] Custom mode - loaded', newPositionCards.size, 'cards into grid');
            
            // allCards stays empty for Custom mode (we use positionCards instead)
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
          
          // Track which cards are being removed and why
          const removedCards: { name: string; variant: string; rarity: string }[] = [];
          
          // Only show cards with variants that the user selected
          allCards = allCards.filter((card) => {
            // If card has no variant specified, treat it as 'base'
            const cardVariant = card.variant || 'base';
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
          
          // Count unique base cards after filtering
          const uniqueFilteredCards = new Set<string>();
          allCards.forEach(card => {
            const baseId = card.id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
            uniqueFilteredCards.add(baseId);
          });
          console.log('[BinderDetail] Unique base cards after filter:', uniqueFilteredCards.size);
          
          // Calculate expected count based on variants selected
          console.log('[BinderDetail] ========================================');
          console.log('[BinderDetail] EXPECTED vs ACTUAL');
          console.log('[BinderDetail] ========================================');
          console.log('[BinderDetail] Expected logic:');
          console.log('  - 165 regular cards with base + reverse-holo = 330 cards');
          console.log('  - 42 special cards with base only = 42 cards');
          console.log('  - Total expected = 372 cards');
          console.log('[BinderDetail] Actual:', allCards.length, 'cards');
          console.log('[BinderDetail] Difference:', 372 - allCards.length, 'cards missing');
          
          console.log('[BinderDetail] ========================================');
          console.log('[BinderDetail] Filter summary:', {
            variantsToTrack: binder.variantsToTrack,
            originalCount: originalCount,
            filteredCount: allCards.length,
            removedCount: originalCount - allCards.length,
            expectedCount: 372,
            missingCards: 372 - allCards.length,
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

        // Apply variant placement logic (only for master-set mode with variants)
        if (binder.collectionMode === 'master-set' && binder.variantPlacement) {
          const isBaseCard = (card: CardWithOwnership): boolean => {
            return !card.variant || card.variant === 'base';
          };

          // Get base identifier (name + number) for grouping
          const getBaseIdentifier = (card: CardWithOwnership): string => {
            return `${card.name}-${card.number}`;
          };

          if (binder.variantPlacement === 'grouped') {
            // Group variants with their base card
            // Cards are already sorted by set number, so we just need to ensure
            // variants appear immediately after their base card
            const grouped: CardWithOwnership[] = [];
            const variantMap = new Map<string, CardWithOwnership[]>();

            // Separate base cards and variants
            const baseCards: CardWithOwnership[] = [];
            cardsWithOwnership.forEach((card) => {
              if (isBaseCard(card)) {
                baseCards.push(card);
              } else {
                const baseId = getBaseIdentifier(card);
                if (!variantMap.has(baseId)) {
                  variantMap.set(baseId, []);
                }
                variantMap.get(baseId)!.push(card);
              }
            });

            // Build final array: base card followed by its variants
            baseCards.forEach((baseCard) => {
              grouped.push(baseCard);
              const baseId = getBaseIdentifier(baseCard);
              const variants = variantMap.get(baseId) || [];
              // Sort variants by variant type order
              variants.sort((a, b) => {
                const variantOrder: Record<string, number> = {
                  'reverse-holo': 1,
                  'poke-ball': 2,
                  'master-ball': 3,
                };
                return (variantOrder[a.variant || 'base'] || 0) - (variantOrder[b.variant || 'base'] || 0);
              });
              grouped.push(...variants);
            });

            // Add any variants whose base card doesn't exist in the list
            variantMap.forEach((variants, baseId) => {
              const hasBase = baseCards.some((card) => getBaseIdentifier(card) === baseId);
              if (!hasBase) {
                grouped.push(...variants);
              }
            });

            cardsWithOwnership = grouped;
          } else if (binder.variantPlacement === 'end') {
            // All base cards first, then all variants at the end
            const baseCards: CardWithOwnership[] = [];
            const variants: CardWithOwnership[] = [];

            cardsWithOwnership.forEach((card) => {
              if (isBaseCard(card)) {
                baseCards.push(card);
              } else {
                variants.push(card);
              }
            });

            // Sort variants by set number (or Pokédex if region mode)
            if (variants.length > 0) {
              variants.sort((a, b) => {
                if (binder.collectionMode === 'master-set') {
                  const getSetNumber = (numberStr: string): number => {
                    const match = numberStr.match(/^(\d+)\//);
                    return match ? parseInt(match[1], 10) : 0;
                  };
                  return getSetNumber(a.number) - getSetNumber(b.number);
                } else {
                  const aNum = a.pokedexNumber ?? 0;
                  const bNum = b.pokedexNumber ?? 0;
                  return aNum - bNum;
                }
              });
            }

            cardsWithOwnership = [...baseCards, ...variants];
          }
        }

        setCards(cardsWithOwnership);
        
        // Load extra cards for Master Set binders
        if (binder.collectionMode === 'master-set') {
          console.log('[BinderDetail] Loading extra cards for Master Set binder');
          try {
            const extraCardsData = await getExtraCardsWithVariants(binder.id);
            console.log('[BinderDetail] Found', extraCardsData.length, 'extra cards');
            
            if (extraCardsData.length > 0) {
              // Fetch card details for each extra card
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
              
              // Filter out nulls and set state
              const validExtraCards = extraCardsWithDetails.filter((c): c is CardWithOwnership => c !== null);
              setExtraCards(validExtraCards);
              console.log('[BinderDetail] Loaded', validExtraCards.length, 'extra cards with details');
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
            }).catch(err => {
              console.error('[BinderDetail] Background prefetch error:', err);
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
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
    binder?.variantPlacement,
    binder?.pokemonArtStyle,
  ]);

  // Toggle card ownership (tap to add/remove) - with optimistic updates
  // Uses functional state updates to handle rapid tapping correctly
  const handleToggleCard = useCallback(async (card: CardWithOwnership) => {
    if (!binder) return;

    // Calculate new ownership state based on current card state
    const newIsOwned = !card.isOwned;
    const cardId = card.id;
    const cardVariant = card.variant;
    const currentBinderId = binder.id;

    // Optimistic update using functional setState to ensure we always use latest state
    // This prevents race conditions when tapping multiple cards quickly
    setCards((prevCards) =>
      prevCards.map((c) =>
        c.id === cardId ? { ...c, isOwned: newIsOwned } : c
      )
    );

    // Update binder state optimistically using functional setState
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

    // Sync with database in the background
    try {
      if (newIsOwned) {
        await addCardToBinder(currentBinderId, cardId, cardVariant);
      } else {
        await removeCardFromBinder(currentBinderId, cardId, cardVariant);
      }
    } catch (err) {
      // Revert on error using functional setState
      setCards((prevCards) =>
        prevCards.map((c) =>
          c.id === cardId ? { ...c, isOwned: !newIsOwned } : c
        )
      );
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
      setError(err instanceof Error ? err.message : 'Failed to update card');
      console.error('Failed to update card:', err);
    }
  }, [binder?.id]);

  // Handle adding a card from the picker (Custom mode with position)
  const handleAddCardFromPicker = useCallback(async (selectedCard: Card) => {
    if (!binder || selectedPosition === null) return;
    
    console.log('[BinderDetail] Adding card from picker at position', selectedPosition, ':', selectedCard.id, selectedCard.name);
    
    try {
      // Add card at the selected position
      await addCardAtPosition(binder.id, selectedCard.id, selectedPosition, selectedCard.variant);
      
      // Optimistically update UI - new cards in Custom binders start as "missing" (unowned)
      const newCard: CardWithOwnership = {
        ...selectedCard,
        isOwned: false, // Default to missing, user can mark as owned
      };
      
      setPositionCards((prev) => {
        const updated = new Map(prev);
        updated.set(selectedPosition, newCard);
        return updated;
      });
      
      setBinder((prevBinder) => {
        if (!prevBinder) return prevBinder;
        return {
          ...prevBinder,
          cardIds: [...prevBinder.cardIds, selectedCard.id],
          // Don't increment ownedCards since card starts as missing
        };
      });
      
      console.log('[BinderDetail] Card added successfully at position', selectedPosition, '(starts as missing)');
    } catch (err) {
      console.error('[BinderDetail] Failed to add card:', err);
      Alert.alert(
        'Error',
        'Failed to add card to binder. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSelectedPosition(null);
    }
  }, [binder, selectedPosition]);

  // Handle opening card picker for a specific slot (Custom mode)
  const handleEmptySlotPress = useCallback((position: number) => {
    console.log('[BinderDetail] Empty slot tapped at position:', position);
    setSelectedPosition(position);
    setShowCardPicker(true);
  }, []);

  // Handle opening card picker for extra card slot (Master Set mode)
  const handleExtraSlotPress = useCallback((slotIndex: number) => {
    console.log('[BinderDetail] Extra card slot tapped:', slotIndex);
    setShowExtraCardPicker(true);
  }, []);

  // Handle toggling owned/missing status for a card at a position (Custom mode)
  const handleToggleCustomCardOwnership = useCallback(async (position: number) => {
    if (!binder) return;
    
    const card = positionCards.get(position);
    if (!card) return;
    
    const newIsOwned = !card.isOwned;
    console.log('[BinderDetail] Toggling card ownership at position', position, ':', card.name, '→', newIsOwned ? 'owned' : 'missing');
    
    // Optimistically update UI
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
      console.log('[BinderDetail] Card ownership toggled at position', position);
    } catch (err) {
      console.error('[BinderDetail] Failed to toggle card ownership:', err);
      // Revert on error
      setPositionCards((prev) => {
        const updated = new Map(prev);
        updated.set(position, card); // Revert to original
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
      Alert.alert('Error', 'Failed to update card. Please try again.');
    }
  }, [binder, positionCards]);

  // === EXTRA CARDS HANDLERS (Master Set mode) ===
  
  // Handle adding an extra card from the picker
  const handleAddExtraCard = useCallback(async (selectedCard: Card) => {
    if (!binder) return;
    
    console.log('[BinderDetail] Adding extra card:', selectedCard.id, selectedCard.name);
    
    try {
      await addExtraCardToBinder(binder.id, selectedCard.id, selectedCard.variant);
      
      // Optimistically update UI - new cards start as missing (not owned yet)
      const newExtraCard: CardWithOwnership = {
        ...selectedCard,
        isOwned: false,
      };
      
      setExtraCards((prev) => [...prev, newExtraCard]);
      console.log('[BinderDetail] Card added successfully (starts as missing)');
    } catch (err) {
      console.error('[BinderDetail] Failed to add extra card:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to add extra card. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [binder]);

  // Handle toggling ownership of an extra card (card added by user, not in official set)
  // Works similar to handleToggleCard but updates extraCards state instead of cards state
  const handleToggleExtraCardOwnership = useCallback(async (card: CardWithOwnership) => {
    if (!binder) return;
    
    const newIsOwned = !card.isOwned;
    const cardId = card.id;
    const cardVariant = card.variant;
    const currentBinderId = binder.id;
    
    console.log('[BinderDetail] Toggling extra card ownership:', card.name, '→', newIsOwned ? 'owned' : 'missing');
    
    // Optimistically update UI - update extraCards state
    setExtraCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isOwned: newIsOwned } : c))
    );
    
    // Note: We don't update binder.ownedCards here because extra cards are counted
    // separately in the progress calculation (see ownedCount/totalCount calculation above)
    // The progress bar will update automatically when extraCards state changes
    
    try {
      await toggleExtraCardOwnership(currentBinderId, cardId, cardVariant);
      console.log('[BinderDetail] Extra card ownership toggled');
    } catch (err) {
      console.error('[BinderDetail] Failed to toggle extra card ownership:', err);
      // Revert on error
      setExtraCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, isOwned: !newIsOwned } : c))
      );
      Alert.alert('Error', 'Failed to update card. Please try again.');
    }
  }, [binder]);

  // === REGION MODE: Navigation based on card selection state ===
  
  // State for Region card picker (when no card selected yet)
  const [showRegionCardPicker, setShowRegionCardPicker] = useState(false);
  const [selectedPokemonForPicker, setSelectedPokemonForPicker] = useState<CardWithOwnership | null>(null);
  
  // Handle tapping a Region Pokemon slot
  // - If no card selected: open card picker directly
  // - If card selected: navigate to card detail
  const handleRegionCardTap = useCallback((pokemon: CardWithOwnership) => {
    const hasCustomCard = !!(pokemon as any).selectedCardId;
    console.log('[BinderDetail] Region card tapped:', pokemon.name, 'hasCustomCard:', hasCustomCard);
    
    if (!hasCustomCard) {
      // No custom card selected - open the card picker directly
      setSelectedPokemonForPicker(pokemon);
      setShowRegionCardPicker(true);
    } else {
      // Custom card selected - navigate to card detail
      navigation.navigate('CardDetail', {
        cardId: pokemon.id,
        binderId: binder?.id || '',
        isOwned: pokemon.isOwned,
        collectionMode: 'region',
        pokedexNumber: pokemon.pokedexNumber,
        pokemonName: pokemon.name,
        // Pass full card data for Region mode (avoids API fetch for sprite-based cards)
        regionCardData: {
          id: pokemon.id,
          name: pokemon.name,
          number: pokemon.pokedexNumber?.toString() || '',
          set: binder?.region || '',
          rarity: '',
          artist: '',
          imageUrl: pokemon.imageUrl,
          imageUrlHiRes: pokemon.imageUrlHiRes || pokemon.imageUrl,
          pokedexNumber: pokemon.pokedexNumber,
          selectedCardId: (pokemon as any).selectedCardId,
        },
      });
    }
  }, [binder?.id, binder?.region, navigation]);

  // Handle selecting a card from the Region card picker
  const handleRegionCardSelected = useCallback(async (selectedCard: Card) => {
    if (!binder || !selectedPokemonForPicker || !selectedPokemonForPicker.pokedexNumber) {
      console.warn('[BinderDetail] Missing data for Region card selection');
      return;
    }
    
    console.log('[BinderDetail] Region card selected:', selectedCard.name, 'for', selectedPokemonForPicker.name);
    
    try {
      // Save the selection to the database
      await setSelectedCardForPokemon(binder.id, selectedPokemonForPicker.pokedexNumber, selectedCard.id);
      console.log('[BinderDetail] Card selection saved');
      
      // Update the cards state to show the new image immediately
      setCards((prevCards) =>
        prevCards.map((card) => {
          if (card.pokedexNumber === selectedPokemonForPicker.pokedexNumber) {
            return {
              ...card,
              imageUrl: selectedCard.imageUrl,
              imageUrlHiRes: selectedCard.imageUrlHiRes,
              selectedCardId: selectedCard.id, // Mark as having custom selection
            };
          }
          return card;
        })
      );
      
      console.log('[BinderDetail] UI updated with new card image');
    } catch (err) {
      console.error('[BinderDetail] Failed to save card selection:', err);
      Alert.alert('Error', 'Failed to save card selection. Please try again.');
    } finally {
      setSelectedPokemonForPicker(null);
    }
  }, [binder, selectedPokemonForPicker]);


  // Update header title when binder loads
  useEffect(() => {
    if (binder) {
      navigation.setOptions({ title: binder.name });
    }
  }, [binder, navigation]);

  // Apply search filter
  const searchedCards = useCardSearch(cards, searchQuery);

  // Apply filter (ownership only)
  const filteredCards = useCardFilter(searchedCards, {
    selectedRarities: new Set(),
    ownershipFilter,
  });

  // Reset pagination when filters change (only affects Custom mode now)
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, ownershipFilter]);

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

  // Render a single card for FlatList
  const renderCard = useCallback(
    ({ item }: { item: CardWithOwnership }) => (
      <CardItem
        card={item}
        onPress={handleToggleCard}
        binderId={binder?.id || ''}
        width={cardWidth}
        variant="grid"
      />
    ),
    [handleToggleCard, binder?.id, cardWidth]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CardWithOwnership) => item.id, []);

  // === MASTER SET MODE: Combined grid with regular cards, extra cards, and empty slots ===
  
  // Create combined data for Master Set mode: regular cards + extra cards + empty slots
  const masterSetGridItems = useMemo((): MasterSetGridItem[] => {
    if (!binder || binder.collectionMode !== 'master-set') return [];
    
    const items: MasterSetGridItem[] = [];
    
    // Add regular cards (paginated)
    displayedCards.forEach((card) => {
      items.push({ type: 'card', card });
    });
    
    // Only add extra cards and empty slots when ALL regular cards have been loaded
    // This prevents empty slots from flashing while scrolling through paginated cards
    if (!hasMoreCards) {
      // Add extra cards at the end of regular cards (displayed the same as regular cards)
      extraCards.forEach((card) => {
        items.push({ type: 'extra', card });
      });
      
      // Add empty slots for adding more cards
      for (let i = 0; i < EXTRA_CARD_SLOTS; i++) {
        items.push({ type: 'empty-slot', slotIndex: i });
      }
    }
    
    return items;
  }, [binder, displayedCards, extraCards, hasMoreCards]);

  // Render function for Master Set grid items
  const renderMasterSetGridItem = useCallback(
    ({ item }: { item: MasterSetGridItem }) => {
      if (item.type === 'card') {
        // Regular set card
        return (
          <CardItem
            card={item.card}
            onPress={handleToggleCard}
            binderId={binder?.id || ''}
            width={cardWidth}
            variant="grid"
          />
        );
      }
      
      if (item.type === 'extra') {
        // Extra card (added by user, displayed the same as regular cards)
        return (
          <CardItem
            card={item.card}
            onPress={handleToggleExtraCardOwnership}
            binderId={binder?.id || ''}
            width={cardWidth}
            variant="grid"
            collectionMode="master-set"
            isExtraCard={true}
          />
        );
      }
      
      // Empty slot for adding cards
      return (
        <EmptyCardSlot
          position={item.slotIndex}
          width={cardWidth}
          onPress={() => handleExtraSlotPress(item.slotIndex)}
          label="Add Card"
          hideSlotNumber={true}
        />
      );
    },
    [binder?.id, cardWidth, handleToggleCard, handleToggleExtraCardOwnership, handleExtraSlotPress, navigation]
  );

  // Key extractor for Master Set grid items
  const masterSetKeyExtractor = useCallback((item: MasterSetGridItem, index: number) => {
    if (item.type === 'card') return `card-${item.card.id}`;
    if (item.type === 'extra') return `extra-${item.card.id}`;
    return `empty-slot-${item.slotIndex}`;
  }, []);

  // === CUSTOM MODE: Positional grid with slots ===
  
  // Calculate max slots based on layout preference
  const customMaxSlots = gridColumns === 4 ? CUSTOM_MAX_SLOTS_4X3 : CUSTOM_MAX_SLOTS_3X3;
  
  // Generate array of slot positions for Custom mode (paginated)
  const customSlots = useMemo(() => {
    if (!binder || binder.collectionMode !== 'custom') return [];
    // Return array of position numbers [0, 1, 2, ..., displayCount-1]
    return Array.from({ length: Math.min(displayCount, customMaxSlots) }, (_, i) => i);
  }, [binder, displayCount, customMaxSlots]);

  const hasMoreCustomSlots = displayCount < customMaxSlots;

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
        return (
          <CardItem
            card={card}
            onPress={() => handleToggleCustomCardOwnership(position)}
            binderId={binder?.id || ''}
            width={cardWidth}
            variant="grid"
            position={position}
            collectionMode="custom"
          />
        );
      }
      
      // Empty slot - render placeholder
      return (
        <EmptyCardSlot
          position={position}
          width={cardWidth}
          onPress={handleEmptySlotPress}
        />
      );
    },
    [positionCards, handleToggleCustomCardOwnership, handleEmptySlotPress, binder?.id, cardWidth]
  );

  // Key extractor for Custom mode slots
  const customSlotKeyExtractor = useCallback((position: number) => `slot-${position}`, []);

  // === REGION MODE: Custom render function for Pokemon cards ===
  
  // Render a Region Pokemon card - tap navigates to card detail
  const renderRegionCard = useCallback(
    ({ item }: { item: CardWithOwnership }) => {
      return (
        <TouchableOpacity
          style={[styles.regionCardItem, { width: cardWidth }]}
          onPress={() => handleRegionCardTap(item)}
          activeOpacity={0.7}
        >
          <View style={styles.regionCardImageContainer}>
            <CardImage
              source={item.imageUrl}
              isMissing={!item.isOwned}
              aspectRatio={0.7}
              style={styles.regionCardImageWrapper}
            />
            {/* Checkbox for ownership toggle */}
            <TouchableOpacity 
              style={styles.checkboxOverlay}
              onPress={() => handleToggleCard(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.checkbox}>{item.isOwned ? '☑' : '☐'}</Text>
            </TouchableOpacity>
          </View>
          <CardDetails
            card={item}
            variant="compact"
            showSet={false}
            showRarity={false}
            showArtist={false}
            showVariantBadge={false}
          />
        </TouchableOpacity>
      );
    },
    [cardWidth, handleRegionCardTap, handleToggleCard]
  );

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
          // Trigger re-fetch by updating binderId dependency
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

  // Progress uses cached values from binder for consistency with BinderList
  // Fallback to counting cards if cached value not available (shouldn't happen)
  // For Master Set: include extra cards in the count (they're treated as regular cards)
  const baseOwnedCount = binder.ownedCards ?? cards.filter(c => c.isOwned).length;
  const baseTotalCount = binder.totalCards ?? cards.length;
  const extraCardsCount = extraCards.length;
  const ownedExtraCardsCount = extraCards.filter(c => c.isOwned).length;
  
  // Include extra cards in the main count for Master Set binders
  const isMasterSetMode = binder.collectionMode === 'master-set';
  const ownedCount = isMasterSetMode ? baseOwnedCount + ownedExtraCardsCount : baseOwnedCount;
  const totalCount = isMasterSetMode ? baseTotalCount + extraCardsCount : baseTotalCount;
  const progressPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  
  // Custom mode uses different progress format
  const isCustomMode = binder.collectionMode === 'custom';

  // Header component for FlatList (binder info, progress, search, filters)
  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>{binder.name}</Text>
      <Text style={styles.subtitle}>Collection Mode: {collectionModeText}</Text>
      {binder.set && <Text style={styles.text}>Set: {binder.set}</Text>}
      {binder.region && <Text style={styles.text}>Region: {binder.region}</Text>}
      
      {/* Progress Summary */}
      <View style={styles.progressContainer}>
        {isCustomMode ? (
          // Custom mode: progress bar showing owned / filled, plus slot info
          <>
            <ProgressBar
              current={Array.from(positionCards.values()).filter(c => c.isOwned).length}
              total={positionCards.size}
              percentage={positionCards.size > 0 
                ? Math.round((Array.from(positionCards.values()).filter(c => c.isOwned).length / positionCards.size) * 100) 
                : 0
              }
              format="full"
              textSize="large"
            />
            <Text style={styles.customSlotInfo}>
              {positionCards.size} / {customMaxSlots} slots filled
            </Text>
          </>
        ) : (
          // Master Set / Region mode: show progress bar with percentage
          <ProgressBar
            current={ownedCount}
            total={totalCount}
            percentage={progressPercentage}
            format="full"
            textSize="large"
          />
        )}
      </View>
      
      {/* Add Card button for Master Set binders */}
      {isMasterSetMode && (
        <TouchableOpacity
          style={styles.addCardButton}
          onPress={() => setShowExtraCardPicker(true)}
        >
          <Text style={styles.addCardButtonIcon}>➕</Text>
          <Text style={styles.addCardButtonText}>Add Card</Text>
        </TouchableOpacity>
      )}
      {__DEV__ && binder && (
        <Text style={styles.debugText}>
          Debug: Binder has {binder.cardIds.length} card IDs
        </Text>
      )}
      
      <View style={styles.cardsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isCustomMode ? 'Card Slots:' : 'Cards:'}</Text>
          {/* View toggle - only show for non-Custom modes */}
          {!isCustomMode && (
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
                onPress={() => setViewMode('grid')}
              >
                <Text style={[styles.toggleButtonText, viewMode === 'grid' && styles.toggleButtonTextActive]}>
                  Grid
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.toggleButtonText, viewMode === 'list' && styles.toggleButtonTextActive]}>
                  List
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Search and Filter - only show for non-Custom modes */}
        {!isCustomMode && (
          <>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or number..."
            />
            
            <FilterPanel
              ownershipFilter={ownershipFilter}
              onOwnershipFilterChange={setOwnershipFilter}
            />
          </>
        )}
        
        <Text style={styles.helpText}>
          {isCustomMode 
            ? 'Tap an empty slot to add a card (starts as missing), tap checkbox to mark owned'
            : binder?.collectionMode === 'region'
            ? 'Tap a Pokémon to choose a TCG card, long-press for options, checkbox to mark owned'
            : 'Tap a card to view details, tap checkbox to mark owned'
          }
        </Text>
      </View>
    </View>
  );

  // Footer component (loading indicator for pagination)
  const ListFooterComponent = () => {
    if (loading) {
      return <LoadingSpinner message="Loading cards..." />;
    }

    // Custom mode footer
    if (isCustomMode) {
      if (!hasMoreCustomSlots && customSlots.length > 0) {
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
              ? `All ${filteredCards.length + extraCardsCount} cards loaded`
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

  // List view (using ScrollView as before)
  // Note: Custom mode only supports grid view (always falls through to grid)
  if (viewMode === 'list' && !isCustomMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <ListHeaderComponent />
          {loading ? (
            <LoadingSpinner message="Loading cards..." />
          ) : filteredCards.length === 0 ? (
            <ListEmptyComponent />
          ) : (
            <CardList
              cards={filteredCards}
              onCardPress={handleToggleCard}
              binderId={binder.id}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Grid view with FlatList for infinite scroll
  // Custom mode uses slots (positions), other modes use cards
  if (isCustomMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={customSlots}
          renderItem={renderCustomSlot}
          keyExtractor={customSlotKeyExtractor}
          numColumns={gridColumns}
          key={`custom-grid-${gridColumns}`}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.flatListContainer}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          onEndReached={loadMoreCustomSlots}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={11}
          initialNumToRender={PAGE_SIZE}
          extraData={[displayCount, positionCards]}
        />
        
        {/* Card Picker Modal for adding cards at a position */}
        <CardPickerModal
          visible={showCardPicker}
          onClose={() => {
            setShowCardPicker(false);
            setSelectedPosition(null);
          }}
          onSelectCard={handleAddCardFromPicker}
          title={selectedPosition !== null ? `Add Card to Slot ${selectedPosition + 1}` : 'Add Card'}
          pokemonOnly={false}
        />
      </SafeAreaView>
    );
  }

  // Master Set mode: combined grid with regular cards, extra cards, and empty slots
  if (isMasterSetMode) {
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
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={loadMoreCards}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={11}
          initialNumToRender={PAGE_SIZE}
          extraData={[displayCount, cards, extraCards]}
        />
        
        {/* Card Picker Modal for adding cards */}
        <CardPickerModal
          visible={showExtraCardPicker}
          onClose={() => setShowExtraCardPicker(false)}
          onSelectCard={handleAddExtraCard}
          title="Add Card"
          pokemonOnly={false}
        />
      </SafeAreaView>
    );
  }

  // Region mode: card grid with tap-to-pick functionality
  // Tapping a Pokemon opens the card picker to select a TCG card
  const isRegionMode = binder.collectionMode === 'region';
  
  if (isRegionMode) {
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
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={loadMoreCards}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={11}
          initialNumToRender={PAGE_SIZE}
          extraData={[displayCount, cards]}
        />
        
        {/* Card Picker Modal for selecting TCG card for Pokemon without custom selection */}
        <CardPickerModal
          visible={showRegionCardPicker}
          onClose={() => {
            setShowRegionCardPicker(false);
            setSelectedPokemonForPicker(null);
          }}
          onSelectCard={handleRegionCardSelected}
          title={selectedPokemonForPicker ? `Choose a ${selectedPokemonForPicker.name} Card` : 'Choose Card'}
          initialQuery={selectedPokemonForPicker?.name || ''}
          pokemonOnly={true}
        />
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
        ListHeaderComponent={ListHeaderComponent}
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
      />
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
    padding: screenPadding,
    paddingBottom: 80, // Extra space at bottom to see last row card numbers
    backgroundColor: colors.background,
  },
  flatListContainer: {
    padding: screenPadding,
    paddingBottom: 80,
  },
  headerContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.xl,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: typography.semibold,
  },
  text: {
    fontSize: typography.lg,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  debugText: {
    fontSize: typography.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: typography.base,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  cardsContainer: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography['2xl'],
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textTertiary,
  },
  toggleButtonTextActive: {
    color: colors.background,
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
  // Custom mode slot info text (below progress bar)
  customSlotInfo: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
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
    fontWeight: typography.medium,
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
  checkboxOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    fontSize: 20,
  },
  });
