import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { ScreenHeader, Card, PrimaryButton, InputField } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius } from '../../theme';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('student')
        .select('*')
        .order('name');
      if (error) throw error;
      setStudents(data || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  function renderStudent({ item }) {
    return (
      <Card style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>Roll: {item.roll_no}</Text>
        <Text style={styles.detail}>Hostel: {item.hostel_id || '—'}</Text>
        <Text style={styles.detail}>Room: {item.room_no || '—'}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Manage Students" />
      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading...' : 'No students found'}
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
