import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Car, CalendarCheck, ShieldCheck, CreditCard, Camera, Smartphone, ArrowRight } from "lucide-react";

// lucide-react v1 removed brand glyphs; inline minimal marks for the social footer.
const brandSvg = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

const Linkedin = ({ className }: { className?: string }) => (
  <svg {...brandSvg} fill="currentColor" className={className}>
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.3c0-1.26-.02-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.8V21h-4z" />
  </svg>
);

const Instagram = ({ className }: { className?: string }) => (
  <svg {...brandSvg} fill="none" stroke="currentColor" strokeWidth={2} className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const Facebook = ({ className }: { className?: string }) => (
  <svg {...brandSvg} fill="currentColor" className={className}>
    <path d="M13 22v-8h2.7l.4-3H13V9.1c0-.87.24-1.46 1.48-1.46H16.6V5a21 21 0 0 0-2.3-.12c-2.3 0-3.87 1.4-3.87 3.98V11H8v3h2.43v8z" />
  </svg>
);
import heroImage from "@/assets/hero-detailing.jpg";
import nexaLogo from "@/assets/nexa-logo.png";
import ctaAbstract from "@/assets/cta-abstract.jpg";
import ServiceBreakdownSection from "@/components/ServiceBreakdownSection";
import FAQSection from "@/components/FAQSection";

const steps = [
  { icon: Car, title: "Register Your Car", desc: "Add your vehicle details in seconds." },
  { icon: CalendarCheck, title: "Book a Wash", desc: "Pick a date, time, and service." },
  { icon: ShieldCheck, title: "We Come to You", desc: "A professional detailer arrives at your door." },
];

const benefits = [
  { icon: ShieldCheck, title: "Trusted Professionals", desc: "Vetted and experienced detailing experts." },
  { icon: CreditCard, title: "Secure Payments", desc: "Pay safely online via Stripe." },
  { icon: Camera, title: "Photo Proof", desc: "Before & after photos of every service." },
  { icon: Smartphone, title: "Mobile Booking", desc: "Book and track from your phone." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button variant="default" size="sm" onClick={() => navigate("/signup")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-16 pb-12">
        <div className="mx-auto max-w-5xl text-center md:text-left md:flex md:items-center md:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 space-y-5"
          >
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Premium Car Detailing —{" "}
              <span className="text-gradient">Delivered to Your Door</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto md:mx-0">
              Book trusted detailing professionals in minutes. Available now in Aberdeen, Scotland.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                variant="hero"
                size="lg"
                className="w-full sm:w-auto h-12 text-base"
                onClick={() => navigate("/signup")}
              >
                Book a Wash <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto h-12"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </div>
          </motion.div>

          {/* Hero visual placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-10 md:mt-0 flex-1"
          >
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <img
                src={heroImage}
                alt="Professional car detailing service"
                className="w-full h-auto object-cover aspect-[4/3]"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-12 bg-card/40">
        <div className="mx-auto max-w-5xl">
          <h3 className="font-heading text-2xl font-bold text-center mb-8">
            How It Works
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass-card p-6 text-center space-y-3"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-semibold text-primary">Step {i + 1}</p>
                <h4 className="font-heading font-semibold">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Breakdown */}
      <ServiceBreakdownSection />

      {/* Benefits */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h3 className="font-heading text-2xl font-bold text-center mb-8">
            Why Choose <span className="text-gradient">NEXA</span>
          </h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass-card p-5 text-center space-y-2"
              >
                <b.icon className="h-6 w-6 text-primary mx-auto" />
                <h4 className="font-heading text-sm font-semibold">{b.title}</h4>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
      <section className="relative px-4 py-16 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-lg glass-card glow-teal p-8 text-center space-y-4"
        >
          <h3 className="font-heading text-2xl font-bold">
            Ready to get started?
          </h3>
          <p className="text-sm text-muted-foreground">
            Join NEXA today and experience premium car care.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
            <Button variant="hero" size="lg" className="w-full sm:w-auto h-12" onClick={() => navigate("/signup")}>
              Create an Account <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto h-12" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-3">
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Linkedin className="h-5 w-5" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
            <Facebook className="h-5 w-5" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 NEXA. All rights reserved. Aberdeen, Scotland.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
