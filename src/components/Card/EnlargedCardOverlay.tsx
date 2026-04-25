import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import CardImage from './CardImage';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, fonts, borderRadius, screenPadding, type ThemeColors } from '../../constants/theme';
import { formatCardNumber } from '../../utils/formatCardNumber';
import { getSetSymbolByName } from '../../data/pokemonEras';

/**
 * Card data shape needed by EnlargedCardOverlay.
 * All fields except id/name are optional so the overlay can be reused from
 * different screens that may not have all metadata available (e.g. BinderEdit
 * has less metadata than BinderDetail).
 */
export interface EnlargedCardData {
  id: string;
  name: string;
  number?: string;
  set?: string;
  setTotal?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  pokedexNumber?: number;
  selectedCardId?: string;
  selectedCardName?: string;
  selectedCardNumber?: string;
  selectedCardSet?: string;
}

export interface EnlargedCardOverlayProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** Card to display in the overlay. When null, the modal renders nothing. */
  card: EnlargedCardData | null;
  /** Called when the user taps to close the overlay. */
  onClose: () => void;
  /** Current screen width (used to compute card size). */
  screenWidth: number;
  /** Current screen height (used to compute card size). */
  screenHeight: number;
  /**
   * If true, render in landscape "display mode" layout (image on the left,
   * info panel on the right). If false (default), info goes below the card.
   */
  displayMode?: boolean;
  /** True when the card belongs to a Region binder (changes name/number formatting). */
  isRegion?: boolean;
  /** Optional 0-based slot index across all pages (used to compute Page/Slot text). */
  slotIndex?: number | null;
  /** Cards per binder page (used together with slotIndex to compute Page/Slot text). */
  cardsPerPage?: number;
  /** Optional saved note for this card. Only shown when showNote is true. */
  note?: string | null;
  /** Whether to show the Page/Slot position line. Defaults to true. */
  showPosition?: boolean;
  /** Whether to show the saved note block. Defaults to true. */
  showNote?: boolean;
}

/**
 * EnlargedCardOverlay is a fullscreen modal that previews a single card image
 * at a large size with its metadata. Used by BinderDetailScreen for the
 * long-press preview, and by BinderEditScreen for the "View" action on a
 * selected card.
 */
