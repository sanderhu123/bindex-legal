import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Card } from '../../types';
import { useCardPicker } from '../../hooks/useCardPicker';
import { CardSearchResults } from './CardSearchResults';
import { CardPickerFilters } from './CardPickerFilters';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

/** Modal height as percentage of screen (85%) */
const MODAL_HEIGHT_RATIO = 0.85;
/** Animation duration in milliseconds */
const ANIMATION_DURATION = 300;

/**
 * Props for CardPickerModal component
 */
export interface CardPickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed (cancelled) */
  onClose: () => void;
  /** Callback when a card is selected */
  onSelectCard: (card: Card) => void;
  /** Title displayed at the top of the modal */
  title?: string;
  /** Initial search query (e.g., "Bulbasaur" for Region mode) */
  initialQuery?: string;
  /** Filter to only show Pokémon cards (exclude Trainers) */
  pokemonOnly?: boolean;
  /** 
   * Use exact word matching for names (default: true when initialQuery is provided)
   * When true, searching "Pidgeot" will NOT match "Pidgeotto"
   */
  exactMatch?: boolean;
}

/**
 * Bottom sheet modal for searching and selecting cards.
 * 
 * Used by:
 * - Custom binder mode (add any card)
 * - Extra cards feature (add cards to Master Set)
 * - Region card selection (pick TCG card for Pokémon slot)
 * 
 * Features:
 * - Bottom sheet style (slides up, covers ~85% of screen)
 * - Debounced search (300ms delay)
 * - Filter chips for Era, Set, Rarity, Illustrator
 * - List view showing card images and details
 * - Loading, empty, and error states
 * - Tap backdrop or Cancel button to close
 * - Tap card to select and close
 * 
 * @example
 * <CardPickerModal
 *   visible={showPicker}
 *   onClose={() => setShowPicker(false)}
 *   onSelectCard={(card) => handleCardSelected(card)}
 *   title="Add Card"
 *   pokemonOnly={false}
 * />
 */
export function CardPickerModal({
  visible,
  onClose,
  onSelectCard,
  title = 'Search Cards',
  initialQuery = '',
  pokemonOnly = false,
  exactMatch,
}: CardPickerModalProps) {
  // Get dynamic screen dimensions for responsive layout
  const { height: screenHeight } = useWindowDimensions();
  
  // Ref to the search input for managing focus
  const searchInputRef = useRef<TextInput>(null);
  
  // Default exactMatch to true when initialQuery is provided (region mode)
  // This prevents "Pidgeot" from matching "Pidgeotto" cards
  const useExactMatch = exactMatch ?? (initialQuery.length > 0);
  
  // Use the card picker hook (includes filter state)
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    originalError,
    hasMore,
    loadMore,
    clear,
    search,
    filters,
    setFilters,
  } = useCardPicker({
    debounceMs: 300,
    initialQuery,
    pokemonOnly,
    pageSize: 30,
    exactMatch: useExactMatch,
  });

  // Check if any filters are active (for empty state message)
  const hasActiveFilters = !!(filters.era || filters.setId || filters.rarity || filters.illustrator);

  /**
   * Dismiss keyboard when scrolling results
   */
  const handleScrollBegin = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  /**
   * Handle card selection
   */
  const handleSelectCard = useCallback((card: Card) => {
    console.log('[CardPickerModal] Card selected:', { id: card.id, name: card.name });
    Keyboard.dismiss();
    onSelectCard(card);
    onClose();
  }, [onSelectCard, onClose]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    console.log('[CardPickerModal] Modal closed');
    Keyboard.dismiss();
    clear();
    onClose();
  }, [clear, onClose]);

  /**
   * Handle backdrop press
   */
  const handleBackdropPress = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Reset when modal opens with initialQuery
  useEffect(() => {
    if (visible && initialQuery) {
      setQuery(initialQuery);
    }
  }, [visible, initialQuery, setQuery]);

  // Clear when modal closes
  useEffect(() => {
    if (!visible) {
      // Small delay to allow close animation
      const timer = setTimeout(() => {
        clear();
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [visible, clear]);

  // Calculate modal height based on screen size
  const modalHeight = screenHeight * MODAL_HEIGHT_RATIO;

  // Build the empty state message
  const emptyMessage = (() => {
    if (query.length > 0 && hasActiveFilters) {
      return `No cards found for "${query}" with the selected filters`;
    }
    if (query.length > 0) {
      return `No cards found for "${query}"`;
    }
    if (hasActiveFilters) {
      return 'No cards match the selected filters';
    }
    return 'Enter a name or select filters to search';
  })();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        style={[styles.bottomSheet, { height: modalHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            
            {/* Placeholder for symmetry */}
            <View style={styles.cancelButton}>
              <Text style={[styles.cancelText, { opacity: 0 }]}>Cancel</Text>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search by Pokémon name..."
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={!initialQuery}
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Chips */}
          <CardPickerFilters
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Results */}
          <View style={styles.resultsContainer}>
            <CardSearchResults
              results={results}
              onSelectCard={handleSelectCard}
              loading={loading}
              error={error}
              originalError={originalError}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onScrollBegin={handleScrollBegin}
              onRetry={search}
              emptyMessage={emptyMessage}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // height is set dynamically via style prop using useWindowDimensions
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  safeArea: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
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
  cancelButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 60,
  },
  cancelText: {
    fontSize: typography.base,
    color: colors.primary,
    fontWeight: typography.medium,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
});

export default CardPickerModal;
