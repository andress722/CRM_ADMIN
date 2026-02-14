import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api';
import { colors } from '../theme';
import PrimaryButton from '../components/PrimaryButton';
import { useCart } from '../contexts/CartContext';

interface ProductScreenProps {
  productId: string;
  onBack: () => void;
}

interface ProductDetail {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export default function ProductScreen({ productId, onBack }: ProductScreenProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/products/${productId}`);
        if (!response.ok) throw new Error('not found');
        const data = await response.json();
        setProduct(data);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Produto não encontrado</Text>
        <PrimaryButton label="Voltar" onPress={onBack} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={{ uri: product.imageUrl || 'https://placehold.co/600x400' }}
        style={styles.image}
      />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>R$ {product.price.toFixed(2)}</Text>
      <Text style={styles.description}>{product.description || 'Sem descrição.'}</Text>
      <PrimaryButton
        label="Adicionar ao carrinho"
        onPress={() => addItem({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl })}
      />
      <View style={{ marginTop: 12 }}>
        <PrimaryButton label="Voltar" onPress={onBack} />
      </View>
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
  image: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text
  },
  price: {
    color: colors.primary,
    fontWeight: '700',
    marginVertical: 8,
    fontSize: 18
  },
  description: {
    color: colors.muted,
    marginBottom: 16
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  }
});
