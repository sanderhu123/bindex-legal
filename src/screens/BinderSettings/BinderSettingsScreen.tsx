import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type {
  Binder,
  LayoutPreference,
  PokemonArtStyle,
  VariantPlacement,
} from '../../types';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import { getBinderById, updateBinder, deleteBinder } from '../../services/supabase/binders';
import {
  clearAllPositionsForBinder,
  getPlacedCardCount,
  moveExtraCardsToPlaceholder,
} from '../../services/supabase/binderPositions';
import {
  getBinderUsage,
  presentProPaywall,
  recordDeletionUsed,
} from '../../services/pro/proService';
import VariantSelector from '../../components/Binder/VariantSelector';
import VariantOrderSelector from '../../components/Binder/VariantOrderSelector';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import ErrorScreen from '../../components/Error/ErrorScreen';
import { getAllSets } from '../../data/pokemonEras';
import { getAvailableVariantsForSet } from '../../data/cardVariants';
import { useTheme } from '../../context/ThemeContext';
import {
  fonts,
  spacing,
  typography,
  borderRadius,
  screenPadding,
  shadows,
  type ThemeColors,
} from '../../constants/theme';
import { showError, showSuccess } from '../../utils/toast';
import { ScreenHeader } from '../../components/ScreenHeader';
import { warningVibration } from '../../utils/haptics';

type NavigationProp = StackNavigationProp<MainStackParamList, 'BinderSettings'>;
type ScreenRouteProp = RouteProp<MainStackParamList, 'BinderSettings'>;

const LAYOUT_OPTIONS: { value: LayoutPreference; label: string }[] = [
  { value: '3x3', label: '3x3' },
  { value: '4x3', label: '4x3' },
];

const VARIANT_PLACEMENT_OPTIONS: { value: VariantPlacement; label: string }[] = [
  { value: 'grouped', label: 'Grouped' },
  { value: 'end', label: 'At End' },
];

const ART_STYLE_OPTIONS: { value: PokemonArtStyle; label: string }[] = [
  { value: 'sprite', label: 'Sprite' },
  { value: 'home', label: '3D' },
  { value: 'official-artwork', label: 'Detailed' },
];

