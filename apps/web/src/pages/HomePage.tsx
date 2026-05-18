import { useNavigate } from "react-router-dom";
import { VEHICLE_CATEGORY_LABELS } from "@nexa/shared";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, Car, MapPin, Gift } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useVehicles } from "../hooks/useVehicles";

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vehicles, isLoading } = useVehicles();

  const firstName = user?.firstName ?? user?.displayName ?? "there";

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-heading text-2xl font-bold">Hi, {firstName} 👋</h1>
      </motion.div>

      {/* Quick Book */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 glow-teal"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold">Book a Wash</h2>
            <p className="text-xs text-muted-foreground">Professional detailing at your door</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="hero" className="flex-1 h-11" onClick={() => navigate("/book")}>
            Book Now
          </Button>
          <Button variant="outline" className="flex-1 h-11 gap-2" onClick={() => navigate("/garage", { state: { giftMode: true } })}>
            <Gift className="h-4 w-4" />
            Gift a Wash
          </Button>
        </div>
      </motion.div>

      {/* Vehicles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-lg">Your Vehicles</h2>
          <button
            onClick={() => navigate("/garage")}
            className="text-xs text-primary font-medium"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="glass-card p-4 text-sm text-muted-foreground">Loading your vehicles…</div>
          ) : vehicles.length === 0 ? (
            <button
              onClick={() => navigate("/garage")}
              className="glass-card w-full p-4 text-left text-sm text-muted-foreground"
            >
              No vehicles yet — add one to get started.
            </button>
          ) : (
            vehicles.map((v) => (
              <div key={v.vehicleId} className="glass-card p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Car className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{v.make} {v.model}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.registrationNumber} · {VEHICLE_CATEGORY_LABELS[v.vehicleType]}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Coverage Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Service Area</h3>
        </div>
        <div className="h-32 rounded-lg bg-secondary/50 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Aberdeen, Scotland</p>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;
