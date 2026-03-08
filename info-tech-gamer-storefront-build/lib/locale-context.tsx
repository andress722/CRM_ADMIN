"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type Locale = "en" | "pt"

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  t: (en: string, pt: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)
const LOCALE_KEY = "infotechgamer-locale"

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt")

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === "en" || stored === "pt") {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = (value: Locale) => {
    setLocaleState(value)
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_KEY, value)
      document.documentElement.lang = value
    }
  }

  const toggleLocale = () => setLocale(locale === "pt" ? "en" : "pt")

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: (en, pt) => (locale === "pt" ? pt : en),
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}
