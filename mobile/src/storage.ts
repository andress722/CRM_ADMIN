import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'mobile_access_token';
const REFRESH_KEY = 'mobile_refresh_token';
const PRODUCTS_CACHE_KEY = 'mobile_products_cache';
const CART_KEY = 'mobile_cart';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [REFRESH_KEY, refreshToken]
  ]);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

export async function saveProductsCache(payload: unknown) {
  await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(payload));
}

export async function getProductsCache<T>() {
  const raw = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveCart(payload: unknown) {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(payload));
}

export async function getCart<T>() {
  const raw = await AsyncStorage.getItem(CART_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
