import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/contexts/CartContext';
import LoginScreen from './src/screens/LoginScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import ProductScreen from './src/screens/ProductScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import { useNotifications } from './src/hooks/useNotifications';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { registerPushDevice } from './src/api';
import { colors } from './src/theme';
import * as Linking from 'expo-linking';

export type RootStackParamList = {
  Login: undefined;
  Catalog: undefined;
  Product: { id: string };
  Cart: undefined;
  Checkout: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: [Linking.createURL('/'), 'ecommerce://'],
  config: {
    screens: {
      Login: 'login',
      Catalog: 'catalog',
      Product: 'product/:id',
      Cart: 'cart',
      Checkout: 'checkout'
    }
  }
};

function RootNavigator() {
  const { isAuthenticated, isReady } = useAuth();
  const { status, pushToken } = useNotifications();

  useEffect(() => {
    if (!isAuthenticated || !pushToken) return;
    registerPushDevice({ token: pushToken, platform: Platform.OS }).catch(() => undefined);
  }, [isAuthenticated, pushToken]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Catalog" options={{ title: 'Catálogo' }}>
              {({ navigation }: { navigation: any }) => (
                <CatalogScreen
                  onSelect={(id: string) => navigation.navigate('Product', { id })}
                  onOpenCart={() => navigation.navigate('Cart')}
                  notificationStatus={status}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Product" options={{ title: 'Produto' }}>
              {({ route, navigation }: { route: any; navigation: any }) => (
                <ProductScreen productId={route.params.id} onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Cart" options={{ title: 'Carrinho' }}>
              {({ navigation }: { navigation: any }) => (
                <CartScreen onCheckout={() => navigation.navigate('Checkout')} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Checkout" options={{ title: 'Checkout' }}>
              {({ navigation }: { navigation: any }) => (
                <CheckoutScreen onDone={() => navigation.navigate('Catalog')} />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <RootNavigator />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
