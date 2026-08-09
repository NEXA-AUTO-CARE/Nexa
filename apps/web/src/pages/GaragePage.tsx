import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import type { CreateCorporateFleetEnquiryDto, CreateVehicleDto } from "@nexa/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Plus, X, Truck, Send, Trash2, Droplets, Gift } from "lucide-react";
import VehicleCategorySelector, {
  type VehicleCategoryId,
  buildCategories,
} from "@/components/VehicleCategorySelector";
import CorporateFleetFields, { type CorporateFleetData } from "@/components/CorporateFleetFields";
import GiftRecipientFields, { type GiftRecipientData } from "@/components/GiftRecipientFields";
import { useToast } from "@/hooks/use-toast";
import { useVehicles } from "../hooks/useVehicles";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";



const emptyCorporateData: CorporateFleetData = {
  companyName: "",
  fleetSize: "",
  contactPerson: "",
  businessEmail: "",
  businessPhone: "",
};

const emptyGiftData: GiftRecipientData = {
  fullName: "",
  email: "",
  telephone: "",
  address: "",
};

const GaragePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vehicles, isLoading, refetch } = useVehicles();
  const { toast } = useToast();
  const { vehicleCategories, priceFor, labelFor, descriptionFor, numericPriceFor } = useSettings();

  const [showForm, setShowForm] = useState(false);
  const [isGiftMode, setIsGiftMode] = useState(false);
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategoryId | null>(null);
  const [corporateData, setCorporateData] = useState<CorporateFleetData>(emptyCorporateData);
  const [giftData, setGiftData] = useState<GiftRecipientData>(emptyGiftData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if ((location.state as { giftMode?: boolean } | null)?.giftMode) {
      // Defer to avoid synchronous setState in effect body
      Promise.resolve().then(() => {
        setIsGiftMode(true);
        setShowForm(true);
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const isCorporate = selectedCategory === "corporate_fleet";
  const allCategories = buildCategories(vehicleCategories, labelFor, descriptionFor, priceFor, numericPriceFor);
  const categoryMeta = selectedCategory
    ? allCategories.find((c) => c.id === selectedCategory)!
    : null;

  const resetForm = () => {
    setPlate("");
    setMake("");
    setModel("");
    setSelectedCategory(null);
    setCorporateData(emptyCorporateData);
    setGiftData(emptyGiftData);
    setIsGiftMode(false);
    setShowForm(false);
  };

  const canSubmit = () => {
    if (!selectedCategory || submitting) return false;
    if (isCorporate) {
      return !!(corporateData.companyName && corporateData.contactPerson && corporateData.businessEmail);
    }
    const vehicleValid = !!(plate && make && model);
    if (isGiftMode) {
      return vehicleValid && !!(giftData.fullName && giftData.email && giftData.telephone && giftData.address);
    }
    return vehicleValid;
  };

  const handleAdd = async () => {
    if (!canSubmit() || !categoryMeta) return;

    // TODO(api): gift bookings have no backend yet — mock confirmation only.
    if (isGiftMode) {
      toast({
        title: "Gift wash sent 🎁",
        description: `A wash gift for the ${make} ${model} has been sent to ${giftData.fullName}.`,
      });
      resetForm();
      return;
    }

    setSubmitting(true);
    try {
      if (isCorporate) {
        const dto: CreateCorporateFleetEnquiryDto = {
          companyName: corporateData.companyName,
          fleetSize: Number(corporateData.fleetSize) || 1,
          contactPerson: corporateData.contactPerson,
          businessEmail: corporateData.businessEmail,
          businessPhone: corporateData.businessPhone,
        };
        await api.post("/corporate-fleet", dto);
        toast({
          title: "Fleet request submitted",
          description: "Our team will follow up with pricing and invoicing details.",
        });
      } else {
        const dto: CreateVehicleDto = {
          registrationNumber: plate,
          make,
          model,
          vehicleType: selectedCategory as string,
        };
        await api.post("/vehicles", dto);
        await refetch();
        toast({
          title: "Vehicle added",
          description: `${make} ${model} has been added to your garage.`,
        });
      }
      resetForm();
    } catch (err) {
      toast({ title: "Something went wrong", description: describeError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    try {
      await api.delete(`/vehicles/${id}`);
      await refetch();
      toast({ title: "Vehicle removed", description: `${name} has been removed from your garage.` });
    } catch (err) {
      toast({ title: "Could not remove vehicle", description: describeError(err) });
    }
  };

  const inputClass = "h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground";

  return (
    <div className="px-4 pt-12 pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">My Garage</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              setIsGiftMode(true);
              setShowForm(true);
            }}
          >
            <Gift className="h-4 w-4" />
            Gift
          </Button>
          <Button size="sm" onClick={() => (showForm ? resetForm() : setShowForm(true))} className="gap-1">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <VehicleCategorySelector selected={selectedCategory} onSelect={setSelectedCategory} />

            <AnimatePresence>
              {selectedCategory && !isCorporate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle Details</p>
                    <Input
                      placeholder="Registration (e.g. AB23 XYZ)"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      className={inputClass}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Make"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        className={inputClass}
                      />
                      <Input
                        placeholder="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isCorporate && <CorporateFleetFields data={corporateData} onChange={setCorporateData} />}
            </AnimatePresence>

            {selectedCategory && !isCorporate && (
              <GiftRecipientFields data={giftData} onChange={setGiftData} disabled={!isGiftMode} />
            )}

            <Button
              variant="hero"
              className="w-full h-12 gap-2"
              onClick={handleAdd}
              disabled={!canSubmit()}
            >
              {isCorporate ? (
                <>
                  <Send className="h-4 w-4" />
                  Submit Fleet Request
                </>
              ) : isGiftMode ? (
                <>
                  <Gift className="h-4 w-4" />
                  Send Gift Wash
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Vehicle{categoryMeta ? ` · ${categoryMeta.priceLabel}` : ""}
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vehicle list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-card p-4 text-sm text-muted-foreground">Loading your vehicles…</div>
        ) : vehicles.length === 0 ? (
          <div className="glass-card p-6 text-center text-sm text-muted-foreground">
            No vehicles yet — add your first to book a wash.
          </div>
        ) : (
          vehicles.map((v, i) => (
            <motion.div
              key={v.vehicleId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                  <span className="text-muted-foreground">
                    {v.vehicleType?.toLowerCase().includes("van") ? (
                      <Truck className="h-5 w-5" />
                    ) : (
                      <Car className="h-5 w-5" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold">
                    {v.make} {v.model}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {v.registrationNumber} · {labelFor(v.vehicleType)}
                  </p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-secondary text-muted-foreground">
                  £{priceFor(v.vehicleType)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="hero"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => navigate(`/book?vehicleId=${v.vehicleId}`)}
                >
                  <Droplets className="h-3.5 w-3.5" />
                  Book a Wash
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => handleRemove(v.vehicleId, `${v.make} ${v.model}`)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default GaragePage;
