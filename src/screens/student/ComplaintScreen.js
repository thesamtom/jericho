import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ToastAndroid,
} from 'react-native';
import { ScreenHeader, InputField, PrimaryButton, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDateDisplay, formatTimeDisplay } from '../../lib/dateTime';
import { colors, spacing, typography } from '../../theme';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

export default function ComplaintScreen() {
  const { user } = useAuth();
  const studentId = user?.student_id || user?.id;
  const [complaint, setComplaint] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);

  useEffect(() => {
    loadComplaints();
  }, [studentId]);

  function showRefreshError() {
    const message = 'Failed to refresh. Try again.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Refresh Failed', message);
  }

  async function loadComplaints({ showError = false } = {}) {
    if (!studentId) {
      setComplaints([]);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('complaint')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComplaints(data || []);
      setLastUpdatedAt(new Date());
      return true;
    } catch {
      if (showError) showRefreshError();
      return false;
    }
  }

  async function handleRefresh() {
    if (refreshing) return;

    const now = Date.now();
    if (now - lastRefreshMs < 1200) return;

    setRefreshing(true);
    await loadComplaints({ showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  async function handleSubmit() {
    if (!complaint.trim()) {
      Alert.alert('Error', 'Please describe your complaint');
      return;
    }

    if (!studentId) {
      Alert.alert('Error', 'Student account not found. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const complaintText = complaint.trim();

      // Resolve assigned warden for this student (required by complaint table).
      let resolvedWardenId = user?.warden_id || null;

      if (!resolvedWardenId) {
        const { data: studentRow } = await supabase
          .from('student')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();

        resolvedWardenId = studentRow?.warden_id || null;

        if (!resolvedWardenId && studentRow?.hostel_id) {
          const { data: hostelWarden } = await supabase
            .from('warden')
            .select('*')
            .eq('hostel_id', studentRow.hostel_id)
            .limit(1)
            .maybeSingle();

          resolvedWardenId = hostelWarden?.warden_id || hostelWarden?.id || null;
        }
      }

      if (!resolvedWardenId) {
        const { data: fallbackWarden } = await supabase
          .from('warden')
          .select('*')
          .limit(1)
          .maybeSingle();

        resolvedWardenId = fallbackWarden?.warden_id || fallbackWarden?.id || null;
      }

      if (!resolvedWardenId) {
        throw new Error('No warden is assigned yet. Please contact admin to map a warden.');
      }

      const basePayload = {
        student_id: studentId,
        warden_id: resolvedWardenId,
        status: 'pending',
      };

      // Try common schema first (description), then fall back to complaint_text schema.
      let { error } = await supabase.from('complaint').insert({
        ...basePayload,
        description: complaintText,
      });

      if (error) {
        const message = (error.message || '').toLowerCase();
        const shouldRetryWithComplaintText =
          message.includes('complaint_text') ||
          (message.includes('description') && message.includes('does not exist'));

        if (shouldRetryWithComplaintText) {
          const retry = await supabase.from('complaint').insert({
            ...basePayload,
            complaint_text: complaintText,
          });
          error = retry.error;
        }
      }

      if (error) throw error;
      Alert.alert('Success', 'Complaint submitted');
      setComplaint('');
      loadComplaints();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Complaints" subtitle="Raise and track complaints" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} enabled={!refreshing} />
        }
      >
        {lastUpdatedAt ? (
          <Text style={styles.lastUpdated}>
            Last updated at {formatTimeDisplay(lastUpdatedAt)}
          </Text>
        ) : null}
        {/* Submit Form */}
        <Card style={styles.formCard}>
          <InputField
            label="Describe your complaint"
            value={complaint}
            onChangeText={setComplaint}
            placeholder="Describe your complaint..."
            multiline
            numberOfLines={4}
          />
          <PrimaryButton
            title="Submit Complaint"
            onPress={handleSubmit}
            loading={loading}
          />
        </Card>

        {/* History */}
        <Text style={styles.sectionTitle}>Complaint History</Text>
        
        {/* Filter Buttons - Minimal Design */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {complaints.length === 0 ? (
          <Text style={styles.empty}>No complaints yet</Text>
        ) : (
          complaints
            .filter((item) => selectedFilter === 'all' || item.status === selectedFilter)
            .map((item) => (
            <Card key={String(item.complaint_id || item.id || `${item.student_id}-${item.created_at}`)} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <Text style={styles.historyText} numberOfLines={2}>
                  {item.complaint_text || item.description || 'Complaint'}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.date}>
                {formatDateDisplay(item.created_at)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  lastUpdated: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.sm,
  },
  formCard: { marginBottom: spacing.sectionGap },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral.border,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral.textPrimary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  historyCard: { marginBottom: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 20,
    fontSize: typography.sizes.md,
  },
});
