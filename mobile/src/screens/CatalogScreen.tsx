import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchProducts } from '../api';
import { colors } from '../theme';
import ProductCard from '../components/ProductCard';
import PrimaryButton from '../components/PrimaryButton';
import { useCart } from '../contexts/CartContext';

interface CatalogScreenProps {
  onSelect: (id: string) => void;
  onOpenCart: () => void;
  notificationStatus: 'granted' | 'denied' | 'undetermined';
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export default function CatalogScreen({ onSelect, onOpenCart, notificationStatus }: CatalogScreenProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [query, setQuery] = useState('');
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addItem } = useCart();

  const loadProducts = async () => {
    setLoading(true);
    const result = await fetchProducts<ProductItem>(query);
    setProducts(result.data?.items ?? []);
    setOffline(result.offline);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadProducts();
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.badge}>Push: {notificationStatus}</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar produto"
        style={styles.search}
      />
      {offline && <Text style={styles.offline}>Modo offline: exibindo cache.</Text>}
      <FlatList<ProductItem>
        data={products}
        keyExtractor={(item: ProductItem) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
        renderItem={({ item }: { item: ProductItem }) => (
          <ProductCard
            name={item.name}
            price={item.price}
            imageUrl={item.imageUrl}
            onPress={() => onSelect(item.id)}
            onAdd={() => addItem({ id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl })}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <View style={styles.cartButton}>
        <PrimaryButton label="Ir para o carrinho" onPress={onOpenCart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  badge: {
    color: colors.muted,
    fontSize: 12
  },
  search: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  offline: {
    color: colors.danger,
    marginBottom: 8
  },
  list: {
    paddingBottom: 24
  },
  cartButton: {
    marginTop: 8
  }
});
