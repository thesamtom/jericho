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
import { ScreenHeader, Card, StatusBadge, PrimaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius } from '../../theme';

const PAYMENT_METHODS = ['UPI', 'Card', 'Cash'];

export default function FeePayment() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
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
      const { data, error } = await supabase
        .from('fee')
        .select('*')
        .eq('student_id', user?.id)
        .order('due_date', { ascending: false });
      if (error) throw error;
      setFees(data || []);
      setLastUpdatedAt(new Date());
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) setFees([]);
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

  async function handlePay(feeId) {
    try {
      const { error } = await supabase.from('payment').insert({
        fee_id: feeId,
        student_id: user?.id,
        method: selectedMethod,
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;

      await supabase
        .from('fee')
        .update({ status: 'approved' })
        .eq('id', feeId);

      Alert.alert('Success', 'Payment recorded');
      loadFees();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Fee Payment" subtitle="View and pay fees" />
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
        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.methodChip, selectedMethod === m && styles.methodChipActive]}
              onPress={() => setSelectedMethod(m)}
            >
              <Text style={[styles.methodText, selectedMethod === m && styles.methodTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fee Cards */}
        <Text style={styles.sectionTitle}>Fee Records</Text>
        {fees.length === 0 ? (
          <Text style={styles.empty}>
            {loading ? 'Loading...' : 'No fee records found'}
          </Text>
        ) : (
          fees.map((fee) => (
            <Card key={fee.id} style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeAmount}>₹{fee.amount}</Text>
                <StatusBadge status={fee.status} />
              </View>
              <Text style={styles.feeDetail}>Due: {fee.due_date}</Text>
              {fee.status === 'pending' && (
                <PrimaryButton
                  title={`Pay via ${selectedMethod}`}
                  onPress={() => handlePay(fee.id)}
                  style={{ marginTop: spacing.sm }}
                />
              )}
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
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sectionGap,
  },
  methodChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  methodChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  methodText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.textSecondary,
  },
  methodTextActive: {
    color: '#FFFFFF',
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
