import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme';
import { useCart } from '../contexts/CartContext';
import { apiFetch } from '../api';

interface CheckoutScreenProps {
  onDone: () => void;
}

export default function CheckoutScreen({ onDone }: CheckoutScreenProps) {
  const { items, total, clear } = useCart();
  const [address, setAddress] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    city: '',
    state: '',
    zip: ''
  });
  const [loading, setLoading] = useState(false);
  const fieldLabels: Record<keyof typeof address, string> = {
    name: 'Nome completo',
    email: 'E-mail',
    phone: 'Telefone',
    street: 'Rua',
    number: 'Numero',
    city: 'Cidade',
    state: 'Estado',
    zip: 'CEP'
  };

  const updateField = (key: keyof typeof address, value: string) => {
    setAddress((prev: typeof address) => ({ ...prev, [key]: value }));
  };

  const handleCheckout = async () => {
    if (!items.length) return;
    const missing = (Object.keys(address) as Array<keyof typeof address>)
      .find((key) => !address[key].trim());
    if (missing) {
      Alert.alert('Atenção', `Preencha o campo: ${fieldLabels[missing]}`);
      return;
    }
    setLoading(true);
    try {
      for (const item of items) {
        await apiFetch('/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: item.id, quantity: item.quantity })
        });
      }

      const response = await apiFetch('/orders/from-cart', { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao criar pedido');

      clear();
      setLoading(false);
      Alert.alert('Sucesso', 'Pedido criado com sucesso!');
      onDone();
    } catch {
      setLoading(false);
      Alert.alert('Erro', 'Não foi possível finalizar agora.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.subtitle}>Preencha os dados de entrega.</Text>
      {(Object.entries(address) as Array<[keyof typeof address, string]>).map(([key, value]) => (
        <TextInput
          key={key}
          value={value}
          onChangeText={(text: string) => updateField(key as keyof typeof address, text)}
          placeholder={fieldLabels[key]}
          keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : key === 'zip' || key === 'number' ? 'numeric' : 'default'}
          autoCapitalize={key === 'email' ? 'none' : 'words'}
          style={styles.input}
        />
      ))}
      <View style={styles.summary}>
        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
      </View>
      <PrimaryButton label={loading ? 'Processando...' : 'Finalizar'} onPress={handleCheckout} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 12
  },
  input: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10
  },
  summary: {
    marginTop: 12,
    marginBottom: 12
  },
  total: {
    fontSize: 18,
    fontWeight: '700'
  }
});
