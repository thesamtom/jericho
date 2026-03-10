import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export default function FeeRecords() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFees();
  }, []);

  async function loadFees() {
    try {
      const { data, error } = await supabase
        .from('fee')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      setFees(data || []);
    } catch {
      setFees([]);
    } finally {
      setLoading(false);
    }
  }

  function renderFee({ item }) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.name}>Student: {item.student_id}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.detail}>Amount: ₹{item.amount}</Text>
        <Text style={styles.detail}>Due: {item.due_date}</Text>
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
