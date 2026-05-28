import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MINI_VALET_PRICING,
  VEHICLE_CATEGORY_LABELS,
  VEHICLE_CATEGORY_DESCRIPTIONS,
  BOOKING_FEE,
  SERVICE_LABELS,
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
  /** The terms and conditions from settings */
  termsAndConditions: string
  /** e.g. { "service-labels": "MINI VALET" }  */
  serviceLabels: Record<string, string>
  /** Enabled customer types: Individual, Corporate */
  customerTypes: string[]
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
  /** Helper: get a service label by key (e.g. 'base'). Defaults to the base service name. */
  serviceLabelFor: (key?: string) => string
}

/* ------------------------------------------------------------------ */
/*  Defaults — mirrors shared constants; used as fallbacks             */
/* ------------------------------------------------------------------ */

const DEFAULTS: SettingsData = {
  categoryPricing: MINI_VALET_PRICING as Record<string, string>,
  categoryLabels: VEHICLE_CATEGORY_LABELS as Record<string, string>,
  categoryDescriptions: VEHICLE_CATEGORY_DESCRIPTIONS as Record<string, string>,
  bookingFee: BOOKING_FEE,
  termsAndConditions: '',
  serviceLabels: SERVICE_LABELS,
  customerTypes: ['Individual', 'Corporate'],
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
      if (cached) {
        return {
          ...DEFAULTS,
          ...JSON.parse(cached),
        } as SettingsData
      }
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
        termsAndConditions: map.get('terms_and_conditions') ?? DEFAULTS.termsAndConditions,
        serviceLabels: tryParseJson(map.get('service_labels'), DEFAULTS.serviceLabels),
        customerTypes: parseStringArray(map.get('customer_type'), DEFAULTS.customerTypes),
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
      priceFor: (vt) => {
        if (!vt) return '0.00';
        const key = vt.toLowerCase();
        const upper = vt.toUpperCase();
        return data.categoryPricing?.[key] ?? data.categoryPricing?.[upper] ?? DEFAULTS.categoryPricing[key] ?? '0.00';
      },
      labelFor: (vt) => {
        if (!vt) return '';
        const key = vt.toLowerCase();
        const upper = vt.toUpperCase();
        return data.categoryLabels?.[key] ?? data.categoryLabels?.[upper] ?? DEFAULTS.categoryLabels[key] ?? vt;
      },
      descriptionFor: (vt) => {
        if (!vt) return '';
        const key = vt.toLowerCase();
        const upper = vt.toUpperCase();
        return data.categoryDescriptions?.[key] ?? data.categoryDescriptions?.[upper] ?? DEFAULTS.categoryDescriptions[key] ?? '';
      },
      serviceLabelFor: (key = 'base') => data.serviceLabels?.[key] ?? DEFAULTS.serviceLabels[key] ?? '',
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
  const trimmed = raw.trim()
  const normalized = trimmed.replace(/""/g, '"')
  try { return JSON.parse(normalized) as T } catch { return fallback }
}

function parseStringArray(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback
  const trimmed = raw.trim()
  const normalized = trimmed.replace(/""/g, '"')
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      return JSON.parse(normalized) as string[]
    } catch {
      return fallback
    }
  }
  if (normalized.startsWith('{') && normalized.endsWith('}')) {
    // Postgres array format e.g. {"Individual","Corporate"} or {"Individual", "Corporate"} or {Individual,Corporate}
    const inner = normalized.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((s) => {
      let val = s.trim()
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1)
      }
      return val
    })
  }
  return fallback
}
