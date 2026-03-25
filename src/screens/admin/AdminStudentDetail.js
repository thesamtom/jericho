import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  ToastAndroid,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card, StatusBadge, InputField, PrimaryButton } from '../../components';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme';

function safeLower(value) {
  return String(value || '').toLowerCase();
}

export default function AdminStudentDetail({ route, navigation }) {
  const { studentId, hostelName, hostelId } = route.params || {};
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [student, setStudent] = useState(null);
  const [parent, setParent] = useState(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [feeStatus, setFeeStatus] = useState('paid');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefreshMs, setLastRefreshMs] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feeVisible, setFeeVisible] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editRoomNo, setEditRoomNo] = useState('');
  const [editHostelId, setEditHostelId] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editParentEmail, setEditParentEmail] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeNote, setFeeNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  function showRefreshError() {
    const message = 'Failed to refresh. Try again.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Refresh Failed', message);
  }

  function showSuccess(message) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Success', message);
  }

  function validateEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }

  async function fetchStudent() {
      const query = await supabase
      .from('student')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    return query;
  }

  async function fetchParent(studentRow) {
      const parentId = studentRow?.parent_id;
      if (!parentId) return null;

      const fromParent = await supabase
      .from('parent')
      .select('*')
        .eq('parent_id', parentId)
      .maybeSingle();

      return fromParent.data || null;
  }

  async function fetchFeeSummary(studentRow) {
      const linkedStudentId = studentRow?.student_id;
    if (!linkedStudentId) {
      setPendingTotal(0);
      setFeeStatus('paid');
      return;
    }

    const feeQuery = await supabase
      .from('fee')
      .select('amount,status')
      .eq('student_id', linkedStudentId);

    const fees = feeQuery.data || [];
    const pending = fees.filter((item) => safeLower(item.status) === 'pending');
    const total = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    setPendingTotal(total);
    setFeeStatus(total > 0 ? 'pending' : 'paid');
  }

  async function loadData({ isRefresh = false, showError = false } = {}) {
    try {
      const studentQuery = await fetchStudent();
      if (studentQuery.error) throw studentQuery.error;

      const studentRow = studentQuery.data || null;
      setStudent(studentRow);

      if (!studentRow) {
        setParent(null);
        setPendingTotal(0);
        setFeeStatus('paid');
        return;
      }

      const [parentRow] = await Promise.all([
        fetchParent(studentRow),
        fetchFeeSummary(studentRow),
      ]);

      setParent(parentRow);

      setEditName(studentRow?.name || '');
      setEditRoomNo(studentRow?.room_no ? String(studentRow.room_no) : '');
      setEditHostelId(String(studentRow?.hostel_id || hostelId || ''));
      setEditParentName(parentRow?.name || '');
      setEditParentPhone(parentRow?.phone ? String(parentRow.phone) : '');
      setEditParentEmail(parentRow?.email || '');
    } catch {
      if (showError) showRefreshError();
      if (!isRefresh) {
        setStudent(null);
        setParent(null);
        setPendingTotal(0);
        setFeeStatus('paid');
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
    await loadData({ isRefresh: true, showError: true });
    setRefreshing(false);
    setLastRefreshMs(Date.now());
  }

  function openEditModal() {
    if (!isAdmin) return;
    setEditVisible(true);
  }

  function openFeeModal() {
    if (!isAdmin || !student || saving || deleting || feeSaving) return;
    setFeeAmount('');
    setFeeNote('');
    setFeeVisible(true);
  }

  async function handleSaveEdit() {
    if (!isAdmin || saving || deleting || !student) return;

    const trimmedName = editName.trim();
    const trimmedRoom = editRoomNo.trim();
    const trimmedHostel = editHostelId.trim();
    const trimmedParentName = editParentName.trim();
    const trimmedParentPhone = editParentPhone.trim();
    const trimmedParentEmail = editParentEmail.trim();

    if (!trimmedName) {
      Alert.alert('Validation', 'Student name is required.');
      return;
    }

    if (!trimmedRoom) {
      Alert.alert('Validation', 'Room number is required.');
      return;
    }

    if (!trimmedHostel || Number.isNaN(Number(trimmedHostel))) {
      Alert.alert('Validation', 'Hostel ID must be numeric.');
      return;
    }

    if (trimmedParentEmail && !validateEmail(trimmedParentEmail)) {
      Alert.alert('Validation', 'Parent email format is invalid.');
      return;
    }

    setSaving(true);
    try {
      const studentPayload = {
        name: trimmedName,
        room_no: trimmedRoom,
        hostel_id: Number(trimmedHostel),
      };

      const { error: studentUpdateError } = await supabase
        .from('student')
        .update(studentPayload)
        .eq('student_id', student.student_id);

      if (studentUpdateError) throw studentUpdateError;

      if (student.parent_id) {
        const parentPayload = {
          name: trimmedParentName || null,
          phone: trimmedParentPhone || null,
          email: trimmedParentEmail || null,
        };

        const { error: parentUpdateError } = await supabase
          .from('parent')
          .update(parentPayload)
          .eq('parent_id', student.parent_id);

        if (parentUpdateError) throw parentUpdateError;
      }

      await loadData({ isRefresh: true });
      setEditVisible(false);
      showSuccess('Student details updated.');
    } catch (error) {
      Alert.alert('Update Failed', error.message || 'Unable to update student details.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFee() {
    if (!isAdmin || !student || feeSaving || saving || deleting) return;

    const trimmedAmount = feeAmount.trim();
    const trimmedNote = feeNote.trim();

    if (!trimmedAmount) {
      Alert.alert('Validation', 'Fee amount is required.');
      return;
    }

    const parsedAmount = Number(trimmedAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation', 'Fee amount must be a valid number greater than 0.');
      return;
    }

    setFeeSaving(true);
    try {
      const { data, error } = await supabase.rpc('admin_assign_student_fee', {
        p_student_id: Number(student.student_id),
        p_amount: parsedAmount,
        p_note: trimmedNote || null,
      });

      if (error) throw error;

      if (data && data.error) {
        throw new Error(data.error);
      }

      await loadData({ isRefresh: true });
      setFeeVisible(false);
      showSuccess('Fee updated successfully');
    } catch (error) {
      const message = error.message || 'Unable to update fee.';
      Alert.alert('Fee Update Failed', `${message}\n\nCreate the SQL RPC admin_assign_student_fee in Supabase if it does not exist.`);
    } finally {
      setFeeSaving(false);
    }
  }

  function confirmDeleteStudent() {
    if (!isAdmin || deleting || saving || !student) return;

    Alert.alert(
      'Delete Student?',
      'Are you sure you want to delete this student?\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteStudent,
        },
      ]
    );
  }

  async function handleDeleteStudent() {
    if (!isAdmin || deleting || saving || !student) return;

    setDeleting(true);
    try {
      const linkedStudentId = student.student_id;
      const linkedParentId = student.parent_id;

      const { error: feeDeleteError } = await supabase
        .from('fee')
        .delete()
        .eq('student_id', linkedStudentId);

      if (feeDeleteError) throw feeDeleteError;

      const { error: movementDeleteError } = await supabase
        .from('movement_request')
        .delete()
        .eq('student_id', linkedStudentId);

      if (movementDeleteError) throw movementDeleteError;

      const { error: complaintDeleteError } = await supabase
        .from('complaint')
        .delete()
        .eq('student_id', linkedStudentId);

      if (complaintDeleteError) throw complaintDeleteError;

      const { error: studentDeleteError } = await supabase
        .from('student')
        .delete()
        .eq('student_id', linkedStudentId);

      if (studentDeleteError) throw studentDeleteError;

      if (linkedParentId) {
        const { data: siblings, error: siblingError } = await supabase
          .from('student')
          .select('student_id')
          .eq('parent_id', linkedParentId)
          .limit(1);

        if (siblingError) throw siblingError;

        if (!siblings || siblings.length === 0) {
          const { error: parentDeleteError } = await supabase
            .from('parent')
            .delete()
            .eq('parent_id', linkedParentId);

          if (parentDeleteError) throw parentDeleteError;
        }
      }

      showSuccess('Student deleted successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Delete Failed', error.message || 'Unable to delete student.');
    } finally {
      setDeleting(false);
    }
  }

  const rightActions = isAdmin
    ? [
        {
          icon: 'edit-2',
          onPress: openEditModal,
          disabled: loading || saving || deleting || !student,
          accessibilityLabel: 'Edit student',
        },
        {
          icon: 'trash-2',
          onPress: confirmDeleteStudent,
          disabled: loading || saving || deleting || !student,
          accessibilityLabel: 'Delete student',
          color: '#FFD7D7',
        },
      ]
    : [];

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={student?.name || 'Student Detail'}
        subtitle={deleting ? 'Deleting student...' : 'Detailed management view'}
        rightActions={rightActions}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} enabled={!refreshing} />}
      >
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <Text style={styles.meta}>Name: {student?.name || '—'}</Text>
          <Text style={styles.meta}>Student ID: {student?.student_id || '—'}</Text>
          <Text style={styles.meta}>Room Number: {student?.room_no || '—'}</Text>
          <Text style={styles.meta}>Hostel: {hostelName || `Hostel ${hostelId || student?.hostel_id || ''}`}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionTitle}>Fee Info</Text>
            {isAdmin ? (
              <TouchableOpacity
                style={styles.feeEditBtn}
                onPress={openFeeModal}
                disabled={loading || saving || deleting || feeSaving || !student}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.pendingLabel}>Total Pending Fees</Text>
            <StatusBadge status={feeStatus} />
          </View>
          <Text style={styles.pendingValue}>INR {pendingTotal}</Text>
          <Text style={styles.feeHint}>Due date is auto-set by system (+21 days) on fee update.</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Parent Details</Text>
          <Text style={styles.meta}>Name: {parent?.name || 'Not linked'}</Text>
          <Text style={styles.meta}>Email: {parent?.email || '—'}</Text>
          <Text style={styles.meta}>Phone: {parent?.phone || '—'}</Text>
        </Card>

        {loading ? <Text style={styles.helper}>Loading details...</Text> : null}
      </ScrollView>

      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving && !deleting) setEditVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student</Text>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                disabled={saving || deleting}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color={colors.neutral.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <InputField
                label="Student Name"
                icon="user"
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter student name"
              />
              <InputField
                label="Student ID"
                icon="hash"
                value={String(student?.student_id || '')}
                onChangeText={() => {}}
                placeholder="Student ID"
              />
              <Text style={styles.readOnlyHint}>Student ID cannot be edited.</Text>
              <InputField
                label="Room Number"
                icon="home"
                value={editRoomNo}
                onChangeText={setEditRoomNo}
                placeholder="Room number"
              />
              <InputField
                label="Hostel ID"
                icon="map-pin"
                value={editHostelId}
                onChangeText={setEditHostelId}
                placeholder="Numeric hostel ID"
                keyboardType="numeric"
              />

              <Text style={styles.modalSection}>Parent Details</Text>
              <InputField
                label="Parent Name"
                icon="user"
                value={editParentName}
                onChangeText={setEditParentName}
                placeholder="Parent name"
              />
              <InputField
                label="Parent Phone"
                icon="phone"
                value={editParentPhone}
                onChangeText={setEditParentPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <InputField
                label="Parent Email"
                icon="mail"
                value={editParentEmail}
                onChangeText={setEditParentEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
              />

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Cancel"
                  onPress={() => setEditVisible(false)}
                  loading={false}
                  style={styles.cancelBtn}
                  textStyle={styles.cancelBtnText}
                />
                <PrimaryButton
                  title={saving ? 'Saving...' : 'Save'}
                  onPress={handleSaveEdit}
                  loading={saving}
                  style={styles.saveBtn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feeVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!feeSaving) setFeeVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Fee</Text>
              <TouchableOpacity
                onPress={() => setFeeVisible(false)}
                disabled={feeSaving}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color={colors.neutral.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <InputField
                label="Fee Amount"
                icon="credit-card"
                value={feeAmount}
                onChangeText={setFeeAmount}
                placeholder="Enter fee amount"
                keyboardType="numeric"
              />
              <InputField
                label="Description / Note (Optional)"
                icon="file-text"
                value={feeNote}
                onChangeText={setFeeNote}
                placeholder="Add a note"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.readOnlyHint}>Due date is automatically set by the database to 21 days from today.</Text>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Cancel"
                  onPress={() => setFeeVisible(false)}
                  loading={false}
                  style={styles.cancelBtn}
                  textStyle={styles.cancelBtnText}
                />
                <PrimaryButton
                  title={feeSaving ? 'Updating...' : 'Update Fee'}
                  onPress={handleSaveFee}
                  loading={feeSaving}
                  style={styles.saveBtn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  sectionCard: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeEditBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    marginTop: -2,
  },
  meta: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
    marginTop: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textSecondary,
  },
  pendingValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
    marginTop: spacing.sm,
  },
  feeHint: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.neutral.textMuted,
  },
  helper: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    fontSize: typography.sizes.md,
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: colors.neutral.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.neutral.surface,
  },
  modalContent: {
    paddingBottom: spacing.lg,
  },
  readOnlyHint: {
    marginTop: -6,
    marginBottom: spacing.sm,
    color: colors.neutral.textMuted,
    fontSize: typography.sizes.sm,
  },
  modalSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  cancelBtnText: {
    color: colors.neutral.textPrimary,
  },
  saveBtn: {
    flex: 1,
  },
});