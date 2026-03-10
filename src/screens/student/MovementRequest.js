import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader, InputField, PrimaryButton, Card } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, borderRadius } from '../../theme';

export default function MovementRequest({ navigation }) {
  const { user } = useAuth();
  const [leaveDate, setLeaveDate] = useState(null);
  const [leaveTime, setLeaveTime] = useState(null);
  const [returnDate, setReturnDate] = useState(null);
  const [returnTime, setReturnTime] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showLeaveDatePicker, setShowLeaveDatePicker] = useState(false);
  const [showLeaveTimePicker, setShowLeaveTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async function handleSubmit() {
    if (!leaveDate || !leaveTime || !returnDate || !returnTime) {
      Alert.alert('Error', 'Please select all date and time fields');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your request');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('movement_request').insert({
        student_id: user?.student_id || user?.id,
        leave_date: formatDate(leaveDate),
        leave_time: formatTime(leaveTime),
        return_date: formatDate(returnDate),
        return_time: formatTime(returnTime),
        reason: reason.trim(),
      });
      if (error) throw error;
      Alert.alert('Success', 'Movement request submitted', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Movement Request" subtitle="Create a new request" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          {/* Leave Date */}
          <Text style={styles.label}>Leave Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowLeaveDatePicker(true)}
          >
            <Feather name="calendar" size={18} color={colors.neutral.textMuted} />
            <Text style={leaveDate ? styles.dateText : styles.placeholderText}>
              {leaveDate ? formatDate(leaveDate) : 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
          {showLeaveDatePicker && (
            <DateTimePicker
              value={leaveDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowLeaveDatePicker(Platform.OS === 'ios');
                if (selectedDate) setLeaveDate(selectedDate);
              }}
            />
          )}

          {/* Leave Time */}
          <Text style={styles.label}>Leave Time</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowLeaveTimePicker(true)}
          >
            <Feather name="clock" size={18} color={colors.neutral.textMuted} />
            <Text style={leaveTime ? styles.dateText : styles.placeholderText}>
              {leaveTime ? formatTime(leaveTime) : 'HH:MM'}
            </Text>
          </TouchableOpacity>
          {showLeaveTimePicker && (
            <DateTimePicker
              value={leaveTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowLeaveTimePicker(Platform.OS === 'ios');
                if (selectedTime) setLeaveTime(selectedTime);
              }}
            />
          )}

          {/* Return Date */}
          <Text style={styles.label}>Return Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowReturnDatePicker(true)}
          >
            <Feather name="calendar" size={18} color={colors.neutral.textMuted} />
            <Text style={returnDate ? styles.dateText : styles.placeholderText}>
              {returnDate ? formatDate(returnDate) : 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
          {showReturnDatePicker && (
            <DateTimePicker
              value={returnDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowReturnDatePicker(Platform.OS === 'ios');
                if (selectedDate) setReturnDate(selectedDate);
              }}
            />
          )}

          {/* Return Time */}
          <Text style={styles.label}>Return Time</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowReturnTimePicker(true)}
          >
            <Feather name="clock" size={18} color={colors.neutral.textMuted} />
            <Text style={returnTime ? styles.dateText : styles.placeholderText}>
              {returnTime ? formatTime(returnTime) : 'HH:MM'}
            </Text>
          </TouchableOpacity>
          {showReturnTimePicker && (
            <DateTimePicker
              value={returnTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowReturnTimePicker(Platform.OS === 'ios');
                if (selectedTime) setReturnTime(selectedTime);
              }}
            />
          )}

          {/* Reason */}
          <InputField
            label="Reason"
            icon="file-text"
            value={reason}
            onChangeText={setReason}
            placeholder="Provide reason for leave..."
            multiline
            numberOfLines={4}
          />

          <PrimaryButton
            title="Send Request"
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.surface },
  content: { padding: spacing.screenPadding },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: spacing.md,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.textPrimary,
  },
  placeholderText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.neutral.textMuted,
  },
});
