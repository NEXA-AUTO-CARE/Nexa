

export const BOOKING_FEE = '0.00';

/**
 * Service label defaults. Stored in system_settings under key `service_labels`.
 * The `base` key is the main service name displayed app-wide.
 */
export const SERVICE_LABELS = {} as Record<string, string>;

export const DEFAULT_CATEGORY_PRICES: Record<string, number> = {
  small_car: 40.0,
  family_car: 50.0,
  large_suv_van: 60.0,
};

export interface VehicleCategoryConfig {
  key: string;
  displayName: string;
  price: number;
  scheduledPrice?: number | null;
  activeFrom?: string | null;
  description?: string;
  vehicleTypes?: string[];
  metrics?: {
    seatingCapacity?: string;
    [key: string]: any;
  };
  examples?: string[];
}

/**
 * Normalizes any vehicle type / body type string (e.g., 'sedan', 'SEDAN', 'saloon',
 * 'hatchback', 'suv', 'van', 'grande', 'standard', 'maxi') to the canonical category key:
 * 'small_car', 'family_car', or 'large_suv_van'.
 */
export function normalizeVehicleCategoryKey(vehicleType: string | null | undefined): string {
  if (!vehicleType) return 'small_car';
  const clean = vehicleType.toLowerCase().trim().replace(/[\s\-_]+/g, '_');

  // Direct matches
  if (clean === 'small_car' || clean === 'smallcar' || clean === 'small') return 'small_car';
  if (clean === 'family_car' || clean === 'familycar' || clean === 'family') return 'family_car';
  if (clean === 'large_suv_van' || clean === 'largesuvvan' || clean === 'large_suv' || clean === 'large') return 'large_suv_van';

  // Small Car aliases
  if (
    clean === 'hatchback' ||
    clean === 'subcompact' ||
    clean === 'city_car' ||
    clean === 'citycar' ||
    clean === 'mini' ||
    clean === 'compact' ||
    clean === 'standard' ||
    clean === 'regular' ||
    clean === 'car'
  ) {
    return 'small_car';
  }

  // Family Car aliases
  if (
    clean === 'sedan' ||
    clean === 'saloon' ||
    clean === 'crossover' ||
    clean === 'estate' ||
    clean === 'coupe' ||
    clean === 'convertible' ||
    clean === 'grande' ||
    clean === 'seven_seater_4x4'
  ) {
    return 'family_car';
  }

  // Large SUV / Van aliases
  if (
    clean === 'suv' ||
    clean === 'van' ||
    clean === 'maxi' ||
    clean === 'transit' ||
    clean === 'small_van' ||
    clean === 'large_van' ||
    clean === '7_seater' ||
    clean === 'seven_seater' ||
    clean === 'mpv'
  ) {
    return 'large_suv_van';
  }

  return 'small_car';
}

/**
 * Dynamically resolves the effective numeric price for a category,
 * respecting any scheduled price changes if current date >= activeFrom.
 */
export function resolveCategoryPrice(
  config: Partial<VehicleCategoryConfig> | null | undefined,
  now: Date = new Date(),
): number {
  if (!config) return 0;
  const basePrice = typeof config.price === 'number' ? config.price : parseFloat(String(config.price || 0));
  if (
    config.activeFrom &&
    config.scheduledPrice !== undefined &&
    config.scheduledPrice !== null
  ) {
    const activeDate = new Date(config.activeFrom);
    if (!isNaN(activeDate.getTime()) && now >= activeDate) {
      const scheduled = typeof config.scheduledPrice === 'number'
        ? config.scheduledPrice
        : parseFloat(String(config.scheduledPrice));
      return isNaN(scheduled) ? (isNaN(basePrice) ? 0 : basePrice) : scheduled;
    }
  }
  return isNaN(basePrice) ? 0 : basePrice;
}

/**
 * Formats a numeric price into a standard currency string (e.g. £40.00).
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencySymbol = '£',
): string {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0));
  if (isNaN(numeric)) return `${currencySymbol}0.00`;
  return `${currencySymbol}${numeric.toFixed(2)}`;
}



