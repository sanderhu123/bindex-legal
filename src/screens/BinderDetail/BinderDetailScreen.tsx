import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder } from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, type Region } from '../../services/api/pokemonApi';
import type { Binder, Card } from '../../types';
import CardGrid from '../../components/Card/CardGrid';
import CardList from '../../components/Card/CardList';
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

      // Update binder counts/cardIds without re-fetching card list
      setBinder((prev) => prev ? { ...prev, ...latestBinder } : latestBinder);
      setCards((prevCards) =>
        prevCards.map((card) => ({
          ...card,
          isOwned: latestBinder.cardIds.includes(card.id),
        }))
      );
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
          allCards = await getCardsByRegion(binder.region as Region, binder.pokemonArtStyle);
        } else if (binder.collectionMode === 'custom') {
          // For custom binders, we'll show only owned cards for now
          // (We'll improve this later)
          allCards = [];
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
    const binderId = binder.id;

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
        await addCardToBinder(binderId, cardId, cardVariant);
      } else {
        await removeCardFromBinder(binderId, cardId, cardVariant);
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
  const ownedCount = binder.ownedCards ?? cards.filter(c => c.isOwned).length;
  const totalCount = binder.totalCards ?? cards.length;
  const progressPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  // Determine grid columns based on layout preference (default to 3)
  const gridColumns = binder.layoutPreference === '4x3' ? 4 : 3;
  const cardWidth = Math.max(50, calculateCardWidth(screenWidth, gridColumns)); // Ensure minimum width of 50

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{binder.name}</Text>
      <Text style={styles.subtitle}>Collection Mode: {collectionModeText}</Text>
      {binder.set && <Text style={styles.text}>Set: {binder.set}</Text>}
      {binder.region && <Text style={styles.text}>Region: {binder.region}</Text>}
      
      {/* Progress Summary */}
      <View style={styles.progressContainer}>
        <ProgressBar
          current={ownedCount}
          total={totalCount}
          percentage={progressPercentage}
          format="full"
          textSize="large"
        />
      </View>
      {__DEV__ && binder && (
        <Text style={styles.debugText}>
          Debug: Binder has {binder.cardIds.length} card IDs
        </Text>
      )}
      
      <View style={styles.cardsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cards:</Text>
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
        </View>
        
        {/* Search Input */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or number..."
        />
        
        {/* Filter Panel */}
        <FilterPanel
          ownershipFilter={ownershipFilter}
          onOwnershipFilterChange={setOwnershipFilter}
        />
        
        <Text style={styles.helpText}>Tap a card to mark it as owned/unowned</Text>
        {loading ? (
          <LoadingSpinner message="Loading cards..." />
        ) : filteredCards.length === 0 ? (
          <EmptyState
            title={searchQuery.trim() ? 'No cards match your search' : 'No cards found'}
            message={
              searchQuery.trim()
                ? 'Try adjusting your search or filters'
                : 'This binder doesn\'t have any cards yet'
            }
          />
        ) : viewMode === 'grid' ? (
          <CardGrid
            cards={filteredCards}
            onCardPress={handleToggleCard}
            binderId={binder.id}
            cardWidth={cardWidth}
          />
        ) : (
          <CardList
            cards={filteredCards}
            onCardPress={handleToggleCard}
            binderId={binder.id}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: screenPadding,
    paddingBottom: 80, // Extra space at bottom to see last row card numbers
    backgroundColor: colors.background,
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
});





