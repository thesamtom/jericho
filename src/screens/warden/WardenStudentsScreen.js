import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { ScreenHeader, Card } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatTimeDisplay } from '../../lib/dateTime';
import { colors, spacing, typography, borderRadius } from '../../theme';

function normalizePresenceStatus(status) {
  const key = String(status || '').toLowerCase();
  return key === 'present' ? 'present' : 'absent';
}

export default function WardenStudentsScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [hostelId, setHostelId] = useState(null);
  const [selectedTab, setSelectedTab] = useState('present');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);
  const [updatingById, setUpdatingById] = useState({});

  useEffect(() => {
    loadStudents();
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

  async function loadStudents({ isRefresh = false, showError = false } = {}) {
    if (!isRefresh) setLoading(true);

    try {
      const resolvedHostelId = await resolveWardenHostelId();
      setHostelId(resolvedHostelId);

      if (!resolvedHostelId) {
        if (!isRefresh) setStudents([]);
        return;
      }

      const { data: studentRows, error: studentError } = await supabase
        .from('student')
        .select('*')
        .eq('hostel_id', resolvedHostelId)
        .order('name', { ascending: true });

      if (studentError) throw studentError;

      const rows = studentRows || [];

      const merged = rows.map((row) => {
        const id = String(row.student_id || row.id || '');
        console.log('Student Status from DB:', row.status);
        return {
          id,
          name: row.name || `Student ${id}`,
          status: normalizePresenceStatus(row.status),
        };
      });

      setStudents(merged);
      setLastUpdatedAt(new Date());
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

  async function handleToggleStatus(student) {
    if (!student?.id || updatingById[student.id]) return;

    const previousStatus = student.status;
    const nextState = previousStatus === 'present' ? 'absent' : 'present';

    setUpdatingById((prev) => ({ ...prev, [student.id]: true }));
    setStudents((prev) => prev.map((item) => (item.id === student.id ? { ...item, status: nextState } : item)));

    try {
      let { error } = await supabase
        .from('student')
        .update({ status: nextState })
        .eq('student_id', student.id);

      if (error) {
        const retry = await supabase
          .from('student')
          .update({ status: nextState })
          .eq('id', student.id);
        error = retry.error;
      }

      if (error) throw error;
    } catch {
      setStudents((prev) =>
        prev.map((item) => (item.id === student.id ? { ...item, status: previousStatus } : item))
      );
      showRefreshError();
    } finally {
      setUpdatingById((prev) => ({ ...prev, [student.id]: false }));
    }
  }

  const filteredStudents = useMemo(
    () => students.filter((student) => student.status === selectedTab),
    [students, selectedTab]
  );

  function renderStudent({ item }) {
    const isPresentTab = selectedTab === 'present';
    const isUpdating = Boolean(updatingById[item.id]);

    return (
      <Card style={styles.studentCard}>
        <View style={styles.studentRow}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.studentId}>ID: {item.id}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isPresentTab ? styles.actionAbsent : styles.actionPresent,
              isUpdating && styles.actionDisabled,
            ]}
            onPress={() => handleToggleStatus(item)}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>
              {isUpdating
                ? 'Updating...'
                : isPresentTab
                  ? 'Mark Absent'
                  : 'Mark Present'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  const emptyText = selectedTab === 'present' ? 'No present students' : 'No absent students';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Students" subtitle="Track hostel presence" />

      <View style={styles.container}>
        {lastUpdatedAt ? (
          <Text style={styles.lastUpdated}>
            Last updated at {formatTimeDisplay(lastUpdatedAt)}
          </Text>
        ) : null}

        <View style={styles.toggleWrap}>
          <TouchableOpacity
            style={[styles.toggleTab, selectedTab === 'present' && styles.toggleTabActive]}
            onPress={() => setSelectedTab('present')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, selectedTab === 'present' && styles.toggleTextActive]}>
              Present
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleTab, selectedTab === 'absent' && styles.toggleTabActive]}
            onPress={() => setSelectedTab('absent')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, selectedTab === 'absent' && styles.toggleTextActive]}>
              Absent
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{loading ? 'Loading students...' : emptyText}</Text>
          }
        />

        {!hostelId && !loading ? (
          <Text style={styles.helperText}>
            Warden hostel mapping is missing. Ask admin to assign this warden to a hostel.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  container: { flex: 1, padding: spacing.screenPadding },
  lastUpdated: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.sm,
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  toggleTab: {
    flex: 1,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleTabActive: {
    backgroundColor: colors.primary.main,
  },
  toggleText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  studentCard: {
    marginBottom: spacing.sm,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  studentId: {
    marginTop: 2,
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
  },
  actionButton: {
    minWidth: 122,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionAbsent: {
    backgroundColor: colors.status.rejected,
  },
  actionPresent: {
    backgroundColor: colors.status.approved,
  },
  actionDisabled: {
    opacity: 0.65,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 36,
    fontSize: typography.sizes.md,
  },
  helperText: {
    textAlign: 'center',
    color: colors.status.rejected,
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
  },
});
