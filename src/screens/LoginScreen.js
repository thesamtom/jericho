import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const SAVED_LOGINS_KEY = '@jericho_saved_logins_v1';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [roleId, setRoleId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedByRole, setSavedByRole] = useState({});
  const [savedLoaded, setSavedLoaded] = useState(false);

  useEffect(() => {
    loadSavedLogins();
  }, []);

  useEffect(() => {
    if (!savedLoaded) return;

    const saved = savedByRole[selectedRole];
    if (saved) {
      setRoleId(saved.roleId || '');
      setPassword(saved.password || '');
      setRememberMe(true);
      return;
    }

    // Keep each role isolated so role switching never shows other role credentials.
    setRoleId('');
    setPassword('');
    setRememberMe(false);
  }, [selectedRole, savedByRole, savedLoaded]);

  async function loadSavedLogins() {
    try {
      const raw = await AsyncStorage.getItem(SAVED_LOGINS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object') {
        setSavedByRole(parsed);
      }
    } catch {
      setSavedByRole({});
    } finally {
      setSavedLoaded(true);
    }
  }

  async function persistSavedLogins(nextValue) {
    setSavedByRole(nextValue);
    await AsyncStorage.setItem(SAVED_LOGINS_KEY, JSON.stringify(nextValue));
  }

  async function handleLogin() {
    if (!roleId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(roleId.trim(), password, selectedRole);

      const nextSaved = { ...savedByRole };
      if (rememberMe) {
        nextSaved[selectedRole] = {
          roleId: roleId.trim(),
          password,
        };
      } else {
        delete nextSaved[selectedRole];
      }
      await persistSavedLogins(nextSaved);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearSavedLogin() {
    const savedForRole = savedByRole[selectedRole];
    if (!savedForRole) {
      Alert.alert('Info', 'No saved login found for this role');
      return;
    }

    const nextSaved = { ...savedByRole };
    delete nextSaved[selectedRole];
    await persistSavedLogins(nextSaved);
    setRoleId('');
    setPassword('');
    setRememberMe(false);
    Alert.alert('Cleared', `Saved ${selectedRole} login removed`);
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

          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Feather
              name={rememberMe ? 'check-square' : 'square'}
              size={20}
              color={rememberMe ? colors.primary.main : colors.neutral.textMuted}
            />
            <Text style={styles.rememberText}>Remember me for {selectedRole}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearSavedLogin}
            style={styles.clearSavedBtn}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={16} color={colors.status.rejected} />
            <Text style={styles.clearSavedText}>Clear saved login for this role</Text>
          </TouchableOpacity>

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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  rememberText: {
    fontSize: typography.sizes.md,
    color: colors.neutral.textPrimary,
    fontWeight: typography.weights.medium,
  },
  clearSavedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  clearSavedText: {
    fontSize: typography.sizes.sm,
    color: colors.status.rejected,
    fontWeight: typography.weights.semibold,
  },
});
