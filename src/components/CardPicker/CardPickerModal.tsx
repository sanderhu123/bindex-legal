import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Card } from '../../types';
import { useCardPicker } from '../../hooks/useCardPicker';
import { CardSearchResults } from './CardSearchResults';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
 * - Bottom sheet style (slides up, covers ~80% of screen)
 * - Debounced search (300ms delay)
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
  
  // Default exactMatch to true when initialQuery is provided (region mode)
  // This prevents "Pidgeot" from matching "Pidgeotto" cards
  const useExactMatch = exactMatch ?? (initialQuery.length > 0);
  
  // Use the card picker hook
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    hasMore,
    loadMore,
    clear,
  } = useCardPicker({
    debounceMs: 300,
    initialQuery,
    pokemonOnly,
    pageSize: 30,
    exactMatch: useExactMatch,
  });

  /**
   * Handle card selection
   */
  const handleSelectCard = useCallback((card: Card) => {
    console.log('[CardPickerModal] Card selected:', { id: card.id, name: card.name });
    onSelectCard(card);
    onClose();
  }, [onSelectCard, onClose]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    console.log('[CardPickerModal] Modal closed');
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, clear]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        style={styles.bottomSheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>{title}</Text>
            
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
                style={styles.searchInput}
                placeholder="Search by Pokémon name..."
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={!initialQuery}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clear}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            <CardSearchResults
              results={results}
              onSelectCard={handleSelectCard}
              loading={loading}
              error={error}
              hasMore={hasMore}
              onLoadMore={loadMore}
              emptyMessage={
                query.length > 0
                  ? `No cards found for "${query}"`
                  : 'Enter a Pokémon name to search'
              }
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
    height: SCREEN_HEIGHT * 0.85, // 85% of screen height
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

