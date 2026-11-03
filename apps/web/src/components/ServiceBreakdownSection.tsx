import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSettings } from "../contexts/SettingsContext";

import {
  ArrowRight,
  Droplets,
  Sparkles,
  CircleDot,
  DoorOpen,
  Wind,
  Armchair,
  LayoutDashboard,
  Flower2,
  FileText,
  Car,
  Truck,
  Building2,
} from "lucide-react";

const services = [
  { icon: Droplets, label: "Hand wash" },
  { icon: Sparkles, label: "Wax & Dry" },
  { icon: CircleDot, label: "Wheels cleaned" },
  { icon: Wind, label: "Windows cleaned" },
  { icon: DoorOpen, label: "Door panels cleaned" },
  { icon: Armchair, label: "Interior vacuum" },
  { icon: LayoutDashboard, label: "Dashboard polish" },
  { icon: Flower2, label: "Air freshener" },
  { icon: FileText, label: "Paper mats" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

const ServiceBreakdownSection = () => {
  const navigate = useNavigate();
  const {
    serviceLabelFor,
    vehicleCategories,
    labelFor,
    descriptionFor,
    priceFor,
  } = useSettings();
  const serviceLabel = serviceLabelFor();
  const categoryKeys = Object.keys(vehicleCategories || {});

  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2">
          <h3 className="font-heading text-2xl font-bold">
            What's Included in Our{" "}
            <span className="text-gradient">{serviceLabel}</span>{" "}
            Service
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Professional detailing designed to keep your car looking its best — transparent pricing by vehicle category.
          </p>
        </div>

        {/* Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 sm:p-8 space-y-8"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-heading text-lg font-bold">
                {serviceLabel}
              </h4>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {services.map((service, i) => (
                <motion.div
                  key={service.label}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-center gap-2.5 rounded-lg bg-secondary/50 px-3 py-2.5"
                >
                  <service.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{service.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pricing & Categories Breakdown */}
          <div className="border-t border-border/60 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h5 className="font-heading text-base font-bold text-foreground">
                Pricing & Vehicle Categories
              </h5>
              <p className="text-xs text-muted-foreground">
                Select your vehicle category when booking — every wash includes all {services.length} {serviceLabel} steps above.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoryKeys.map((key, i) => {
                const isVan = key.toLowerCase().includes("van");
                const Icon = isVan ? Truck : Car;
                return (
                  <motion.div
                    key={key}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-heading text-xl font-bold text-primary">
                          £{priceFor(key)}
                        </span>
                      </div>
                      <p className="font-heading font-semibold text-sm text-foreground">
                        {labelFor(key)}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {descriptionFor(key)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Corporate Fleet Tier Card */}
              <motion.div
                custom={categoryKeys.length}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                      Custom Pricing
                    </span>
                  </div>
                  <p className="font-heading font-semibold text-sm text-foreground">
                    Corporate Fleet
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tailored B2B invoicing and scheduling for 1 or more company vehicles across all categories.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center">
          <Button
            variant="hero"
            size="lg"
            className="h-12 text-base"
            onClick={() => navigate("/signup")}
          >
            Book Your Wash <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServiceBreakdownSection;
