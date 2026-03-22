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
import { Ionicons } from '@expo/vector-icons';
import type { Card, CardSearchFilters } from '../../types';
import { POKEMON_ERAS } from '../../data/pokemonEras';
import { SearchableListPicker, type ListPickerItem } from './SearchableListPicker';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, borderRadius, fonts, type ThemeColors } from '../../constants/theme';
import { getRarities, getRaritiesForSets } from '../../services/api/pokemonApi';

/**
 * Props for CardPickerFilters
 */
export interface CardPickerFiltersProps {
  /** Current active filters */
  filters: CardSearchFilters;
  /** Called when filters change */
  onFiltersChange: (filters: CardSearchFilters, options?: { force?: boolean }) => void;
  /** Current card results (used for dynamic/cascading filter options) */
  availableCards?: Card[];
  /** When true, build filter options from availableCards instead of global lists */
  useAvailableOptions?: boolean;
  /** Current search query from card picker */
  query?: string;
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
export function CardPickerFilters({
  filters,
  onFiltersChange,
  availableCards = [],
  useAvailableOptions = false,
  query = '',
}: CardPickerFiltersProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Which picker is currently open
  const [activePicker, setActivePicker] = useState<'era' | 'set' | 'rarity' | null>(null);
  // Whether the illustrator inline input is shown
  const [showIllustratorInput, setShowIllustratorInput] = useState(false);
  // Local illustrator text (committed on submit)
  const [illustratorText, setIllustratorText] = useState('');
  // Rarities fetched from API for fallback mode (non-dynamic)
  const [apiRarities, setApiRarities] = useState<string[]>([]);
  const [fullSearchRarities, setFullSearchRarities] = useState<string[]>([]);

  useEffect(() => {
    if (!useAvailableOptions) {
      getRarities().then(setApiRarities);
    }
  }, [useAvailableOptions]);

  // Build lookups once from hard-coded era data
  const setMetaById = useMemo(() => {
    const byId = new Map<string, { name: string; eraName: string; releaseDate: string }>();
    for (const era of POKEMON_ERAS) {
      for (const set of era.sets) {
        byId.set(set.id.toLowerCase(), {
          name: set.name,
          eraName: era.name,
          releaseDate: set.releaseDate,
        });
      }
    }
    return byId;
  }, []);

  const setIdByName = useMemo(() => {
    const byName = new Map<string, string>();
    for (const era of POKEMON_ERAS) {
      for (const set of era.sets) {
        byName.set(set.name.toLowerCase(), set.id);
      }
    }
    return byName;
  }, []);

  const extractSetId = useCallback((cardId: string): string => {
    const lastDash = cardId.lastIndexOf('-');
    if (lastDash <= 0) return cardId.toLowerCase();
    return cardId.slice(0, lastDash).toLowerCase();
  }, []);

  // Aggregate available set/era data from current search results
  const availableSetMap = useMemo(() => {
    const map = new Map<string, { label: string; eraName: string; releaseDate: string; count: number }>();

    for (const card of availableCards) {
      const rawSetId = extractSetId(card.id || '');
      const byIdMeta = setMetaById.get(rawSetId);
      const byNameId = card.set ? setIdByName.get(card.set.toLowerCase()) : undefined;
      const resolvedSetId = (rawSetId && setMetaById.has(rawSetId))
        ? rawSetId
        : (byNameId ? byNameId.toLowerCase() : rawSetId);
      const meta = setMetaById.get(resolvedSetId);

      // Ignore cards that can't be mapped to a known set/era.
      if (!resolvedSetId || !meta) continue;

      const current = map.get(resolvedSetId);
      if (current) {
        current.count += 1;
      } else {
        map.set(resolvedSetId, {
          // Always prefer canonical set name from hard-coded era data,
          // so users see full names (not abbreviated set IDs like "sv08").
          label: meta.name || byIdMeta?.name || card.set || resolvedSetId,
          eraName: meta.eraName,
          releaseDate: meta.releaseDate,
          count: 1,
        });
      }
    }

    return map;
  }, [availableCards, extractSetId, setMetaById, setIdByName]);

  const availableEraCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const value of availableSetMap.values()) {
      // Count sets per era (one availableSetMap entry = one set)
      counts.set(value.eraName, (counts.get(value.eraName) || 0) + 1);
    }
    return counts;
  }, [availableSetMap]);

  const availableRarities = useMemo(() => {
    const raritySet = new Set<string>();
    for (const card of availableCards) {
      const rarity = card.rarity?.trim();
      if (rarity) raritySet.add(rarity);
    }
    return Array.from(raritySet).sort((a, b) => a.localeCompare(b));
  }, [availableCards]);

  // For rarity, use dynamic "available" options whenever a text search
  // or non-rarity filters are active.
  const hasOtherActiveFilters = !!(
    (filters.eras && filters.eras.length > 0) ||
    (filters.setIds && filters.setIds.length > 0) ||
    (filters.illustrators && filters.illustrators.length > 0)
  );
  const useAvailableRarityOptions = useAvailableOptions || hasOtherActiveFilters;

  // Build rarity options from the FULL matching search set (not just loaded page).
  // We intentionally remove the rarity filter so users can see all possible rarities
  // available under the current query + other active filters.
  useEffect(() => {
    if (!useAvailableRarityOptions) {
      setFullSearchRarities([]);
      return;
    }

    let cancelled = false;

    const fetchRarities = async () => {
      try {
        // Always use the fast getRaritiesForSets path.
        // Derive set IDs from selected sets or eras, then query the
        // dedicated rarity endpoint (single cached API call per set).
        // This avoids a slow second search with unlimited results.
        let setIdsForLookup: string[] = [];
        if (filters.setIds && filters.setIds.length > 0) {
          setIdsForLookup = filters.setIds;
        } else if (filters.eras && filters.eras.length > 0) {
          const setIdSet = new Set<string>();
          for (const eraName of filters.eras) {
            const era = POKEMON_ERAS.find(e => e.name === eraName);
            if (!era) continue;
            for (const set of era.sets) setIdSet.add(set.id);
          }
          setIdsForLookup = Array.from(setIdSet);
        }

        const rarities = await getRaritiesForSets(setIdsForLookup);
        if (cancelled) return;
        setFullSearchRarities(rarities);
      } catch {
        if (!cancelled) {
          setFullSearchRarities([]);
        }
      }
    };

    fetchRarities();

    return () => {
      cancelled = true;
    };
  }, [useAvailableRarityOptions, filters.eras, filters.setIds]);

  // ----- Build era items -----
  const eraItems: ListPickerItem[] = useMemo(() => {
    if (useAvailableOptions) {
      const items: ListPickerItem[] = [];
      for (const era of POKEMON_ERAS) {
        const count = availableEraCounts.get(era.name);
        if (!count) continue;
        items.push({
          id: era.name,
          label: era.name,
          // Use canonical era metadata for stable, correct set counts.
          subtitle: `${era.sets.length} set${era.sets.length === 1 ? '' : 's'}`,
        });
      }
      return items;
    }

    return POKEMON_ERAS.map(era => ({
      id: era.name,
      label: era.name,
      subtitle: `${era.sets.length} sets`,
    }));
  }, [availableEraCounts, useAvailableOptions]);

  // ----- Build set items (filtered by selected eras) -----
  const setItems: ListPickerItem[] = useMemo(() => {
    const selectedEras = filters.eras && filters.eras.length > 0 ? filters.eras : null;
    const items: ListPickerItem[] = [];

    if (useAvailableOptions) {
      for (const [setId, value] of availableSetMap.entries()) {
        if (selectedEras && !selectedEras.includes(value.eraName)) continue;
        items.push({
          id: setId,
          label: value.label,
          subtitle: `${value.eraName} - ${value.releaseDate || 'Unknown date'}`,
        });
      }
      return items.sort((a, b) => a.label.localeCompare(b.label));
    }

    if (selectedEras) {
      // Only show sets from selected eras
      for (const eraName of selectedEras) {
        const era = POKEMON_ERAS.find(e => e.name === eraName);
        if (era) {
          for (const set of era.sets) {
            items.push({
              id: set.id,
              label: set.name,
              subtitle: `${era.name} - ${set.releaseDate}`,
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
            subtitle: `${era.name} - ${set.releaseDate}`,
          });
        }
      }
    }

    return items;
  }, [availableSetMap, filters.eras, useAvailableOptions]);

  // ----- Build rarity items -----
  const rarityItems: ListPickerItem[] = useMemo(() => {
    if (useAvailableRarityOptions) {
      return fullSearchRarities.map(r => ({ id: r, label: r }));
    }
    return apiRarities.map(r => ({ id: r, label: r }));
  }, [apiRarities, fullSearchRarities, useAvailableRarityOptions]);

  // Important: do NOT auto-clear selected filters when available options change.
  // Options are built from currently loaded results (which are paginated), so
  // auto-pruning here can incorrectly remove active filters while scrolling.

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
      }, { force: true });
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
      }, { force: true });
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
      }, { force: true });
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
                <Ionicons name="close" size={10} color={colors.primary} style={styles.tagRemove} />
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
                <Ionicons name="close" size={12} color={colors.textTertiary} style={styles.inputClearIcon} />
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <Ionicons name="close" size={10} color={colors.primary} style={styles.chipClearIcon} />
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
      <Ionicons name="chevron-down" size={10} color={colors.textTertiary} style={styles.chipArrow} />
    </TouchableOpacity>
  );
}

// ==================== Styles ====================

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.primaryTint,
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
    backgroundColor: colors.primaryTint,
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
    color: colors.onPrimary,
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
