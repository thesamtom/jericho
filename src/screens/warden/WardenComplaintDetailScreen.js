import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ScreenHeader, Card, PrimaryButton } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius } from '../../theme';

const STATUS_OPTIONS = [
  { key: 'pending', label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
];

function normalizeStatus(status) {
  const key = String(status || 'pending').toLowerCase();
  return key === 'resolved' ? 'resolved' : 'pending';
}

function complaintBody(complaint) {
  return complaint?.complaint_text || complaint?.description || '';
}

function complaintTitle(complaint) {
  const text = complaintBody(complaint);
  const line = String(text).split('\n').find((part) => part.trim().length > 0) || '';
  return line.trim() || 'Complaint';
}

function parseTimestamp(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // If timezone is missing (common for timestamp without time zone), parse as UTC.
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const input = hasTimezone ? normalized : `${normalized}Z`;

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  const date = parseTimestamp(value);
  if (!date) return 'Unknown';

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

export default function WardenComplaintDetailScreen({ route, navigation }) {
  const initialComplaint = route?.params?.complaint || {};
  const student = route?.params?.student || {};

  const [complaint, setComplaint] = useState(initialComplaint);
  const [selectedStatus, setSelectedStatus] = useState(normalizeStatus(initialComplaint.status));
  const [saving, setSaving] = useState(false);

  async function updateByIdentifier(payload) {
    const identifiers = [
      { column: 'complaint_id', value: complaint?.complaint_id },
      { column: 'id', value: complaint?.id },
    ].filter((entry) => entry.value !== undefined && entry.value !== null);

    if (identifiers.length === 0) {
      throw new Error('Complaint identifier is missing, cannot update this record.');
    }

    let lastError = null;
    for (let i = 0; i < identifiers.length; i += 1) {
      const entry = identifiers[i];
      const response = await supabase
        .from('complaint')
        .update(payload)
        .eq(entry.column, entry.value);

      if (!response.error) return true;
      lastError = response.error;
    }

    throw lastError || new Error('Failed to update complaint');
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateByIdentifier({ status: selectedStatus });

      const nextComplaint = {
        ...complaint,
        status: selectedStatus,
        updated_at: new Date().toISOString(),
      };

      setComplaint(nextComplaint);
      Alert.alert('Success', 'Complaint updated successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update complaint');
    } finally {
      setSaving(false);
    }
  }

  const studentName = student?.name || `Student ${complaint?.student_id || ''}`;
  const roomValue = student?.room_no || student?.room_id || complaint?.room_no || complaint?.room_id || '—';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Complaint Detail" subtitle="Review and update complaint" />

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.title}>{complaintTitle(complaint)}</Text>
          <Text style={styles.info}>Student Name: {studentName}</Text>
          <Text style={styles.info}>Student ID: {complaint?.student_id || '—'}</Text>
          <Text style={styles.info}>Room: {roomValue}</Text>
          <Text style={styles.info}>
            Submitted: {formatDateTime(complaint?.created_at)}
          </Text>

          <Text style={styles.sectionHeading}>Full Description</Text>
          <Text style={styles.bodyText}>{complaintBody(complaint) || 'No description'}</Text>

          <Text style={styles.sectionHeading}>Update Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((option) => {
              const active = selectedStatus === option.key;
              const activeStyle =
                option.key === 'resolved' ? styles.statusChipResolvedActive : styles.statusChipPendingActive;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.statusChip, active && activeStyle]}
                  onPress={() => setSelectedStatus(option.key)}
                >
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding, paddingBottom: spacing.xl },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.sm,
  },
  info: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: typography.weights.medium,
  },
  sectionHeading: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: typography.sizes.lg,
    color: colors.neutral.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.neutral.background,
  },
  statusChipPendingActive: {
    backgroundColor: colors.status.pending,
    borderColor: colors.status.pending,
  },
  statusChipResolvedActive: {
    backgroundColor: colors.status.approved,
    borderColor: colors.status.approved,
  },
  statusChipText: {
    color: colors.neutral.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
});
