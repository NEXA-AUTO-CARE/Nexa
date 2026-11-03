import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  isValidPhoneNumber,
  sanitizePhoneInput,
  type BookingResponse,
  type CreateBatchBookingDto,
  type CreateBookingDto,
  type CreateCorporateFleetEnquiryDto,
} from "@nexa/shared";
import { useSettings } from "../contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Check, CheckCircle2, ChevronRight, Phone, Send, Sparkles, X, Car } from "lucide-react";
import { AddressFinder } from "@ideal-postcodes/react";
import "@ideal-postcodes/react/css/address-finder.min.css";
import { useAuth } from "../contexts/AuthContext";
import { useAddons } from "../hooks/useAddons";
import { useVehicles } from "../hooks/useVehicles";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";
import { useToast } from "@/hooks/use-toast";
import CorporateFleetFields, { type CorporateFleetData } from "@/components/CorporateFleetFields";


const BookingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { vehicles, isLoading } = useVehicles();
  const { addons } = useAddons();
  const { toast } = useToast();
  const { priceFor, labelFor, serviceLabelFor, customerTypes = ["Individual", "Corporate"], timeSlots = [], blockedDates = [] } = useSettings();

  const serviceLabel = serviceLabelFor();

  const showCorporateTab = customerTypes.some((t) => t.toLowerCase() === "corporate");
  const showIndividualTab = customerTypes.some((t) => t.toLowerCase() === "individual");

  // Determine initial customer type based on allowed types
  const initialType = showIndividualTab ? "Individual" : "Corporate";
  const [customerType, setCustomerType] = useState<string>(initialType);

  const initialVehicleIds = useMemo(() => {
    const multi = searchParams.get("vehicleIds");
    if (multi) {
      return multi.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const single = searchParams.get("vehicleId");
    return single ? [single] : [];
  }, [searchParams]);

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(initialVehicleIds);
  const [addonsByVehicle, setAddonsByVehicle] = useState<Record<string, string[]>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phoneNumber ?? "");
  const [corporateData, setCorporateData] = useState<CorporateFleetData>({
    companyName: "",
    fleetSize: "1",
    contactPerson: "",
    businessEmail: "",
    businessPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualAddress, setShowManualAddress] = useState(!import.meta.env.VITE_IDEAL_POSTCODES_API_KEY);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [postTown, setPostTown] = useState("");
  const [postcodeVal, setPostcodeVal] = useState("");
  const [uprnVal, setUprnVal] = useState("");
  const [latVal, setLatVal] = useState<number | null>(null);
  const [lonVal, setLonVal] = useState<number | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const isCorporateFlow = customerType === "Corporate";

  const effectiveVehicleIds = useMemo(() => {
    const validSelected = selectedVehicleIds.filter((id) =>
      vehicles.some((v) => v.vehicleId === id),
    );
    if (validSelected.length > 0) return validSelected;
    return vehicles[0] ? [vehicles[0].vehicleId] : [];
  }, [selectedVehicleIds, vehicles]);

  const selectedVehiclesList = useMemo(
    () =>
      effectiveVehicleIds
        .map((id) => vehicles.find((v) => v.vehicleId === id))
        .filter((v): v is NonNullable<typeof v> => !!v),
    [effectiveVehicleIds, vehicles],
  );

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicleIds((prev) => {
      const current =
        prev.filter((id) => vehicles.some((v) => v.vehicleId === id)).length > 0
          ? prev.filter((id) => vehicles.some((v) => v.vehicleId === id))
          : vehicles[0]
            ? [vehicles[0].vehicleId]
            : [];
      if (current.includes(vehicleId)) {
        if (current.length === 1) return current; // Keep at least 1 selected
        return current.filter((id) => id !== vehicleId);
      }
      return [...current, vehicleId];
    });
  };

  const addAddonForVehicle = (vehicleId: string, addonId: string) => {
    setAddonsByVehicle((prev) => {
      const current = prev[vehicleId] ?? [];
      if (current.includes(addonId)) return prev;
      return { ...prev, [vehicleId]: [...current, addonId] };
    });
  };

  const removeAddonForVehicle = (vehicleId: string, addonId: string) => {
    setAddonsByVehicle((prev) => {
      const current = prev[vehicleId] ?? [];
      return { ...prev, [vehicleId]: current.filter((id) => id !== addonId) };
    });
  };

  const baseServiceTotal = useMemo(() => {
    if (selectedVehiclesList.length === 0) return null;
    let sum = 0;
    for (const v of selectedVehiclesList) {
      const p = priceFor(v.vehicleType);
      if (p === undefined) return null;
      sum += Number(p);
    }
    return sum;
  }, [selectedVehiclesList, priceFor]);

  const hasPrice = baseServiceTotal !== null;

  const total = useMemo(() => {
    if (baseServiceTotal === null) return null;
    const addonsPrice = selectedVehiclesList.reduce((vehSum, v) => {
      const vehAddonIds = addonsByVehicle[v.vehicleId] ?? [];
      const vAddons = vehAddonIds.reduce((sum, id) => {
        const addon = addons.find((a) => a.addonId === id);
        return sum + (addon ? Number(addon.price) : 0);
      }, 0);
      return vehSum + vAddons;
    }, 0);
    return (baseServiceTotal + addonsPrice).toFixed(2);
  }, [baseServiceTotal, selectedVehiclesList, addonsByVehicle, addons]);

  const isSelectedDateBlocked = !!date && blockedDates.some((b) => b.date === date);

  const availableTimeSlots = useMemo(() => {
    if (!date) return timeSlots;
    if (isSelectedDateBlocked) return [];
    const nowPlus48Hours = Date.now() + 48 * 60 * 60 * 1000 - 60000;
    return timeSlots.filter((slot) => {
      const slotTime = new Date(`${date}T${String(slot.hour).padStart(2, "0")}:00:00`).getTime();
      return slotTime >= nowPlus48Hours;
    });
  }, [date, timeSlots, isSelectedDateBlocked]);

  const minDateString = useMemo(() => {
    const now = new Date();
    const fortyEightHours = new Date(Date.now() + 172800000); // 48 hours from now
    const sixthDay = new Date(now.getFullYear(), now.getMonth(), 6); // 6th day of the current month
    
    // Pick whichever is later: 48 hours from now, or the 6th day of the month
    const minDate = new Date(Math.max(fortyEightHours.getTime(), sixthDay.getTime()));
    return minDate.toISOString().split("T")[0];
  }, []);

  // Clear time if it's no longer valid for the selected date
  useEffect(() => {
    if (time && !availableTimeSlots.find((s) => s.key === time)) {
      setTime("");
    }
  }, [time, availableTimeSlots]);

  const servicePhoneValid = isValidPhoneNumber(phone);
  const servicePhoneInvalid = phone.trim().length > 0 && !servicePhoneValid;
  const businessPhoneValid = isValidPhoneNumber(corporateData.businessPhone);

  const canSubmit = isSelectedDateBlocked
    ? false
    : isCorporateFlow
    ? !!(
        corporateData.companyName &&
        corporateData.contactPerson &&
        corporateData.businessEmail &&
        businessPhoneValid &&
        servicePhoneValid &&
        date &&
        time &&
        address.trim() &&
        addressConfirmed
      ) && !submitting
    : effectiveVehicleIds.length > 0 &&
      hasPrice &&
      !!date &&
      !!time &&
      address.trim().length > 0 &&
      addressConfirmed &&
      servicePhoneValid &&
      !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const selectedSlot = timeSlots.find((s) => s.key === time);
      const hour = selectedSlot ? selectedSlot.hour : 9;
      const bookingTime = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).toISOString();

      if (isCorporateFlow) {
        const dto: CreateCorporateFleetEnquiryDto = {
          companyName: corporateData.companyName,
          fleetSize: Number(corporateData.fleetSize) || 1,
          contactPerson: corporateData.contactPerson,
          businessEmail: corporateData.businessEmail,
          businessPhone: corporateData.businessPhone.trim(),
        };
        await api.post("/corporate-fleet", dto);
        toast({
          title: "Corporate Fleet Request Submitted! 🏢",
          description: "Our admin team will raise a custom invoice and get in touch with you shortly.",
        });
        navigate("/bookings");
      } else if (effectiveVehicleIds.length === 1) {
        const singleId = effectiveVehicleIds[0];
        const dto: CreateBookingDto = {
          vehicleId: singleId,
          bookingTime,
          serviceAddress: address.trim(),
          servicePhone: phone.trim(),
          addonIds: addonsByVehicle[singleId] ?? [],
          agreedSafeSpace: true,
          agreedDetailsCorrect: true,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          addressLine3: addressLine3 || null,
          postTown: postTown || null,
          postcode: postcodeVal || null,
          uprn: uprnVal || null,
          latitude: latVal,
          longitude: lonVal,
        };
        const { data } = await api.post<BookingResponse>("/bookings", dto);
        navigate("/payment", { state: { bookingId: data.bookingId, bookingIds: [data.bookingId] } });
      } else {
        const batchDto: CreateBatchBookingDto = {
          vehicles: effectiveVehicleIds.map((vehicleId) => ({
            vehicleId,
            addonIds: addonsByVehicle[vehicleId] ?? [],
          })),
          bookingTime,
          serviceAddress: address.trim(),
          servicePhone: phone.trim(),
          agreedSafeSpace: true,
          agreedDetailsCorrect: true,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          addressLine3: addressLine3 || null,
          postTown: postTown || null,
          postcode: postcodeVal || null,
          uprn: uprnVal || null,
          latitude: latVal,
          longitude: lonVal,
        };
        const { data } = await api.post<BookingResponse[]>("/bookings/batch", batchDto);
        const createdIds = data.map((b) => b.bookingId);
        navigate("/payment", {
          state: { bookingId: createdIds[0], bookingIds: createdIds },
        });
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-28 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Book a Wash</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule your detailing service. Bookings require a minimum 48-hour notice.</p>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Select Vehicle{vehicles.length > 1 ? "(s)" : ""}
              </label>
              {vehicles.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedVehicleIds(
                      effectiveVehicleIds.length === vehicles.length
                        ? [vehicles[0].vehicleId]
                        : vehicles.map((v) => v.vehicleId),
                    )
                  }
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {effectiveVehicleIds.length === vehicles.length ? "Select Single" : "Select All"}
                </button>
              )}
            </div>
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
                vehicles.map((v) => {
                  const isSelected = effectiveVehicleIds.includes(v.vehicleId);
                  return (
                    <button
                      key={v.vehicleId}
                      type="button"
                      onClick={() => toggleVehicle(v.vehicleId)}
                      className={`w-full glass-card p-3 flex items-center gap-3 transition-all ${
                        isSelected ? "border-primary bg-primary/5 glow-teal" : ""
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </div>
                      <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {v.make} {v.model}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.registrationNumber} · {labelFor(v.vehicleType)}
                        </p>
                      </div>
                      <span className="text-xs font-heading font-bold text-primary shrink-0">
                        £{priceFor(v.vehicleType)}
                      </span>
                    </button>
                  );
                })
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
                <p className="font-heading font-semibold text-sm">
                  {serviceLabel}
                  {selectedVehiclesList.length > 1 ? ` × ${selectedVehiclesList.length} Vehicles` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedVehiclesList.length > 1
                    ? "Combined tier pricing · Single checkout booking fee"
                    : "Priced by vehicle category"}
                </p>
              </div>
              <span className="font-heading font-bold text-lg text-primary">
                {baseServiceTotal !== null ? `£${baseServiceTotal.toFixed(2)}` : "—"}
              </span>
            </div>
          </motion.div>

          {/* Per-Vehicle Add-ons Selection */}
          {addons.length > 0 && selectedVehiclesList.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                Add-ons (Optional{selectedVehiclesList.length > 1 ? " · Per Vehicle" : ""})
              </label>

              <div className="space-y-3">
                {selectedVehiclesList.map((v) => {
                  const vehicleAddons = addonsByVehicle[v.vehicleId] ?? [];
                  const availableAddons = addons.filter((a) => !vehicleAddons.includes(a.addonId));
                  return (
                    <div
                      key={v.vehicleId}
                      className={
                        selectedVehiclesList.length > 1
                          ? "glass-card p-3.5 space-y-2.5 border border-border/80"
                          : "space-y-2.5"
                      }
                    >
                      {selectedVehiclesList.length > 1 && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-heading font-semibold text-foreground">
                            {v.make} {v.model} ({v.registrationNumber})
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {vehicleAddons.length} selected
                          </span>
                        </div>
                      )}

                      {availableAddons.length > 0 ? (
                        <Select
                          value=""
                          onValueChange={(val) => {
                            if (val) addAddonForVehicle(v.vehicleId, val);
                          }}
                        >
                          <SelectTrigger className="h-11 bg-secondary border-border text-foreground">
                            <SelectValue
                              placeholder={
                                selectedVehiclesList.length > 1
                                  ? `Add an add-on for ${v.make} ${v.model}...`
                                  : "Add an add-on..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAddons.map((a) => (
                              <SelectItem key={a.addonId} value={a.addonId}>
                                {a.name} (+£{a.price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          All available add-ons have been selected.
                        </p>
                      )}

                      <AnimatePresence>
                        {vehicleAddons.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {vehicleAddons.map((id) => {
                              const addon = addons.find((a) => a.addonId === id);
                              if (!addon) return null;
                              return (
                                <motion.div
                                  key={`${v.vehicleId}-${id}`}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="glass-card p-3 flex items-center justify-between border-primary/20 bg-primary/5 shadow-sm"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{addon.name}</p>
                                    {addon.description && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {addon.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 ml-2 shrink-0">
                                    <span className="text-sm font-bold text-primary">+£{addon.price}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeAddonForVehicle(v.vehicleId, id)}
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
                    </div>
                  );
                })}
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative w-full min-w-0 max-w-full">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="date"
                value={date}
                min={minDateString}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 pl-9 bg-secondary border-border text-foreground w-full min-w-0 max-w-full box-border"
              />
            </div>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="h-11 bg-secondary border-border text-foreground w-full min-w-0 max-w-full">
                <SelectValue placeholder={availableTimeSlots.length === 0 ? "No available times" : "Select time"} />
              </SelectTrigger>
              <SelectContent>
                {availableTimeSlots.map((slot) => (
                  <SelectItem key={slot.key} value={slot.key}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isSelectedDateBlocked && (
            <p className="mt-2 text-xs text-destructive">
              We&apos;re not taking bookings on this date. Please choose another day.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Service Address</label>
          
          {/* Confirmed Address View */}
          {addressConfirmed && (
            <div className="glass-card p-4 border border-primary bg-primary/5 shadow-sm rounded-xl relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Service Address Verified</p>
                  <p className="text-sm font-semibold text-foreground mt-1 leading-snug">{address}</p>
                  {uprnVal && <p className="text-xs text-muted-foreground mt-1">UPRN: {uprnVal}</p>}
                  {latVal && lonVal && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Coordinates: {Number(latVal).toFixed(4)}, {Number(lonVal).toFixed(4)}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddressConfirmed(false);
                    setAddress("");
                    setAddressLine1("");
                    setAddressLine2("");
                    setAddressLine3("");
                    setPostTown("");
                    setPostcodeVal("");
                    setUprnVal("");
                    setLatVal(null);
                    setLonVal(null);
                  }}
                  className="text-xs border-border hover:bg-secondary text-muted-foreground"
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Manual Address View */}
          {!addressConfirmed && showManualAddress && (
            <div className="glass-card p-4 border border-border bg-secondary/10 space-y-3 rounded-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Manual Address Entry</h3>
                <button
                  type="button"
                  onClick={() => setShowManualAddress(false)}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Use Postcode Lookup
                </button>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Address Line 1 *</label>
                  <Input
                    placeholder="e.g. Flat 1, 15 Union Street"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="h-10 bg-secondary border-border text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Address Line 2 (Optional)</label>
                  <Input
                    placeholder="e.g. Locality"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="h-10 bg-secondary border-border text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Address Line 3 (Optional)</label>
                  <Input
                    placeholder="e.g. Area"
                    value={addressLine3}
                    onChange={(e) => setAddressLine3(e.target.value)}
                    className="h-10 bg-secondary border-border text-foreground text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Town/City *</label>
                    <Input
                      placeholder="e.g. Aberdeen"
                      value={postTown}
                      onChange={(e) => setPostTown(e.target.value)}
                      className="h-10 bg-secondary border-border text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">Postcode *</label>
                    <Input
                      placeholder="e.g. AB10 1AB"
                      value={postcodeVal}
                      onChange={(e) => setPostcodeVal(e.target.value)}
                      className="h-10 bg-secondary border-border text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="hero"
                size="sm"
                className="w-full mt-2"
                disabled={!addressLine1.trim() || !postTown.trim() || !postcodeVal.trim()}
                onClick={() => {
                  const formatted = [
                    addressLine1.trim(),
                    addressLine2.trim(),
                    addressLine3.trim(),
                    postTown.trim(),
                    postcodeVal.trim().toUpperCase()
                  ].filter(Boolean).join(", ");
                  setAddress(formatted);
                  setAddressConfirmed(true);
                  setPostcodeVal(postcodeVal.trim().toUpperCase());
                  setShowManualAddress(false);
                }}
              >
                Confirm Manual Address
              </Button>
            </div>
          )}

          {/* Postcode Lookup View (AddressFinder) */}
          <div className={addressConfirmed || showManualAddress ? "hidden" : "space-y-3"}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <AddressFinder
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-foreground idpc-input-override"
                  placeholder="Start typing your address..."
                  apiKey={import.meta.env.VITE_IDEAL_POSTCODES_API_KEY || ""}
                  onAddressRetrieved={(addr: any) => {
                    setTimeout(() => {
                      setAddressLine1(addr.line_1 || "");
                      setAddressLine2(addr.line_2 || "");
                      setAddressLine3(addr.line_3 || "");
                      setPostTown(addr.post_town || "");
                      setPostcodeVal(addr.postcode || "");
                      setUprnVal(addr.uprn || "");
                      setLatVal(addr.latitude ?? null);
                      setLonVal(addr.longitude ?? null);

                      const formatted = [
                        addr.line_1,
                        addr.line_2,
                        addr.line_3,
                        addr.post_town,
                        addr.postcode,
                      ]
                        .filter(Boolean)
                        .join(", ");
                      setAddress(formatted);
                      setAddressConfirmed(true);
                    }, 0);
                  }}
                  onFailedCheck={() => setShowManualAddress(true)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => {
                  setShowManualAddress(true);
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline"
              >
                Or enter address manually
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Service Phone Number *</label>
          <div className="relative w-full min-w-0 max-w-full">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              type="tel"
              inputMode="tel"
              placeholder="Enter your phone number (e.g. +447700900077)"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              className={`h-11 pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground w-full min-w-0 max-w-full box-border ${
                servicePhoneInvalid ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
          </div>
          {servicePhoneInvalid && (
            <p className="text-xs text-destructive">
              Please enter a valid phone number (7–15 digits, e.g. +447700900077 or 07700900077).
            </p>
          )}
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
