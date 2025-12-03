import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder } from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, type Region } from '../../services/api/pokemonApi';
import type { Binder, Card } from '../../types';
import CardGrid from '../../components/Card/CardGrid';
import CardList from '../../components/Card/CardList';
import { useCardSearch } from '../../hooks/useCardSearch';
import { useCardFilter, useAvailableRarities, type OwnershipFilter } from '../../hooks/useCardFilter';
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
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
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
        setBinder(binderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load binder');
        setLoading(false);
      }
    }

    fetchBinder();
  }, [binderId]);

  // Fetch cards when binder is loaded
  useEffect(() => {
    async function fetchCards() {
      if (!binder) return;

      try {
        setLoading(true);
        let allCards: Card[] = [];

        // Get all cards based on collection mode
        if (binder.collectionMode === 'master-set' && binder.set) {
          allCards = await getCardsBySet(binder.set);
        } else if (binder.collectionMode === 'region' && binder.region) {
          allCards = await getCardsByRegion(binder.region as Region);
        } else if (binder.collectionMode === 'custom') {
          // For custom binders, we'll show only owned cards for now
          // (We'll improve this later)
          allCards = [];
        }

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
  }, [binder]);

  // Toggle card ownership (tap to add/remove) - with optimistic updates
  const handleToggleCard = async (card: CardWithOwnership) => {
    if (!binder) return;

    // Store the previous state in case we need to revert
    const previousCards = [...cards];
    const previousBinder = { ...binder };

    // Optimistic update: Update UI immediately
    const newIsOwned = !card.isOwned;
    const updatedCards = cards.map((c) =>
      c.id === card.id ? { ...c, isOwned: newIsOwned } : c
    );
    setCards(updatedCards);

    // Update binder state optimistically
    const updatedCardIds = newIsOwned
      ? [...binder.cardIds, card.id]
      : binder.cardIds.filter((id) => id !== card.id);
    setBinder({ ...binder, cardIds: updatedCardIds });

    // Sync with database in the background
    try {
      if (newIsOwned) {
        await addCardToBinder(binder.id, card.id);
      } else {
        await removeCardFromBinder(binder.id, card.id);
      }
    } catch (err) {
      // Revert on error
      setCards(previousCards);
      setBinder(previousBinder);
      setError(err instanceof Error ? err.message : 'Failed to update card');
      console.error('Failed to update card:', err);
    }
  };

  // Update header title when binder loads
  useEffect(() => {
    if (binder) {
      navigation.setOptions({ title: binder.name });
    }
  }, [binder, navigation]);

  // Get all unique rarities from cards
  const availableRarities = useAvailableRarities(cards);

  // Apply search filter
  const searchedCards = useCardSearch(cards, searchQuery);

  // Apply filter (ownership + rarity)
  const filteredCards = useCardFilter(searchedCards, {
    selectedRarities,
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

  // Progress is always calculated from all cards (not filtered)
  const ownedCount = cards.filter(c => c.isOwned).length;
  const totalCount = cards.length;
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
          availableRarities={availableRarities}
          selectedRarities={selectedRarities}
          onRarityToggle={(rarity) => {
            const newSelected = new Set(selectedRarities);
            if (newSelected.has(rarity)) {
              newSelected.delete(rarity);
            } else {
              newSelected.add(rarity);
            }
            setSelectedRarities(newSelected);
          }}
          onClearRarities={() => setSelectedRarities(new Set())}
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





