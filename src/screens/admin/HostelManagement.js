import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
import { ScreenHeader, Card } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export default function HostelManagement() {
  const [hostels, setHostels] = useState([]);
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
    loadHostels();
  }, []);

  async function loadHostels({ isRefresh = false, showError = false } = {}) {
    try {
      const { data, error } = await supabase
        .from('hostel')
        .select('*')
        .order('name');
      if (error) throw error;
      setHostels(data || []);
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) setHostels([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;
    setRefreshing(true);
    await loadHostels({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  function renderHostel({ item }) {
    return (
      <Card style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>Total Rooms: {item.total_rooms || '—'}</Text>
        <Text style={styles.detail}>Warden: {item.warden_id || '—'}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Hostel Management" />
      <FlatList
        data={hostels}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderHostel}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading...' : 'No hostels found'}
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
