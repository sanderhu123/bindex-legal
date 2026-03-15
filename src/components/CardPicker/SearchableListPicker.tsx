import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, fonts } from '../../constants/theme';

/**
 * A single item in the searchable list
 */
export interface ListPickerItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional subtitle shown below the label */
  subtitle?: string;
}

/**
 * Props for the SearchableListPicker component
 */
export interface SearchableListPickerProps {
  /** Whether the picker modal is visible */
  visible: boolean;
  /** Title shown at the top of the picker */
  title: string;
  /** Array of items to choose from */
  items: ListPickerItem[];
  /** Set of currently selected item IDs (supports multi-select) */
  selectedIds: Set<string>;
  /** Called when the user taps Done Ã¢â‚¬â€ receives the final set of selected IDs */
  onDone: (selectedIds: Set<string>) => void;
  /** Called when the picker is closed via Cancel or backdrop */
  onClose: () => void;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
}

/** Fixed height for each list item (for getItemLayout optimization) */
const ITEM_HEIGHT = 52;

/**
 * A modal with a search bar and scrollable list for picking multiple items.
 * Used for Era, Set, and Rarity filters in the CardPicker.
 *
 * Features:
 * - Multi-select: tap items to toggle checkmarks
 * - Text input filters the list instantly (no API call)
 * - "Done" button confirms and closes
 * - "Clear all" removes all selections
 * - Selected count shown in header
 */
export function SearchableListPicker({
  visible,
  title,
  items,
  selectedIds,
  onDone,
  onClose,
  searchPlaceholder = 'Search...',
}: SearchableListPickerProps) {
  const [searchText, setSearchText] = useState('');
  // Local selection state so changes aren't applied until "Done"
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));

  // Sync local state when modal opens with new selectedIds
  React.useEffect(() => {
    if (visible) {
      setLocalSelected(new Set(selectedIds));
      setSearchText('');
    }
  }, [visible, selectedIds]);

  // Filter items based on search text (instant, local filtering)
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    const lower = searchText.trim().toLowerCase();
    return items.filter(
      item =>
        item.label.toLowerCase().includes(lower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lower))
    );
  }, [items, searchText]);

  // Handle closing without saving
  const handleClose = useCallback(() => {
    setSearchText('');
    onClose();
  }, [onClose]);

  // Handle Done Ã¢â‚¬â€ save selections
  const handleDone = useCallback(() => {
    setSearchText('');
    onDone(localSelected);
  }, [localSelected, onDone]);

  // Toggle an item selection
  const handleToggle = useCallback((itemId: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    setLocalSelected(new Set());
  }, []);

  // Render a single list item with a checkbox
  const renderItem = useCallback(
    ({ item }: { item: ListPickerItem }) => {
      const isSelected = localSelected.has(item.id);
      return (
        <TouchableOpacity
          style={[styles.listItem, isSelected && styles.listItemSelected]}
          onPress={() => handleToggle(item.id)}
          activeOpacity={0.7}
        >
          {/* Checkbox */}
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxIcon}>Ã¢Å“â€œ</Text>}
          </View>
          <View style={styles.listItemContent}>
            <Text
              style={[styles.listItemLabel, isSelected && styles.listItemLabelSelected]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {item.subtitle ? (
              <Text style={styles.listItemSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [localSelected, handleToggle]
  );

  // getItemLayout for fixed-height items
  const getItemLayout = useCallback(
    (_data: ListPickerItem[] | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const selectionCount = localSelected.size;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {selectionCount > 0 && (
                <Text style={styles.selectionCount}>
                  {selectionCount} selected
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>Ã°Å¸â€Â</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textTertiary}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearIcon}>Ã¢Å“â€¢</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Clear all button (if items are selected) */}
          {selectionCount > 0 && (
            <TouchableOpacity style={styles.clearFilterButton} onPress={handleClearAll}>
              <Text style={styles.clearFilterText}>Clear all selections</Text>
            </TouchableOpacity>
          )}

          {/* List */}
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            getItemLayout={getItemLayout}
            extraData={localSelected}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText ? `No results for "${searchText}"` : 'No items available'}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </View>
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
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
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
  cancelText: {
    fontSize: typography.base,
    color: colors.primary,
    fontFamily: fonts.medium,
    minWidth: 60,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  selectionCount: {
    fontSize: typography.xs,
    color: colors.primary,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  doneText: {
    fontSize: typography.base,
    color: colors.primary,
    fontFamily: fonts.semibold,
    minWidth: 60,
    textAlign: 'right',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textTertiary,
    padding: spacing.xs,
  },
  clearFilterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clearFilterText: {
    fontSize: typography.sm,
    color: colors.error,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: ITEM_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  listItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxIcon: {
    fontSize: 14,
    color: '#fff',
    fontFamily: fonts.bold,
  },
  listItemContent: {
    flex: 1,
  },
  listItemLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  listItemLabelSelected: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  listItemSubtitle: {
    fontSize: typography.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

export default SearchableListPicker;
