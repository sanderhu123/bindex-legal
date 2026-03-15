import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CardImage from './CardImage';
import CardDetails from './CardDetails';
import { lightTap } from '../../utils/haptics';
import type { Card } from '../../types';
import type { MainStackParamList } from '../../navigation/AppNavigator';

const LOGO_ICON = require('../../../assets/logo-icon-teal.png');

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

interface CardItemProps {
  card: CardWithOwnership;
  onPress?: (card: CardWithOwnership) => void; // Optional now, navigation takes priority
  onLongPress?: (card: CardWithOwnership) => void; // Long-press handler (for enlarge preview)
  onLongPressRelease?: () => void; // Called when long-press is released
  binderId: string;
  width?: number;
  variant?: 'grid' | 'list';
  position?: number; // For Custom binders (slot position)
  collectionMode?: 'master-set' | 'region' | 'custom'; // Binder type
  isExtraCard?: boolean; // For cards added by user (not in official set)
  cardIndex?: number; // Card's index in the sorted list (for binder position calculation)
  cardsPerPage?: number; // Cards per binder page (9 for 3x3, 12 for 4x3)
  listTapBehavior?: 'navigate' | 'toggle'; // Step 34A: what happens when list row is tapped
}

type NavigationProp = StackNavigationProp<MainStackParamList, 'CardDetail'>;

/**
 * Helper function to get variant badge info
 */
function getVariantBadge(variant?: string) {
  if (!variant || variant === 'base') return null;
  const badges: Record<string, { label: string; color: string }> = {
    'reverse-holo': { label: 'RH', color: '#FFD700' }, // Gold
    'poke-ball': { label: 'PB', color: '#FF6B6B' }, // Red
    'master-ball': { label: 'MB', color: '#4ECDC4' }, // Teal
  };
  return badges[variant] || null;
}

/**
 * Card item component - memoized to prevent unnecessary re-renders
 * when switching between view modes or when other cards change.
 */
