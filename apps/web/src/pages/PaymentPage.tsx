import { useState, useRef, type ReactNode } from "react";
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

function parseBoldText(text: string): ReactNode[] {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    const plain = text.substring(lastIndex, match.index);
    if (plain) {
      parts.push(plain);
    }
    parts.push(<strong key={`bold-${match.index}`} className="font-semibold text-foreground">{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }

  const remaining = text.substring(lastIndex);
  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

function parseInlineElements(text: string): ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const plainText = text.substring(lastIndex, match.index);
    if (plainText) {
      parts.push(...parseBoldText(plainText));
    }
    const label = match[1];
    const url = match[2];
    parts.push(
      <a
        key={`link-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-semibold"
      >
        {label}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  const remaining = text.substring(lastIndex);
  if (remaining) {
    parts.push(...parseBoldText(remaining));
  }

  return parts;
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { bookingId?: string } };
  const bookingId = location.state?.bookingId;
  const settings = useSettings();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.00");
  const [initing, setIniting] = useState(false);
  const initingRef = useRef(false);
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
    if (!agreed || initingRef.current) {
      if (!agreed) {
        setError("Please confirm your agreement to the terms before continuing.");
      }
      return;
    }
    initingRef.current = true;
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
      initingRef.current = false;
      setIniting(false);
    }
  };

  // Price breakdown calculations
  const totalVal = parseFloat(booking?.price || "0.00");
  const addonsTotal = booking?.addons?.reduce((sum, a) => sum + parseFloat(a.price), 0) ?? 0;
  const bookingFee = parseFloat(settings.bookingFee || "1.49");
  const baseServicePrice = Math.max(0, totalVal - addonsTotal - bookingFee);

  // Dynamic Terms & Conditions parsing
  const lines = (settings.termsAndConditions || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let parsedTitle = "Before you confirm your booking, please confirm:";
  const listItems: string[] = [];

  lines.forEach((line) => {
    const match = line.match(/^[-*+]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
    if (match) {
      listItems.push(match[1]);
    } else if (line.startsWith("#")) {
      parsedTitle = line.replace(/^#+\s+/, "");
    } else {
      if (listItems.length === 0) {
        parsedTitle = line;
      }
    }
  });

  const hasListItems = listItems.length > 0;

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
            <span>{settings.serviceLabelFor()} (Tier Base)</span>
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
          <span>{parsedTitle}</span>
        </h3>

        {hasListItems ? (
          <ul className="space-y-3">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{parseInlineElements(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-2">
            {settings.termsAndConditions || "No terms and conditions configured."}
          </div>
        )}

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
