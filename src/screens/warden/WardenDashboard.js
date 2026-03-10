import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export default function WardenDashboard({ navigation }) {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Movement requests where parent approved and warden still pending
      const { data: requests } = await supabase
        .from('movement_request')
        .select('*')
        .eq('parent_status', 'Approved')
        .eq('warden_status', 'Pending')
        .order('created_at', { ascending: false });
      if (requests) setPendingRequests(requests);

      // Open complaints
      const { data: complaintData } = await supabase
        .from('complaint')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });
      if (complaintData) setComplaints(complaintData);

      // Students in hostel for status update
      const { data: studentData } = await supabase
        .from('hostel_status')
        .select('*')
        .limit(20);
      if (studentData) setStudents(studentData);
    } catch {
      // Tables may not exist yet
    }
  }

  async function handleRequestAction(requestId, action) {
    try {
      const updates = { warden_status: action };
      // If warden approves and parent already approved, set final status
      const req = pendingRequests.find((r) => r.request_id === requestId);
      if (action === 'Approved' && req?.parent_status === 'Approved') {
        updates.final_status = 'Approved';
      } else if (action === 'Rejected') {
        updates.final_status = 'Rejected';
      }

      const { error } = await supabase
        .from('movement_request')
        .update(updates)
        .eq('request_id', requestId);
      if (error) throw error;
      Alert.alert('Success', `Request ${action}`);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleStatusUpdate(studentId, status) {
    try {
      const { error } = await supabase
        .from('hostel_status')
        .upsert({ student_id: studentId, status }, { onConflict: 'student_id' });
      if (error) throw error;
      Alert.alert('Updated', `Student marked as ${status}`);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Warden Panel" subtitle="Manage hostel operations" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Movement Approvals */}
        <Text style={styles.sectionTitle}>Movement Approvals</Text>
        {pendingRequests.length === 0 ? (
          <Text style={styles.empty}>No pending requests</Text>
        ) : (
          pendingRequests.map((req) => (
            <Card key={req.request_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Student: {req.student_id}</Text>
                <StatusBadge status={req.parent_status} />
              </View>
              <Text style={styles.cardDetail}>{req.reason || 'Movement Request'}</Text>
              <Text style={styles.cardMeta}>
                {req.leave_date} → {req.return_date}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleRequestAction(req.request_id, 'Approved')}
                >
                  <Feather name="check" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleRequestAction(req.request_id, 'Rejected')}
                >
                  <Feather name="x" size={16} color="#FFF" />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Complaints */}
        <Text style={styles.sectionTitle}>Open Complaints</Text>
        {complaints.length === 0 ? (
          <Text style={styles.empty}>No open complaints</Text>
        ) : (
          complaints.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDetail} numberOfLines={2}>
                  {item.description}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardMeta}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}

        {/* Hostel Status Update */}
        <Text style={styles.sectionTitle}>Hostel Presence</Text>
        {students.length === 0 ? (
          <Text style={styles.empty}>No student records</Text>
        ) : (
          students.map((s) => (
            <Card key={s.student_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Student: {s.student_id}</Text>
                <StatusBadge status={s.status === 'present' ? 'approved' : 'rejected'} />
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleStatusUpdate(s.student_id, 'present')}
                >
                  <Text style={styles.actionText}>Mark Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleStatusUpdate(s.student_id, 'out')}
                >
                  <Text style={styles.actionText}>Mark Out</Text>
                </TouchableOpacity>
              </View>
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
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sectionGap,
  },
  card: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  cardDetail: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  approveBtn: { backgroundColor: colors.status.approved },
  rejectBtn: { backgroundColor: colors.status.rejected },
  actionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    marginTop: 10,
    marginBottom: spacing.md,
    fontSize: typography.sizes.md,
  },
});
