import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { InputField, PrimaryButton } from '../components';
import { colors, typography, spacing, borderRadius } from '../theme';

const ROLES = ['admin', 'student', 'parent', 'warden'];

const ROLE_ID_LABELS = {
  admin: 'Admin ID',
  student: 'Student ID',
  parent: 'Parent ID',
  warden: 'Warden ID',
};

const ROLE_ID_PLACEHOLDERS = {
  admin: 'Enter your Admin ID',
  student: 'Enter your Student ID',
  parent: 'Enter your Parent ID',
  warden: 'Enter your Warden ID',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [roleId, setRoleId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!roleId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(roleId.trim(), password, selectedRole);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Feather name="home" size={36} color={colors.primary.main} />
          </View>
          <Text style={styles.appName}>Jericho</Text>
          <Text style={styles.tagline}>Hostel Management</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            label={ROLE_ID_LABELS[selectedRole]}
            icon="hash"
            value={roleId}
            onChangeText={setRoleId}
            placeholder={ROLE_ID_PLACEHOLDERS[selectedRole]}
          />
          <InputField
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          {/* Role Selector */}
          <Text style={styles.roleLabel}>Login As</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChip,
                  selectedRole === r && styles.roleChipActive,
                ]}
                onPress={() => setSelectedRole(r)}
              >
                <Text
                  style={[
                    styles.roleText,
                    selectedRole === r && styles.roleTextActive,
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton
            title="Login"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.neutral.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appName: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.neutral.textPrimary,
  },
  tagline: {
    fontSize: typography.sizes.xl,
    color: colors.neutral.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  roleLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  roleChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  roleText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.neutral.textSecondary,
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
});
