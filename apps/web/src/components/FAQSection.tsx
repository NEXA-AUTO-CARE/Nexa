import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does NEXA work?",
    a: "Simply register your vehicle, pick a date and time, and one of our professional detailers will come to your location. No need to travel to a car wash — we bring the service to you.",
  },
  {
    q: "What areas do you cover?",
    a: "We currently serve Aberdeen, Scotland and the surrounding area. We're expanding soon — sign up to be notified when we reach your location.",
  },
  {
    q: "How long does a Mini Valet & Spray Polish take?",
    a: "A standard session takes approximately 45–60 minutes depending on the vehicle size and condition.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major debit and credit cards through our secure Stripe-powered checkout. Corporate fleet customers are invoiced separately.",
  },
  {
    q: "Can I book for multiple vehicles?",
    a: "Yes! You can add multiple vehicles to your Garage and book services for each one individually. For businesses with fleets, we offer a dedicated Corporate Fleet option with custom pricing.",
  },
  {
    q: "What if I need to cancel or reschedule?",
    a: "You can cancel or reschedule your booking up to 24 hours before the appointment at no charge through the app.",
  },
];

const FAQSection = () => {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-2"
        >
          <h3 className="font-heading text-2xl font-bold">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about NEXA.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/50">
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline hover:text-primary">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
