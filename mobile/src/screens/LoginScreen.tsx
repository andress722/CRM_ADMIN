import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      Alert.alert('Erro', result.message ?? 'Login inválido.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>Acesse sua conta no mobile.</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Senha"
        secureTextEntry
        style={styles.input}
      />
      <PrimaryButton label={loading ? 'Entrando...' : 'Entrar'} onPress={handleLogin} disabled={loading} />
      <Text style={styles.hint}>Use as mesmas credenciais do web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 20
  },
  input: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  hint: {
    marginTop: 12,
    color: colors.muted,
    textAlign: 'center'
  }
});
