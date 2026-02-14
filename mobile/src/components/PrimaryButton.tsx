import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  pressed: {
    opacity: 0.9
  },
  disabled: {
    backgroundColor: colors.muted
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
