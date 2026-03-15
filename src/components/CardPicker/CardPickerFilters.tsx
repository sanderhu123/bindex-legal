import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { colors, spacing, typography, borderRadius, fonts } from '../../constants/theme';
import { getRarities, getRaritiesForSets } from '../../services/api/pokemonApi';

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
 * Horizontal filter chips bar for the CardPicker.
 *
 * Supports multi-select for all four filters:
 * - Era, Set, Rarity: opens a searchable multi-select list picker
 * - Illustrator: inline text input, each "Apply" adds a name to the list
 * - Active chips show the count or single value, with an X to clear
 * - Era and Set are linked: selecting eras narrows the set list
 */
export function CardPickerFilters({ filters, onFiltersChange }: CardPickerFiltersProps) {
  // Which picker is currently open
  const [activePicker, setActivePicker] = useState<'era' | 'set' | 'rarity' | null>(null);
  // Whether the illustrator inline input is shown
  const [showIllustratorInput, setShowIllustratorInput] = useState(false);
  // Local illustrator text (committed on submit)
  const [illustratorText, setIllustratorText] = useState('');
  // Rarities fetched from the TCGDEX API (filtered by selected sets when applicable)
  const [apiRarities, setApiRarities] = useState<string[]>([]);

  useEffect(() => {
    const setIds = filters.setIds && filters.setIds.length > 0 ? filters.setIds : [];
    if (setIds.length > 0) {
      getRaritiesForSets(setIds).then(setApiRarities);
    } else {
      getRarities().then(setApiRarities);
    }
  }, [filters.setIds]);

  // ----- Build era items from hard-coded data -----
  const eraItems: ListPickerItem[] = useMemo(() => {
    return POKEMON_ERAS.map(era => ({
      id: era.name,
      label: era.name,
      subtitle: `${era.sets.length} sets`,
    }));
  }, []);

  // ----- Build set items (filtered by selected eras) -----
  const setItems: ListPickerItem[] = useMemo(() => {
    const items: ListPickerItem[] = [];
    const selectedEras = filters.eras && filters.eras.length > 0 ? filters.eras : null;

    if (selectedEras) {
      // Only show sets from selected eras
      for (const eraName of selectedEras) {
        const era = POKEMON_ERAS.find(e => e.name === eraName);
        if (era) {
          for (const set of era.sets) {
            items.push({
              id: set.id,
              label: set.name,
              subtitle: `${era.name} â€¢ ${set.releaseDate}`,
            });
          }
        }
      }
    } else {
      // Show all sets (newest first)
      for (const era of POKEMON_ERAS) {
        for (const set of era.sets) {
          items.push({
            id: set.id,
            label: set.name,
            subtitle: `${era.name} â€¢ ${set.releaseDate}`,
          });
        }
      }
    }

    return items;
  }, [filters.eras]);

  // ----- Build rarity items from API data -----
  const rarityItems: ListPickerItem[] = useMemo(() => {
    return apiRarities.map(r => ({ id: r, label: r }));
  }, [apiRarities]);

  // ----- Convert arrays to Sets for the picker -----
  const eraSelectedIds = useMemo(() => new Set(filters.eras || []), [filters.eras]);
  const setSelectedIds = useMemo(() => new Set(filters.setIds || []), [filters.setIds]);
  const raritySelectedIds = useMemo(() => new Set(filters.rarities || []), [filters.rarities]);

  // ----- Handler: era picker done -----
  const handleEraDone = useCallback(
    (selectedIds: Set<string>) => {
      setActivePicker(null);
      const eras = Array.from(selectedIds);
      // When eras change, remove any set selections that no longer belong
      let setIds = filters.setIds || [];

      if (eras.length > 0) {
        const validSetIds = new Set<string>();
        for (const eraName of eras) {
          const era = POKEMON_ERAS.find(e => e.name === eraName);
          if (era) {
            for (const s of era.sets) validSetIds.add(s.id);
          }
        }
        setIds = setIds.filter(id => validSetIds.has(id));
      }
      onFiltersChange({
        ...filters,
        eras: eras.length > 0 ? eras : undefined,
        setIds: setIds.length > 0 ? setIds : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // ----- Handler: set picker done -----
  const handleSetDone = useCallback(
    (selectedIds: Set<string>) => {
      setActivePicker(null);
      const setIds = Array.from(selectedIds);

      onFiltersChange({
        ...filters,
        setIds: setIds.length > 0 ? setIds : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // ----- Handler: rarity picker done -----
  const handleRarityDone = useCallback(
    (selectedIds: Set<string>) => {
      setActivePicker(null);
      const rarities = Array.from(selectedIds);
      onFiltersChange({
        ...filters,
        rarities: rarities.length > 0 ? rarities : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // ----- Handler: illustrator add -----
  const handleIllustratorAdd = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = illustratorText.trim();
    if (!trimmed) return;

    // Add to the list (avoid duplicates)
    const current = filters.illustrators || [];
    if (!current.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      onFiltersChange({
        ...filters,
        illustrators: [...current, trimmed],
      });
    }
    setIllustratorText('');
    setShowIllustratorInput(false);
  }, [illustratorText, filters, onFiltersChange]);

  // ----- Handler: remove one illustrator -----
  const handleRemoveIllustrator = useCallback((name: string) => {
    const current = filters.illustrators || [];
    const updated = current.filter(i => i !== name);
    onFiltersChange({
      ...filters,
      illustrators: updated.length > 0 ? updated : undefined,
    });
  }, [filters, onFiltersChange]);

  // ----- Handler: clear all illustrators -----
  const handleClearIllustrators = useCallback(() => {
    setIllustratorText('');
    setShowIllustratorInput(false);
    onFiltersChange({ ...filters, illustrators: undefined });
  }, [filters, onFiltersChange]);

  // ----- Helper: get display label for a set ID -----
  const getSetLabel = useCallback((setId: string): string => {
    for (const era of POKEMON_ERAS) {
      const found = era.sets.find(s => s.id === setId);
      if (found) return found.name;
    }
    return setId;
  }, []);

  // ----- Helper: build chip display text -----
  const getChipDisplay = useCallback((items: string[] | undefined, getLabel?: (id: string) => string): string | undefined => {
    if (!items || items.length === 0) return undefined;
    if (items.length === 1) return getLabel ? getLabel(items[0]) : items[0];
    return `${items.length} selected`;
  }, []);

  // Count total active filter categories
  const activeFilterCount = [
    filters.eras && filters.eras.length > 0,
    filters.setIds && filters.setIds.length > 0,
    filters.rarities && filters.rarities.length > 0,
    filters.illustrators && filters.illustrators.length > 0,
  ].filter(Boolean).length;

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
          value={getChipDisplay(filters.eras)}
          onPress={() => { Keyboard.dismiss(); setActivePicker('era'); }}
          onClear={() => onFiltersChange({ ...filters, eras: undefined, setIds: undefined })}
        />

        {/* Set chip */}
        <FilterChip
          label="Set"
          value={getChipDisplay(filters.setIds, getSetLabel)}
          onPress={() => { Keyboard.dismiss(); setActivePicker('set'); }}
          onClear={() => onFiltersChange({ ...filters, setIds: undefined })}
        />

        {/* Rarity chip */}
        <FilterChip
          label="Rarity"
          value={getChipDisplay(filters.rarities)}
          onPress={() => { Keyboard.dismiss(); setActivePicker('rarity'); }}
          onClear={() => onFiltersChange({ ...filters, rarities: undefined })}
        />

        {/* Illustrator chip */}
        <FilterChip
          label="Illustrator"
          value={getChipDisplay(filters.illustrators)}
          onPress={() => {
            Keyboard.dismiss();
            setShowIllustratorInput(true);
            setIllustratorText('');
          }}
          onClear={handleClearIllustrators}
        />

        {/* Clear all (only shown when 2+ filter categories are active) */}
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

      {/* Show individual illustrator tags when illustrators are selected */}
      {filters.illustrators && filters.illustrators.length > 0 && !showIllustratorInput && (
        <View style={styles.tagsRow}>
          {filters.illustrators.map(name => (
            <View key={name} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>{name}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveIllustrator(name)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
              >
                <Text style={styles.tagRemove}>âœ•</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowIllustratorInput(true);
              setIllustratorText('');
            }}
          >
            <Text style={styles.addMoreText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Illustrator inline input */}
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
              onSubmitEditing={handleIllustratorAdd}
            />
            {illustratorText.length > 0 && (
              <TouchableOpacity
                onPress={() => setIllustratorText('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.inputClearIcon}>âœ•</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.illustratorApplyButton} onPress={handleIllustratorAdd}>
            <Text style={styles.illustratorApplyText}>Add</Text>
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
        title="Select Eras"
        items={eraItems}
        selectedIds={eraSelectedIds}
        onDone={handleEraDone}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search eras..."
      />

      <SearchableListPicker
        visible={activePicker === 'set'}
        title={filters.eras && filters.eras.length > 0 ? 'Select Sets' : 'Select Sets (all eras)'}
        items={setItems}
        selectedIds={setSelectedIds}
        onDone={handleSetDone}
        onClose={() => setActivePicker(null)}
        searchPlaceholder="Search sets..."
      />

      <SearchableListPicker
        visible={activePicker === 'rarity'}
        title="Select Rarities"
        items={rarityItems}
        selectedIds={raritySelectedIds}
        onDone={handleRarityDone}
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
 * Shows the selected value (or count) and an X button to clear.
 */
function FilterChip({ label, value, onPress, onClear }: FilterChipProps) {
  const isActive = !!value;

  if (isActive) {
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
          <Text style={styles.chipClearIcon}>âœ•</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.chipArrow}>â–¾</Text>
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
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  chipTextActive: {
    color: colors.primary,
    fontFamily: fonts.semibold,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.medium,
  },

  // -- Illustrator tags row --
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: typography.xs,
    color: colors.primary,
    fontFamily: fonts.medium,
    maxWidth: 120,
  },
  tagRemove: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: fonts.bold,
    marginLeft: 4,
  },
  addMoreButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  addMoreText: {
    fontSize: typography.xs,
    color: colors.primary,
    fontFamily: fonts.semibold,
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
    fontFamily: fonts.semibold,
  },
  illustratorCancelButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  illustratorCancelText: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    fontFamily: fonts.medium,
  },
});

export default CardPickerFilters;
