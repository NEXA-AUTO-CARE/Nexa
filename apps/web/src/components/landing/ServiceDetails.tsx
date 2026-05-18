import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  CircleDotIcon,
  DashboardIcon,
  DoorIcon,
  DropletIcon,
  FileTextIcon,
  LeafIcon,
  SparklesIcon,
  VacuumIcon,
  WindIcon,
  WindowIcon,
} from './icons'

const serviceItems = [
  { icon: DropletIcon, label: 'Hand wash' },
  { icon: WindIcon, label: 'Wax & Dry' },
  { icon: CircleDotIcon, label: 'Wheels cleaned' },
  { icon: WindowIcon, label: 'Windows cleaned' },
  { icon: DoorIcon, label: 'Door panels cleaned' },
  { icon: VacuumIcon, label: 'Interior vacuum' },
  { icon: DashboardIcon, label: 'Dashboard polish' },
  { icon: LeafIcon, label: 'Air freshener' },
  { icon: FileTextIcon, label: 'Paper mats' },
]

export function ServiceDetails() {
  return (
    <section id="services" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-3xl font-bold leading-tight md:text-4xl">
            <span className="font-display italic">What's Included in Our </span>
            <span className="font-display italic text-nexa-mint">Mini Valet & Spray Polish</span>
            <span className="font-display italic"> Service</span>
          </h2>
          <p className="mt-4 text-nexa-text-secondary">
            Professional detailing designed to keep your car looking its best.
          </p>
        </div>

        {/* Service Card */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="nexa-card p-8">
            {/* Card Header */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexa-mint/15">
                <SparklesIcon className="text-nexa-mint" size={22} />
              </div>
              <h3 className="text-lg font-semibold text-white">Mini Valet & Spray Polish</h3>
            </div>

            {/* Service Items Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {serviceItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-lg bg-nexa-bg-elevated/60 px-3 py-3 transition-colors hover:bg-nexa-bg-elevated"
                >
                  <item.icon className="shrink-0 text-nexa-mint" size={18} />
                  <span className="text-sm text-nexa-text-secondary">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
          <Link to="/signup" className="btn-primary px-10 py-4 text-base">
            Book Your Wash <ArrowRightIcon size={20} />
          </Link>
        </div>
      </div>
    </section>
  )
}
