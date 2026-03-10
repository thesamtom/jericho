import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, Alert } from 'react-native';
import { ScreenHeader, InputField, PrimaryButton, Card, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography } from '../../theme';

export default function ComplaintScreen() {
  const { user } = useAuth();
  const [complaint, setComplaint] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, []);

  async function loadComplaints() {
    try {
      const { data, error } = await supabase
        .from('complaint')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComplaints(data || []);
    } catch {
      setComplaints([]);
    }
  }

  async function handleSubmit() {
    if (!complaint.trim()) {
      Alert.alert('Error', 'Please describe your complaint');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('complaint').insert({
        student_id: user?.id,
        description: complaint.trim(),
        status: 'pending',
      });
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
      <ScrollView contentContainerStyle={styles.content}>
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
        {complaints.length === 0 ? (
          <Text style={styles.empty}>No complaints yet</Text>
        ) : (
          complaints.map((item) => (
            <Card key={item.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <Text style={styles.historyText} numberOfLines={2}>
                  {item.description}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleDateString()}
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
  formCard: { marginBottom: spacing.sectionGap },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: spacing.md,
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
