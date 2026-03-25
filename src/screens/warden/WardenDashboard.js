import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius } from '../../theme';

export default function WardenDashboard({ navigation }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
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
      // Movement requests where parent approved and warden still pending
      const { data: requests } = await supabase
        .from('movement_request')
        .select('*')
        .eq('parent_status', 'Approved')
        .eq('warden_status', 'Pending')
        .order('created_at', { ascending: false });
      if (requests) setPendingRequests(requests);

      // Open complaints
      const { data: complaintData } = await supabase
        .from('complaint')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });
      if (complaintData) setComplaints(complaintData);
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

  function toDateTime(dateValue, timeValue, isEndOfRange) {
    if (!dateValue) return null;
    const fallbackTime = isEndOfRange ? '23:59' : '00:00';
    const time = String(timeValue || fallbackTime);
    const composed = `${String(dateValue)}T${time}:00`;
    const parsed = new Date(composed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function deriveStudentStatusFromRequestWindow(requestRow) {
    const now = new Date();
    const leaveAt = toDateTime(requestRow?.leave_date, requestRow?.leave_time, false);
    const returnAt = toDateTime(requestRow?.return_date, requestRow?.return_time, true);

    if (!leaveAt || !returnAt) return 'present';
    if (now >= leaveAt && now <= returnAt) return 'absent';
    return 'present';
  }

  async function handleRequestAction(requestId, action) {
    try {
      const updates = { warden_status: action };
      // If warden approves and parent already approved, set final status
      const req = pendingRequests.find((r) => r.request_id === requestId);
      if (action === 'Approved' && req?.parent_status === 'Approved') {
        updates.final_status = 'Approved';
      } else if (action === 'Rejected') {
        updates.final_status = 'Rejected';
      }

      const { error } = await supabase
        .from('movement_request')
        .update(updates)
        .eq('request_id', requestId);
      if (error) throw error;

      if (req?.student_id && updates.final_status === 'Approved') {
        const nextStatus = deriveStudentStatusFromRequestWindow(req);
        const studentUpdate = await supabase
          .from('student')
          .update({ status: nextStatus })
          .eq('student_id', req.student_id);
        if (studentUpdate.error) throw studentUpdate.error;
      }

      if (req?.student_id && action === 'Rejected') {
        const studentUpdate = await supabase
          .from('student')
          .update({ status: 'present' })
          .eq('student_id', req.student_id);
        if (studentUpdate.error) throw studentUpdate.error;
      }

      Alert.alert('Success', `Request ${action}`);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

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
            Last updated at {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
        {/* Movement Approvals */}
        <Text style={styles.sectionTitle}>Movement Approvals</Text>
        {pendingRequests.length === 0 ? (
          <Text style={styles.empty}>No pending requests</Text>
        ) : (
          pendingRequests.map((req) => (
            <Card key={req.request_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Student: {req.student_id}</Text>
                <StatusBadge status={req.parent_status} />
              </View>
              <Text style={styles.cardDetail}>{req.reason || 'Movement Request'}</Text>
              <Text style={styles.cardMeta}>
                {req.leave_date} → {req.return_date}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleRequestAction(req.request_id, 'Approved')}
                >
                  <Feather name="check" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleRequestAction(req.request_id, 'Rejected')}
                >
                  <Feather name="x" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Complaints */}
        <Text style={styles.sectionTitle}>Open Complaints</Text>
        {complaints.length === 0 ? (
          <Text style={styles.empty}>No open complaints</Text>
        ) : (
          complaints.map((item) => (
            <Card key={String(item.complaint_id || item.id || `${item.student_id}-${item.created_at}`)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDetail} numberOfLines={2}>
                  {item.complaint_text || item.description || 'Complaint'}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardMeta}>
                {new Date(item.created_at).toLocaleDateString()}
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
  lastUpdated: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sectionGap,
  },
  card: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  cardDetail: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  approveBtn: { backgroundColor: colors.status.approved },
  rejectBtn: { backgroundColor: colors.status.rejected },
  actionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 10,
    marginBottom: spacing.md,
    fontSize: typography.sizes.md,
  },
});
