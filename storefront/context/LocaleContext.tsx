import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CountryCode = 'BR' | 'US' | 'ES';

export interface LocaleConfig {
  code: CountryCode;
  label: string;
  locale: string;
  currency: 'BRL' | 'USD' | 'EUR';
  exchangeRate: number; // Base BRL -> currency
  taxRate: number;
  shippingBase: number;
}

const DEFAULT_COUNTRY: CountryCode = 'BR';

const LOCALES: Record<CountryCode, LocaleConfig> = {
  BR: {
    code: 'BR',
    label: 'Brasil',
    locale: 'pt-BR',
    currency: 'BRL',
    exchangeRate: 1,
    taxRate: 0.12,
    shippingBase: 18
  },
  US: {
    code: 'US',
    label: 'United States',
    locale: 'en-US',
    currency: 'USD',
    exchangeRate: 0.2,
    taxRate: 0.07,
    shippingBase: 12
  },
  ES: {
    code: 'ES',
    label: 'España',
    locale: 'es-ES',
    currency: 'EUR',
    exchangeRate: 0.18,
    taxRate: 0.21,
    shippingBase: 14
  }
};

interface LocaleContextValue {
  country: CountryCode;
  setCountry: (country: CountryCode) => void;
  config: LocaleConfig;
  formatFromBase: (amount: number) => string;
  convertFromBase: (amount: number) => number;
  convertToBase: (amount: number) => number;
  formatBase: (amount: number) => string;
  estimateTaxFromBase: (amount: number) => number;
  estimateShippingFromBase: (amount: number) => number;
  isBaseCurrency: boolean;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('country') as CountryCode | null;
    if (stored && LOCALES[stored]) {
      setCountryState(stored);
      return;
    }
    const browserLocale = navigator.language || '';
    if (browserLocale.startsWith('en')) setCountryState('US');
    if (browserLocale.startsWith('es')) setCountryState('ES');
  }, []);

  const setCountry = (next: CountryCode) => {
    setCountryState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('country', next);
    }
  };

  const config = useMemo(() => LOCALES[country], [country]);

  const convertFromBase = (amount: number) => amount * config.exchangeRate;
  const convertToBase = (amount: number) => (config.exchangeRate === 0 ? amount : amount / config.exchangeRate);
  const formatCurrency = (amount: number, currency: LocaleConfig['currency'], locale: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

  const formatFromBase = (amount: number) => formatCurrency(convertFromBase(amount), config.currency, config.locale);
  const formatBase = (amount: number) => formatCurrency(amount, 'BRL', 'pt-BR');
  const estimateTaxFromBase = (amount: number) => amount * config.taxRate;
  const estimateShippingFromBase = (amount: number) => config.shippingBase;

  const value = useMemo<LocaleContextValue>(() => ({
    country,
    setCountry,
    config,
    formatFromBase,
    convertFromBase,
    convertToBase,
    formatBase,
    estimateTaxFromBase,
    estimateShippingFromBase,
    isBaseCurrency: config.currency === 'BRL'
  }), [country, config]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}

export function getLocaleOptions() {
  return Object.values(LOCALES);
}
