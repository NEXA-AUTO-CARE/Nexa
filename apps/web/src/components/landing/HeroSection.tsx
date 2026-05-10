import { Link } from 'react-router-dom'
import heroImg from '../../assets/hero-detailer.png'
import { ArrowRightIcon } from './icons'

export function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        {/* Text Column */}
        <div className="animate-fade-in-up">
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            <span className="font-display italic">Premium Car{' '}</span>
            <span className="font-display italic">Detailing — </span>
            <span className="font-display italic text-nexa-mint">Delivered to Your Door</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-nexa-text-secondary">
            Book trusted detailing professionals in minutes.
            Available now in Aberdeen, Scotland.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/signup" className="btn-primary">
              Book a Wash <ArrowRightIcon />
            </Link>
            <Link to="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>

        {/* Image Column */}
        <div className="animate-fade-in-up animate-delay-200">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={heroImg}
              alt="Professional car detailer polishing a luxury black car with a microfiber cloth"
              className="h-full w-full object-cover"
              loading="eager"
            />
            {/* Subtle gradient overlay at bottom */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(15, 25, 35, 0.3) 0%, transparent 40%)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
