import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ScreenHeader, Card } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export default function HostelManagement() {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHostels();
  }, []);

  async function loadHostels() {
    try {
      const { data, error } = await supabase
        .from('hostel')
        .select('*')
        .order('name');
      if (error) throw error;
      setHostels(data || []);
    } catch {
      setHostels([]);
    } finally {
      setLoading(false);
    }
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
