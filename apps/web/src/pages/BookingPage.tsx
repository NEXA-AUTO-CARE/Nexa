import { useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type BookingResponse, type CreateBookingDto, type CreateCorporateFleetEnquiryDto } from "@nexa/shared";
import { useSettings } from "../contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Calendar, MapPin, Sparkles, ChevronRight, X, Send } from "lucide-react";
import { useAddons } from "../hooks/useAddons";
import { useVehicles } from "../hooks/useVehicles";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";
import { useToast } from "@/hooks/use-toast";
import CorporateFleetFields, { type CorporateFleetData } from "@/components/CorporateFleetFields";

const TIME_SLOTS: Record<string, number> = { morning: 9, afternoon: 13, evening: 16 };

const BookingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vehicles, isLoading } = useVehicles();
  const { addons } = useAddons();
  const { toast } = useToast();
  const { priceFor, serviceLabelFor, customerTypes = ["Individual", "Corporate"] } = useSettings();

  const serviceLabel = serviceLabelFor();

  const showCorporateTab = customerTypes.some((t) => t.toLowerCase() === "corporate");
  const showIndividualTab = customerTypes.some((t) => t.toLowerCase() === "individual");

  // Determine initial customer type based on allowed types
  const initialType = showIndividualTab ? "Individual" : "Corporate";
  const [customerType, setCustomerType] = useState<string>(initialType);

  const [selectedVehicle, setSelectedVehicle] = useState<string>(searchParams.get("vehicleId") ?? "");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [corporateData, setCorporateData] = useState<CorporateFleetData>({
    companyName: "",
    fleetSize: "",
    contactPerson: "",
    businessEmail: "",
    businessPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const isCorporateFlow = customerType === "Corporate";

  const effectiveVehicleId = selectedVehicle || vehicles[0]?.vehicleId || "";
  const vehicle = vehicles.find((v) => v.vehicleId === effectiveVehicleId);
  const basePriceStr = vehicle ? priceFor(vehicle.vehicleType) : undefined;
  const hasPrice = basePriceStr !== undefined;

  const total = useMemo(() => {
    if (!hasPrice) return null;
    const base = Number(basePriceStr);
    const addonsPrice = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.addonId === id);
      return sum + (addon ? Number(addon.price) : 0);
    }, 0);
    return (base + addonsPrice).toFixed(2);
  }, [hasPrice, basePriceStr, addons, selectedAddons]);

  const canSubmit = isCorporateFlow
    ? !!(corporateData.companyName && corporateData.contactPerson && corporateData.businessEmail && date && time && address.trim()) && !submitting
    : !!effectiveVehicleId &&
      hasPrice &&
      !!date &&
      !!time &&
      address.trim().length > 0 &&
      !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const bookingTime = new Date(`${date}T${String(TIME_SLOTS[time] ?? 9).padStart(2, "0")}:00:00`).toISOString();

      if (isCorporateFlow) {
        const dto: CreateCorporateFleetEnquiryDto = {
          companyName: corporateData.companyName,
          fleetSize: Number(corporateData.fleetSize) || 1,
          contactPerson: corporateData.contactPerson,
          businessEmail: corporateData.businessEmail,
          businessPhone: corporateData.businessPhone,
        };
        await api.post("/corporate-fleet", dto);
        toast({
          title: "Corporate Fleet Request Submitted! 🏢",
          description: "Our admin team will raise a custom invoice and get in touch with you shortly.",
        });
        navigate("/bookings");
      } else {
        const dto: CreateBookingDto = {
          vehicleId: effectiveVehicleId,
          bookingTime,
          serviceAddress: address.trim(),
          addonIds: selectedAddons,
          agreedSafeSpace: true,
          agreedDetailsCorrect: true,
        };
        const { data } = await api.post<BookingResponse>("/bookings", dto);
        navigate("/payment", { state: { bookingId: data.bookingId } });
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Book a Wash</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule your detailing service</p>
      </motion.div>

      {/* Dynamic Tab Control */}
      {showIndividualTab && showCorporateTab && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex p-1 rounded-xl bg-secondary/80 border border-border"
        >
          <button
            type="button"
            onClick={() => setCustomerType("Individual")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              customerType === "Individual"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Individual Booking
          </button>
          <button
            type="button"
            onClick={() => setCustomerType("Corporate")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              customerType === "Corporate"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Corporate Fleet
          </button>
        </motion.div>
      )}

      {/* INDIVIDUAL BOOKING FORM FLOW */}
      {!isCorporateFlow && (
        <>
          {/* Vehicle Selection */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Select Vehicle</label>
            <div className="space-y-2">
              {isLoading ? (
                <div className="glass-card p-3 text-sm text-muted-foreground animate-pulse">Loading vehicles…</div>
              ) : vehicles.length === 0 ? (
                <button
                  onClick={() => navigate("/garage")}
                  className="glass-card w-full p-3 text-left text-sm text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  No vehicles yet — add one in your garage.
                </button>
              ) : (
                vehicles.map((v) => (
                  <button
                    key={v.vehicleId}
                    type="button"
                    onClick={() => setSelectedVehicle(v.vehicleId)}
                    className={`w-full glass-card p-3 flex items-center gap-3 transition-all ${
                      effectiveVehicleId === v.vehicleId ? "border-primary bg-primary/5 glow-teal" : ""
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

          {/* Service Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Service</label>
            <div className="glass-card p-4 flex items-center gap-3 border-primary bg-primary/5 glow-teal">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-heading font-semibold text-sm">{serviceLabel}</p>
                <p className="text-xs text-muted-foreground">Priced by vehicle category</p>
              </div>
              <span className="font-heading font-bold text-lg text-primary">
                {basePriceStr ? `£${basePriceStr}` : "—"}
              </span>
            </div>
          </motion.div>

          {/* Multiple Add-ons Selection */}
          {addons.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Add-ons (Optional)</label>

              {addons.filter((a) => !selectedAddons.includes(a.addonId)).length > 0 ? (
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (val && !selectedAddons.includes(val)) {
                      setSelectedAddons([...selectedAddons, val]);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Add an add-on..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addons
                      .filter((a) => !selectedAddons.includes(a.addonId))
                      .map((a) => (
                        <SelectItem key={a.addonId} value={a.addonId}>
                          {a.name} (+£{a.price})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground italic">All available add-ons have been selected.</p>
              )}

              {/* Selected Add-ons Display Cards */}
              <AnimatePresence>
                {selectedAddons.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {selectedAddons.map((id) => {
                      const addon = addons.find((a) => a.addonId === id);
                      if (!addon) return null;
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="glass-card p-3 flex items-center justify-between border-primary/20 bg-primary/5 shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{addon.name}</p>
                            {addon.description && (
                              <p className="text-xs text-muted-foreground truncate">{addon.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-2 shrink-0">
                            <span className="text-sm font-bold text-primary">+£{addon.price}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedAddons(selectedAddons.filter((x) => x !== id))}
                              className="h-7 w-7 rounded-lg flex items-center justify-center bg-secondary hover:bg-destructive hover:text-destructive-foreground transition-colors border border-border text-muted-foreground hover:border-destructive/30"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      {/* CORPORATE FLEET BOOKING FLOW */}
      {isCorporateFlow && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <CorporateFleetFields data={corporateData} onChange={setCorporateData} />
        </motion.div>
      )}

      {/* SHARED BOOKING DETAILS (Slots and Address) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Date & Time</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
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
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Service Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter your address in Aberdeen"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-11 pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </motion.div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* SUBMISSION / CONFIRM ACTION */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Button
          variant="hero"
          className="w-full h-12 gap-2"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            "Processing..."
          ) : isCorporateFlow ? (
            <>
              <Send className="h-4 w-4" /> Submit Fleet Request
            </>
          ) : total ? (
            <>
              Continue to Payment · £{total} <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Continue to Payment <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default BookingPage;
