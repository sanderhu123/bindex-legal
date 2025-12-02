import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CardImage from './CardImage';
import CardDetails from './CardDetails';
import type { Card } from '../../types';
import type { MainStackParamList } from '../../navigation/AppNavigator';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

interface CardItemProps {
  card: CardWithOwnership;
  onPress?: (card: CardWithOwnership) => void; // Optional now, navigation takes priority
  binderId: string;
  width?: number;
  variant?: 'grid' | 'list';
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

export default function CardItem({ card, onPress, binderId, width, variant = 'grid' }: CardItemProps) {
  const navigation = useNavigation<NavigationProp>();
  const badge = getVariantBadge(card.variant);

  const handleCardPress = () => {
    // Navigate to CardDetail screen when card is tapped
    navigation.navigate('CardDetail', {
      cardId: card.id,
      binderId: binderId,
    });
  };

  const handleCheckboxPress = () => {
    // Toggle ownership if onPress handler is provided
    // In React Native, nested TouchableOpacity prevents parent from firing
    if (onPress) {
      onPress(card);
    }
  };

  if (variant === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listItem, !card.isOwned && styles.missingListItem]}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <View style={styles.listImageContainer}>
          <CardImage
            source={card.imageUrl}
            isMissing={!card.isOwned}
            aspectRatio={0.7}
            style={styles.listImageWrapper}
          />
          {badge && (
            <View style={[styles.listVariantBadge, { backgroundColor: badge.color }]}>
              <Text style={styles.listVariantBadgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listCardName}>{card.name}</Text>
          <Text style={styles.listCardNumber}>{card.number}</Text>
          {card.set && <Text style={styles.listCardSet}>{card.set}</Text>}
          {card.pokedexNumber && <Text style={styles.listCardSet}>Pokédex: #{card.pokedexNumber}</Text>}
          {card.rarity && <Text style={styles.listCardRarity}>{card.rarity}</Text>}
        </View>
        <TouchableOpacity 
          style={styles.listCheckbox}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
        >
          <Text style={styles.checkbox}>{card.isOwned ? '☑' : '☐'}</Text>
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
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        <CardImage
          source={card.imageUrl}
          isMissing={!card.isOwned}
          aspectRatio={0.7}
          style={styles.cardImageWrapper}
        />
        <TouchableOpacity 
          style={styles.checkboxOverlay}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
        >
          <Text style={styles.checkbox}>{card.isOwned ? '☑' : '☐'}</Text>
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
        showArtist={false}
        showVariantBadge={false}
      />
    </TouchableOpacity>
  );
}

const CARD_MARGIN = 2;

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    fontSize: 20,
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
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
  // List view styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  missingListItem: {
    opacity: 0.6,
  },
  listImageContainer: {
    width: 60,
    height: 84, // 60 * 0.7 aspect ratio
    marginRight: 12,
    position: 'relative',
  },
  listImageWrapper: {
    width: 60,
    height: 84,
    borderRadius: 6,
  },
  listInfo: {
    flex: 1,
  },
  listCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listCardNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  listCardSet: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  listCardRarity: {
    fontSize: 12,
    color: '#999',
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
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
});