function CardItemComponent({ 
  card, 
  onPress, 
  onLongPress,
  onLongPressRelease,
  binderId, 
  width, 
  variant = 'grid', 
  position, 
  collectionMode, 
  isExtraCard, 
  cardIndex, 
  cardsPerPage,
  listTapBehavior = 'navigate', // Default: tap navigates to card details
}: CardItemProps) {
  const navigation = useNavigation<NavigationProp>();
  const badge = getVariantBadge(card.variant);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const checkScale = useRef(new Animated.Value(1)).current;
  const prevOwnedRef = useRef(card.isOwned);

  const handleCardPress = () => {
    // Navigate to CardDetail screen when card is tapped
    navigation.navigate('CardDetail', {
      cardId: card.id,
      binderId: binderId,
      // Pass current ownership so detail screen shows the latest optimistic state
      isOwned: card.isOwned,
      // Pass position and collectionMode for Custom binders
      position: position,
      collectionMode: collectionMode,
      // Pass isExtraCard for cards added by user (not in official set)
      isExtraCard: isExtraCard,
      // Pass card index and cards per page for binder position display
      cardIndex: cardIndex,
      cardsPerPage: cardsPerPage,
      // Pass full card data to skip API fetch (faster loading)
      cardData: {
        id: card.id,
        name: card.name,
        number: card.number,
        set: card.set,
        rarity: card.rarity,
        illustrator: card.illustrator,
        imageUrl: card.imageUrl,
        imageUrlHiRes: card.imageUrlHiRes,
        variant: card.variant,
        supertype: card.supertype,
        setTotal: card.setTotal,
        pokedexNumber: card.pokedexNumber,
      },
    });
  };

  useEffect(() => {
    if (prevOwnedRef.current !== card.isOwned) {
      prevOwnedRef.current = card.isOwned;
      Animated.sequence([
        Animated.timing(checkScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
        Animated.timing(checkScale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [card.isOwned]);

  const handleCheckboxPress = () => {
    if (onPress) {
      lightTap();
      onPress(card);
    }
  };

  // Step 34A: Long-press handler for enlarge preview
  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(card);
    }
  };

  // Step 34A: List view tap behavior - either navigate or toggle ownership
  const handleListRowPress = () => {
    if (listTapBehavior === 'toggle') {
      // Toggle ownership when row is tapped
      if (onPress) {
        onPress(card);
      }
    } else {
      // Navigate to card details (default)
      handleCardPress();
    }
  };

  if (variant === 'list') {
    // Step 34A: List view is text-only (no images) for faster scrolling
    return (
      <TouchableOpacity
        style={[styles.listItem, !card.isOwned && styles.missingListItem]}
        onPress={handleListRowPress}
        activeOpacity={0.7}
      >
        <View style={styles.listInfo}>
          <View style={styles.listNameRow}>
            <Text style={styles.listCardName} numberOfLines={1}>{card.name}</Text>
            {badge && (
              <View style={[styles.listVariantBadgeInline, { backgroundColor: badge.color }]}>
                <Text style={styles.listVariantBadgeText}>{badge.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.listCardNumber}>{card.number}</Text>
          {card.rarity && <Text style={styles.listCardRarity}>{card.rarity}</Text>}
        </View>
        <TouchableOpacity 
          style={styles.listCheckbox}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            {card.isOwned ? (
              <RNImage source={LOGO_ICON} style={styles.checkboxLogo} resizeMode="contain" />
            ) : (
              <Ionicons name="square-outline" size={22} color={colors.textTertiary} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // Grid view
  const cardItemStyle = width 
    ? [styles.cardItem, { width }]
    : styles.cardItem;
  
  return (
    <TouchableOpacity
      style={cardItemStyle}
      onPress={handleCardPress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPressOut={onLongPressRelease}
      delayLongPress={300}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        <CardImage
          source={card.imageUrl}
          isMissing={!card.isOwned}
          aspectRatio={0.716}
          style={styles.cardImageWrapper}
          cardInfo={{ id: card.id, name: card.name, number: card.number, set: card.set }}
        />
        <TouchableOpacity 
          style={styles.checkboxOverlay}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            {card.isOwned ? (
              <RNImage source={LOGO_ICON} style={styles.checkboxLogo} resizeMode="contain" />
            ) : (
              <Ionicons name="square-outline" size={20} color={colors.textTertiary} />
            )}
          </Animated.View>
        </TouchableOpacity>
        {badge && (
          <View style={[styles.variantBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.variantBadgeText}>{badge.label}</Text>
          </View>
        )}
      </View>
      <CardDetails
        card={card}
        variant="compact"
        showSet={false}
        showRarity={false}
        showIllustrator={false}
        showVariantBadge={false}
      />
    </TouchableOpacity>
  );
}

/**
 * Custom comparison function for React.memo
 * Only re-render if card ownership, image, or key props changed
 */
function arePropsEqual(prevProps: CardItemProps, nextProps: CardItemProps): boolean {
  // Always re-render if card ID changes
  if (prevProps.card.id !== nextProps.card.id) return false;
  
  // Re-render if ownership status changes
  if (prevProps.card.isOwned !== nextProps.card.isOwned) return false;
  
  // Re-render if image URL changes (for Region mode card selections)
  if (prevProps.card.imageUrl !== nextProps.card.imageUrl) return false;
  
  // Re-render if display variant (grid/list) changes
  if (prevProps.variant !== nextProps.variant) return false;
  
  // Re-render if card variant (reverse-holo, poke-ball, etc.) changes
  if (prevProps.card.variant !== nextProps.card.variant) return false;
  
  // Re-render if width changes (for grid layout)
  if (prevProps.width !== nextProps.width) return false;
  
  // All relevant props are the same, skip re-render
  return true;
}

// Export memoized component to prevent unnecessary re-renders
const CardItem = memo(CardItemComponent, arePropsEqual);
export default CardItem;

const CARD_MARGIN = 2;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Grid view styles
  cardItem: {
    margin: CARD_MARGIN,
    marginBottom: 8,
    alignItems: 'center',
  },
  cardImageContainer: {
    width: '100%',
    position: 'relative',
  },
  cardImageWrapper: {
    width: '100%',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.overlayLight,
    borderRadius: 4,
    padding: 4,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLogo: {
    width: 22,
    height: 22,
  },
  variantBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  // List view styles (text-only, no images)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  missingListItem: {
    opacity: 0.6,
  },
  listInfo: {
    flex: 1,
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  listCardName: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    flex: 1,
  },
  listCardNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  listCardRarity: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  listVariantBadgeInline: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCheckbox: {
    marginLeft: 8,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listVariantBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listVariantBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
});


