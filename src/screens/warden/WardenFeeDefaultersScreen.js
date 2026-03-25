import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatTimeDisplay } from '../../lib/dateTime';
import { colors, spacing, typography } from '../../theme';

function normalizeFeeStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === 'paid' ? 'paid' : 'pending';
}

export default function WardenFeeDefaultersScreen() {
  const { user } = useAuth();
  const [hostelId, setHostelId] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);

  useEffect(() => {
    loadDefaulters();
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

  function buildGroupedDefaulters(studentRows, feeRows) {
    const studentMap = {};
    (studentRows || []).forEach((row) => {
      const key = String(row.student_id || row.id || '');
      if (key) studentMap[key] = row;
    });

    const grouped = {};
    (feeRows || []).forEach((fee) => {
      const status = normalizeFeeStatus(fee.status);
      if (status !== 'pending') return;

      const key = String(fee.student_id || '');
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          studentId: key,
          studentName: studentMap[key]?.name || `Student ${key}`,
          totalDue: 0,
          items: 0,
        };
      }

      grouped[key].totalDue += Number(fee.amount || 0);
      grouped[key].items += 1;
    });

    return Object.values(grouped).sort((a, b) => b.totalDue - a.totalDue);
  }

  async function loadDefaulters({ isRefresh = false, showError = false } = {}) {
    if (!isRefresh) setLoading(true);

    try {
      const resolvedHostelId = await resolveWardenHostelId();
      setHostelId(resolvedHostelId);

      if (!resolvedHostelId) {
        if (!isRefresh) setDefaulters([]);
        return;
      }

      const { data: studentRows, error: studentError } = await supabase
        .from('student')
        .select('*')
        .eq('hostel_id', resolvedHostelId);

      if (studentError) throw studentError;

      const studentIds = (studentRows || [])
        .map((row) => String(row.student_id || row.id || ''))
        .filter(Boolean);

      if (studentIds.length === 0) {
        setDefaulters([]);
        return;
      }

      const { data: feeRows, error: feeError } = await supabase
        .from('fee')
        .select('*')
        .order('due_date', { ascending: true });

      if (feeError) throw feeError;

      const hostelFees = (feeRows || []).filter((row) =>
        studentIds.includes(String(row.student_id || ''))
      );

      setDefaulters(buildGroupedDefaulters(studentRows, hostelFees));
      setLastUpdatedAt(new Date());
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) setDefaulters([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;

    setRefreshing(true);
    await loadDefaulters({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  function renderItem({ item }) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.name}>{item.studentName}</Text>
          <StatusBadge status="pending" />
        </View>
        <Text style={styles.meta}>Student ID: {item.studentId}</Text>
        <Text style={styles.meta}>Pending records: {item.items}</Text>
        <Text style={styles.amount}>Total Due: INR {item.totalDue}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Pending Fees" subtitle="Students with due fees" />
      <FlatList
        data={defaulters}
        keyExtractor={(item) => item.studentId}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} enabled={!refreshing} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          lastUpdatedAt ? (
            <Text style={styles.lastUpdated}>
              Last updated at {formatTimeDisplay(lastUpdatedAt)}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading pending fees...' : 'No students with pending fees'}
          </Text>
        }
      />
      {!hostelId && !loading ? (
        <Text style={styles.helperText}>
          Warden hostel mapping is missing. Ask admin to assign this warden to a hostel.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  list: { padding: spacing.screenPadding, paddingBottom: spacing.xl },
  lastUpdated: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.sm,
  },
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
    flex: 1,
    marginRight: 8,
  },
  meta: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginTop: 4,
  },
  amount: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textPrimary,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 30,
    fontSize: typography.sizes.md,
  },
  helperText: {
    textAlign: 'center',
    color: colors.status.rejected,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: typography.sizes.sm,
  },
});
