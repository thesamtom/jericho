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
import { formatDateRangeDisplay, formatTimeDisplay } from '../../lib/dateTime';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function WardenDashboard({ navigation }) {
  const { user } = useAuth();
  const [recentRequests, setRecentRequests] = useState([]);
  const [hostelId, setHostelId] = useState(null);
  const [hostelStatus, setHostelStatus] = useState('Not Assigned');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);
  const [processingId, setProcessingId] = useState(null);

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

  async function resolveWardenHostelId() {
    if (user?.hostel_id) return user.hostel_id;

    const candidateId = user?.warden_id || user?.id;
    if (!candidateId) return null;

    const byWardenId = await supabase
      .from('warden')
      .select('*')
      .eq('warden_id', candidateId)
      .maybeSingle();

    if (byWardenId.data?.hostel_id) return byWardenId.data.hostel_id;

    const byId = await supabase
      .from('warden')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    return byId.data?.hostel_id || null;
  }

  async function loadData({ showError = false } = {}) {
    try {
      const resolvedHostelId = await resolveWardenHostelId();
      setHostelId(resolvedHostelId);
      setHostelStatus(resolvedHostelId ? 'Active' : 'Not Assigned');

      if (resolvedHostelId) {
        const { data: studentRows, error: studentError } = await supabase
          .from('student')
          .select('*')
          .eq('hostel_id', resolvedHostelId);

        if (studentError) throw studentError;

        const studentIds = (studentRows || [])
          .map((row) => String(row.student_id || row.id || ''))
          .filter(Boolean);

        const studentMap = {};
        (studentRows || []).forEach((row) => {
          const key = String(row.student_id || row.id || '');
          if (!key) return;
          studentMap[key] = row;
        });

        if (studentIds.length === 0) {
          setRecentRequests([]);
        } else {
          const { data: requestRows, error: requestError } = await supabase
            .from('movement_request')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(40);

          if (requestError) throw requestError;

          const hostelRequests = (requestRows || [])
            .filter((row) => studentIds.includes(String(row.student_id || '')))
            .filter((row) => {
              const finalStatus = String(row.final_status || '').toLowerCase();
              const parentStatus = String(row.parent_status || '').toLowerCase();
              const wardenStatus = String(row.warden_status || '').toLowerCase();

              if (finalStatus === 'approved' || finalStatus === 'rejected') return false;
              if (parentStatus === 'rejected' || wardenStatus === 'rejected') return false;

              return wardenStatus === 'pending' || !wardenStatus;
            })
            .slice(0, 5)
            .map((row) => {
              const key = String(row.student_id || '');
              const student = studentMap[key] || {};
              return {
                ...row,
                studentName: student.name || `Student ${key}`,
                studentCode: key,
              };
            });

          setRecentRequests(hostelRequests);
        }
      } else {
        setRecentRequests([]);
      }

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

  async function updateRequestStatus(requestId, wardenAction) {
    if (!requestId || processingId) return;

    try {
      setProcessingId(requestId);

      const request = recentRequests.find((r) => r.request_id === requestId);
      if (!request) {
        Alert.alert('Error', 'Request not found');
        return;
      }

      const wardenStatusValue = wardenAction === 'approved' ? 'approved' : 'rejected';
      const parentStatus = String(request.parent_status || 'pending').toLowerCase();

      // Only update warden_status; final_status updates only on specific conditions
      let computedFinalStatus = null;
      if (wardenAction === 'rejected' || parentStatus === 'rejected') {
        computedFinalStatus = 'rejected';
      } else if (wardenAction === 'approved' && parentStatus === 'approved') {
        computedFinalStatus = 'approved';
      }

      const updatePayload = { warden_status: wardenStatusValue };
      if (computedFinalStatus) {
        updatePayload.final_status = computedFinalStatus;
      }

      const { error } = await supabase
        .from('movement_request')
        .update(updatePayload)
        .eq('request_id', requestId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Show success message
      const message = wardenAction === 'approved' ? 'Request approved!' : 'Request rejected!';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', message);
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Full error:', error.message);
      Alert.alert('Error', error.message || 'Failed to update request');
    } finally {
      setProcessingId(null);
    }
  }

  const quickActions = [
    {
      label: 'View Complaints',
      icon: 'alert-triangle',
      color: colors.status.pending,
      onPress: () => navigation.navigate('Complaints'),
    },
    {
      label: 'View Pending Fees',
      icon: 'credit-card',
      color: colors.status.rejected,
      onPress: () => navigation.navigate('WardenFeeDefaulters'),
    },
    {
      label: 'View Students',
      icon: 'users',
      color: colors.status.approved,
      onPress: () => navigation.navigate('Students'),
    },
  ];

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Warden Panel" subtitle="Manage hostel operations" />
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

        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Hostel Status</Text>
              <Text style={styles.statusValue}>{hostelStatus}</Text>
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: hostelStatus === 'Active' ? colors.status.approved : colors.status.rejected },
              ]}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
                <Feather name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Requests</Text>
        {recentRequests.length === 0 ? (
          <Text style={styles.empty}>No recent requests</Text>
        ) : (
          recentRequests.map((req) => (
            <Card key={String(req.request_id || `${req.student_id}-${req.created_at}`)} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <Text style={styles.requestStudentName}>{req.studentName || `Student ${req.studentCode || ''}`}</Text>
                <StatusBadge status="pending" />
              </View>
              <Text style={styles.requestReason}>{req.reason || 'Movement Request'}</Text>
              <Text style={styles.requestMeta}>Student ID: {req.studentCode}</Text>
              <Text style={styles.requestDate}>
                {formatDateRangeDisplay(req.leave_date, req.return_date, req.leave_time, req.return_time)}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.approveBtn, processingId === req.request_id && styles.disabledBtn]}
                  onPress={() => updateRequestStatus(req.request_id, 'approved')}
                  disabled={processingId === req.request_id}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="check"
                    size={18}
                    color={colors.neutral.surface}
                    style={styles.btnIcon}
                  />
                  <Text style={styles.approveBtnText}>
                    {processingId === req.request_id ? 'Processing...' : 'Approve'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectBtn, processingId === req.request_id && styles.disabledBtn]}
                  onPress={() => updateRequestStatus(req.request_id, 'rejected')}
                  disabled={processingId === req.request_id}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="x"
                    size={18}
                    color={colors.neutral.surface}
                    style={styles.btnIcon}
                  />
                  <Text style={styles.rejectBtnText}>
                    {processingId === req.request_id ? 'Processing...' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {!hostelId ? (
          <Text style={styles.helperText}>
            Warden hostel mapping is missing. Ask admin to assign this warden to a hostel.
          </Text>
        ) : null}
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
  requestStudentName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  requestReason: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginBottom: 2,
  },
  requestDate: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
  },
  requestMeta: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginBottom: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 20,
    fontSize: typography.sizes.md,
  },
  helperText: {
    textAlign: 'center',
    color: colors.status.rejected,
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.status.approved,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    color: colors.neutral.surface,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginLeft: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.status.rejected,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: colors.neutral.surface,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginLeft: 6,
  },
  btnIcon: {
    marginRight: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
