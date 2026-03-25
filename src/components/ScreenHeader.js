import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../theme';

export default function ScreenHeader({ title, subtitle, rightActions = [] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>  
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {rightActions.length > 0 ? (
          <View style={styles.actionsWrap}>
            {rightActions.map((action, index) => (
              <TouchableOpacity
                key={`${action?.icon || 'action'}-${index}`}
                style={[styles.actionBtn, action?.disabled && styles.actionBtnDisabled]}
                onPress={action?.onPress}
                disabled={Boolean(action?.disabled)}
                activeOpacity={0.8}
                accessibilityLabel={action?.accessibilityLabel || action?.icon || 'action'}
              >
                <Feather
                  name={action?.icon || 'circle'}
                  size={20}
                  color={action?.color || '#FFFFFF'}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF26',
    marginLeft: 8,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: '#FFFFFFCC',
    marginTop: 2,
  },
});
