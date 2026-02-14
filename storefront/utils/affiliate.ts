const STORAGE_KEY = 'affiliate_ref';

export function storeAffiliateRef(ref: string) {
  if (typeof window === 'undefined') return;
  if (!ref) return;
  window.localStorage.setItem(STORAGE_KEY, ref);
}

export function getAffiliateRef(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function clearAffiliateRef() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function captureAffiliateRefFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    storeAffiliateRef(ref);
  }
}
