import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, borderRadius, typography, spacing, shadows } from '../theme';

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatsCard({ title, value, icon, color }) {
  const iconColor = color || colors.primary.main;
  return (
    <View style={styles.statsCard}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.statsValue}>{value ?? '—'}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );
}

export function StatusBadge({ status }) {
  const key = status?.toLowerCase() || 'pending';
  const bgColor = colors.statusBg[key] || colors.statusBg.pending;
  const textColor = colors.status[key] || colors.status.pending;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>
        {status || 'Pending'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: spacing.cardPadding,
    ...shadows.card,
  },
  statsCard: {
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: spacing.cardPadding,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    ...shadows.card,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
  },
  statsTitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  badgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
