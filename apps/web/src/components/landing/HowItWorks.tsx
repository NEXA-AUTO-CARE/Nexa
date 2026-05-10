import { CalendarIcon, CarIcon, CheckCircleIcon } from './icons'

const steps = [
  {
    step: 1,
    icon: CarIcon,
    title: 'Register Your Car',
    description: 'Add your vehicle details in seconds.',
  },
  {
    step: 2,
    icon: CalendarIcon,
    title: 'Book a Wash',
    description: 'Pick a date, time, and service.',
  },
  {
    step: 3,
    icon: CheckCircleIcon,
    title: 'We Come to You',
    description: 'A professional detailer arrives at your door.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold md:text-4xl">
          <span className="font-display italic text-white">How It Works</span>
        </h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.step}
              className={`nexa-card flex flex-col items-center p-8 text-center transition-transform duration-300 hover:-translate-y-1 animate-fade-in-up animate-delay-${(i + 1) * 100}`}
            >
              {/* Icon */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-nexa-mint/15">
                <s.icon className="text-nexa-mint" size={28} />
              </div>

              {/* Step Label */}
              <span className="mt-5 text-sm font-semibold text-nexa-mint">
                Step {s.step}
              </span>

              {/* Title */}
              <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-nexa-text-secondary">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