export default function BinderSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { binderId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [binder, setBinder] = useState<Binder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [layoutPreference, setLayoutPreference] = useState<LayoutPreference>('3x3');
  const [variantsToTrack, setVariantsToTrack] = useState<string[]>(['base']);
  const [variantPlacement, setVariantPlacement] = useState<VariantPlacement>('grouped');
  const [variantOrder, setVariantOrder] = useState<string[]>(['base', 'secret-rare']);
  const [pokemonArtStyle, setPokemonArtStyle] = useState<PokemonArtStyle>('sprite');

  useEffect(() => {
    loadBinder();
  }, [binderId]);

  async function loadBinder() {
    setLoading(true);
    setError(null);
    try {
      const data = await getBinderById(binderId);
      if (!data) {
        setError('Binder not found');
        return;
      }

      setBinder(data);
      setName(data.name);
      setNameDraft(data.name);
      setIsEditingName(false);
      setLayoutPreference(data.layoutPreference || '3x3');
      setVariantsToTrack(data.variantsToTrack && data.variantsToTrack.length > 0 ? data.variantsToTrack : ['base']);
      setVariantPlacement(data.variantPlacement || 'grouped');
      const defaultOrder = [...(data.variantsToTrack || ['base']), 'secret-rare'];
      setVariantOrder(data.variantOrder && data.variantOrder.length > 0 ? data.variantOrder : defaultOrder);
      setPokemonArtStyle(data.pokemonArtStyle || 'sprite');
    } catch (err: any) {
      setError(err?.message || 'Failed to load binder settings');
    } finally {
      setLoading(false);
    }
  }

  const hasChanges = useMemo(() => {
    if (!binder) return false;
    const originalVariants = binder.variantsToTrack || [];
    const variantsEqual = originalVariants.length === variantsToTrack.length &&
      originalVariants.every((variant) => variantsToTrack.includes(variant));

    const defaultOrder = [...originalVariants, 'secret-rare'];
    const originalOrder = binder.variantOrder && binder.variantOrder.length > 0 ? binder.variantOrder : defaultOrder;
    const orderEqual = originalOrder.length === variantOrder.length &&
      originalOrder.every((key, i) => variantOrder[i] === key);

    return (
      name.trim() !== binder.name ||
      layoutPreference !== (binder.layoutPreference || '3x3') ||
      variantPlacement !== (binder.variantPlacement || 'grouped') ||
      pokemonArtStyle !== (binder.pokemonArtStyle || 'sprite') ||
      !variantsEqual ||
      !orderEqual
    );
  }, [binder, name, layoutPreference, variantsToTrack, variantPlacement, variantOrder, pokemonArtStyle]);

  const availableVariantKeys = useMemo(() => {
    if (!binder || binder.collectionMode !== 'master-set' || !binder.set) {
      return ['base', 'reverse-holo'];
    }

    const matchingSet = getAllSets().find((set) => set.name === binder.set);
    if (!matchingSet) {
      return ['base', 'reverse-holo'];
    }

    return getAvailableVariantsForSet(matchingSet.id);
  }, [binder]);

  useEffect(() => {
    if (!binder || binder.collectionMode !== 'master-set') return;

    setVariantsToTrack((current) => {
      const filtered = current.filter((variant) => availableVariantKeys.includes(variant));
      if (filtered.length > 0) return filtered;
      return availableVariantKeys.includes('base') ? ['base'] : availableVariantKeys.slice(0, 1);
    });
  }, [binder, availableVariantKeys]);

  useEffect(() => {
    if (!binder || binder.collectionMode !== 'master-set') return;
    const items = [...variantsToTrack, 'secret-rare'];
    setVariantOrder(prev => {
      const kept = prev.filter(k => items.includes(k));
      const missing = items.filter(k => !kept.includes(k));
      return [...kept, ...missing];
    });
  }, [binder, variantsToTrack]);

  const beginNameEdit = () => {
    setNameDraft(name);
    setIsEditingName(true);
  };

  const cancelNameEdit = () => {
    setNameDraft(name);
    setIsEditingName(false);
  };

  const applyNameEdit = () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      Alert.alert('Name Required', 'Please enter a binder name.');
      return;
    }
    setName(nextName);
    setIsEditingName(false);
  };

  const buildUpdates = () => {
    if (!binder) return {};

    const updates: {
      name?: string;
      layoutPreference?: LayoutPreference;
      variantsToTrack?: string[];
      variantPlacement?: VariantPlacement;
      variantOrder?: string[];
      pokemonArtStyle?: PokemonArtStyle;
    } = {};

    if (name.trim() !== binder.name) updates.name = name.trim();
    if (layoutPreference !== (binder.layoutPreference || '3x3')) {
      updates.layoutPreference = layoutPreference;
    }

    if (binder.collectionMode === 'master-set') {
      const originalVariants = binder.variantsToTrack || [];
      const variantsEqual = originalVariants.length === variantsToTrack.length &&
        originalVariants.every((variant) => variantsToTrack.includes(variant));

      if (!variantsEqual) {
        updates.variantsToTrack = variantsToTrack;
        if (!binder.variantPlacement) {
          updates.variantPlacement = variantPlacement;
        }
      }
      if (variantPlacement !== (binder.variantPlacement || 'grouped')) {
        updates.variantPlacement = variantPlacement;
      }

      const defaultOrder = [...originalVariants, 'secret-rare'];
      const originalOrder = binder.variantOrder && binder.variantOrder.length > 0 ? binder.variantOrder : defaultOrder;
      const orderEqual = originalOrder.length === variantOrder.length &&
        originalOrder.every((key, i) => variantOrder[i] === key);
      if (!orderEqual) {
        updates.variantOrder = variantOrder;
      }
    }

    if (binder.collectionMode === 'region' && pokemonArtStyle !== (binder.pokemonArtStyle || 'sprite')) {
      updates.pokemonArtStyle = pokemonArtStyle;
    }

    return updates;
  };

  const hasVariantChanges = () => {
    if (!binder || binder.collectionMode !== 'master-set') return false;

    const updates = buildUpdates();
    return !!updates.variantsToTrack || !!updates.variantPlacement || !!updates.variantOrder;
  };

  const performSave = async (shouldClearPositions: boolean) => {
    if (!binder) return;
    setSaving(true);
    try {
      if (shouldClearPositions) {
        await moveExtraCardsToPlaceholder(binder.id);
        await clearAllPositionsForBinder(binder.id);
      } else if (hasVariantChanges()) {
        await moveExtraCardsToPlaceholder(binder.id);
      }

      await updateBinder(binder.id, buildUpdates());
      showSuccess('Binder settings saved');
      navigation.goBack();
    } catch (err: any) {
      showError('Failed to save settings', err?.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!binder) return;
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a binder name.');
      return;
    }
    if (binder.collectionMode === 'master-set' && variantsToTrack.length === 0) {
      Alert.alert('Choose Variants', 'Select at least one variant to track.');
      return;
    }

    if (!hasVariantChanges()) {
      await performSave(false);
      return;
    }

    const positionCount = await getPlacedCardCount(binder.id);
    if (positionCount === 0) {
      await performSave(false);
      return;
    }

    Alert.alert(
      'Reset Card Arrangement?',
      'Changing variant settings will reset your card arrangement. Extra cards you added will be moved to the placeholder tray (max 18).\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => performSave(true),
        },
      ]
    );
  };

  const confirmDelete = (title: string, message: string, useDoOver: boolean) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: useDoOver ? 'Delete (Use Do-Over)' : 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!binder) return;
          try {
            warningVibration();
            await deleteBinder(binder.id);
            if (useDoOver) {
              await recordDeletionUsed();
            }
            showSuccess('Binder deleted');
            navigation.navigate('BinderList');
          } catch (err: any) {
            showError('Failed to delete binder', err?.message || 'Please try again');
          }
        },
      },
    ]);
  };

  const handleDeleteBinder = async () => {
    if (!binder) return;

    try {
      const usage = await getBinderUsage();

      if (usage.tier === 'pro') {
        confirmDelete(
          'Delete Binder',
          `Are you sure you want to delete "${binder.name}"? This action cannot be undone.`,
          false
        );
        return;
      }

      if (!usage.canDelete) {
        Alert.alert(
          'Upgrade to Bindex Pro',
          "You've used your free do-over. Upgrade to Pro to manage your binders freely.",
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Upgrade to Pro',
              onPress: () => presentProPaywall(),
            },
          ]
        );
        return;
      }

      confirmDelete(
        'Use Your Do-Over?',
        `This is your only free do-over. After deleting "${binder.name}", you won't be able to delete binders again unless you upgrade to Pro.\n\nAre you sure?`,
        true
      );
    } catch {
      confirmDelete(
        'Delete Binder',
        `Are you sure you want to delete "${binder.name}"? This action cannot be undone.`,
        false
      );
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading binder settings..." />;
  }

  if (error || !binder) {
    return (
      <ErrorScreen
        message={error || 'Binder not found'}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Binder Settings"
        onBack={() => navigation.goBack()}
        rightLabel="Save"
        onRight={handleSave}
        rightLoading={saving}
        rightDisabled={!hasChanges}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Binder Info</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          {!isEditingName ? (
            <View style={styles.valueRow}>
              <Text style={styles.valueText}>{name}</Text>
              <TouchableOpacity
                style={styles.inlineIconButton}
                onPress={beginNameEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameEditorRow}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Binder name"
                placeholderTextColor={colors.textLight}
                style={styles.nameInput}
                maxLength={60}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.nameActionButton, styles.nameActionCancel]}
                onPress={cancelNameEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nameActionButton, styles.nameActionSave]}
                onPress={applyNameEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Collection Mode</Text>
            <Text style={styles.infoValue}>
              {binder.collectionMode === 'master-set'
                ? 'Master Set'
                : binder.collectionMode === 'region'
                  ? 'Region'
                  : 'Custom'}
            </Text>
          </View>

          {binder.collectionMode === 'master-set' && binder.set && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Set</Text>
              <Text style={styles.infoValue}>{binder.set}</Text>
            </View>
          )}

          {binder.collectionMode === 'region' && binder.region && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Region</Text>
              <Text style={styles.infoValue}>{binder.region}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Display & Rules</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Layout</Text>
          <View style={styles.segmentedRow}>
            {LAYOUT_OPTIONS.map((option, idx) => {
              const selected = layoutPreference === option.value;
              const isLast = idx === LAYOUT_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segmentedButton,
                    selected && styles.segmentedButtonActive,
                    isLast && styles.segmentedButtonLast,
                  ]}
                  onPress={() => setLayoutPreference(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentedText, selected && styles.segmentedTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {binder.collectionMode === 'master-set' && (
            <>
              <Text style={[styles.label, styles.subSectionTop]}>Variants to Track</Text>
              <VariantSelector
                selected={variantsToTrack}
                onChange={setVariantsToTrack}
                availableKeys={availableVariantKeys}
              />

              {variantsToTrack.length > 1 && (
                <>
                  <Text style={[styles.label, styles.subSectionTop]}>Variant Placement</Text>
                  <View style={styles.segmentedRow}>
                    {VARIANT_PLACEMENT_OPTIONS.map((option, idx) => {
                      const selected = variantPlacement === option.value;
                      const isLast = idx === VARIANT_PLACEMENT_OPTIONS.length - 1;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.segmentedButton,
                            selected && styles.segmentedButtonActive,
                            isLast && styles.segmentedButtonLast,
                          ]}
                          onPress={() => setVariantPlacement(option.value)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.segmentedText, selected && styles.segmentedTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, styles.subSectionTop]}>Display Order</Text>
                  {variantPlacement === 'grouped' ? (
                    <VariantOrderSelector
                      order={
                        variantOrder.length > 0 && variantOrder[0] === 'secret-rare'
                          ? ['secret-rare', 'main-set']
                          : ['main-set', 'secret-rare']
                      }
                      onChange={(newOrder) => {
                        const rest = variantOrder.filter(k => k !== 'secret-rare');
                        if (newOrder[0] === 'secret-rare') {
                          setVariantOrder(['secret-rare', ...rest]);
                        } else {
                          setVariantOrder([...rest, 'secret-rare']);
                        }
                      }}
                    />
                  ) : (
                    <VariantOrderSelector order={variantOrder} onChange={setVariantOrder} />
                  )}
                </>
              )}
            </>
          )}

          {binder.collectionMode === 'region' && (
            <>
              <Text style={[styles.label, styles.subSectionTop]}>Pokemon Art Style</Text>
              <View style={styles.segmentedRow}>
                {ART_STYLE_OPTIONS.map((option, idx) => {
                  const selected = pokemonArtStyle === option.value;
                  const isLast = idx === ART_STYLE_OPTIONS.length - 1;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.segmentedButton,
                        selected && styles.segmentedButtonActive,
                        isLast && styles.segmentedButtonLast,
                      ]}
                      onPress={() => setPokemonArtStyle(option.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.segmentedText, selected && styles.segmentedTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteBinder}>
            <View style={styles.deleteRowLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.deleteText}>Delete Binder</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: screenPadding,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backButton: {
      padding: spacing.xs,
      marginLeft: -spacing.xs,
      width: 32,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: typography.xl,
      fontFamily: fonts.semibold,
      color: colors.text,
    },
    saveButton: {
      minWidth: 56,
      height: 32,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: typography.sm,
      fontFamily: fonts.semibold,
      color: colors.onPrimary,
    },
    content: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: typography.xs,
      fontFamily: fonts.semibold,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      marginHorizontal: screenPadding,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginHorizontal: screenPadding,
      padding: spacing.md,
      ...shadows.sm,
    },
    label: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    subSectionTop: {
      marginTop: spacing.md,
    },
    valueRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      backgroundColor: colors.background,
    },
    segmentedRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
      backgroundColor: colors.background,
    },
    segmentedButton: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    segmentedButtonActive: {
      backgroundColor: colors.primary,
    },
    segmentedButtonLast: {
      borderRightWidth: 0,
    },
    segmentedText: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
    },
    segmentedTextActive: {
      color: colors.onPrimary,
      fontFamily: fonts.semibold,
    },
    inlineIconButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primaryTint,
    },
    nameEditorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    nameInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: typography.base,
      fontFamily: fonts.regular,
      color: colors.text,
      backgroundColor: colors.background,
    },
    nameActionButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    nameActionCancel: {
      backgroundColor: colors.backgroundDark,
    },
    nameActionSave: {
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary + '44',
    },
    valueText: {
      flex: 1,
      fontSize: typography.base,
      fontFamily: fonts.regular,
      color: colors.text,
      marginRight: spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    infoLabel: {
      fontSize: typography.sm,
      fontFamily: fonts.regular,
      color: colors.textTertiary,
    },
    infoValue: {
      fontSize: typography.sm,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    deleteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    deleteRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    deleteText: {
      fontSize: typography.base,
      fontFamily: fonts.medium,
      color: colors.error,
    },
    footer: {
      height: spacing.xxl,
    },
  });
