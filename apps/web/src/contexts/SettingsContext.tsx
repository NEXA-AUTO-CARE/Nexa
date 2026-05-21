import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MINI_VALET_PRICING,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_DESCRIPTIONS,
  BOOKING_FEE,
  type VehicleType,
} from '@nexa/shared'
import { api } from '../lib/api-client'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsData {
  /** e.g. { standard: "25.00", grande: "30.00", ... } */
  categoryPricing: Record<string, string>
  /** e.g. { standard: "Standard", grande: "Grande", ... } */
  categoryLabels: Record<string, string>
  /** e.g. { standard: "Hatchbacks, Saloons…", ... } */
  categoryDescriptions: Record<string, string>
  /** e.g. "1.49" */
  bookingFee: string
}

interface SettingsContextValue extends SettingsData {
  loading: boolean
  /** Force a re-fetch from the API (e.g. after admin saves) */
  refresh: () => Promise<void>
  /** Helper: get the category price for a vehicle type */
  priceFor: (vehicleType: VehicleType | string) => string
  /** Helper: get the human label for a vehicle type */
  labelFor: (vehicleType: VehicleType | string) => string
  /** Helper: get the description for a vehicle type */
  descriptionFor: (vehicleType: VehicleType | string) => string
}

/* ------------------------------------------------------------------ */
/*  Defaults — mirrors shared constants; used as fallbacks             */
/* ------------------------------------------------------------------ */

const DEFAULTS: SettingsData = {
  categoryPricing: MINI_VALET_PRICING as Record<string, string>,
  categoryLabels: VEHICLE_CATEGORY_LABELS as Record<string, string>,
  categoryDescriptions: VEHICLE_CATEGORY_DESCRIPTIONS as Record<string, string>,
  bookingFee: BOOKING_FEE,
}

const CACHE_KEY = 'nexa_settings_cache'

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SettingsData>(() => {
    // Hydrate from localStorage on first render for instant display
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached) as SettingsData
    } catch { /* ignore corrupt cache */ }
    return DEFAULTS
  })
  const [loading, setLoading] = useState(true)
  const bootstrapped = useRef(false)

  const fetchSettings = useCallback(async () => {
    try {
      const { data: raw } = await api.get<{ key: string; value: string }[]>('/settings')
      const map = new Map(raw.map((s) => [s.key, s.value]))

      const next: SettingsData = {
        categoryPricing: tryParseJson(map.get('car_category_pricing'), DEFAULTS.categoryPricing),
        categoryLabels: tryParseJson(map.get('vehicle_category_labels'), DEFAULTS.categoryLabels),
        categoryDescriptions: tryParseJson(map.get('vehicle_category_descriptions'), DEFAULTS.categoryDescriptions),
        bookingFee: map.get('booking_fee') ?? DEFAULTS.bookingFee,
      }
      setData(next)
      // Persist to localStorage for cache-on-load
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch { /* quota */ }
    } catch (err) {
      console.error('Failed to load system settings, using cached/defaults:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    fetchSettings()
  }, [fetchSettings])

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...data,
      loading,
      refresh: fetchSettings,
      priceFor: (vt) => data.categoryPricing[vt] ?? DEFAULTS.categoryPricing[vt] ?? '0.00',
      labelFor: (vt) => data.categoryLabels[vt] ?? DEFAULTS.categoryLabels[vt] ?? vt,
      descriptionFor: (vt) => data.categoryDescriptions[vt] ?? DEFAULTS.categoryDescriptions[vt] ?? '',
    }),
    [data, loading, fetchSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function tryParseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}
