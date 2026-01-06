import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { Card } from '../../types';
import CardImage from '../Card/CardImage';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

/**
 * Props for CardSearchResults component
 */
export interface CardSearchResultsProps {
  /** Array of cards to display */
  results: Card[];
  /** Callback when a card is selected */
  onSelectCard: (card: Card) => void;
  /** Loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether there are more results to load */
  hasMore?: boolean;
  /** Callback to load more results */
  onLoadMore?: () => void;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Displays search results in a list view.
 * Used by CardPickerModal to show search results.
 * 
 * Features:
 * - List view with card image and details
 * - Loading spinner while searching
 * - Error state display
 * - Empty state when no results
 * - "Load more" button for pagination
 */
export function CardSearchResults({
  results,
  onSelectCard,
  loading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No cards found',
}: CardSearchResultsProps) {
  
  /**
   * Render a single card item
   */
  const renderCardItem = useCallback(({ item }: { item: Card }) => (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => onSelectCard(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        <CardImage
          imageUrl={item.imageUrl}
          cardName={item.name}
          size="small"
          isMissing={false}
        />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardDetails} numberOfLines={1}>
          #{item.number} • {item.set || 'Unknown Set'}
        </Text>
        {item.rarity ? (
          <Text style={styles.cardRarity}>{item.rarity}</Text>
        ) : null}
        {item.supertype ? (
          <Text style={styles.cardSupertype}>{item.supertype}</Text>
        ) : null}
      </View>
      <View style={styles.selectIndicator}>
        <Text style={styles.selectIcon}>›</Text>
      </View>
    </TouchableOpacity>
  ), [onSelectCard]);

  /**
   * Render the footer (loading or load more button)
   */
  const renderFooter = useCallback(() => {
    if (loading && results.length > 0) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }

    if (hasMore && onLoadMore) {
      return (
        <TouchableOpacity style={styles.loadMoreButton} onPress={onLoadMore}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }

    if (results.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            {results.length} card{results.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      );
    }

    return null;
  }, [loading, results.length, hasMore, onLoadMore]);

  /**
   * Render empty state
   */
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🔎</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }, [loading, error, emptyMessage]);

  return (
    <FlatList
      data={results}
      renderItem={renderCardItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={results.length === 0 ? styles.emptyListContainer : styles.listContent}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      onEndReached={hasMore && onLoadMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.3}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.md,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImageContainer: {
    width: 50,
    height: 70,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  cardDetails: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cardRarity: {
    fontSize: typography.xs,
    color: colors.primary,
  },
  cardSupertype: {
    fontSize: typography.xs,
    color: colors.textTertiary,
  },
  selectIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: typography.bold,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  footerText: {
    marginLeft: spacing.sm,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  footerEnd: {
    alignItems: 'center',
    padding: spacing.md,
  },
  footerEndText: {
    fontSize: typography.xs,
    color: colors.textTertiary,
  },
});

export default CardSearchResults;

