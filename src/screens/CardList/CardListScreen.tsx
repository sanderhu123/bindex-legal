import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { fonts, typography, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface CardListScreenProps {
  navigation: any;
  route: any;
}

export default function CardListScreen({ navigation, route }: CardListScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card List</Text>
      <Text style={styles.text}>This screen will be implemented in Step 15</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.backgroundLight,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    marginBottom: 20,
    marginTop: 20,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
