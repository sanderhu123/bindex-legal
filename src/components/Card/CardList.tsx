import React, { useCallback, memo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
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

/**
 * CardList component - uses FlatList for virtualization
 * This is much faster than .map() when switching view modes
 */
function CardListComponent({ cards, onCardPress, binderId, listTapBehavior = 'toggle' }: CardListProps) {
  // Memoized render function for better performance
  const renderCard = useCallback(
    ({ item }: { item: CardWithOwnership }) => (
      <CardItem
        card={item}
        onPress={onCardPress}
        binderId={binderId}
        variant="list"
        listTapBehavior={listTapBehavior}
      />
    ),
    [onCardPress, binderId, listTapBehavior]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CardWithOwnership) => item.id, []);

  return (
    <FlatList
      data={cards}
      renderItem={renderCard}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      // Performance optimizations
      removeClippedSubviews={false} // Causes issues on some devices
      maxToRenderPerBatch={20}
      windowSize={11}
      initialNumToRender={15}
      // Disable scroll since parent ScrollView handles it
      scrollEnabled={false}
      // Prevent nested scroll issues
      nestedScrollEnabled={false}
      // Re-render when cards change
      extraData={cards}
    />
  );
}

// Memoize the entire list to prevent re-renders when parent state changes
const CardList = memo(CardListComponent);
export default CardList;

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
  },
});


