import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, StatusBadge } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function StudentMovementHistory({ route }) {
  const { studentId, studentName } = route.params;
  const [requests, setRequests] = useState([]);
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
    loadRequests();
  }, []);

  async function loadRequests({ isRefresh = false, showError = false } = {}) {
    try {
      const { data, error } = await supabase
        .from('movement_request')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      if (error) {
        console.log('Load requests error:', JSON.stringify(error));
        if (showError) showRefreshError();
      }
      setRequests(data || []);
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) setRequests([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;
    setRefreshing(true);
    await loadRequests({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  function renderRequest({ item }) {
    const statusKey = (item.status || 'pending').toLowerCase();
    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.requestId}>#{item.request_id}</Text>
          <StatusBadge status={statusKey} />
        </View>

        {/* Details */}
        <View style={styles.detailGrid}>
          <DetailRow icon="calendar" label="Date" value={item.date || '—'} />
          <DetailRow icon="log-out" label="Time Out" value={item.time_out || '—'} />
          <DetailRow icon="log-in" label="Time In" value={item.time_in || '—'} />
          <DetailRow icon="map-pin" label="Destination" value={item.destination || '—'} />
          <DetailRow icon="user-check" label="Approved By" value={item.approved_by || '—'} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={studentName || 'Student'}
        subtitle="Movement Request History"
      />
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.request_id)}
        renderItem={renderRequest}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="file-text" size={48} color={colors.neutral.textMuted} />
            <Text style={styles.empty}>
              {loading ? 'Loading requests...' : 'No movement requests found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabel}>
        <Feather name={icon} size={14} color={colors.neutral.textMuted} />
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  list: { padding: spacing.screenPadding },
  card: {
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  requestId: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
  },
  detailGrid: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  valueText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.textPrimary,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 12,
    fontSize: typography.sizes.lg,
  },
});
