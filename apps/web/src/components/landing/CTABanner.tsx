import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'

export function CTABanner() {
  return (
    <section id="cta" className="relative px-6 py-20 md:py-28 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="nexa-card p-10 text-center md:p-14">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-3 text-nexa-text-secondary">
            Join NEXA today and experience premium car care.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary">
              Create an Account <ArrowRightIcon />
            </Link>
            <Link to="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
