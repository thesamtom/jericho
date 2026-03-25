import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, ToastAndroid } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function HostelStudents({ route, navigation }) {
  const { hostelId, hostelName } = route.params;
  const [students, setStudents] = useState([]);
  const [warden, setWarden] = useState(null);
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

  useFocusEffect(
    React.useCallback(() => {
      loadStudents({ isRefresh: true });
    }, [hostelId])
  );

  async function loadStudents({ isRefresh = false, showError = false } = {}) {
    try {
      const studentTask = supabase
        .from('student')
        .select('*')
        .eq('hostel_id', hostelId)
        .order('name');

      const wardenQuery = await supabase
        .from('warden')
        .select('*')
        .eq('hostel_id', hostelId)
        .limit(1);

      const [studentQuery] = await Promise.all([
        studentTask,
      ]);

      if (studentQuery.error) {
        console.log('Load students error:', JSON.stringify(studentQuery.error));
        if (showError) showRefreshError();
      }

      if (wardenQuery.error) {
        console.log('Load warden error:', JSON.stringify(wardenQuery.error));
      }

      setStudents(studentQuery.data || []);
      setWarden((wardenQuery.data || [])[0] || null);
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) {
        setStudents([]);
        setWarden(null);
      }
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
          navigation.navigate('AdminStudentDetail', {
            studentId: item.student_id,
            studentName: item.name,
            hostelName,
            hostelId,
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
          {item.branch && (
            <Text style={styles.detail}>Branch: {item.branch}</Text>
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
        keyExtractor={(item, index) => String(item.student_id || item.id || index)}
        renderItem={renderStudent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.wardenCard}>
              <View style={styles.wardenAvatar}>
                <Feather name="shield" size={22} color={colors.primary.main} />
              </View>
              <View style={styles.wardenInfo}>
                <Text style={styles.wardenTitle}>Warden Info</Text>
                <Text style={styles.wardenMeta}>Name: {warden?.name || 'Not assigned'}</Text>
                <Text style={styles.wardenMeta}>Email: {warden?.email || '—'}</Text>
                <Text style={styles.wardenMeta}>Phone: {warden?.phone || '—'}</Text>
                <Text style={styles.wardenMeta}>Hostel: {hostelName}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="users" size={48} color={colors.neutral.textMuted} />
            <Text style={styles.empty}>
              {loading ? 'Loading students...' : 'No students in this hostel'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AdminAddEntity', { hostelId, hostelName })}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  list: { padding: spacing.screenPadding },
  headerWrap: {
    marginBottom: spacing.md,
  },
  wardenCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: 14,
    ...shadows.card,
  },
  wardenAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wardenInfo: { flex: 1 },
  wardenTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  wardenMeta: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
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
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
});
