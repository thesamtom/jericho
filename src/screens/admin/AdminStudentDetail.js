import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

function safeLower(value) {
  return String(value || '').toLowerCase();
}

export default function AdminStudentDetail({ route }) {
  const { studentId, hostelName, hostelId } = route.params || {};
  const [student, setStudent] = useState(null);
  const [parent, setParent] = useState(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [feeStatus, setFeeStatus] = useState('paid');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
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

  async function fetchStudent() {
      const query = await supabase
      .from('student')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    return query;
  }

  async function fetchParent(studentRow) {
      const parentId = studentRow?.parent_id;
      if (!parentId) return null;

      const fromParent = await supabase
      .from('parent')
      .select('*')
        .eq('parent_id', parentId)
      .maybeSingle();

      return fromParent.data || null;
  }

  async function fetchFeeSummary(studentRow) {
      const linkedStudentId = studentRow?.student_id;
    if (!linkedStudentId) {
      setPendingTotal(0);
      setFeeStatus('paid');
      return;
    }

    const feeQuery = await supabase
      .from('fee')
      .select('amount,status')
      .eq('student_id', linkedStudentId);

    const fees = feeQuery.data || [];
    const pending = fees.filter((item) => safeLower(item.status) === 'pending');
    const total = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    setPendingTotal(total);
    setFeeStatus(total > 0 ? 'pending' : 'paid');
  }

  async function loadData({ isRefresh = false, showError = false } = {}) {
    try {
      const studentQuery = await fetchStudent();
      if (studentQuery.error) throw studentQuery.error;

      const studentRow = studentQuery.data || null;
      setStudent(studentRow);

      if (!studentRow) {
        setParent(null);
        setPendingTotal(0);
        setFeeStatus('paid');
        return;
      }

      const [parentRow] = await Promise.all([
        fetchParent(studentRow),
        fetchFeeSummary(studentRow),
      ]);

      setParent(parentRow);
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) {
        setStudent(null);
        setParent(null);
        setPendingTotal(0);
        setFeeStatus('paid');
      }
    } finally {
      if (!isRefresh) setLoading(false);
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

  return (
    <View style={styles.flex}>
      <ScreenHeader title={student?.name || 'Student Detail'} subtitle="Detailed management view" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} enabled={!refreshing} />}
      >
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <Text style={styles.meta}>Name: {student?.name || '—'}</Text>
          <Text style={styles.meta}>Student ID: {student?.student_id || '—'}</Text>
          <Text style={styles.meta}>Room Number: {student?.room_no || '—'}</Text>
          <Text style={styles.meta}>Hostel: {hostelName || `Hostel ${hostelId || student?.hostel_id || ''}`}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fee Info</Text>
          <View style={styles.feeRow}>
            <Text style={styles.pendingLabel}>Total Pending Fees</Text>
            <StatusBadge status={feeStatus} />
          </View>
          <Text style={styles.pendingValue}>INR {pendingTotal}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Parent Details</Text>
          <Text style={styles.meta}>Name: {parent?.name || 'Not linked'}</Text>
          <Text style={styles.meta}>Email: {parent?.email || '—'}</Text>
          <Text style={styles.meta}>Phone: {parent?.phone || '—'}</Text>
        </Card>

        {loading ? <Text style={styles.helper}>Loading details...</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  sectionCard: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
    marginTop: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  pendingValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginTop: spacing.sm,
  },
  helper: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    fontSize: typography.sizes.md,
    marginTop: spacing.sm,
  },
});