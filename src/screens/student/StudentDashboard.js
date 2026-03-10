import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function StudentDashboard({ navigation }) {
  const { user } = useAuth();
  const [hostelStatus, setHostelStatus] = useState('Present');
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const studentId = user?.student_id || user?.id;
      const today = new Date().toISOString().split('T')[0];

      // Check if student has an approved movement request where they're currently away
      const { data: activeRequests } = await supabase
        .from('movement_request')
        .select('*')
        .eq('student_id', studentId)
        .eq('final_status', 'Approved')
        .lte('leave_date', today)
        .gte('return_date', today);

      if (activeRequests && activeRequests.length > 0) {
        setHostelStatus('Not Present');
      } else {
        setHostelStatus('Present');
      }

      // Load recent movement requests
      const { data: requests } = await supabase
        .from('movement_request')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (requests) setRecentRequests(requests);
    } catch {
      // Tables may not exist yet
    }
  }

  const quickActions = [
    { label: 'Movement Request', icon: 'arrow-right-circle', screen: 'MovementRequest', color: colors.primary.main },
    { label: 'Raise Complaint', icon: 'alert-triangle', screen: 'Complaint', color: colors.status.pending },
    { label: 'View Fee Status', icon: 'credit-card', screen: 'FeePayment', color: colors.status.approved },
  ];

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Student Portal" subtitle={`Welcome, ${user?.email || 'Student'}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hostel Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Hostel Status</Text>
              <Text style={styles.statusValue}>{hostelStatus}</Text>
            </View>
            <View style={[styles.statusDot, {
              backgroundColor: hostelStatus === 'Present' ? colors.status.approved : colors.status.rejected,
            }]} />
          </View>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                <Feather name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Requests */}
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        {recentRequests.length === 0 ? (
          <Text style={styles.empty}>No recent requests</Text>
        ) : (
          recentRequests.map((req) => (
            <Card key={req.request_id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Text style={styles.requestReason}>{req.reason || 'Movement Request'}</Text>
                <StatusBadge status={req.final_status || req.status} />
              </View>
              <Text style={styles.requestDate}>
                {req.leave_date} — {req.return_date}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  statusCard: { marginBottom: spacing.sectionGap },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  statusValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginTop: 2,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sectionGap,
  },
  actionCard: {
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral.textPrimary,
    textAlign: 'center',
  },
  requestCard: { marginBottom: spacing.sm },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  requestReason: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    flex: 1,
  },
  requestDate: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 20,
    fontSize: typography.sizes.md,
  },
});
