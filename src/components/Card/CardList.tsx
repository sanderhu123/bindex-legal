import React from 'react';
import { View, StyleSheet } from 'react-native';
import CardItem from './CardItem';
import type { Card } from '../../types';

interface CardWithOwnership extends Card {
  isOwned: boolean;
}

interface CardListProps {
  cards: CardWithOwnership[];
  onCardPress?: (card: CardWithOwnership) => void; // Optional now, kept for backward compatibility
  binderId: string;
  listTapBehavior?: 'navigate' | 'toggle'; // Step 34A: what happens when list row is tapped
}

export default function CardList({ cards, onCardPress, binderId, listTapBehavior = 'toggle' }: CardListProps) {
  return (
    <View style={styles.list}>
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          onPress={onCardPress}
          binderId={binderId}
          variant="list"
          listTapBehavior={listTapBehavior}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
  },
});


