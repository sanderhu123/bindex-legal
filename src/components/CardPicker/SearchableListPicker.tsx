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
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

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
  /** Currently selected item ID (or undefined for no selection) */
  selectedId?: string;
  /** Called when the user selects an item */
  onSelect: (item: ListPickerItem) => void;
  /** Called when the picker is closed without selecting */
  onClose: () => void;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
}

/** Fixed height for each list item (for getItemLayout optimization) */
const ITEM_HEIGHT = 52;

/**
 * A modal with a search bar and scrollable list for picking one item.
 * Used for Era, Set, and Rarity filters in the CardPicker.
 *
 * Features:
 * - Text input at the top filters the list instantly (no API call)
 * - Scrollable list below shows matching items
 * - Tap an item to select and close
 * - Currently selected item is highlighted
 * - "Clear" option to remove the filter
 */
export function SearchableListPicker({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  searchPlaceholder = 'Search...',
}: SearchableListPickerProps) {
  const [searchText, setSearchText] = useState('');

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

  // Reset search text when modal closes
  const handleClose = useCallback(() => {
    setSearchText('');
    onClose();
  }, [onClose]);

  // Handle selecting an item
  const handleSelect = useCallback(
    (item: ListPickerItem) => {
      setSearchText('');
      onSelect(item);
    },
    [onSelect]
  );

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    setSearchText('');
    // Pass a special "clear" item with empty id
    onSelect({ id: '', label: '' });
  }, [onSelect]);

  // Render a single list item
  const renderItem = useCallback(
    ({ item }: { item: ListPickerItem }) => {
      const isSelected = item.id === selectedId;
      return (
        <TouchableOpacity
          style={[styles.listItem, isSelected && styles.listItemSelected]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
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
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [selectedId, handleSelect]
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
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
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
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Clear filter button (if something is currently selected) */}
          {selectedId ? (
            <TouchableOpacity style={styles.clearFilterButton} onPress={handleClear}>
              <Text style={styles.clearFilterText}>Clear filter</Text>
            </TouchableOpacity>
          ) : null}

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
    fontWeight: typography.medium,
    minWidth: 60,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  doneText: {
    fontSize: typography.base,
    color: colors.primary,
    fontWeight: typography.semibold,
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
    fontWeight: typography.medium,
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
  listItemContent: {
    flex: 1,
  },
  listItemLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.regular,
  },
  listItemLabelSelected: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  listItemSubtitle: {
    fontSize: typography.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: typography.bold,
    marginLeft: spacing.sm,
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
