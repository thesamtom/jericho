import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDateRangeDisplay, formatTimeDisplay, formatTimeString } from '../../lib/dateTime';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

function toDateTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const date = String(dateValue).trim();
  const time = String(timeValue || '00:00:00').trim();
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const parsed = new Date(`${date}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function StudentDashboard({ navigation }) {
  const { user } = useAuth();
  const [hostelStatus, setHostelStatus] = useState('Present');
  const [recentRequests, setRecentRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  function showRefreshError() {
    const message = 'Failed to refresh. Try again.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Refresh Failed', message);
  }

  async function loadData({ showError = false } = {}) {
    try {
      const studentId = user?.student_id || user?.id;

      // Keep DB as source of truth for time-based absence.
      await supabase.rpc('auto_mark_absent');

      let { data: studentRow, error: studentError } = await supabase
        .from('student')
        .select('status')
        .eq('student_id', studentId)
        .maybeSingle();

      if (studentError) {
        const retry = await supabase
          .from('student')
          .select('status')
          .eq('id', studentId)
          .maybeSingle();
        studentRow = retry.data;
        studentError = retry.error;
      }

      if (studentError) throw studentError;

      // Load recent movement requests
      const { data: requests } = await supabase
        .from('movement_request')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5);

      const now = new Date();
      const activeApprovedLeave = (requests || []).some((req) => {
        const finalStatus = String(req?.final_status || '').toLowerCase();
        const checkedInAt = req?.checked_in_at;
        const leaveAt = toDateTime(req?.leave_date, req?.leave_time);

        if (finalStatus !== 'approved' || checkedInAt || !leaveAt) return false;
        return now >= leaveAt;
      });

      const dbStatus = String(studentRow?.status || 'present').toLowerCase();
      const effectiveAbsent = dbStatus === 'absent' || activeApprovedLeave;

      if (activeApprovedLeave && dbStatus !== 'absent') {
        await supabase
          .from('student')
          .update({ status: 'absent' })
          .eq('student_id', studentId);
      }

      setHostelStatus(effectiveAbsent ? 'Not Present' : 'Present');
      if (requests) setRecentRequests(requests);
      setLastUpdatedAt(new Date());
      return true;
    } catch {
      if (showError) showRefreshError();
      return false;
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;

    setRefreshing(true);
    await loadData({ showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  const quickActions = [
    { label: 'Movement Request', icon: 'arrow-right-circle', screen: 'MovementRequest', color: colors.primary.main },
    { label: 'Raise Complaint', icon: 'alert-triangle', screen: 'Complaint', color: colors.status.pending },
    { label: 'View Fee Status', icon: 'credit-card', screen: 'FeePayment', color: colors.status.approved },
  ];

  function getRequestBadge(req) {
    const parentStatus = String(req?.parent_status || '').toLowerCase();
    const finalStatus = String(req?.final_status || '').toLowerCase();

    if (parentStatus === 'rejected' && finalStatus !== 'approved') {
      return { status: 'rejected', label: 'Parent Rejected' };
    }

    return {
      status: req?.final_status || req?.status || 'Pending',
      label: null,
    };
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Student Portal" subtitle={`Welcome, ${user?.email || 'Student'}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} enabled={!refreshing} />
        }
      >
        {lastUpdatedAt ? (
          <Text style={styles.lastUpdated}>
            Last updated at {formatTimeDisplay(lastUpdatedAt)}
          </Text>
        ) : null}
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
          recentRequests.map((req) => {
            const badge = getRequestBadge(req);
            return (
            <Card key={req.request_id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Text style={styles.requestReason}>{req.reason || 'Movement Request'}</Text>
                <StatusBadge status={badge.status} label={badge.label} />
              </View>
              <Text style={styles.requestDate}>
                {formatDateRangeDisplay(req.leave_date, req.return_date, req.leave_time, req.return_time)}
              </Text>
              <Text style={styles.requestTime}>
                Leave: {formatTimeString(req.leave_time)}   Return: {formatTimeString(req.return_time)}
              </Text>
            </Card>
          )})
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  lastUpdated: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.sm,
  },
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
  requestTime: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 20,
    fontSize: typography.sizes.md,
  },
});
