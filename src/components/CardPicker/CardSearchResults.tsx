import React, { useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { Card } from '../../types';
import CardImage from '../Card/CardImage';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, borderRadius, fonts, type ThemeColors } from '../../constants/theme';
import { canRetryError, classifyError, type AppErrorType } from '../../utils/errorUtils';
import { getSetSymbolByName } from '../../data/pokemonEras';

/**
 * Fixed height for each card item (used for getItemLayout optimization)
 * This includes the card image (70px) + padding (8px top/bottom) + margins (8px top)
 */
const CARD_ITEM_HEIGHT = 70 + 16 + 8; // 94px total

/**
 * Individual card item in search results (memoized for performance)
 */
interface CardItemProps {
  card: Card;
  onSelect: (card: Card) => void;
  /** Whether the item is currently visible on screen (for lazy loading) */
  isVisible?: boolean;
  /** Callback when card is long-pressed (for enlarged preview) */
  onLongPress?: (card: Card) => void;
  /** Callback when long-press is released */
  onLongPressRelease?: () => void;
}

const CardResultItem = memo(function CardResultItem({ card, onSelect, isVisible = true, onLongPress, onLongPressRelease }: CardItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => onSelect(card)}
      onLongPress={onLongPress ? () => onLongPress(card) : undefined}
      onResponderRelease={onLongPressRelease}
      onResponderTerminate={onLongPressRelease}
      delayLongPress={300}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        {isVisible ? (
          <CardImage
            source={card.imageUrl}
            isMissing={false}
            style={styles.cardImage}
            priority="low"
            cardInfo={{ id: card.id, name: card.name, number: card.number, set: card.set }}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.cardNumber}>#{card.number}</Text>
        <View style={styles.setRow}>
          {getSetSymbolByName(card.set) && (
            <Image
              source={{ uri: getSetSymbolByName(card.set)! }}
              style={styles.setIcon}
              contentFit="contain"
            />
          )}
          <Text style={styles.setName} numberOfLines={1}>
            {card.set || 'Unknown Set'}
          </Text>
        </View>
      </View>
      <View style={styles.selectIndicator}>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
});

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
  /** Whether loading is pagination (load more) instead of a new search */
  isLoadingMore?: boolean;
  /** Error message to display */
  error?: string | null;
  /** The original error object (for determining if retry is possible) */
  originalError?: Error | null;
  /** Whether there are more results to load */
  hasMore?: boolean;
  /** Callback to load more results */
  onLoadMore?: () => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Callback when scrolling begins (useful for dismissing keyboard) */
  onScrollBegin?: () => void;
  /** Callback to retry the search (shown on retryable errors) */
  onRetry?: () => void;
  /** Callback when a card is long-pressed (for enlarged preview) */
  onCardLongPress?: (card: Card) => void;
  /** Callback when long-press is released */
  onCardLongPressRelease?: () => void;
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
  isLoadingMore = false,
  error = null,
  originalError = null,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No cards found',
  onScrollBegin,
  onRetry,
  onCardLongPress,
  onCardLongPressRelease,
}: CardSearchResultsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  /**
   * Track which items are currently visible for lazy loading
   * We use a Set for O(1) lookups
   */
  const [visibleItems, setVisibleItems] = React.useState<Set<string>>(new Set());
  
  /**
   * Keep FlatList viewability config/callback stable for entire component life.
   * FlatList throws if viewabilityConfigCallbackPairs identity changes.
   */
  const viewabilityConfigCallbackPairsRef = useRef([{
    viewabilityConfig: {
      itemVisiblePercentThreshold: 20,
      minimumViewTime: 100,
    },
    onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const newVisibleSet = new Set<string>();
      viewableItems.forEach((item) => {
        if (item.item?.id) {
          newVisibleSet.add(item.item.id);
        }
      });
      setVisibleItems(newVisibleSet);
    },
  }]);
  
  /**
   * getItemLayout for fixed-height items (improves scroll performance)
   * Allows FlatList to calculate scroll positions without measuring each item
   */
  const getItemLayout = useCallback((_data: Card[] | null | undefined, index: number) => ({
    length: CARD_ITEM_HEIGHT,
    offset: CARD_ITEM_HEIGHT * index,
    index,
  }), []);
  
  /**
   * Render a single card item using memoized component
   * Pass visibility status for lazy image loading
   */
  const renderCardItem = useCallback(({ item }: ListRenderItemInfo<Card>) => (
    <CardResultItem 
      card={item} 
      onSelect={onSelectCard}
      isVisible={visibleItems.size === 0 || visibleItems.has(item.id)}
      onLongPress={onCardLongPress}
      onLongPressRelease={onCardLongPressRelease}
    />
  ), [onSelectCard, visibleItems, onCardLongPress, onCardLongPressRelease]);

  /**
   * Render the footer (loading or load more button)
   */
  const renderFooter = useCallback(() => {
    if (isLoadingMore && results.length > 0) {
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
  }, [isLoadingMore, results.length, hasMore, onLoadMore, colors.primary, styles.footerLoading, styles.footerText, styles.loadMoreButton, styles.loadMoreText, styles.footerEnd, styles.footerEndText]);

  /**
   * Render loading state at top when doing a new search with existing results.
   * This keeps the spinner visible without needing to scroll to the footer.
   */
  const renderHeader = useCallback(() => {
    if (loading && !isLoadingMore && results.length > 0) {
      return (
        <View style={styles.headerLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.headerLoadingText}>Searching...</Text>
        </View>
      );
    }
    return null;
  }, [loading, isLoadingMore, results.length, colors.primary, styles.headerLoading, styles.headerLoadingText]);

  /**
   * Get error icon based on error type (Step 32C)
   */
  const getErrorIconName = useCallback((errorType: AppErrorType): keyof typeof Ionicons.glyphMap => {
    switch (errorType) {
      case 'network':
        return 'cloud-offline-outline';
      case 'rate_limit':
        return 'time-outline';
      case 'not_found':
        return 'search-outline';
      case 'server':
        return 'construct-outline';
      default:
        return 'warning-outline';
    }
  }, []);

  /**
   * Render empty state (enhanced for Step 32C)
   */
  const renderEmptyState = useCallback(() => {
    if (loading && !isLoadingMore) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (error) {
      const errorType = originalError ? classifyError(originalError) : 'unknown';
      const showRetry = onRetry && (originalError ? canRetryError(originalError) : true);
      const iconName = getErrorIconName(errorType);
      
      return (
        <View style={styles.centerContainer}>
          <Ionicons name={iconName} size={32} color={colors.error} style={styles.stateIcon} />
          <Text style={styles.errorText}>{error}</Text>
          {showRetry && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const isSearchAttempted = emptyMessage.toLowerCase().includes('no cards found');
    const isInitialPrompt = emptyMessage.toLowerCase().includes('enter a name');
    
    return (
      <View style={isInitialPrompt ? styles.topContainer : styles.centerContainer}>
        <Ionicons
          name={isSearchAttempted ? 'help-circle-outline' : 'search-outline'}
          size={32}
          color={colors.textTertiary}
          style={styles.stateIcon}
        />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        {isSearchAttempted && (
          <Text style={styles.emptyHint}>
            Try searching by the full Pokémon name{'\n'}
            (e.g., "Pikachu" or "Charizard")
          </Text>
        )}
      </View>
    );
  }, [loading, isLoadingMore, error, originalError, emptyMessage, onRetry, getErrorIconName, colors]);

  return (
    <FlatList
      data={results}
      renderItem={renderCardItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={results.length === 0 ? styles.emptyListContainer : styles.listContent}
      ListEmptyComponent={renderEmptyState}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={onScrollBegin}
      onEndReached={hasMore && onLoadMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.3}
      // Performance optimizations (Step 32B)
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={7}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
      // getItemLayout for instant scroll calculations (fixed item height)
      getItemLayout={getItemLayout}
      // Viewability tracking for lazy image loading
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairsRef.current}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  cardImagePlaceholder: {
    width: 50,
    height: 70,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: 50,
    height: 70,
    borderRadius: borderRadius.sm,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  setName: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    flex: 1,
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
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  topContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  headerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  headerLoadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  stateIcon: {
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Step 32C: Hint text for empty search results
  emptyHint: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
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
    fontFamily: fonts.semibold,
  },
  footerEnd: {
    alignItems: 'center',
    padding: spacing.md,
  },
  footerEndText: {
    fontSize: typography.xs,
    color: colors.textTertiary,
  },
  // Step 32C: Retry button styles
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
});

export default CardSearchResults;

