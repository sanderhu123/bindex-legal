import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import type { CardSearchFilters } from '../../types';
import { POKEMON_ERAS } from '../../data/pokemonEras';
import { SearchableListPicker, type ListPickerItem } from './SearchableListPicker';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

/**
 * Props for CardPickerFilters
 */
export interface CardPickerFiltersProps {
  /** Current active filters */
  filters: CardSearchFilters;
  /** Called when filters change */
  onFiltersChange: (filters: CardSearchFilters) => void;
}

/**
 * Well-known rarity values in the Pokémon TCG (ordered roughly by commonality)
 */
const RARITY_OPTIONS: ListPickerItem[] = [
  { id: 'Common', label: 'Common' },
  { id: 'Uncommon', label: 'Uncommon' },
  { id: 'Rare', label: 'Rare' },
  { id: 'Holo Rare', label: 'Holo Rare' },
  { id: 'Rare Holo', label: 'Rare Holo' },
  { id: 'Ultra Rare', label: 'Ultra Rare' },
  { id: 'Rare Ultra', label: 'Rare Ultra' },
  { id: 'Illustration Rare', label: 'Illustration Rare' },
  { id: 'Special Illustration Rare', label: 'Special Illustration Rare' },
  { id: 'Hyper Rare', label: 'Hyper Rare' },
  { id: 'Double Rare', label: 'Double Rare' },
  { id: 'Art Rare', label: 'Art Rare' },
  { id: 'Special Art Rare', label: 'Special Art Rare' },
  { id: 'Shiny Rare', label: 'Shiny Rare' },
  { id: 'Shiny Ultra Rare', label: 'Shiny Ultra Rare' },
  { id: 'ACE SPEC Rare', label: 'ACE SPEC Rare' },
  { id: 'Amazing Rare', label: 'Amazing Rare' },
  { id: 'Radiant Rare', label: 'Radiant Rare' },
  { id: 'Rare Holo EX', label: 'Rare Holo EX' },
  { id: 'Rare Holo GX', label: 'Rare Holo GX' },
  { id: 'Rare Holo V', label: 'Rare Holo V' },
  { id: 'Rare Holo VMAX', label: 'Rare Holo VMAX' },
  { id: 'Rare Holo VSTAR', label: 'Rare Holo VSTAR' },
  { id: 'Rare BREAK', label: 'Rare BREAK' },
  { id: 'Rare Prime', label: 'Rare Prime' },
  { id: 'Rare Prism Star', label: 'Rare Prism Star' },
  { id: 'Rare Rainbow', label: 'Rare Rainbow' },
  { id: 'Rare Secret', label: 'Rare Secret' },
  { id: 'Rare Shining', label: 'Rare Shining' },
  { id: 'Rare Shiny', label: 'Rare Shiny' },
  { id: 'Rare Shiny GX', label: 'Rare Shiny GX' },
  { id: 'LEGEND', label: 'LEGEND' },
  { id: 'Promo', label: 'Promo' },
  { id: 'Classic Collection', label: 'Classic Collection' },
];

/**
 * Horizontal filter chips bar for the CardPicker.
 *
 * Shows filter chips for Era, Set, Rarity, and Illustrator.
 * - Tapping Era/Set/Rarity opens a searchable list picker modal.
 * - Illustrator uses an inline text input.
 * - Active chips show the selected value with an X to clear.
 * - Era and Set are linked: selecting an era narrows the set list;
 *   selecting a set auto-fills the era.
 */
