import { createContext, useContext, useMemo, useState } from 'react'
import { requestAuth } from '../services/api'
import { notifyExtensionAuthSuccess } from '../services/extensionAuth'

const AuthContext = createContext(null)

function getStoredUser() {
  try {
    const rawUser = window.localStorage.getItem('user')
    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

function getStoredToken() {
  return window.localStorage.getItem('token')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [token, setToken] = useState(getStoredToken)

  const login = async (credentials) => {
    const data = await requestAuth('login', credentials)

    window.localStorage.setItem('token', data.token)
    window.localStorage.setItem('user', JSON.stringify(data.user))

    setToken(data.token)
    setUser(data.user)
    await notifyExtensionAuthSuccess(data.token)

    return data
  }

  const signup = async (credentials) => {
    await requestAuth('signup', credentials)
    return login(credentials)
  }

  const logout = () => {
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      signup,
      logout,
    }),
    [token, user]
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
