import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { supabase } from '../../lib/supabase';
import { formatDateDisplay } from '../../lib/dateTime';
import { colors, spacing, typography } from '../../theme';

export default function FeeRecords() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);

  function showRefreshError() {
    const message = 'Failed to refresh. Try again.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Refresh Failed', message);
  }

  useEffect(() => {
    loadFees();
  }, []);

  async function loadFees({ isRefresh = false, showError = false } = {}) {
    try {
      const { data, error } = await supabase
        .from('fee')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      setFees(data || []);
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

  function renderFee({ item }) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.name}>Student: {item.student_id}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.detail}>Amount: ₹{item.amount}</Text>
        <Text style={styles.detail}>Due: {formatDateDisplay(item.due_date)}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Fee Records" />
      <FlatList
        data={fees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFee}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading...' : 'No fee records found'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  list: { padding: spacing.screenPadding },
  card: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  detail: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 40,
    fontSize: typography.sizes.lg,
  },
});
