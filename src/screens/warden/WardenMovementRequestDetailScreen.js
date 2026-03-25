import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import { ScreenHeader, Card, StatusBadge, PrimaryButton } from '../../components';
import { formatDateDisplay, formatDateTimeDisplay, formatDateRangeDisplay, formatTimeString } from '../../lib/dateTime';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export default function WardenMovementRequestDetailScreen({ route, navigation }) {
  const request = route?.params?.request || {};
  const [loading, setLoading] = useState(false);

  const status =
    request?.final_status || request?.warden_status || request?.parent_status || request?.status || 'pending';

  async function updateRequestStatus(wardenAction) {
    if (!request.request_id) {
      Alert.alert('Error', 'Request ID not found');
      return;
    }

    try {
      setLoading(true);

      const wardenStatusValue = wardenAction === 'approved' ? 'approved' : 'rejected';
      const parentStatus = String(request.parent_status || 'pending').toLowerCase();

      // Compute final_status: only set if it's a final decision
      let computedFinalStatus = null;
      if (wardenAction === 'rejected' || parentStatus === 'rejected') {
        // If either side rejects, it's rejected
        computedFinalStatus = 'rejected';
      } else if (wardenAction === 'approved' && parentStatus === 'approved') {
        // Only if both approve
        computedFinalStatus = 'approved';
      }

      const updatePayload = { warden_status: wardenStatusValue };
      if (computedFinalStatus) {
        updatePayload.final_status = computedFinalStatus;
      }

      const { error } = await supabase
        .from('movement_request')
        .update(updatePayload)
        .eq('request_id', request.request_id);

      if (error) throw error;

      // Show toast
      const message = wardenAction === 'approved' ? 'Request approved' : 'Request rejected';
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', message);
      }

      // Navigate back and refresh parent
      navigation.goBack();
      if (route?.params?.onStatusUpdate) {
        route.params.onStatusUpdate();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update request');
    } finally {
      setLoading(false);
    }
  }

  const isEditable = status === 'pending';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Request Detail" subtitle="Movement request information" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.rowTop}>
            <Text style={styles.title}>{request.reason || 'Movement Request'}</Text>
            <StatusBadge status={status} />
          </View>

          <Text style={styles.meta}>Student ID: {request.student_id || '—'}</Text>
          <Text style={styles.meta}>
            Date Range: {formatDateRangeDisplay(
              request.leave_date,
              request.return_date,
              request.leave_time,
              request.return_time
            )}
          </Text>
          {request.leave_time && <Text style={styles.meta}>Leave Time: {formatTimeString(request.leave_time)}</Text>}
          {request.return_time && <Text style={styles.meta}>Return Time: {formatTimeString(request.return_time)}</Text>}
          <Text style={styles.meta}>
            Requested At: {formatDateTimeDisplay(request.created_at)}
          </Text>
        </Card>

        {isEditable && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Approval</Text>
            <View style={styles.buttonRow}>
              <PrimaryButton
                label="Approve"
                onPress={() => {
                  Alert.alert(
                    'Approve Request?',
                    'Confirm approval of this movement request.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Approve',
                        onPress: () => updateRequestStatus('approved'),
                        style: 'default',
                      },
                    ]
                  );
                }}
                disabled={loading}
                textStyle={styles.approveButtonText}
                style={styles.approveButton}
              />
              <PrimaryButton
                label="Reject"
                onPress={() => {
                  Alert.alert(
                    'Reject Request?',
                    'Confirm rejection of this movement request.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reject',
                        onPress: () => updateRequestStatus('rejected'),
                        style: 'destructive',
                      },
                    ]
                  );
                }}
                disabled={loading}
                textStyle={styles.rejectButtonText}
                style={styles.rejectButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding, paddingBottom: spacing.lg * 2 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  meta: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
    marginTop: 6,
  },
  actionSection: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
  },
  actionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.status.approved,
  },
  approveButtonText: {
    color: colors.neutral.surface,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: colors.status.rejected,
  },
  rejectButtonText: {
    color: colors.neutral.surface,
  },
});
