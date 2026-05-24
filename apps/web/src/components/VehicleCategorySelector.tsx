import { motion } from "framer-motion";
import { Car, Truck, Building2, Check } from "lucide-react";
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
  label: string;
  price: number | null;
  priceLabel: string;
  subtitle?: string;
  icon: React.ReactNode;
  pricingMode: PricingMode;
  bookingType: BookingType;
}

// TODO: Remove this, and use the system settings in context provider instead
export const getVehicleCategories = (settings: ReturnType<typeof useSettings>): VehicleCategory[] => {
  const showCorporate = (settings.customerTypes || []).some(
    (t) => t.toLowerCase() === "corporate"
  );

  const all = [
    {
      id: "regular_car" as const,
      label: settings.labelFor("standard") || "Regular Cars",
      price: Number(settings.priceFor("standard")) || 25,
      priceLabel: `£${settings.priceFor("standard")}`,
      icon: <Car className="h-5 w-5" />,
      pricingMode: "fixed_price" as const,
      bookingType: "consumer_booking" as const,
    },
    {
      id: "suv_7_seat_4x4" as const,
      label: settings.labelFor("grande") || "7 Seat SUV & 4×4",
      price: Number(settings.priceFor("grande")) || 30,
      priceLabel: `£${settings.priceFor("grande")}`,
      icon: <Truck className="h-5 w-5" />,
      pricingMode: "fixed_price" as const,
      bookingType: "consumer_booking" as const,
    },
    {
      id: "small_van" as const,
      label: settings.labelFor("maxi") || "Small Van",
      price: Number(settings.priceFor("maxi")) || 35,
      priceLabel: `£${settings.priceFor("maxi")}`,
      icon: <Truck className="h-5 w-5" />,
      pricingMode: "fixed_price" as const,
      bookingType: "consumer_booking" as const,
    },
    {
      id: "large_van" as const,
      label: settings.labelFor("transit") || "Large Van",
      price: Number(settings.priceFor("transit")) || 40,
      priceLabel: `£${settings.priceFor("transit")}`,
      icon: <Truck className="h-5 w-5" />,
      pricingMode: "fixed_price" as const,
      bookingType: "consumer_booking" as const,
    },
    {
      id: "corporate_fleet" as const,
      label: "Corporate Fleet",
      price: null,
      priceLabel: "Custom pricing",
      subtitle: "Invoiced by admin",
      icon: <Building2 className="h-5 w-5" />,
      pricingMode: "invoice_only" as const,
      bookingType: "corporate_request" as const,
    },
  ];

  return all.filter((c) => c.id !== "corporate_fleet" || showCorporate);
};

interface VehicleCategorySelectorProps {
  selected: VehicleCategoryId | null;
  onSelect: (id: VehicleCategoryId) => void;
}

const VehicleCategorySelector = ({ selected, onSelect }: VehicleCategorySelectorProps) => {
  const settings = useSettings();
  const serviceLabel = settings.serviceLabelFor();
  const categories = getVehicleCategories(settings);

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

              {/* Label + price */}
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-foreground">{cat.label}</p>
                {isCorporate ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.priceLabel} · {cat.subtitle}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">{serviceLabel}</p>
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
