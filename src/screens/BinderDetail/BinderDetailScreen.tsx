import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { getBinderById } from '../../services/supabase/binders';
import { addCardToBinder, removeCardFromBinder } from '../../services/supabase/cards';
import { getCardsBySet, getCardsByRegion, type Region } from '../../services/api/pokemonApi';
import type { Binder, Card } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = 20; // Padding from container style
const CARD_MARGIN = 2; // Margin between cards (margin: 2 means 2px on all sides, 4px gap between cards)

/**
 * Calculate card width based on number of columns
 * Grid has negative horizontal margin that extends it CARD_MARGIN beyond container padding
 * Effective grid width = screen width - (container padding - card margin) * 2
 * Each card takes: cardWidth + (CARD_MARGIN * 2) total space
 * For N cards: N * (cardWidth + CARD_MARGIN * 2) = grid width
 * Therefore: cardWidth = (grid width / N) - (CARD_MARGIN * 2)
 */
function calculateCardWidth(columns: number): number {
  const gridWidth = SCREEN_WIDTH - ((CONTAINER_PADDING - CARD_MARGIN) * 2);
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

  if (loading && !binder) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading binder...</Text>
      </View>
    );
  }

  if (error && !binder) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!binder) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Binder not found</Text>
      </View>
    );
  }

  // Format collection mode for display
  const collectionModeText = 
    binder.collectionMode === 'master-set' ? 'Master Set' :
    binder.collectionMode === 'region' ? 'Region' :
    'Custom';

  const ownedCount = cards.filter(c => c.isOwned).length;
  const totalCount = cards.length;
  const progressPercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  // Determine grid columns based on layout preference (default to 3)
  const gridColumns = binder.layoutPreference === '4x3' ? 4 : 3;
  const cardWidth = calculateCardWidth(gridColumns);

  // Helper function to get variant badge info
  const getVariantBadge = (variant?: string) => {
    if (!variant || variant === 'base') return null;
    const badges: Record<string, { label: string; color: string }> = {
      'reverse-holo': { label: 'RH', color: '#FFD700' }, // Gold
      'poke-ball': { label: 'PB', color: '#FF6B6B' }, // Red
      'master-ball': { label: 'MB', color: '#4ECDC4' }, // Teal
    };
    return badges[variant] || null;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{binder.name}</Text>
      <Text style={styles.subtitle}>Collection Mode: {collectionModeText}</Text>
      {binder.set && <Text style={styles.text}>Set: {binder.set}</Text>}
      {binder.region && <Text style={styles.text}>Region: {binder.region}</Text>}
      
      {/* Progress Summary */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {ownedCount} / {totalCount} cards ({progressPercentage}%)
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
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
        <Text style={styles.helpText}>Tap a card to mark it as owned/unowned</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" style={styles.cardsLoading} />
        ) : cards.length === 0 ? (
          <Text style={styles.emptyText}>No cards found for this binder.</Text>
        ) : viewMode === 'grid' ? (
          <View style={styles.grid}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardItem, { width: cardWidth }]}
                onPress={() => handleToggleCard(card)}
                activeOpacity={0.7}
              >
                <View style={[styles.cardImageContainer, !card.isOwned && styles.missingCard]}>
                  <Image
                    source={{ uri: card.imageUrl }}
                    style={styles.cardImage}
                    contentFit="contain"
                    transition={200}
                  />
                  <View style={styles.checkboxOverlay}>
                    <Text style={styles.checkbox}>
                      {card.isOwned ? '☑' : '☐'}
                    </Text>
                  </View>
                  {getVariantBadge(card.variant) && (
                    <View style={[styles.variantBadge, { backgroundColor: getVariantBadge(card.variant)!.color }]}>
                      <Text style={styles.variantBadgeText}>
                        {getVariantBadge(card.variant)!.label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {card.name}
                </Text>
                <Text style={styles.cardNumber}>{card.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.listItem, !card.isOwned && styles.missingListItem]}
                onPress={() => handleToggleCard(card)}
                activeOpacity={0.7}
              >
                <View style={[styles.listImageContainer, !card.isOwned && styles.missingCard]}>
                  <Image
                    source={{ uri: card.imageUrl }}
                    style={styles.listImage}
                    contentFit="contain"
                    transition={200}
                  />
                  {getVariantBadge(card.variant) && (
                    <View style={[styles.listVariantBadge, { backgroundColor: getVariantBadge(card.variant)!.color }]}>
                      <Text style={styles.listVariantBadgeText}>
                        {getVariantBadge(card.variant)!.label}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listCardName}>{card.name}</Text>
                  <Text style={styles.listCardNumber}>{card.number}</Text>
                  <Text style={styles.listCardSet}>{card.set}</Text>
                  <Text style={styles.listCardRarity}>{card.rarity}</Text>
                </View>
                <View style={styles.listCheckbox}>
                  <Text style={styles.checkbox}>
                    {card.isOwned ? '☑' : '☐'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 16,
    fontWeight: '600',
  },
  text: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  cardsContainer: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  cardsLoading: {
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_MARGIN,
  },
  cardItem: {
    margin: CARD_MARGIN,
    marginBottom: 8,
    alignItems: 'center',
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 0.7, // Card aspect ratio (height/width)
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 2,
  },
  checkbox: {
    fontSize: 16,
  },
  cardName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  missingCard: {
    opacity: 0.5,
  },
  variantBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  // List view styles
  list: {
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  missingListItem: {
    opacity: 0.6,
  },
  listImageContainer: {
    width: 60,
    height: 84, // 60 * 0.7 aspect ratio
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listInfo: {
    flex: 1,
  },
  listCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listCardNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  listCardSet: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  listCardRarity: {
    fontSize: 12,
    color: '#999',
  },
  listCheckbox: {
    marginLeft: 8,
  },
  listVariantBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listVariantBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
});





