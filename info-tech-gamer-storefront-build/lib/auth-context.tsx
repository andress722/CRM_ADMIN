"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User } from "./types"
import * as api from "./api"

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  loginUser: (email: string, password: string) => Promise<void>
  registerUser: (name: string, email: string, password: string) => Promise<{ message?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      if (!api.hasAccessToken()) {
        setUser(null)
        return
      }
      const me = await api.getMe()
      setUser(me)
    } catch {
      api.clearTokens()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const loginUser = async (email: string, password: string) => {
    await api.login(email, password)
    await refreshUser()
  }

  const registerUser = async (name: string, email: string, password: string) => {
    const result = await api.register(name, email, password)
    return result as { message?: string }
  }

  const logout = () => {
    api.clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        loginUser,
        registerUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
