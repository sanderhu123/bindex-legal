import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface CardListScreenProps {
  navigation: any;
  route: any;
}

export default function CardListScreen({ navigation, route }: CardListScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card List</Text>
      <Text style={styles.text}>This screen will be implemented in Step 15</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});






