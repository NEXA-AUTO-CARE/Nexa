import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BOOKING_FEE,
  SERVICE_LABELS,
  normalizeVehicleCategoryKey,
  resolveCategoryPrice,
  type VehicleCategoryConfig,
} from '@nexa/shared'
import { api } from '../lib/api-client'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
export interface TimeSlot {
  key: string
  label: string
  hour: number
}

interface SettingsData {
  /** Rich categories config */
  vehicleCategories: Record<string, VehicleCategoryConfig>
  /** e.g. { small_car: "Small Car", ... } */
  categoryLabels: Record<string, string>
  /** e.g. { small_car: "Subcompact hatchbacks...", ... } */
  categoryDescriptions: Record<string, string>
  /** e.g. "1.49" */
  bookingFee: string
  /** The terms and conditions from settings */
  termsAndConditions: string
  /** e.g. { "service-labels": "MINI VALET" }  */
  serviceLabels: Record<string, string>
  /** Enabled customer types: Individual, Corporate */
  customerTypes: string[]
  /** Configurable booking time slots */
  timeSlots: TimeSlot[]
}

interface SettingsContextValue extends SettingsData {
  loading: boolean
  /** Force a re-fetch from the API (e.g. after admin saves) */
  refresh: () => Promise<void>
  /** Helper: get the effective numeric price for a vehicle type */
  numericPriceFor: (vehicleType: string) => number
  /** Helper: get the category price string formatted to 2 decimals for a vehicle type */
  priceFor: (vehicleType: string) => string
  /** Helper: get the human label for a vehicle type */
  labelFor: (vehicleType: string) => string
  /** Helper: get the description for a vehicle type */
  descriptionFor: (vehicleType: string) => string
  /** Helper: get a service label by key (e.g. 'base'). Defaults to the base service name. */
  serviceLabelFor: (key?: string) => string
}

/* ------------------------------------------------------------------ */
/*  Defaults — mirrors shared constants; used as fallbacks             */
/* ------------------------------------------------------------------ */

const DEFAULTS: SettingsData = {
  vehicleCategories: {
    small_car: {
      key: 'small_car',
      displayName: 'Small Car',
      price: 40.00,
      description: 'Subcompact hatchbacks, City cars, Small-segment hatchbacks',
    },
    family_car: {
      key: 'family_car',
      displayName: 'Family Car',
      price: 50.00,
      description: 'Mid-size sedans, Compact family hatchbacks, Crossover SUVs',
    },
    large_suv_van: {
      key: 'large_suv_van',
      displayName: 'Large SUV / 7-Seater / Van',
      price: 60.00,
      description: 'Full-size luxury SUVs, 7-seater passenger vehicles, Multi-purpose vans',
    },
  },
  categoryLabels: {
    small_car: 'Small Car',
    family_car: 'Family Car',
    large_suv_van: 'Large SUV / 7-Seater / Van',
  },
  categoryDescriptions: {
    small_car: 'Subcompact hatchbacks, City cars, Small-segment hatchbacks',
    family_car: 'Mid-size sedans, Compact family hatchbacks, Crossover SUVs',
    large_suv_van: 'Full-size luxury SUVs, 7-seater passenger vehicles, Multi-purpose vans',
  },
  bookingFee: BOOKING_FEE,
  termsAndConditions: '',
  serviceLabels: SERVICE_LABELS,
  customerTypes: ['Individual', 'Corporate'],
  timeSlots: [
    { key: 'early_morning', label: 'Early Morning (7:00 AM)', hour: 7 },
    { key: 'morning', label: 'Morning (9:00 AM)', hour: 9 },
    { key: 'late_morning', label: 'Late Morning (11:00 AM)', hour: 11 },
    { key: 'afternoon', label: 'Afternoon (1:00 PM)', hour: 13 },
    { key: 'evening', label: 'Evening (4:00 PM)', hour: 16 },
    { key: 'late_evening', label: 'Late Evening (6:00 PM)', hour: 18 }
  ],
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
        const parsed = JSON.parse(cached)
        return {
          ...DEFAULTS,
          ...parsed,
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

      const parsedCategories = tryParseJson<Record<string, VehicleCategoryConfig>>(map.get('vehicle_categories'), DEFAULTS.vehicleCategories)

      const next: SettingsData = {
        vehicleCategories: parsedCategories,
        categoryLabels: tryParseJson(map.get('vehicle_category_labels'), DEFAULTS.categoryLabels),
        categoryDescriptions: tryParseJson(map.get('vehicle_category_descriptions'), DEFAULTS.categoryDescriptions),
        bookingFee: map.get('booking_fee') ?? DEFAULTS.bookingFee,
        termsAndConditions: map.get('terms_and_conditions') ?? DEFAULTS.termsAndConditions,
        serviceLabels: tryParseJson(map.get('service_labels'), DEFAULTS.serviceLabels),
        customerTypes: parseStringArray(map.get('customer_type'), DEFAULTS.customerTypes),
        timeSlots: tryParseJson(map.get('booking_time_slots'), DEFAULTS.timeSlots),
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

  const defaultPrices: Record<string, number> = {
    small_car: 40.0,
    family_car: 50.0,
    large_suv_van: 60.0,
  }

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...data,
      loading,
      refresh: fetchSettings,
      numericPriceFor: (vt) => {
        const key = normalizeVehicleCategoryKey(vt)
        if (data.vehicleCategories?.[key]) {
          const resolved = resolveCategoryPrice(data.vehicleCategories[key])
          if (resolved > 0) return resolved
        }
        return defaultPrices[key] ?? 40.0
      },
      priceFor: (vt) => {
        const key = normalizeVehicleCategoryKey(vt)
        let num = 0
        if (data.vehicleCategories?.[key]) {
          num = resolveCategoryPrice(data.vehicleCategories[key])
        }
        if (num <= 0) num = defaultPrices[key] ?? 40.0
        return num.toFixed(2)
      },
      labelFor: (vt) => {
        const key = normalizeVehicleCategoryKey(vt)
        return (
          data.vehicleCategories?.[key]?.displayName ??
          data.categoryLabels?.[key] ??
          DEFAULTS.categoryLabels[key] ??
          vt
        )
      },
      descriptionFor: (vt) => {
        const key = normalizeVehicleCategoryKey(vt)
        return (
          data.vehicleCategories?.[key]?.description ??
          data.categoryDescriptions?.[key] ??
          DEFAULTS.categoryDescriptions[key] ??
          ''
        )
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
