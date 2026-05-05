import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '@nexa/shared'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface AuthTokenStore {
  get(): string | null
  set(token: string | null): void
  clear(): void
  onLogout?: () => void
}

const memoryStore: { token: string | null } = { token: null }
export const accessTokenStore: AuthTokenStore = {
  get: () => memoryStore.token,
  set: (t) => {
    memoryStore.token = t
  },
  clear: () => {
    memoryStore.token = null
  },
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL,
    withCredentials: true,
  })

  client.interceptors.request.use((cfg) => {
    const token = accessTokenStore.get()
    if (token) {
      cfg.headers = cfg.headers ?? {}
      cfg.headers.Authorization = `Bearer ${token}`
    }
    return cfg
  })

  let refreshInFlight: Promise<string | null> | null = null

  client.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined
      const status = error.response?.status
      const isRefreshCall = original?.url?.endsWith('/auth/refresh')
      if (status !== 401 || !original || original._retry || isRefreshCall) {
        return Promise.reject(error)
      }
      original._retry = true

      if (!refreshInFlight) {
        refreshInFlight = (async () => {
          try {
            const { data } = await axios.post<AuthResponse>(
              `${client.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true },
            )
            accessTokenStore.set(data.accessToken)
            return data.accessToken
          } catch {
            accessTokenStore.clear()
            accessTokenStore.onLogout?.()
            return null
          } finally {
            refreshInFlight = null
          }
        })()
      }

      const newToken = await refreshInFlight
      if (!newToken) return Promise.reject(error)
      original.headers = original.headers ?? {}
      original.headers.Authorization = `Bearer ${newToken}`
      return client.request(original)
    },
  )

  return client
}

export const api = createApiClient()
