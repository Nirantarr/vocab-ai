import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AUTH_EXPIRED_EVENT, fetchSession, logoutSession, requestAuth } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const bootstrapSession = async () => {
      try {
        const data = await fetchSession()

        if (!isMounted) {
          return
        }

        setUser(data.user || null)
      } catch (_error) {
        if (!isMounted) {
          return
        }

        setUser(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null)
      setIsLoading(false)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    }
  }, [])

  const login = async (credentials) => {
    const data = await requestAuth('login', credentials)
    setUser(data.user || null)
    return data
  }

  const signup = async (credentials) => {
    const data = await requestAuth('signup', credentials)
    setUser(data.user || null)
    return data
  }

  const logout = async () => {
    try {
      await logoutSession()
    } catch (_error) {
      // Ignore logout request failures and still clear local session state.
    } finally {
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      setUser,
    }),
    [isLoading, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
