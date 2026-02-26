import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

// Estendemos as props nativas do TextInput e adicionamos o 'label'
interface AuthInputProps extends TextInputProps {
  label: string;
}

export function AuthInput({ label, ...props }: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#94A3B8"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 4 },
  label: { fontSize: 14, color: '#334155', fontWeight: '700', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
});