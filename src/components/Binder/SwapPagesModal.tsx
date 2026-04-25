import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, shadows, type ThemeColors } from '../../constants/theme';

/**
 * Props for SwapPagesModal component
 */
export interface SwapPagesModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Current page number (used to pre-fill page A) */
  currentPage: number;
  /** Total number of pages in the binder */
  totalPages: number;
  /** Callback when modal is closed (cancelled) */
  onClose: () => void;
  /** Callback when user confirms swap (pageA and pageB are 1-based) */
  onSwap: (pageA: number, pageB: number) => void;
}

/**
 * Modal that lets the user swap all cards on one page with all cards on
 * another page. The first page is pre-filled with the current page so the
 * user typically only needs to type the second page number.
 */
export function SwapPagesModal({
  visible,
  currentPage,
  totalPages,
  onClose,
  onSwap,
}: SwapPagesModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [pageAInput, setPageAInput] = useState('');
  const [pageBInput, setPageBInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pageBRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPageAInput(currentPage.toString());
      setPageBInput('');
      setError(null);
      const timer = setTimeout(() => {
        pageBRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, currentPage]);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!pageAInput.trim() || !pageBInput.trim()) {
      setError('Please enter both page numbers');
      return;
    }

    const pageA = parseInt(pageAInput, 10);
    const pageB = parseInt(pageBInput, 10);

    if (isNaN(pageA) || isNaN(pageB)) {
      setError('Please enter valid numbers');
      return;
    }

    if (pageA < 1 || pageB < 1) {
      setError('Page numbers must be at least 1');
      return;
    }

    if (pageA > totalPages || pageB > totalPages) {
      setError(`Page numbers cannot exceed ${totalPages}`);
      return;
    }

    if (pageA === pageB) {
      setError('Pages must be different');
      return;
    }

    Keyboard.dismiss();
    onSwap(pageA, pageB);
    onClose();
  }, [pageAInput, pageBInput, totalPages, onSwap, onClose]);

  const handlePageAChange = useCallback((text: string) => {
    setPageAInput(text.replace(/[^0-9]/g, ''));
    if (error) setError(null);
  }, [error]);

  const handlePageBChange = useCallback((text: string) => {
    setPageBInput(text.replace(/[^0-9]/g, ''));
    if (error) setError(null);
  }, [error]);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={styles.centeredView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Swap Pages</Text>

            <Text style={styles.instructions}>
              Swap all cards on page A with all cards on page B (1-{totalPages}):
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputColumn}>
                <Text style={styles.inputLabel}>Page A</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={pageAInput}
                  onChangeText={handlePageAChange}
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => pageBRef.current?.focus()}
                  maxLength={totalPages.toString().length + 1}
                  selectTextOnFocus
                />
              </View>

              <Text style={styles.swapSymbol}>⇄</Text>

              <View style={styles.inputColumn}>
                <Text style={styles.inputLabel}>Page B</Text>
                <TextInput
                  ref={pageBRef}
                  style={[styles.input, error && styles.inputError]}
                  value={pageBInput}
                  onChangeText={handlePageBChange}
                  placeholder="2"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  maxLength={totalPages.toString().length + 1}
                  selectTextOnFocus
                />
              </View>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.swapButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.swapButtonText}>Swap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    fontSize: typography.xl,
    fontFamily: fonts.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  instructions: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  inputColumn: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.xl,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.backgroundLight,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  swapSymbol: {
    fontSize: typography.xl,
    color: colors.textSecondary,
    paddingBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  swapButton: {
    backgroundColor: colors.primary,
  },
  swapButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
});

export default SwapPagesModal;
