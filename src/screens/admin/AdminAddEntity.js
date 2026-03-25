import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, Card, InputField, PrimaryButton } from '../../components';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

function showMessage(message) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('Success', message);
}

export default function AdminAddEntity({ route, navigation }) {
  const { hostelId, hostelName } = route.params || {};
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');

  const [wardenName, setWardenName] = useState('');
  const [wardenEmail, setWardenEmail] = useState('');
  const [wardenPhone, setWardenPhone] = useState('');
  const [wardenPassword, setWardenPassword] = useState('');

  const title = useMemo(() => {
    if (mode === 'student') return 'Add Student';
    if (mode === 'warden') return 'Add Warden';
    return 'Add Record';
  }, [mode]);

  async function insertParent() {
    const hasParentInput = parentName.trim() || parentEmail.trim() || parentPhone.trim();
    if (!hasParentInput) return null;

    if (!parentName.trim() || !parentEmail.trim() || !parentPassword.trim()) {
      throw new Error('Parent Name, Parent Email, and Parent Password are required when adding parent details.');
    }

    const payload = {
      name: parentName.trim(),
      email: parentEmail.trim(),
      phone: parentPhone.trim() || null,
      password: parentPassword,
    };

    const insertParentResult = await supabase
      .from('parent')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (insertParentResult.error) {
      throw insertParentResult.error;
    }

    return insertParentResult.data?.parent_id || null;
  }

  async function handleAddStudent() {
    if (!studentName.trim() || !studentIdInput.trim() || !studentEmail.trim() || !studentPassword.trim() || !roomNo.trim()) {
      Alert.alert('Missing fields', 'Name, Student ID, Student Email, Student Password, and Room Number are required.');
      return;
    }

    const parsedStudentId = Number(studentIdInput);
    if (Number.isNaN(parsedStudentId)) {
      Alert.alert('Invalid Student ID', 'Student ID must be numeric.');
      return;
    }

    setLoading(true);
    try {
      const parentId = await insertParent();

      const payload = {
        student_id: parsedStudentId,
        name: studentName.trim(),
        email: studentEmail.trim(),
        phone: studentPhone.trim() || null,
        password: studentPassword,
        parent_id: parentId,
        hostel_id: hostelId,
        room_no: roomNo.trim(),
        status: 'Present',
      };

      const insertStudent = await supabase
        .from('student')
        .insert(payload);

      if (insertStudent.error) throw insertStudent.error;

      showMessage('Student added successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Add Student Failed', error.message || 'Please verify table columns in Supabase.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWarden() {
    if (!wardenName.trim() || !wardenEmail.trim() || !wardenPassword.trim()) {
      Alert.alert('Missing fields', 'Name, Email, and Password are required.');
      return;
    }

    setLoading(true);
    try {
      const existing = await supabase
        .from('warden')
        .select('*')
        .eq('hostel_id', hostelId)
        .limit(1);

      if (existing.error) throw existing.error;

      if ((existing.data || []).length > 0) {
        Alert.alert('Not allowed', 'This hostel already has a warden.');
        setLoading(false);
        return;
      }

      const payload = {
        name: wardenName.trim(),
        email: wardenEmail.trim(),
        phone: wardenPhone.trim(),
        password: wardenPassword,
        hostel_id: hostelId,
      };

      const insertWarden = await supabase
        .from('warden')
        .insert(payload);

      if (insertWarden.error) throw insertWarden.error;

      showMessage('Warden added successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Add Warden Failed', error.message || 'Please verify table columns in Supabase.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={title} subtitle={hostelName ? `${hostelName} (ID ${hostelId})` : 'Hostel management'} />
      <ScrollView contentContainerStyle={styles.content}>
        {!mode ? (
          <>
            <TouchableOpacity style={styles.choiceCard} onPress={() => setMode('student')} activeOpacity={0.7}>
              <View style={[styles.choiceIcon, { backgroundColor: `${colors.primary.main}18` }]}>
                <Feather name="user-plus" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.choiceInfo}>
                <Text style={styles.choiceTitle}>Add Student</Text>
                <Text style={styles.choiceText}>Create a student and optionally link parent details.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.choiceCard} onPress={() => setMode('warden')} activeOpacity={0.7}>
              <View style={[styles.choiceIcon, { backgroundColor: `${colors.status.approved}18` }]}>
                <Feather name="shield" size={24} color={colors.status.approved} />
              </View>
              <View style={styles.choiceInfo}>
                <Text style={styles.choiceTitle}>Add Warden</Text>
                <Text style={styles.choiceText}>Assign one warden to this hostel.</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : null}

        {mode === 'student' ? (
          <Card style={styles.formCard}>
            <InputField label="Name" icon="user" value={studentName} onChangeText={setStudentName} placeholder="Student name" />
            <InputField
              label="Student ID"
              icon="hash"
              value={studentIdInput}
              onChangeText={setStudentIdInput}
              placeholder="Numeric ID"
              keyboardType="numeric"
            />
            <InputField
              label="Student Email"
              icon="mail"
              value={studentEmail}
              onChangeText={setStudentEmail}
              placeholder="student@email.com"
              keyboardType="email-address"
            />
            <InputField
              label="Student Phone"
              icon="phone"
              value={studentPhone}
              onChangeText={setStudentPhone}
              placeholder="Optional"
              keyboardType="phone-pad"
            />
            <InputField
              label="Student Password"
              icon="lock"
              value={studentPassword}
              onChangeText={setStudentPassword}
              placeholder="Required"
              secureTextEntry
            />
            <InputField label="Room Number" icon="home" value={roomNo} onChangeText={setRoomNo} placeholder="A101" />
            <InputField label="Hostel ID" icon="home" value={String(hostelId || '')} onChangeText={() => {}} placeholder="" />

            <Text style={styles.subTitle}>Parent Details (Optional)</Text>
            <InputField label="Parent Name" icon="user" value={parentName} onChangeText={setParentName} placeholder="Parent name" />
            <InputField label="Parent Email" icon="mail" value={parentEmail} onChangeText={setParentEmail} placeholder="email@example.com" keyboardType="email-address" />
            <InputField label="Parent Phone" icon="phone" value={parentPhone} onChangeText={setParentPhone} placeholder="Phone number" keyboardType="phone-pad" />
            <InputField
              label="Parent Password"
              icon="lock"
              value={parentPassword}
              onChangeText={setParentPassword}
              placeholder="Required if parent details are filled"
              secureTextEntry
            />

            <PrimaryButton title="Save Student" loading={loading} onPress={handleAddStudent} style={styles.submitBtn} />
          </Card>
        ) : null}

        {mode === 'warden' ? (
          <Card style={styles.formCard}>
            <InputField label="Name" icon="user" value={wardenName} onChangeText={setWardenName} placeholder="Warden name" />
            <InputField label="Email" icon="mail" value={wardenEmail} onChangeText={setWardenEmail} placeholder="email@example.com" keyboardType="email-address" />
            <InputField label="Phone" icon="phone" value={wardenPhone} onChangeText={setWardenPhone} placeholder="Phone number" keyboardType="phone-pad" />
            <InputField
              label="Password"
              icon="lock"
              value={wardenPassword}
              onChangeText={setWardenPassword}
              placeholder="Required"
              secureTextEntry
            />

            <PrimaryButton title="Save Warden" loading={loading} onPress={handleAddWarden} style={styles.submitBtn} />
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  choiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  choiceInfo: { flex: 1 },
  choiceTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  choiceText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  formCard: {
    marginTop: spacing.sm,
  },
  subTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});