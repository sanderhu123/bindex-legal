import React from 'react';
import { View, StyleSheet } from 'react-native';
import CardItem from './CardItem';
import type { Card } from '../../types';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

interface CardGridProps {
  cards: CardWithOwnership[];
  onCardPress?: (card: CardWithOwnership) => void; // Optional now, kept for backward compatibility
  binderId: string;
  cardWidth: number;
}

const CARD_MARGIN = 2;

export default function CardGrid({ cards, onCardPress, binderId, cardWidth }: CardGridProps) {
  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          onPress={onCardPress}
          binderId={binderId}
          width={cardWidth}
          variant="grid"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_MARGIN,
  },
});


