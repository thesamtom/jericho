import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius } from '../../theme';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
];

const DATE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
];

function normalizeStatus(status) {
  const key = String(status || 'pending').toLowerCase();
  return key === 'resolved' ? 'resolved' : 'pending';
}

function badgeStatus(status) {
  return normalizeStatus(status) === 'resolved' ? 'approved' : 'pending';
}

function formatStatus(status) {
  return normalizeStatus(status) === 'resolved' ? 'Resolved' : 'Pending';
}

function complaintText(item) {
  return item?.complaint_text || item?.description || '';
}

function firstLine(value) {
  const line = String(value || '').split('\n').find((part) => part.trim().length > 0) || '';
  return line.trim();
}

function shortText(value, maxLength = 90) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function complaintKey(item, index) {
  return String(item?.complaint_id || item?.id || `${item?.student_id || 'student'}-${item?.created_at || index}-${index}`);
}

function parseTimestamp(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const input = hasTimezone ? normalized : `${normalized}Z`;

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  const date = parseTimestamp(value);
  if (!date) return 'Unknown time';

  const rendered = date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${rendered.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM')} IST`;
}

function getISTDateKey(value) {
  const date = parseTimestamp(value);
  if (!date) return '';
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function WardenComplaintsScreen({ navigation }) {
  const { user } = useAuth();
  const [hostelId, setHostelId] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [studentsById, setStudentsById] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [user])
  );

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

  function showRefreshError() {
    const message = 'Failed to refresh. Try again.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Refresh Failed', message);
  }

  async function loadComplaints({ isRefresh = false, showError = true } = {}) {
    if (!isRefresh) setLoading(true);
    try {
      const resolvedHostelId = await resolveWardenHostelId();
      setHostelId(resolvedHostelId);

      if (!resolvedHostelId) {
        setComplaints([]);
        setStudentsById({});
        return;
      }

      const { data: studentRows, error: studentError } = await supabase
        .from('student')
        .select('*')
        .eq('hostel_id', resolvedHostelId);

      if (studentError) throw studentError;

      const studentMap = {};
      (studentRows || []).forEach((row) => {
        const key = String(row.student_id || row.id || '');
        if (key) studentMap[key] = row;
      });
      setStudentsById(studentMap);

      const studentIds = Object.keys(studentMap);
      if (studentIds.length === 0) {
        setComplaints([]);
        return;
      }

      const { data: complaintRows, error: complaintError } = await supabase
        .from('complaint')
        .select('*')
        .order('created_at', { ascending: false });

      if (complaintError) throw complaintError;

      const filteredByHostel = (complaintRows || []).filter((row) =>
        studentIds.includes(String(row.student_id || ''))
      );

      setComplaints(filteredByHostel);
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (showError) showRefreshError();
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;

    setRefreshing(true);
    await loadComplaints({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  const filteredComplaints = useMemo(() => {
    const now = new Date();
    const todayIST = getISTDateKey(now);
    return complaints.filter((item) => {
      const itemStatus = normalizeStatus(item.status);
      if (statusFilter !== 'all' && itemStatus !== statusFilter) return false;

      const createdAt = parseTimestamp(item.created_at);
      if (!createdAt) {
        return dateFilter === 'all';
      }

      if (dateFilter === 'today') {
        return getISTDateKey(createdAt) === todayIST;
      }

      if (dateFilter === '7d') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return createdAt.getTime() >= sevenDaysAgo.getTime();
      }

      if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return createdAt.getTime() >= thirtyDaysAgo.getTime();
      }

      return true;
    });
  }, [complaints, statusFilter, dateFilter]);

  function renderFilterChips(options, selected, onSelect) {
    return (
      <View style={styles.filterRow}>
        {options.map((option) => {
          const isActive = selected === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => onSelect(option.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function openComplaint(item) {
    const student = studentsById[String(item.student_id || '')] || null;
    navigation.navigate('WardenComplaintDetail', { complaint: item, student });
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="Complaints Management"
        subtitle="View and manage student complaints"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} enabled={!refreshing} />
        }
      >
        {lastUpdatedAt ? (
          <Text style={styles.lastUpdated}>
            Last updated at {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
        <Card style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filters</Text>

          <Text style={styles.filterLabel}>Status</Text>
          {renderFilterChips(STATUS_OPTIONS, statusFilter, setStatusFilter)}

          <Text style={styles.filterLabel}>Date</Text>
          {renderFilterChips(DATE_OPTIONS, dateFilter, setDateFilter)}
        </Card>

        <Text style={styles.sectionTitle}>Complaint List</Text>
        {loading ? (
          <Text style={styles.empty}>Loading complaints...</Text>
        ) : filteredComplaints.length === 0 ? (
          <Text style={styles.empty}>No complaints from students in this hostel</Text>
        ) : (
          filteredComplaints.map((item, index) => {
            const student = studentsById[String(item.student_id || '')] || {};
            const detailText = complaintText(item);
            const title = firstLine(detailText) || 'Complaint';
            const roomValue = student.room_no || student.room_id || item.room_no || item.room_id || '—';
            const studentName = student.name || `Student ${item.student_id || ''}`;
            return (
              <TouchableOpacity
                key={complaintKey(item, index)}
                activeOpacity={0.85}
                onPress={() => openComplaint(item)}
              >
                <Card style={styles.complaintCard}>
                  <View style={styles.rowTop}>
                    <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                    <StatusBadge status={badgeStatus(item.status)} />
                  </View>

                  <Text style={styles.metaText}>Student Name: {studentName}</Text>
                  <Text style={styles.metaText}>Room: {roomValue}</Text>
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {shortText(detailText) || 'No description'}
                  </Text>

                  <Text style={styles.dateText}>
                    {formatDateTime(item.created_at)}
                  </Text>

                  <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        {!hostelId && !loading ? (
          <Text style={styles.helperText}>
            Warden hostel mapping is missing. Ask admin to assign this warden to a hostel.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding, paddingBottom: spacing.xl },
  lastUpdated: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.sm,
  },
  filterCard: { marginBottom: spacing.sectionGap },
  filterTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.neutral.background,
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterChipText: {
    color: colors.neutral.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  complaintCard: { marginBottom: spacing.md },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginRight: 8,
  },
  metaText: {
    marginTop: 6,
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    fontWeight: typography.weights.medium,
  },
  descriptionText: {
    marginTop: 8,
    fontSize: typography.sizes.sm,
    color: colors.neutral.textPrimary,
  },
  dateText: {
    marginTop: 8,
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
  },
  statusText: {
    marginTop: 8,
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 24,
    fontSize: typography.sizes.lg,
  },
  helperText: {
    textAlign: 'center',
    color: colors.status.rejected,
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
  },
});
