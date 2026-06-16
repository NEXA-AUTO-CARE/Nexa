import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronLeft, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import nexaLogo from "@/assets/nexa-logo.png";
import ctaAbstract from "@/assets/cta-abstract.jpg";

const CancellationPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-12">
      <img
        src={ctaAbstract}
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        aria-hidden="true"
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <img src={nexaLogo} alt="NEXA" className="h-6 w-auto" />
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 pt-12 space-y-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Cancellation & Refund Policy
          </h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: June 15, 2026. NEXA AutoCare Marketplace.
          </p>
        </motion.div>

        {/* Overview Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card glow-teal p-6 border border-primary/20 space-y-4"
        >
          <h2 className="font-heading text-lg font-bold flex items-center gap-2 text-primary">
            <Clock className="h-5 w-5 text-primary" /> Key Summary
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We understand that plans change. To support our network of professional detailers, we maintain a balanced cancellation policy. Please review our timeline requirements and associated refund structures below.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="flex gap-3 items-start p-3 rounded-xl bg-primary/5 border border-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Free Cancellations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cancel up to <strong>24 hours prior</strong> to your appointment slot for a full refund (100%).
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Late Cancellations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cancellations within <strong>24 hours</strong> of the slot receive a <strong>70% refund</strong> (30% retention fee).
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Detailed Sections */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 text-sm text-muted-foreground leading-relaxed"
        >
          <div className="space-y-2">
            <h3 className="font-heading text-base font-bold text-foreground">1. How to Cancel or Reschedule</h3>
            <p>
              You can cancel or request a schedule change directly through your customer dashboard on the NEXA app:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 mt-2">
              <li>Navigate to your active bookings.</li>
              <li>Select the specific wash order you need to cancel.</li>
              <li>Click the <strong>Cancel Booking</strong> button.</li>
              <li>Confirm your cancellation on the dialog box.</li>
            </ol>
            <p className="mt-2">
              Alternatively, you can contact our support team at <span className="text-foreground">support@nexaautocare.com</span>.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-base font-bold text-foreground">2. Refund Processing</h3>
            <p>
              Eligible refunds are automatically initiated to the original payment method used during checkout (Stripe-powered transactions). Please note that bank processing times typically take <strong>5 to 10 business days</strong> to reflect in your account.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-base font-bold text-foreground">3. Weather & Force Majeure</h3>
            <p>
              NEXA detailers operate outdoors. In cases of extreme weather conditions (heavy storms, amber weather warnings, sub-zero temperatures) where the detailing service cannot be safely performed, NEXA or the assigned detailer may cancel the booking. In such events, a <strong>100% full refund</strong> is issued immediately, and we will assist you in rescheduling.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-base font-bold text-foreground">4. Space and Accessibility Requirements</h3>
            <p>
              As confirmed at checkout, customers must provide a safe and suitable off-road space (e.g. driveway or private parking bay) for the detailing service. If a detailer arrives and the space is deemed unsafe or inaccessible, the booking will be cancelled and a <strong>70% refund</strong> will be issued.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default CancellationPolicyPage;
