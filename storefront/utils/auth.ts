export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('accessToken');
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('refreshToken');
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('accessToken', accessToken);
  window.localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
}