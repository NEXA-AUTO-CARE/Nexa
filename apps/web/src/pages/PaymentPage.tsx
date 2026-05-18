import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { BookingResponse } from "@nexa/shared";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CreditCard, Shield, Check } from "lucide-react";
import { PaymentModal } from "../components/payment/PaymentModal";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { bookingId?: string } };
  const bookingId = location.state?.bookingId;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.00");
  const [initing, setIniting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: booking } = useQuery<BookingResponse>({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data } = await api.get<BookingResponse>(`/bookings/${bookingId}`);
      return data;
    },
    enabled: !!bookingId,
  });

  if (!bookingId) return <Navigate to="/book" replace />;

  const startPayment = async () => {
    setIniting(true);
    setError(null);
    try {
      const { data } = await api.post<{ clientSecret: string; amount: string }>("/payments/intent", {
        bookingId,
      });
      setClientSecret(data.clientSecret);
      setAmount(data.amount);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIniting(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Payment</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and confirm your booking</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="font-heading font-semibold">Booking Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicle</span>
            <span>{booking?.vehicleSummary ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service</span>
            <span>Mini Valet & Spray Polish</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">When</span>
            <span>{formatWhen(booking?.bookingTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="text-right max-w-[60%] truncate">{booking?.serviceAddress ?? "—"}</span>
          </div>
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="font-heading font-semibold">Total</span>
          <span className="font-heading text-2xl font-bold text-primary">£{booking?.price ?? "—"}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Pay securely with card</p>
          <p className="text-xs text-muted-foreground">Processed by Stripe</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Shield className="h-3.5 w-3.5" />
        <span>Secured by Stripe. Your data is encrypted.</span>
      </motion.div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Button variant="hero" className="w-full h-12" onClick={startPayment} disabled={initing}>
          <Check className="h-4 w-4" />
          {initing ? "Preparing…" : `Confirm & Pay £${booking?.price ?? ""}`}
        </Button>
      </motion.div>

      {clientSecret && (
        <PaymentModal
          clientSecret={clientSecret}
          amount={amount}
          onSuccess={() => {
            setClientSecret(null);
            navigate("/bookings");
          }}
          onCancel={() => setClientSecret(null)}
        />
      )}
    </div>
  );
};

export default PaymentPage;
