import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type BookingResponse, type CreateBookingDto } from "@nexa/shared";
import { useSettings } from "../contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Car, Calendar, MapPin, Sparkles, ChevronRight } from "lucide-react";
import { useAddons } from "../hooks/useAddons";
import { useVehicles } from "../hooks/useVehicles";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";

const TIME_SLOTS: Record<string, number> = { morning: 9, afternoon: 13, evening: 16 };

const BookingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vehicles, isLoading } = useVehicles();
  const { addons } = useAddons();
  const { priceFor } = useSettings();

  const [selectedVehicle, setSelectedVehicle] = useState<string>(searchParams.get("vehicleId") ?? "");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [agreedSafeSpace, setAgreedSafeSpace] = useState(false);
  const [agreedDetailsCorrect, setAgreedDetailsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveVehicleId = selectedVehicle || vehicles[0]?.vehicleId || "";
  const vehicle = vehicles.find((v) => v.vehicleId === effectiveVehicleId);
  const basePriceStr = vehicle ? priceFor(vehicle.vehicleType) : undefined;
  const hasPrice = basePriceStr !== undefined;

  const total = useMemo(() => {
    if (!hasPrice) return null;
    const base = Number(basePriceStr);
    const extras = addons
      .filter((a) => selectedAddons.includes(a.addonId))
      .reduce((sum, a) => sum + Number(a.price), 0);
    return (base + extras).toFixed(2);
  }, [hasPrice, basePriceStr, addons, selectedAddons]);

  const canSubmit =
    !!effectiveVehicleId &&
    hasPrice &&
    !!date &&
    !!time &&
    address.trim().length > 0 &&
    agreedSafeSpace &&
    agreedDetailsCorrect &&
    !submitting;

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const bookingTime = new Date(`${date}T${String(TIME_SLOTS[time] ?? 9).padStart(2, "0")}:00:00`).toISOString();
      const dto: CreateBookingDto = {
        vehicleId: effectiveVehicleId,
        bookingTime,
        serviceAddress: address.trim(),
        addonIds: selectedAddons,
        agreedSafeSpace,
        agreedDetailsCorrect,
      };
      const { data } = await api.post<BookingResponse>("/bookings", dto);
      navigate("/payment", { state: { bookingId: data.bookingId } });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Book a Wash</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule your detailing service</p>
      </motion.div>

      {/* Vehicle Selection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Vehicle</label>
        <div className="space-y-2">
          {isLoading ? (
            <div className="glass-card p-3 text-sm text-muted-foreground">Loading vehicles…</div>
          ) : vehicles.length === 0 ? (
            <button
              onClick={() => navigate("/garage")}
              className="glass-card w-full p-3 text-left text-sm text-muted-foreground"
            >
              No vehicles yet — add one in your garage.
            </button>
          ) : (
            vehicles.map((v) => (
              <button
                key={v.vehicleId}
                onClick={() => setSelectedVehicle(v.vehicleId)}
                className={`w-full glass-card p-3 flex items-center gap-3 transition-all ${
                  effectiveVehicleId === v.vehicleId ? "border-primary glow-teal" : ""
                }`}
              >
                <Car className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{v.make} {v.model}</p>
                  <p className="text-xs text-muted-foreground">{v.registrationNumber}</p>
                </div>
                {effectiveVehicleId === v.vehicleId && <div className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            ))
          )}
        </div>
      </motion.div>

      {/* Service */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Service</label>
        <div className="glass-card p-4 flex items-center gap-3 border-primary glow-teal">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-sm">Mini Valet & Spray Polish</p>
            <p className="text-xs text-muted-foreground">Priced by vehicle category</p>
          </div>
          <span className="font-heading font-bold text-lg text-primary">
            {basePriceStr ? `£${basePriceStr}` : "—"}
          </span>
        </div>
      </motion.div>

      {/* Add-ons */}
      {addons.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Add-ons (optional)</label>
          <div className="space-y-2">
            {addons.map((a) => (
              <button
                key={a.addonId}
                onClick={() => toggleAddon(a.addonId)}
                className={`w-full glass-card p-3 flex items-center gap-3 transition-all ${
                  selectedAddons.includes(a.addonId) ? "border-primary glow-teal" : ""
                }`}
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{a.name}</p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                </div>
                <span className="text-sm font-semibold text-primary">£{a.price}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Date & Time */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Date & Time</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 pl-9 bg-secondary border-border text-foreground"
            />
          </div>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger className="h-11 bg-secondary border-border text-foreground">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning (9:00 AM)</SelectItem>
              <SelectItem value="afternoon">Afternoon (1:00 PM)</SelectItem>
              <SelectItem value="evening">Evening (4:00 PM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Address */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Service Address</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter your address in Aberdeen"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-11 pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </motion.div>

      {/* Consent */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="glass-card p-4 space-y-3 text-sm"
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreedSafeSpace}
            onChange={(e) => setAgreedSafeSpace(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--primary))]"
          />
          <span className="text-muted-foreground">
            I can provide a safe, accessible space for the detailer to work.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreedDetailsCorrect}
            onChange={(e) => setAgreedDetailsCorrect(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--primary))]"
          />
          <span className="text-muted-foreground">
            The vehicle and address details above are correct.
          </span>
        </label>
      </motion.div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Confirm */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Button variant="hero" className="w-full h-12" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Creating booking…" : total ? (
            <>
              Continue to Payment · £{total} <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>Continue to Payment <ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default BookingPage;
