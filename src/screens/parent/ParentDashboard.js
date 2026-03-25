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
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDateDisplay, formatDateRangeDisplay, formatTimeDisplay } from '../../lib/dateTime';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

function normalizeFeeStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === 'paid' ? 'paid' : 'pending';
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [fees, setFees] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
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

  async function loadData({ isRefresh = false, showError = false } = {}) {
    try {
      const parentId = user?.parent_id || user?.id;

      // Load linked student info
      let { data: student, error: studentErr } = await supabase
        .from('student')
        .select('*')
        .eq('parent_id', parentId)
        .single();

      if (studentErr) {
        const retry = await supabase
          .from('student')
          .select('*')
          .eq('parent_id', Number(parentId))
          .single();
        student = retry.data;
        studentErr = retry.error;
      }
      
      if (studentErr) console.log('Student lookup error:', JSON.stringify(studentErr));
      if (student) setStudentInfo(student);

      if (!student) return;

      // Load pending movement requests needing parent approval
      const { data: requests, error: reqErr } = await supabase
        .from('movement_request')
        .select('*')
        .eq('student_id', student.student_id)
        .order('created_at', { ascending: false });
      console.log('Student ID:', student.student_id);
      console.log('Movement requests found:', JSON.stringify(requests));
      if (reqErr) console.log('Request error:', JSON.stringify(reqErr));
      if (requests) {
        const pending = requests.filter(
          (r) => !r.parent_status || r.parent_status.toLowerCase() === 'pending'
        );
        console.log('Pending count:', pending.length, JSON.stringify(pending));
        setPendingRequests(pending);
      }

      const linkedStudentId = student.student_id || student.id;
      let { data: feeData, error: feeError } = await supabase
        .from('fee')
        .select('*')
        .eq('student_id', linkedStudentId)
        .order('due_date', { ascending: false });

      if (feeError) {
        const retry = await supabase
          .from('fee')
          .select('*')
          .eq('student_id', Number(linkedStudentId))
          .order('due_date', { ascending: false });
        feeData = retry.data;
        feeError = retry.error;
      }

      if (feeError) throw feeError;

      const normalizedFees = (feeData || []).map((item) => ({
        ...item,
        status: normalizeFeeStatus(item.status),
      }));

      setFees(normalizedFees);
      const total = normalizedFees
        .filter((item) => item.status === 'pending')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setPendingTotal(total);
      setLastUpdatedAt(new Date());
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) {
        setStudentInfo(null);
        setPendingRequests([]);
        setFees([]);
        setPendingTotal(0);
      }
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;

    setRefreshing(true);
    await loadData({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  async function handleApproval(requestId, action) {
    try {
      const { error } = await supabase
        .from('movement_request')
        .update({ parent_status: action })
        .eq('request_id', requestId);
      if (error) throw error;
      await loadData({ isRefresh: true });
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Request ${action}`, ToastAndroid.SHORT);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  const normalizedPresence = String(studentInfo?.status || '').toLowerCase();
  const isPresentInHostel = normalizedPresence === 'present';
  const presenceLabel = isPresentInHostel ? 'Present in Hostel' : 'Outside Hostel';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Parent Panel" subtitle={`Welcome, ${user?.email || 'Parent'}`} />
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
        {/* Student Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Student Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{studentInfo?.name || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hostel</Text>
            <Text style={styles.infoValue}>{studentInfo?.hostel_id || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Room</Text>
            <Text style={styles.infoValue}>{studentInfo?.room_no || '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowNoBorder]}>
            <Text style={styles.infoLabel}>Hostel Presence</Text>
            <View style={styles.presenceWrap}>
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: isPresentInHostel ? colors.status.approved : colors.status.rejected },
                ]}
              />
              <Text style={styles.infoValue}>{presenceLabel}</Text>
            </View>
          </View>
        </Card>

        {/* Pending Approvals */}
        <Text style={styles.sectionTitle}>Pending Approvals</Text>
        {pendingRequests.length === 0 ? (
          <Text style={styles.empty}>No pending requests</Text>
        ) : (
          pendingRequests.map((req) => (
            <Card key={req.request_id} style={styles.requestCard}>
              <Text style={styles.requestReason}>{req.reason || 'Movement Request'}</Text>
              <Text style={styles.requestDate}>
                {formatDateRangeDisplay(req.leave_date, req.return_date)}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApproval(req.request_id, 'approved')}
                >
                  <Feather name="check" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleApproval(req.request_id, 'rejected')}
                >
                  <Feather name="x" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Fee Status */}
        <Text style={styles.sectionTitle}>Fee Status</Text>
        <Card style={styles.feeSummaryCard}>
          <Text style={styles.feeSummaryLabel}>Total Pending Amount</Text>
          <Text style={styles.feeSummaryValue}>
            {pendingTotal > 0 ? `INR ${pendingTotal}` : 'No pending fees'}
          </Text>
        </Card>
        {fees.length === 0 ? (
          <Text style={styles.empty}>No fee records found</Text>
        ) : (
          fees.map((fee) => (
            <Card key={String(fee.fee_id || fee.id || `${fee.student_id}-${fee.due_date}`)} style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeAmount}>₹{fee.amount}</Text>
                <StatusBadge status={fee.status} />
              </View>
              <Text style={styles.feeDetail}>Due: {formatDateDisplay(fee.due_date)}</Text>
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
  infoCard: { marginBottom: spacing.sectionGap },
  cardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  infoRowNoBorder: {
    borderBottomWidth: 0,
  },
  presenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  requestCard: { marginBottom: spacing.md },
  requestReason: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  requestDate: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
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
  feeCard: { marginBottom: spacing.md },
  feeSummaryCard: { marginBottom: spacing.md },
  feeSummaryLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  feeSummaryValue: {
    marginTop: 4,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
  },
  feeDetail: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 10,
    marginBottom: spacing.md,
    fontSize: typography.sizes.md,
  },
});
