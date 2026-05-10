import { CameraIcon, CreditCardIcon, ShieldCheckIcon, SmartphoneIcon } from './icons'

const cards = [
  {
    icon: ShieldCheckIcon,
    title: 'Trusted Professionals',
    description: 'Vetted and experienced detailing professionals you can rely on for quality results.',
  },
  {
    icon: CreditCardIcon,
    title: 'Secure Payments',
    description: 'Pay safely online via Stripe. Your payment details are always encrypted and protected.',
  },
  {
    icon: CameraIcon,
    title: 'Photo Proof',
    description: 'Before & after photos of every job so you can see the transformation for yourself.',
  },
  {
    icon: SmartphoneIcon,
    title: 'Mobile Booking',
    description: 'Book and track from your phone. Manage your vehicles and bookings on the go.',
  },
]

export function WhyChooseNexa() {
  return (
    <section id="why-nexa" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold md:text-4xl">
          <span className="font-display italic">Why Choose </span>
          <span className="font-display italic text-nexa-mint underline underline-offset-4 decoration-nexa-mint/40">NEXA</span>
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className={`nexa-card flex flex-col items-center p-8 text-center transition-transform duration-300 hover:-translate-y-1 animate-fade-in-up animate-delay-${(i + 1) * 100}`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-nexa-mint/15">
                <card.icon className="text-nexa-mint" size={28} />
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-nexa-text-secondary">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