export function CardPickerFilters({ filters, onFiltersChange }: CardPickerFiltersProps) {
  // Which picker is currently open
  const [activePicker, setActivePicker] = useState<'era' | 'set' | 'rarity' | null>(null);
  // Whether the illustrator inline input is shown
  const [showIllustratorInput, setShowIllustratorInput] = useState(false);
  // Local illustrator text (committed on submit)
  const [illustratorText, setIllustratorText] = useState(filters.illustrator || '');

  // ----- Build era items from hard-coded data -----
  const eraItems: ListPickerItem[] = useMemo(() => {
    return POKEMON_ERAS.map(era => ({
      id: era.name, // use name as ID because that's what searchCardsByName uses
      label: era.name,
      subtitle: `${era.sets.length} sets`,
    }));
  }, []);

  // ----- Build set items (filtered by era if one is selected) -----
  const setItems: ListPickerItem[] = useMemo(() => {
    const items: ListPickerItem[] = [];

    if (filters.era) {
      // Only show sets from the selected era
      const era = POKEMON_ERAS.find(e => e.name === filters.era);
      if (era) {
        for (const set of era.sets) {
          items.push({
            id: set.id,
            label: set.name,
            subtitle: set.releaseDate,
          });
        }
      }
    } else {
      // Show all sets, grouped by era (newest first)
      for (const era of POKEMON_ERAS) {
        for (const set of era.sets) {
          items.push({
            id: set.id,
            label: set.name,
            subtitle: `${era.name} • ${set.releaseDate}`,
          });
        }
      }
    }

    return items;
  }, [filters.era]);

  // ----- Find which era a set belongs to -----
  const findEraForSet = useCallback((setId: string): string | undefined => {
    for (const era of POKEMON_ERAS) {
      if (era.sets.some(s => s.id === setId)) {
        return era.name;
      }
    }
    return undefined;
  }, []);

  // ----- Handler: era selected -----
  const handleEraSelect = useCallback(
    (item: ListPickerItem) => {
      setActivePicker(null);
      if (!item.id) {
        // Clear era (and set, since the set list depends on era)
        onFiltersChange({ ...filters, era: undefined, setId: undefined });
      } else {
        // When era changes, clear the set (it might not belong to new era)
        onFiltersChange({ ...filters, era: item.id, setId: undefined });
      }
    },
    [filters, onFiltersChange]
  );

  // ----- Handler: set selected -----
  const handleSetSelect = useCallback(
    (item: ListPickerItem) => {
      setActivePicker(null);
      if (!item.id) {
        // Clear set
        onFiltersChange({ ...filters, setId: undefined });
      } else {
        // Auto-fill era when a set is selected
        const eraName = findEraForSet(item.id);
        onFiltersChange({
          ...filters,
          setId: item.id,
          era: eraName || filters.era,
        });
      }
    },
    [filters, onFiltersChange, findEraForSet]
  );

  // ----- Handler: rarity selected -----
  const handleRaritySelect = useCallback(
    (item: ListPickerItem) => {
      setActivePicker(null);
      if (!item.id) {
        onFiltersChange({ ...filters, rarity: undefined });
      } else {
        onFiltersChange({ ...filters, rarity: item.id });
      }
    },
    [filters, onFiltersChange]
  );

  // ----- Handler: illustrator submitted -----
  const handleIllustratorSubmit = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = illustratorText.trim();
    if (trimmed) {
      onFiltersChange({ ...filters, illustrator: trimmed });
    } else {
      onFiltersChange({ ...filters, illustrator: undefined });
    }
    setShowIllustratorInput(false);
  }, [illustratorText, filters, onFiltersChange]);

  // ----- Handler: clear illustrator -----
  const handleClearIllustrator = useCallback(() => {
    setIllustratorText('');
    onFiltersChange({ ...filters, illustrator: undefined });
    setShowIllustratorInput(false);
  }, [filters, onFiltersChange]);

  // Sync illustratorText if filter is cleared externally
  React.useEffect(() => {
    if (!filters.illustrator) {
      setIllustratorText('');
    }
  }, [filters.illustrator]);

  // ----- Helper: get display label for a set ID -----
  const getSetLabel = useCallback((setId: string): string => {
    for (const era of POKEMON_ERAS) {
      const found = era.sets.find(s => s.id === setId);
      if (found) return found.name;
    }
    return setId;
  }, []);

  // Count active filters
  const activeFilterCount = [filters.era, filters.setId, filters.rarity, filters.illustrator].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {/* Era chip */}
        <FilterChip
          label="Era"
          value={filters.era}
          onPress={() => { Keyboard.dismiss(); setActivePicker('era'); }}
          onClear={() => onFiltersChange({ ...filters, era: undefined, setId: undefined })}
        />

        {/* Set chip */}
        <FilterChip
          label="Set"
          value={filters.setId ? getSetLabel(filters.setId) : undefined}
          onPress={() => { Keyboard.dismiss(); setActivePicker('set'); }}
          onClear={() => onFiltersChange({ ...filters, setId: undefined })}
        />

        {/* Rarity chip */}
        <FilterChip
          label="Rarity"
          value={filters.rarity}
          onPress={() => { Keyboard.dismiss(); setActivePicker('rarity'); }}
          onClear={() => onFiltersChange({ ...filters, rarity: undefined })}
        />

        {/* Illustrator chip */}
        <FilterChip
          label="Illustrator"
          value={filters.illustrator}
          onPress={() => {
            Keyboard.dismiss();
            setShowIllustratorInput(true);
            setIllustratorText(filters.illustrator || '');
          }}
          onClear={handleClearIllustrator}
        />

        {/* Clear all (only shown when filters are active) */}
        {activeFilterCount > 1 && (
          <TouchableOpacity
            style={styles.clearAllChip}
            onPress={() => {
              setIllustratorText('');
              setShowIllustratorInput(false);
              onFiltersChange({});
            }}
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Illustrator inline input (shown below chips when active) */}
      {showIllustratorInput && (
        <View style={styles.illustratorInputRow}>
          <View style={styles.illustratorInputContainer}>
            <TextInput
              style={styles.illustratorInput}
              placeholder="Type illustrator name..."
              placeholderTextColor={colors.textTertiary}
              value={illustratorText}
              onChangeText={setIllustratorText}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={handleIllustratorSubmit}
            />
            {illustratorText.length > 0 && (
              <TouchableOpacity
                onPress={() => setIllustratorText('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.inputClearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.illustratorApplyButton} onPress={handleIllustratorSubmit}>
            <Text style={styles.illustratorApplyText}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.illustratorCancelButton}
            onPress={() => setShowIllustratorInput(false)}
          >
            <Text style={styles.illustratorCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Searchable list pickers (modals) */}
      <SearchableListPicker
        visible={activePicker === 'era'}
        title="Select Era"
        items={eraItems}
        selectedId={filters.era}
        onSelect={handleEraSelect}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search eras..."
      />

      <SearchableListPicker
        visible={activePicker === 'set'}
        title={filters.era ? `Sets in ${filters.era}` : 'Select Set'}
        items={setItems}
        selectedId={filters.setId}
        onSelect={handleSetSelect}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search sets..."
      />

      <SearchableListPicker
        visible={activePicker === 'rarity'}
        title="Select Rarity"
        items={RARITY_OPTIONS}
        selectedId={filters.rarity}
        onSelect={handleRaritySelect}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search rarities..."
      />
    </View>
  );
}

// ==================== FilterChip sub-component ====================

interface FilterChipProps {
  label: string;
  value?: string;
  onPress: () => void;
  onClear: () => void;
}

/**
 * A single filter chip. Gray when inactive, blue when active.
 * Shows the selected value and an X button to clear.
 */
function FilterChip({ label, value, onPress, onClear }: FilterChipProps) {
  const isActive = !!value;

  if (isActive) {
    // Active chip: label area opens picker, X button clears
    return (
      <View style={[styles.chip, styles.chipActive]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.chipLabelTouch}>
          <Text style={[styles.chipText, styles.chipTextActive]} numberOfLines={1}>
            {value}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          style={styles.chipClearButton}
        >
          <Text style={styles.chipClearIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Inactive chip: whole chip opens picker
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.chipArrow}>▾</Text>
    </TouchableOpacity>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  // -- Filter chip --
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 180,
  },
  chipActive: {
    backgroundColor: '#EBF5FF',
    borderColor: colors.primary,
  },
  chipLabelTouch: {
    flexShrink: 1,
  },
  chipText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontWeight: typography.medium,
    flexShrink: 1,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  chipArrow: {
    fontSize: 10,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  chipClearButton: {
    marginLeft: 4,
    padding: 2,
  },
  chipClearIcon: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.bold,
  },

  // -- Clear all --
  clearAllChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  clearAllText: {
    fontSize: typography.sm,
    color: colors.error,
    fontWeight: typography.medium,
  },

  // -- Illustrator inline input --
  illustratorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  illustratorInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
  },
  illustratorInput: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  inputClearIcon: {
    fontSize: 12,
    color: colors.textTertiary,
    padding: spacing.xs,
  },
  illustratorApplyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  illustratorApplyText: {
    fontSize: typography.sm,
    color: colors.background,
    fontWeight: typography.semibold,
  },
  illustratorCancelButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  illustratorCancelText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontWeight: typography.medium,
  },
});

export default CardPickerFilters;
