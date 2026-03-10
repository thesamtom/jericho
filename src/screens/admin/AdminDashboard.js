import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../../components';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const HOSTELS = [
  { id: 1, name: 'Santhom Hostel', icon: 'home', color: '#2563EB' },
  { id: 2, name: 'Jyothi Hostel', icon: 'home', color: '#7C3AED' },
  { id: 3, name: 'Thejus Hostel', icon: 'home', color: '#059669' },
  { id: 4, name: 'Shalom Hostel', icon: 'home', color: '#DC2626' },
];

export default function AdminDashboard({ navigation }) {
  return (
    <View style={styles.flex}>
      <ScreenHeader title="Admin Panel" subtitle="Select a hostel to manage" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Campus Hostels</Text>
        {HOSTELS.map((hostel) => (
          <TouchableOpacity
            key={hostel.id}
            style={styles.hostelCard}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('HostelStudents', {
                hostelId: hostel.id,
                hostelName: hostel.name,
              })
            }
          >
            <View style={[styles.hostelIcon, { backgroundColor: hostel.color + '18' }]}>
              <Feather name={hostel.icon} size={28} color={hostel.color} />
            </View>
            <View style={styles.hostelInfo}>
              <Text style={styles.hostelName}>{hostel.name}</Text>
              <Text style={styles.hostelId}>ID: {hostel.id}</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.neutral.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  hostelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  hostelIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  hostelInfo: { flex: 1 },
  hostelName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  hostelId: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
});
