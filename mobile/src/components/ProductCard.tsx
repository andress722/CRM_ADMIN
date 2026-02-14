import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import PrimaryButton from './PrimaryButton';

interface ProductCardProps {
  name: string;
  price: number;
  imageUrl?: string;
  onPress: () => void;
  onAdd: () => void;
}

export default function ProductCard({ name, price, imageUrl, onPress, onAdd }: ProductCardProps) {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: imageUrl || 'https://placehold.co/300x200' }}
        style={styles.image}
      />
      <Text style={styles.title} numberOfLines={1}>{name}</Text>
      <Text style={styles.price}>R$ {price.toFixed(2)}</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Ver" onPress={onPress} />
        <PrimaryButton label="Adicionar" onPress={onAdd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  price: {
    marginTop: 4,
    marginBottom: 10,
    color: colors.primary,
    fontWeight: '700'
  },
  actions: {
    gap: 8
  }
});
