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
  const { serviceLabelFor } = useSettings();
  const serviceLabel = serviceLabelFor();

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
            Professional detailing designed to keep your car looking its best.
          </p>
        </div>

        {/* Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 sm:p-8 space-y-6"
        >
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
