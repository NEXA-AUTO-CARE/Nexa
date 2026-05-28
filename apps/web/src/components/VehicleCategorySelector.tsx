import { motion } from "framer-motion";
import { Car, Truck, Building2, Check } from "lucide-react";
import { VehicleType } from "@nexa/shared";
import { useSettings } from "../contexts/SettingsContext";

export type VehicleCategoryId =
  | "regular_car"
  | "suv_7_seat_4x4"
  | "small_van"
  | "large_van"
  | "corporate_fleet";

export type PricingMode = "fixed_price" | "invoice_only";
export type BookingType = "consumer_booking" | "corporate_request";

export interface VehicleCategory {
  id: VehicleCategoryId;
  vehicleType: VehicleType | null;
  label: string;
  description: string;
  price: number | null;
  priceLabel: string;
  subtitle?: string;
  icon: React.ReactNode;
  pricingMode: PricingMode;
  bookingType: BookingType;
}

/**
 * Maps each consumer-facing category ID to its VehicleType key and icon.
 * The corporate_fleet entry has no VehicleType — it's handled separately.
 */
const CATEGORY_DEFS: {
  id: VehicleCategoryId;
  vehicleType: VehicleType | null;
  icon: React.ReactNode;
  pricingMode: PricingMode;
  bookingType: BookingType;
  subtitle?: string;
}[] = [
    {
      id: "regular_car",
      vehicleType: VehicleType.STANDARD,
      icon: <Car className="h-5 w-5" />,
      pricingMode: "fixed_price",
      bookingType: "consumer_booking",
    },
    {
      id: "suv_7_seat_4x4",
      vehicleType: VehicleType.GRANDE,
      icon: <Truck className="h-5 w-5" />,
      pricingMode: "fixed_price",
      bookingType: "consumer_booking",
    },
    {
      id: "small_van",
      vehicleType: VehicleType.MAXI,
      icon: <Truck className="h-5 w-5" />,
      pricingMode: "fixed_price",
      bookingType: "consumer_booking",
    },
    {
      id: "large_van",
      vehicleType: VehicleType.TRANSIT,
      icon: <Truck className="h-5 w-5" />,
      pricingMode: "fixed_price",
      bookingType: "consumer_booking",
    },
    {
      id: "corporate_fleet",
      vehicleType: null,
      icon: <Building2 className="h-5 w-5" />,
      pricingMode: "invoice_only",
      bookingType: "corporate_request",
      subtitle: "Invoiced by admin",
    },
  ];

/**
 * Build the full VehicleCategory list from the static defs + live settings.
 */
function buildCategories(
  priceFor: (vt: VehicleType | string) => string,
  labelFor: (vt: VehicleType | string) => string,
  descriptionFor: (vt: VehicleType | string) => string,
): VehicleCategory[] {
  return CATEGORY_DEFS.map((def) => {
    if (def.vehicleType) {
      const price = parseFloat(priceFor(def.vehicleType));
      return {
        id: def.id,
        vehicleType: def.vehicleType,
        label: labelFor(def.vehicleType),
        description: descriptionFor(def.vehicleType),
        price,
        priceLabel: `£${price % 1 === 0 ? price : price.toFixed(2)}`,
        icon: def.icon,
        pricingMode: def.pricingMode,
        bookingType: def.bookingType,
      };
    }
    // Corporate fleet — no VehicleType
    return {
      id: def.id,
      vehicleType: null,
      label: "Corporate Fleet",
      description: "",
      price: null,
      priceLabel: "Custom pricing",
      subtitle: def.subtitle,
      icon: def.icon,
      pricingMode: def.pricingMode,
      bookingType: def.bookingType,
    };
  });
}

interface VehicleCategorySelectorProps {
  selected: VehicleCategoryId | null;
  onSelect: (id: VehicleCategoryId) => void;
}

const VehicleCategorySelector = ({ selected, onSelect }: VehicleCategorySelectorProps) => {
  const { priceFor, labelFor, descriptionFor } = useSettings();
  const categories = buildCategories(priceFor, labelFor, descriptionFor);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle Category</p>
      <div className="grid grid-cols-1 gap-2.5">
        {categories.map((cat, i) => {
          const isSelected = selected === cat.id;
          const isCorporate = cat.id === "corporate_fleet";

          return (
            <motion.button
              key={cat.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(cat.id)}
              className={`relative flex items-center gap-3 rounded-xl p-3.5 text-left transition-all border ${isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-secondary/60 hover:border-primary/30"
                } ${isCorporate ? "mt-1" : ""}`}
            >
              {/* Icon */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                  }`}
              >
                {cat.icon}
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-foreground">{cat.label}</p>
                {isCorporate ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.priceLabel} · {cat.subtitle}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                )}
              </div>

              {/* Price / badge */}
              <div className="shrink-0 text-right">
                {isCorporate ? (
                  <span className="inline-block rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-primary uppercase tracking-wide">
                    Business
                  </span>
                ) : (
                  <span className="font-heading text-lg font-bold text-primary">{cat.priceLabel}</span>
                )}
              </div>

              {/* Check mark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleCategorySelector;

/**
 * Re-export a helper so GaragePage and others can still access the full list
 * outside the component render (e.g. for looking up categoryMeta).
 */
export { buildCategories, CATEGORY_DEFS };
