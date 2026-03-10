import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../theme';

export default function ScreenHeader({ title, subtitle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>  
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 18,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: '#FFFFFFCC',
    marginTop: 2,
  },
});
