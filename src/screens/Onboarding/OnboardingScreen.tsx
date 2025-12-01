import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CollectionMode, VariantPlacement, LayoutPreference } from '../../types';
import type { Region } from '../../services/api/pokemonApi';
import { createBinder } from '../../services/supabase/binders';
import Step1CollectionMode from './Step1CollectionMode';
import Step2MasterSet from './Step2MasterSet';
import Step2Region from './Step2Region';
import Step3Variants from './Step3Variants';
import Step3VariantPlacement from './Step3VariantPlacement';
import Step4Layout from './Step4Layout';
import Step5BinderName from './Step5BinderName';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Questionnaire'>;

interface OnboardingState {
  // Step 1
  collectionMode: CollectionMode | null;
  // Step 2A (Master Set)
  selectedSetName: string | null;
  selectedVariants: string[]; // Always includes 'base' implicitly
  // Step 2B (Region)
  selectedRegion: Region | null;
  // Step 3
  variantPlacement: VariantPlacement | null;
  // Step 4
  layoutPreference: LayoutPreference | null;
  // Step 5 (last step)
  binderName: string | null;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const nfcTagId = (route.params as { nfcTagId?: string })?.nfcTagId;

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    collectionMode: null,
    selectedSetName: null,
    selectedVariants: [],
    selectedRegion: null,
    variantPlacement: null,
    layoutPreference: null,
    binderName: null,
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel Binder Creation',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // For region mode, skip steps 3 and 4 when going back
      if (state.collectionMode === 'region' && currentStep === 6) {
        setCurrentStep(5); // Go back from step 6 to step 5 (layout)
      } else if (state.collectionMode === 'region' && currentStep === 5) {
        setCurrentStep(2); // Go back from step 5 to step 2 (skipping steps 3 and 4)
      } else if (state.collectionMode === 'master-set' && currentStep === 6) {
        setCurrentStep(5); // Go back from step 6 to step 5 (layout)
      } else {
        setCurrentStep(currentStep - 1);
      }
    } else {
      handleCancel();
    }
  };

  // Calculate total steps (4 for region, 6 for master-set)
  const getTotalSteps = (): number => {
    return state.collectionMode === 'region' ? 4 : 6;
  };

  // Get the actual step number for display (accounting for skipped steps in region mode)
  const getActualStep = (): number => {
    if (state.collectionMode === 'region') {
      // For region mode: step 1 → 1, step 2 → 2, step 5 → 3, step 6 → 4 (skip steps 3 and 4)
      if (currentStep === 5) return 3;
      if (currentStep === 6) return 4;
      return currentStep;
    }
    return currentStep;
  };

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return state.collectionMode !== null;
      case 2:
        if (state.collectionMode === 'master-set') {
          return state.selectedSetName !== null;
        } else if (state.collectionMode === 'region') {
          return state.selectedRegion !== null;
        }
        return false;
      case 3:
        // Step 3: Variants for Master Set, skipped for Region
        if (state.collectionMode === 'region') {
          return true; // Always allow proceeding (this step is skipped)
        }
        // For Master Set, variants are optional (can proceed with empty array)
        return true;
      case 4:
        // Step 4: Variant placement for Master Set, skipped for Region
        if (state.collectionMode === 'region') {
          return true; // Always allow proceeding (this step is skipped)
        }
        return state.variantPlacement !== null;
      case 5:
        return state.layoutPreference !== null;
      case 6:
        // Step 6: Binder name (last step for both modes)
        return state.binderName !== null && state.binderName.trim() !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Please make a selection', 'You need to select an option before continuing.');
      return;
    }

    // For region mode, skip steps 3 and 4
    if (state.collectionMode === 'region' && currentStep === 2) {
      // Skip directly from step 2 to step 5 (layout, which displays as step 3 in UI)
      setCurrentStep(5);
    } else if (currentStep === 6) {
      // Last step - finish
      handleFinish();
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = async () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Error', 'Please complete all steps before finishing.');
      return;
    }

    setSaving(true);
    try {
      // Use custom binder name from user input
      const binderName = state.binderName?.trim() || 'My Binder';

      // Prepare variants array (always include 'base' for master-set, just 'base' for region)
      const variantsToTrack = state.collectionMode === 'master-set' 
        ? ['base', ...state.selectedVariants]
        : ['base']; // Region mode only has base cards

      // Create binder
      const binder = await createBinder({
        name: binderName,
        collectionMode: state.collectionMode!,
        set: state.collectionMode === 'master-set' ? state.selectedSetName || undefined : undefined,
        region: state.collectionMode === 'region' ? state.selectedRegion || undefined : undefined,
        variantsToTrack,
        variantPlacement: state.collectionMode === 'master-set' ? (state.variantPlacement || undefined) : undefined,
        layoutPreference: state.layoutPreference || undefined,
        nfcTagId: nfcTagId || undefined,
      });

      // Navigate to binder detail
      navigation.replace('BinderDetail', { binderId: binder.id });
    } catch (error: any) {
      console.error('Error creating binder:', error);
      Alert.alert('Error', error.message || 'Failed to create binder. Please try again.');
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1CollectionMode
            value={state.collectionMode}
            onChange={(mode) => setState({ ...state, collectionMode: mode })}
          />
        );
      case 2:
        if (state.collectionMode === 'master-set') {
          return (
            <Step2MasterSet
              selectedSetName={state.selectedSetName}
              onSetChange={(setName) => setState({ ...state, selectedSetName: setName })}
            />
          );
        } else if (state.collectionMode === 'region') {
          return (
            <Step2Region
              selectedRegion={state.selectedRegion}
              onChange={(region) => setState({ ...state, selectedRegion: region })}
            />
          );
        }
        return null;
      case 3:
        // Step 3: Variants for Master Set, skipped for Region
        if (state.collectionMode === 'region') {
          // This should never render, but handle gracefully
          return null;
        }
        return (
          <Step3Variants
            selectedVariants={state.selectedVariants}
            onChange={(variants) => setState({ ...state, selectedVariants: variants })}
          />
        );
      case 4:
        // Step 4: Variant placement for Master Set, skipped for Region
        if (state.collectionMode === 'region') {
          // This should never render, but handle gracefully
          return null;
        }
        return (
          <Step3VariantPlacement
            value={state.variantPlacement}
            onChange={(placement) => setState({ ...state, variantPlacement: placement })}
          />
        );
      case 5:
        return (
          <Step4Layout
            value={state.layoutPreference}
            onChange={(layout) => setState({ ...state, layoutPreference: layout })}
          />
        );
      case 6:
        // Step 6: Binder name (last step for both modes)
        // Generate default name based on collection mode
        let defaultName = 'My Binder';
        if (state.collectionMode === 'master-set' && state.selectedSetName) {
          defaultName = state.selectedSetName;
        } else if (state.collectionMode === 'region' && state.selectedRegion) {
          defaultName = `${state.selectedRegion} Region`;
        }
        return (
          <Step5BinderName
            value={state.binderName}
            onChange={(name) => setState({ ...state, binderName: name })}
            defaultName={defaultName}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = (): string => {
    const totalSteps = getTotalSteps();
    const actualStep = getActualStep();
    return `Step ${actualStep} of ${totalSteps}`;
  };

  if (saving) {
    return (
      <View style={styles.savingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.savingText}>Creating binder...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{currentStep === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(getActualStep() / getTotalSteps()) * 100}%` }]} />
      </View>

      {/* Step content */}
      <View style={styles.content}>{renderStep()}</View>

      {/* Footer with Next button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceedToNextStep() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceedToNextStep()}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 6 ? 'Create Binder' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  savingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  savingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#eee',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
