import { motion } from "framer-motion";
import { Car, Truck, Building2, Check } from "lucide-react";

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

export const vehicleCategories: VehicleCategory[] = [
  {
    id: "regular_car",
    label: "Regular Cars",
    price: 25,
    priceLabel: "£25",
    icon: <Car className="h-5 w-5" />,
    pricingMode: "fixed_price",
    bookingType: "consumer_booking",
  },
  {
    id: "suv_7_seat_4x4",
    label: "7 Seat SUV & 4×4",
    price: 30,
    priceLabel: "£30",
    icon: <Truck className="h-5 w-5" />,
    pricingMode: "fixed_price",
    bookingType: "consumer_booking",
  },
  {
    id: "small_van",
    label: "Small Van",
    price: 35,
    priceLabel: "£35",
    icon: <Truck className="h-5 w-5" />,
    pricingMode: "fixed_price",
    bookingType: "consumer_booking",
  },
  {
    id: "large_van",
    label: "Large Van",
    price: 40,
    priceLabel: "£40",
    icon: <Truck className="h-5 w-5" />,
    pricingMode: "fixed_price",
    bookingType: "consumer_booking",
  },
  {
    id: "corporate_fleet",
    label: "Corporate Fleet",
    price: null,
    priceLabel: "Custom pricing",
    subtitle: "Invoiced by admin",
    icon: <Building2 className="h-5 w-5" />,
    pricingMode: "invoice_only",
    bookingType: "corporate_request",
  },
];

interface VehicleCategorySelectorProps {
  selected: VehicleCategoryId | null;
  onSelect: (id: VehicleCategoryId) => void;
}

const VehicleCategorySelector = ({ selected, onSelect }: VehicleCategorySelectorProps) => {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle Category</p>
      <div className="grid grid-cols-1 gap-2.5">
        {vehicleCategories.map((cat, i) => {
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
              className={`relative flex items-center gap-3 rounded-xl p-3.5 text-left transition-all border ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-secondary/60 hover:border-primary/30"
              } ${isCorporate ? "mt-1" : ""}`}
            >
              {/* Icon */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isSelected
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
                  <p className="text-xs text-muted-foreground mt-0.5">Mini Valet & Spray Polish</p>
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