export default function EnlargedCardOverlay({
  visible,
  card,
  onClose,
  screenWidth,
  screenHeight,
  displayMode = false,
  isRegion = false,
  slotIndex = null,
  cardsPerPage = 9,
  note = null,
  showPosition = true,
  showNote = true,
}: EnlargedCardOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!card) return null;

  const isDisplayPreview = displayMode;
  const hasSelectedCard = !!card.selectedCardId;

  // For Region cards: show TCG card name when selected, otherwise Pokémon name
  const displayName = (isRegion && hasSelectedCard && card.selectedCardName)
    ? card.selectedCardName
    : card.name;

  // For Region cards: show TCG card number/setTotal when selected, otherwise Pokédex ID
  let cardNumberText: string;
  if (isRegion && hasSelectedCard) {
    const num = card.selectedCardNumber || card.number || '';
    cardNumberText = formatCardNumber(num, card.setTotal, card.selectedCardId);
  } else if (isRegion && !hasSelectedCard) {
    const dexNum = card.pokedexNumber;
    cardNumberText = dexNum ? `#${String(dexNum).padStart(3, '0')}` : (card.number || '');
  } else {
    cardNumberText = formatCardNumber(card.number || '', card.setTotal, card.id);
  }

  const displaySetName = card.selectedCardSet || card.set || '';

  const binderPage = (showPosition && slotIndex !== null && slotIndex !== undefined)
    ? Math.floor(slotIndex / cardsPerPage) + 1
    : null;
  const binderSlot = (showPosition && slotIndex !== null && slotIndex !== undefined)
    ? (slotIndex % cardsPerPage) + 1
    : null;

  const infoPanelWidth = Math.min(220, screenWidth * 0.28);
  const previewMaxWidth = isDisplayPreview
    ? Math.min(screenWidth - (screenPadding * 2) - infoPanelWidth - spacing.lg, 640)
    : Math.min(screenWidth - (screenPadding * 2), 640);
  const previewMaxHeight = isDisplayPreview
    ? Math.min(screenHeight * 0.86, screenHeight - 120)
    : Math.min(screenHeight * 0.78, screenHeight - 220);
  const previewCardWidth = Math.min(previewMaxWidth, previewMaxHeight * 0.716);
  const previewCardHeight = previewCardWidth / 0.716;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.enlargeOverlay}
        onPress={onClose}
      >
        <View
          style={[
            styles.enlargedCardContainer,
            isDisplayPreview ? styles.enlargedCardContainerRow : styles.enlargedCardContainerColumn,
          ]}
        >
          <CardImage
            source={card.imageUrlHiRes || card.imageUrl}
            lowResSource={card.imageUrl}
            isMissing={false}
            style={[styles.enlargedCard, { width: previewCardWidth, height: previewCardHeight }]}
            priority="high"
            cardInfo={{ id: card.id, name: card.name, number: card.number || '', set: card.set || '' }}
          />
          <View
            style={[
              styles.enlargedInfoPanel,
              isDisplayPreview ? styles.enlargedInfoPanelSide : styles.enlargedInfoPanelBelow,
              isDisplayPreview ? { width: infoPanelWidth } : { maxWidth: Math.min(460, screenWidth - (screenPadding * 2)) },
            ]}
          >
            {cardNumberText ? (
              <Text style={[styles.enlargedCardNumber, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                {cardNumberText}
              </Text>
            ) : null}
            <Text style={[styles.enlargedCardName, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
              {displayName}
            </Text>
            {displaySetName ? (
              <View style={[styles.enlargedSetRow, isDisplayPreview ? styles.enlargedSetRowLeft : styles.enlargedSetRowCenter]}>
                {getSetSymbolByName(displaySetName) && (
                  <Image
                    source={{ uri: getSetSymbolByName(displaySetName)! }}
                    style={styles.enlargedSetIcon}
                    contentFit="contain"
                  />
                )}
                <Text style={[styles.enlargedSetName, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                  {displaySetName}
                </Text>
              </View>
            ) : null}
            {binderPage !== null && binderSlot !== null && (
              <Text style={[styles.enlargedCardPosition, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                Page {binderPage}, Slot {binderSlot}
              </Text>
            )}
            {showNote && note ? (
              <View style={[styles.enlargedNoteBlock, isDisplayPreview ? styles.enlargedNoteBlockLeft : styles.enlargedNoteBlockCenter]}>
                <Text style={[styles.enlargedNoteLabel, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                  Note
                </Text>
                <Text style={[styles.enlargedNoteText, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
                  {note}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.enlargedHint, isDisplayPreview ? styles.enlargedTextLeft : styles.enlargedTextCenter]}>
              Tap anywhere to close
            </Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  enlargeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  enlargedCardContainer: {
    width: '100%',
    maxHeight: '90%',
    paddingHorizontal: screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  enlargedCardContainerRow: {
    flexDirection: 'row',
  },
  enlargedCardContainerColumn: {
    flexDirection: 'column',
  },
  enlargedInfoPanel: {
    justifyContent: 'center',
  },
  enlargedInfoPanelSide: {
    alignItems: 'flex-start',
  },
  enlargedInfoPanelBelow: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  enlargedCard: {
    borderRadius: borderRadius.lg,
  },
  enlargedCardName: {
    fontSize: typography.lg,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
    marginTop: spacing.xs,
  },
  enlargedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  enlargedSetRowLeft: {
    justifyContent: 'flex-start',
  },
  enlargedSetRowCenter: {
    justifyContent: 'center',
  },
  enlargedSetIcon: {
    width: 20,
    height: 20,
  },
  enlargedSetName: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  enlargedCardNumber: {
    fontSize: typography.base,
    color: colors.onPrimary,
  },
  enlargedCardPosition: {
    fontSize: typography.sm,
    color: colors.onPrimary,
    marginTop: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  enlargedNoteBlock: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  enlargedNoteBlockLeft: {
    alignSelf: 'flex-start',
  },
  enlargedNoteBlockCenter: {
    alignSelf: 'center',
  },
  enlargedNoteLabel: {
    fontSize: typography.sm,
    color: colors.onPrimary,
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  enlargedNoteText: {
    fontSize: typography.sm,
    color: colors.onPrimary,
  },
  enlargedHint: {
    fontSize: typography.sm,
    color: colors.textTertiary,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  enlargedTextLeft: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  enlargedTextCenter: {
    textAlign: 'center',
    alignSelf: 'center',
  },
});
