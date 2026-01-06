import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import CardItem from './CardItem';
import type { Card } from '../../types';
import { colors, spacing, typography } from '../../constants/theme';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

interface CardGridPaginatedProps {
  cards: CardWithOwnership[];
  onCardPress?: (card: CardWithOwnership) => void;
  binderId: string;
  cardWidth: number;
  numColumns: number;
  /** Number of cards to load initially and per batch */
  pageSize?: number;
  /** Show loading progress */
  showProgress?: boolean;
  /** Total cards in binder (for progress display) */
  totalCards?: number;
}

const CARD_MARGIN = 2;

/**
 * Paginated card grid using FlatList for better performance.
 * Loads cards in batches as user scrolls (infinite scroll).
 */
export default function CardGridPaginated({
  cards,
  onCardPress,
  binderId,
  cardWidth,
  numColumns,
  pageSize = 30,
  showProgress = true,
  totalCards,
}: CardGridPaginatedProps) {
  // Track how many cards to display
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Get cards to display (paginated)
  const displayedCards = cards.slice(0, displayCount);
  const hasMoreCards = displayCount < cards.length;

  // Load more cards when user scrolls to bottom
  const loadMoreCards = useCallback(() => {
    if (isLoadingMore || !hasMoreCards) return;

    setIsLoadingMore(true);
    
    // Small delay to show loading indicator and prevent rapid calls
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + pageSize, cards.length));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasMoreCards, pageSize, cards.length]);

  // Render a single card item
  const renderCard = useCallback(
    ({ item }: { item: CardWithOwnership }) => (
      <CardItem
        key={item.id}
        card={item}
        onPress={onCardPress}
        binderId={binderId}
        width={cardWidth}
        variant="grid"
      />
    ),
    [onCardPress, binderId, cardWidth]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CardWithOwnership) => item.id, []);

  // Footer component (loading indicator)
  const renderFooter = useCallback(() => {
    if (!hasMoreCards) {
      // All cards loaded
      return (
        <View style={styles.footerComplete}>
          <Text style={styles.footerCompleteText}>
            All {cards.length} cards loaded
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
  }, [hasMoreCards, isLoadingMore, cards.length]);

  // Progress header
  const renderHeader = useCallback(() => {
    if (!showProgress) return null;

    const total = totalCards || cards.length;
    const loaded = displayedCards.length;
    const percentage = Math.round((loaded / total) * 100);

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Showing {loaded} of {total} cards
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${percentage}%` }]} />
        </View>
      </View>
    );
  }, [showProgress, totalCards, cards.length, displayedCards.length]);

  return (
    <FlatList
      data={displayedCards}
      renderItem={renderCard}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.container}
      onEndReached={loadMoreCards}
      onEndReachedThreshold={0.5} // Load more when 50% from bottom
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={pageSize}
      windowSize={5}
      initialNumToRender={pageSize}
      // Prevent re-renders
      extraData={displayCount}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  row: {
    marginHorizontal: -CARD_MARGIN,
  },
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
  progressContainer: {
    paddingBottom: spacing.md,
  },
  progressText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.backgroundDark,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

