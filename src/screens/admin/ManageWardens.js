import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ScreenHeader, Card } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export default function ManageWardens() {
  const [wardens, setWardens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWardens();
  }, []);

  async function loadWardens() {
    try {
      const { data, error } = await supabase
        .from('warden')
        .select('*')
        .order('name');
      if (error) throw error;
      setWardens(data || []);
    } catch {
      setWardens([]);
    } finally {
      setLoading(false);
    }
  }

  function renderWarden({ item }) {
    return (
      <Card style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>Email: {item.email}</Text>
        <Text style={styles.detail}>Hostel: {item.hostel_id || '—'}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Manage Wardens" />
      <FlatList
        data={wardens}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWarden}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading...' : 'No wardens found'}
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
