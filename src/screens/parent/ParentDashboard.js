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
import { ScreenHeader, Card, StatusBadge, PrimaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function ParentDashboard({ navigation }) {
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [fees, setFees] = useState([]);
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
      const { data: student, error: studentErr } = await supabase
        .from('student')
        .select('*')
        .eq('parent_id', parentId)
        .single();
      
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

      // Load pending fees
      const { data: feeData } = await supabase
        .from('fee')
        .select('*')
        .eq('student_id', student.student_id)
        .eq('status', 'pending');
      if (feeData) setFees(feeData);
      setLastUpdatedAt(new Date());
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) {
        setStudentInfo(null);
        setPendingRequests([]);
        setFees([]);
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
      Alert.alert('Success', `Request ${action}`);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

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
            Last updated at {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                {req.leave_date} → {req.return_date}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApproval(req.request_id, 'Approved')}
                >
                  <Feather name="check" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleApproval(req.request_id, 'Rejected')}
                >
                  <Feather name="x" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Fee Payment */}
        <Text style={styles.sectionTitle}>Fee Payment</Text>
        {fees.length === 0 ? (
          <Text style={styles.empty}>No pending fees</Text>
        ) : (
          fees.map((fee) => (
            <Card key={fee.id} style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeAmount}>₹{fee.amount}</Text>
                <StatusBadge status={fee.status} />
              </View>
              <Text style={styles.feeDetail}>Due: {fee.due_date}</Text>
              <PrimaryButton
                title="Pay Fee"
                onPress={() => navigation.navigate('FeePayment')}
                style={{ marginTop: spacing.sm }}
              />
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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
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
