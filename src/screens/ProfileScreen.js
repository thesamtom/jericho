import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card } from '../components';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../theme';

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut },
    ]);
  }

  const idLabel = role === 'admin' ? 'Admin ID'
    : role === 'student' ? 'Student ID'
    : role === 'parent' ? 'Parent ID'
    : role === 'warden' ? 'Warden ID'
    : 'User ID';

  const idValue = user?.admin_id || user?.student_id || user?.parent_id || user?.warden_id || user?.id || '—';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Feather name="user" size={40} color={colors.primary.main} />
          </View>
          <Text style={styles.name}>{user?.name || user?.email || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(role || 'student').charAt(0).toUpperCase() + (role || 'student').slice(1)}
            </Text>
          </View>
        </View>

        {/* Info */}
        <Card style={styles.infoCard}>
          <InfoRow label={idLabel} value={idValue} />
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Role" value={role ? role.charAt(0).toUpperCase() + role.slice(1) : '—'} />
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.status.rejected} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.sectionGap },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  roleBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    marginTop: 6,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary.main,
  },
  infoCard: { marginBottom: spacing.sectionGap },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  infoLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.status.rejected,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.status.rejected,
  },
});
