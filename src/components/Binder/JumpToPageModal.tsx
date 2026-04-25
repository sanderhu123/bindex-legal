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
 * Props for JumpToPageModal component
 */
export interface JumpToPageModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Current page number (used as placeholder) */
  currentPage: number;
  /** Total number of pages in the binder */
  totalPages: number;
  /** Callback when modal is closed (cancelled) */
  onClose: () => void;
  /** Callback when user wants to jump to a page */
  onJump: (pageNumber: number) => void;
}

/**
 * Modal for jumping directly to a specific page in binder view.
 * 
 * Features:
 * - Numeric input for page number
 * - Validates input is within valid range (1 to totalPages)
 * - Shows error message for invalid input
 * - Cancel and Go buttons
 * - Keyboard Enter/Submit triggers jump
 * 
 * @example
 * <JumpToPageModal
 *   visible={showJumpModal}
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   onClose={() => setShowJumpModal(false)}
 *   onJump={(page) => setCurrentPage(page)}
 * />
 */
export function JumpToPageModal({
  visible,
  currentPage,
  totalPages,
  onClose,
  onJump,
}: JumpToPageModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // State for input value and error message
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Ref to the input for auto-focus
  const inputRef = useRef<TextInput>(null);

  /**
   * Reset state when modal opens - pre-populate with current page number
   */
  useEffect(() => {
    if (visible) {
      // Pre-populate with current page so cursor is centered with the text
      setInputValue(currentPage.toString());
      setError(null);
      // Auto-focus input after a short delay (for animation)
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, currentPage]);

  /**
   * Validate and submit the page number
   */
  const handleSubmit = useCallback(() => {
    // Clear previous error
    setError(null);

    // Check if input is empty
    if (!inputValue.trim()) {
      setError('Please enter a page number');
      return;
    }

    // Parse the input
    const pageNum = parseInt(inputValue, 10);

    // Check if it's a valid number
    if (isNaN(pageNum)) {
      setError('Please enter a valid number');
      return;
    }

    // Check if it's within range
    if (pageNum < 1) {
      setError('Page number must be at least 1');
      return;
    }

    if (pageNum > totalPages) {
      setError(`Page number cannot exceed ${totalPages}`);
      return;
    }

    // Valid! Dismiss keyboard and jump to page
    Keyboard.dismiss();
    onJump(pageNum);
    onClose();
  }, [inputValue, totalPages, onJump, onClose]);

  /**
   * Handle text input change - only allow numbers
   */
  const handleInputChange = useCallback((text: string) => {
    // Remove any non-numeric characters
    const numericOnly = text.replace(/[^0-9]/g, '');
    setInputValue(numericOnly);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  /**
   * Handle backdrop press
   */
  const handleBackdropPress = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <KeyboardAvoidingView
        style={styles.centeredView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            {/* Title */}
            <Text style={styles.title}>Jump to Page</Text>

            {/* Instructions */}
            <Text style={styles.instructions}>
              Enter page number (1-{totalPages}):
            </Text>

            {/* Input */}
            <TextInput
              ref={inputRef}
              style={[styles.input, error && styles.inputError]}
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder={currentPage.toString()}
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              maxLength={totalPages.toString().length + 1}
              selectTextOnFocus
              autoFocus={false} // We handle focus manually
            />

            {/* Error Message */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.goButton]}
                onPress={handleSubmit}
                accessibilityRole="button"
                accessibilityLabel="Go to page"
              >
                <Text style={styles.goButtonText}>Go</Text>
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
    maxWidth: 320,
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
    marginBottom: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
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
  goButton: {
    backgroundColor: colors.primary,
  },
  goButtonText: {
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
});

export default JumpToPageModal;
