import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  ToastAndroid,
} from 'react-native';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDateDisplay, formatTimeDisplay } from '../../lib/dateTime';
import { colors, spacing, typography } from '../../theme';

function normalizeFeeStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === 'paid' ? 'paid' : 'pending';
}

export default function FeePayment() {
  const { user } = useAuth();
  const studentId = user?.student_id || user?.id;
  const [fees, setFees] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);

  useEffect(() => {
    loadFees();
  }, []);

  function showRefreshError() {
    const message = 'Failed to refresh. Try again.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Refresh Failed', message);
  }

  async function loadFees({ isRefresh = false, showError = false } = {}) {
    try {
      if (!studentId) {
        setFees([]);
        setPendingTotal(0);
        return;
      }

      let { data, error } = await supabase
        .from('fee')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: false });

      if (error) {
        const retry = await supabase
          .from('fee')
          .select('*')
          .eq('student_id', Number(studentId))
          .order('due_date', { ascending: false });
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      const normalizedFees = (data || []).map((item) => ({
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
        setFees([]);
        setPendingTotal(0);
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
    await loadFees({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Fee Payment" subtitle="View fee status" />
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

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Pending Amount</Text>
          <Text style={styles.summaryValue}>
            {pendingTotal > 0 ? `INR ${pendingTotal}` : 'No pending fees'}
          </Text>
        </Card>

        {/* Fee Cards */}
        <Text style={styles.sectionTitle}>Fee Records</Text>
        {fees.length === 0 ? (
          <Text style={styles.empty}>
            {loading ? 'Loading...' : 'No fee records found'}
          </Text>
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
  summaryCard: { marginBottom: spacing.sectionGap },
  summaryLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
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
    marginTop: 20,
    fontSize: typography.sizes.md,
  },
});
