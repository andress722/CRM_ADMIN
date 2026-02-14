import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { colors } from '../theme';
import PrimaryButton from '../components/PrimaryButton';

interface CartScreenProps {
  onCheckout: () => void;
}

export default function CartScreen({ onCheckout }: CartScreenProps) {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Carrinho vazio</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>R$ {item.price.toFixed(2)}</Text>
              <Text style={styles.quantity}>Qtd: {item.quantity}</Text>
            </View>
            <View style={styles.actions}>
              <PrimaryButton label="+" onPress={() => updateQuantity(item.id, item.quantity + 1)} />
              <PrimaryButton label="-" onPress={() => updateQuantity(item.id, item.quantity - 1)} />
              <PrimaryButton label="Remover" onPress={() => removeItem(item.id)} />
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      <View style={styles.summary}>
        <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
        <PrimaryButton label="Finalizar compra" onPress={onCheckout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  list: {
    padding: 16,
    paddingBottom: 140
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12
  },
  name: {
    fontWeight: '600',
    color: colors.text
  },
  price: {
    color: colors.primary,
    marginTop: 4
  },
  quantity: {
    color: colors.muted,
    marginTop: 4
  },
  actions: {
    gap: 8
  },
  summary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '600'
  }
});
