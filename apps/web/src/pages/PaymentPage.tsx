import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { BookingResponse } from "@nexa/shared";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CreditCard, Shield, Check, FileText, AlertTriangle } from "lucide-react";
import { PaymentModal } from "../components/payment/PaymentModal";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";
import { useSettings } from "../contexts/SettingsContext";

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
  const settings = useSettings();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.00");
  const [initing, setIniting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

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
    if (!agreed) {
      setError("Please confirm your agreement to the terms before continuing.");
      return;
    }
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

  // Price breakdown calculations
  const totalVal = parseFloat(booking?.price || "0.00");
  const addonsTotal = booking?.addons?.reduce((sum, a) => sum + parseFloat(a.price), 0) ?? 0;
  const bookingFee = parseFloat(settings.bookingFee || "1.49");
  const baseServicePrice = Math.max(0, totalVal - addonsTotal - bookingFee);

  return (
    <div className="px-4 pt-12 pb-6 space-y-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Checkout & Review</h1>
        <p className="text-sm text-muted-foreground mt-1">Review details and confirm your booking</p>
      </motion.div>

      {/* SUMMARY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 space-y-4 border border-border/80"
      >
        <h2 className="font-heading font-semibold text-sm uppercase tracking-widest text-muted-foreground">
          Booking Summary
        </h2>
        
        {/* DETAILS */}
        <div className="space-y-2 text-xs divide-y divide-border/40">
          <div className="flex justify-between py-2 first:pt-0">
            <span className="text-muted-foreground">Vehicle Details</span>
            <span className="font-semibold">{booking?.vehicleSummary ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">When</span>
            <span className="font-semibold">{formatWhen(booking?.bookingTime)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Location</span>
            <span className="font-semibold text-right max-w-[60%] truncate">{booking?.serviceAddress ?? "—"}</span>
          </div>
        </div>

        {/* PRICING BREAKDOWN */}
        <div className="border-t border-border/50 pt-4 space-y-2.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Mini Valet Service (Tier Base)</span>
            <span>£{baseServicePrice.toFixed(2)}</span>
          </div>

          {booking?.addons && booking.addons.length > 0 && (
            <div className="space-y-1.5 pl-3 border-l border-primary/20">
              {booking.addons.map((a) => (
                <div key={a.addonId} className="flex justify-between text-muted-foreground text-[11px]">
                  <span>+ {a.name}</span>
                  <span>£{parseFloat(a.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <span>Booking & Protection Fee</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Secure</span>
            </span>
            <span>£{bookingFee.toFixed(2)}</span>
          </div>

          <div className="border-t border-border pt-3.5 flex justify-between items-center text-sm font-semibold">
            <span>Total Payable</span>
            <span className="font-heading text-2xl font-bold text-primary">£{totalVal.toFixed(2)}</span>
          </div>
        </div>
      </motion.div>

      {/* LEGAL CONSENT SUMMARY BLOCK */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5 space-y-4 border border-border bg-nexa-bg-deep/40"
      >
        <h3 className="font-heading font-semibold text-sm text-primary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Before you confirm your booking, please confirm:</span>
        </h3>

        <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed pl-1">
          <li className="flex gap-2.5">
            <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
            <span>
              I confirm that the vehicle details I have provided are accurate. I understand that if my vehicle does not match the tier I have selected, I may be asked to pay an additional amount in line with the correct NEXA rate. See{" "}
              <a
                href="https://nexa-autocare.co.uk/classification"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                NEXA Vehicle Classification Guide
              </a>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
            <span>
              I confirm that I have a suitable and safe space available for the service to be carried out at the address provided. I understand that if the space is deemed unsuitable on arrival, my booking may be cancelled and a 70% refund will be issued.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
            <span>
              I confirm that I am the registered owner of the vehicle or have the permission of the registered owner to book this service.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
            <span>
              I agree to the{" "}
              <a
                href="https://nexa-autocare.co.uk/terms"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Nexa Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://nexa-autocare.co.uk/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Privacy Policy
              </a>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
            <span>
              I confirm that I have read the Cancellation Policy: full refund 24h prior, 70% refund if cancelled within 24h of booking slot.
            </span>
          </li>
        </ul>

        {/* AGREEMENT CHECKBOX */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer mt-4 select-none group transition-all duration-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4.5 w-4.5 rounded border-border text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors leading-relaxed">
            By checking this box, you confirm that you have read, understood and agree to all of the terms listed above.
          </span>
        </label>
      </motion.div>

      {/* STRIPE SECURED MEMO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 flex items-center gap-3 border border-border/80"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Pay securely with card</p>
          <p className="text-xs text-muted-foreground">Processed and encrypted by Stripe</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-2 text-xs text-muted-foreground pl-1"
      >
        <Shield className="h-3.5 w-3.5" />
        <span>Secured SSL payment gateway.</span>
      </motion.div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACTION TRIGGERS */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Button
          variant="hero"
          className="w-full h-12 gap-2 text-sm font-bold uppercase tracking-wider"
          onClick={startPayment}
          disabled={initing || !agreed}
        >
          <Check className="h-4 w-4" />
          {initing ? "Preparing Checkout…" : `Confirm & Pay £${totalVal.toFixed(2)}`}
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
