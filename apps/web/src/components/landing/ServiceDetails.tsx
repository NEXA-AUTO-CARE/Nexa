import { Link } from 'react-router-dom'
import { useSettings } from '../../contexts/SettingsContext'
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
  const {
    serviceLabelFor,
    vehicleCategories,
    labelFor,
    descriptionFor,
    priceFor,
  } = useSettings()
  const serviceLabel = serviceLabelFor()
  const categoryKeys = Object.keys(vehicleCategories || {})

  return (
    <section id="services" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-3xl font-bold leading-tight md:text-4xl">
            <span className="font-display italic">What's Included in Our </span>
            <span className="font-display italic text-nexa-mint">{serviceLabel}</span>
            <span className="font-display italic"> Service</span>
          </h2>
          <p className="mt-4 text-nexa-text-secondary">
            Professional detailing designed to keep your car looking its best — priced by vehicle category.
          </p>
        </div>

        {/* Service Card */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="nexa-card p-8 space-y-8">
            <div>
              {/* Card Header */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexa-mint/15">
                  <SparklesIcon className="text-nexa-mint" size={22} />
                </div>
                <h3 className="text-lg font-semibold text-white">{serviceLabel}</h3>
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

            {/* Pricing & Vehicle Categories */}
            <div className="border-t border-nexa-border-subtle pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h4 className="text-base font-semibold text-white">
                  Pricing & Vehicle Categories
                </h4>
                <p className="text-xs text-nexa-text-muted">
                  Transparent pricing by vehicle category — no account required to view our rates.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {categoryKeys.map((key) => (
                  <div
                    key={key}
                    className="rounded-xl border border-nexa-border-subtle bg-nexa-bg-elevated/60 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-white">
                        {labelFor(key)}
                      </span>
                      <span className="text-lg font-bold text-nexa-mint">
                        £{priceFor(key)}
                      </span>
                    </div>
                    <p className="text-xs text-nexa-text-secondary leading-relaxed">
                      {descriptionFor(key)}
                    </p>
                  </div>
                ))}
                <div className="rounded-xl border border-nexa-mint/30 bg-nexa-mint/5 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-white">
                      Corporate Fleet
                    </span>
                    <span className="text-xs font-bold uppercase text-nexa-mint">
                      Custom
                    </span>
                  </div>
                  <p className="text-xs text-nexa-text-secondary leading-relaxed">
                    Tailored B2B invoicing and scheduling for 1 or more company vehicles.
                  </p>
                </div>
              </div>
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
