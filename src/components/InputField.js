import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, borderRadius, typography, spacing } from '../theme';

export default function InputField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  numberOfLines,
}) {
  const [hidePassword, setHidePassword] = useState(true);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, multiline && styles.multilineRow]}>
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={colors.neutral.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral.textMuted}
          secureTextEntry={isPassword ? hidePassword : false}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setHidePassword(!hidePassword)} style={styles.eyeBtn}>
            <Feather name={hidePassword ? 'eye-off' : 'eye'} size={18} color={colors.neutral.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.neutral.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 50,
  },
  multilineRow: {
    height: undefined,
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.lg,
    color: colors.neutral.textPrimary,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
});
