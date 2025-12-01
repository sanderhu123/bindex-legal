import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface BinderDetailScreenProps {
  navigation: any;
  route: any;
}

export default function BinderDetailScreen({ navigation, route }: BinderDetailScreenProps) {
  const binderId = route.params?.binderId;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Binder Detail</Text>
      <Text style={styles.text}>Binder ID: {binderId || 'N/A'}</Text>
      <Text style={styles.text}>This screen will be implemented in Step 14</Text>
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
    marginBottom: 10,
  },
});





