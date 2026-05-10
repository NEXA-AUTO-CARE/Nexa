import { useState } from 'react'
import { ChevronDownIcon } from './icons'

const faqs = [
  {
    question: 'How does NEXA work?',
    answer:
      'Simply create an account, register your vehicle, and book a wash. Choose your preferred date and time slot, enter your address, and a professional detailer will come to you. You\'ll receive before & after photos of the job and can rate your experience.',
  },
  {
    question: 'What areas do you cover?',
    answer:
      'We currently serve Aberdeen, Scotland and the surrounding areas. We\'re working on expanding to more cities across Scotland — stay tuned!',
  },
  {
    question: 'How long does a Mini Valet & Spray Polish take?',
    answer:
      'A typical Mini Valet & Spray Polish takes between 45 minutes to 1.5 hours, depending on the size and condition of your vehicle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major debit and credit cards through our secure Stripe payment system. Apple Pay and Google Pay are also supported.',
  },
  {
    question: 'Can I book for multiple vehicles?',
    answer:
      'Absolutely! You can register multiple vehicles in your Garage and book washes for any of them. Each vehicle can have its own booking schedule.',
  },
  {
    question: 'What if I need to cancel or reschedule?',
    answer:
      'You can cancel or reschedule your booking up to 24 hours before your appointment at no charge. Late cancellations may incur a fee.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i)
  }

  return (
    <section id="faq" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            <span className="font-display italic">Frequently Asked </span>
            <span className="font-display italic text-nexa-mint">Questions</span>
          </h2>
          <p className="mt-4 text-nexa-text-secondary">
            Everything you need to know about NEXA.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-xl border border-nexa-border-card bg-nexa-bg-card-solid">
          {faqs.map((faq, i) => (
            <div key={i} className={i > 0 ? 'border-t border-nexa-border-card' : ''}>
              <button
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
                aria-expanded={openIndex === i}
                id={`faq-btn-${i}`}
                aria-controls={`faq-panel-${i}`}
              >
                <span className="pr-4 text-sm font-medium text-white md:text-base">
                  {faq.question}
                </span>
                <ChevronDownIcon
                  className={`shrink-0 text-nexa-text-muted transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  size={18}
                />
              </button>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-btn-${i}`}
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: openIndex === i ? '300px' : '0px',
                  opacity: openIndex === i ? 1 : 0,
                }}
              >
                <p className="px-6 pb-5 text-sm leading-relaxed text-nexa-text-secondary">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
