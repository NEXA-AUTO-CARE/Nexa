import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { api } from "../lib/api-client";

interface FaqItem {
  q: string;
  a: string;
}

/**
 * Convert newlines to <br> tags for proper HTML rendering.
 * The seed data already stores answers with inline HTML (<strong>, etc.)
 * so we only need to handle line breaks here.
 */
function formatAnswer(raw: string): string {
  return raw.replace(/\n/g, "<br />");
}

const FAQSection = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const { data } = await api.get<{ key: string; value: string }[]>("/settings");
        const faqsSetting = data.find((s) => s.key === "faqs");
        if (faqsSetting) {
          const parsed = JSON.parse(faqsSetting.value) as { question: string; answer: string }[];
          if (parsed && parsed.length > 0) {
            setFaqs(
              parsed.map((item) => ({
                q: item.question,
                a: item.answer,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load dynamic FAQs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  if (loading && faqs.length === 0) {
    return null; // Don't flash empty state while fetching
  }

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
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: formatAnswer(faq.a) }} />
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
