'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  role: string
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string, turnstileToken?: string) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'accessToken'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    router.push('/login')
  }, [router])

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        setUser(data.user)
      } else {
        logout()
      }
    } catch {
      logout()
    }
  }, [logout])

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 401) {
        await refreshAuth()
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      setIsLoading(false)
    }
  }, [logout, refreshAuth])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (username: string, password: string, turnstileToken?: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, turnstileToken }),
    })

    if (!response.ok) {
      const data = await response.json()
      // Extrair mensagem de erro do formato da API: { error: { message: "..." } }
      let errorMessage = 'Usuário ou senha inválidos'
      if (data?.error?.message) {
        errorMessage = data.error.message
      } else if (typeof data?.error === 'string') {
        errorMessage = data.error
      } else if (data?.message) {
        errorMessage = data.message
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    setUser(data.user)
    router.push('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
