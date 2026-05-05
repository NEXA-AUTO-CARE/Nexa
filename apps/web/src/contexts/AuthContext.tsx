import type {
  AuthResponse,
  LoginDto,
  PublicUser,
  SetPasswordDto,
  SignupDto,
  VerifyOtpDto,
  VerifyOtpResponse,
} from '@nexa/shared'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { accessTokenStore, api } from '../lib/api-client'

interface AuthContextValue {
  user: PublicUser | null
  loading: boolean
  signup: (dto: SignupDto) => Promise<void>
  verifyOtp: (dto: VerifyOtpDto) => Promise<VerifyOtpResponse>
  setPassword: (dto: SetPasswordDto) => Promise<void>
  login: (dto: LoginDto) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const bootstrapped = useRef(false)

  const handleLogout = useCallback(() => {
    accessTokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    accessTokenStore.onLogout = handleLogout
    return () => {
      accessTokenStore.onLogout = undefined
    }
  }, [handleLogout])

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    ;(async () => {
      try {
        const { data } = await api.post<AuthResponse>('/auth/refresh', {})
        accessTokenStore.set(data.accessToken)
        setUser(data.user)
      } catch {
        accessTokenStore.clear()
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signup(dto) {
        await api.post('/auth/signup', dto)
      },
      async verifyOtp(dto) {
        const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', dto)
        return data
      },
      async setPassword(dto) {
        const { data } = await api.post<AuthResponse>('/auth/set-password', dto)
        accessTokenStore.set(data.accessToken)
        setUser(data.user)
      },
      async login(dto) {
        const { data } = await api.post<AuthResponse>('/auth/login', dto)
        accessTokenStore.set(data.accessToken)
        setUser(data.user)
      },
      async logout() {
        try {
          await api.post('/auth/logout', {})
        } finally {
          handleLogout()
        }
      },
    }),
    [user, loading, handleLogout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
