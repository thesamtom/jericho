import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function HostelStudents({ route, navigation }) {
  const { hostelId, hostelName } = route.params;
  const [students, setStudents] = useState([]);
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
    loadStudents();
  }, []);

  async function loadStudents({ isRefresh = false, showError = false } = {}) {
    try {
      const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('hostel_id', hostelId)
        .order('name');
      if (error) {
        console.log('Load students error:', JSON.stringify(error));
        if (showError) showRefreshError();
      }
      setStudents(data || []);
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) setStudents([]);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;
    setRefreshing(true);
    await loadStudents({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  function renderStudent({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('StudentMovementHistory', {
            studentId: item.student_id,
            studentName: item.name,
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.detail}>ID: {item.student_id}</Text>
          <Text style={styles.detail}>Room: {item.room_no || '—'}</Text>
          {item.department && (
            <Text style={styles.detail}>Dept: {item.department}</Text>
          )}
        </View>
        <Feather name="chevron-right" size={20} color={colors.neutral.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={hostelName} subtitle="Students List" />
      <FlatList
        data={students}
        keyExtractor={(item) => String(item.student_id)}
        renderItem={renderStudent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="users" size={48} color={colors.neutral.textMuted} />
            <Text style={styles.empty}>
              {loading ? 'Loading students...' : 'No students in this hostel'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  list: { padding: spacing.screenPadding },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
  },
  info: { flex: 1 },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  detail: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginTop: 1,
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
