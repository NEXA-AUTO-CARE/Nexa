import { useMemo, useState } from 'react'
import type { CreateCorporateFleetEnquiryDto } from '@nexa/shared'
import { api } from '../../lib/api-client'
import { describeError } from '../../lib/errors'
import { useSettings } from '../../contexts/SettingsContext'

export function CorporateFleet() {
  const { categoryPricing, priceFor, labelFor, serviceLabelFor } = useSettings()
  const serviceLabel = serviceLabelFor()

  const CATEGORIES = useMemo(
    () =>
      Object.keys(categoryPricing).map((key) => ({
        label: labelFor(key),
        price: priceFor(key),
      })),
    [categoryPricing, priceFor, labelFor],
  )
  const [form, setForm] = useState<CreateCorporateFleetEnquiryDto>({
    companyName: '',
    fleetSize: 1,
    contactPerson: '',
    businessEmail: '',
    businessPhone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (k: keyof CreateCorporateFleetEnquiryDto, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/corporate-fleet', {
        ...form,
        fleetSize: Number(form.fleetSize),
      })
      setDone(true)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="pricing" className="px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
        {/* Pricing */}
        <div>
          <h2 className="text-3xl font-bold leading-tight md:text-4xl">
            <span className="font-display italic">Simple, </span>
            <span className="font-display italic text-nexa-mint">per-vehicle</span>
            <span className="font-display italic"> pricing</span>
          </h2>
          <p className="mt-4 text-nexa-text-secondary">
            Every booking is our {serviceLabel}. Price depends only
            on your vehicle category.
          </p>
          <div className="mt-8 space-y-3">
            {CATEGORIES.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between rounded-lg bg-nexa-bg-elevated/60 px-5 py-4"
              >
                <span className="text-white">{c.label}</span>
                <span className="text-lg font-bold text-nexa-mint">£{c.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Corporate fleet form */}
        <div className="nexa-card p-8">
          <h3 className="text-xl font-semibold text-white">Corporate fleet</h3>
          <p className="mt-2 text-sm text-nexa-text-secondary">
            Multiple vehicles? Tell us about your fleet and our team will get in
            touch to arrange invoicing.
          </p>

          {done ? (
            <div className="mt-6 rounded-lg bg-nexa-mint/10 p-5 text-center">
              <p className="font-semibold text-nexa-mint">Thanks — enquiry received.</p>
              <p className="mt-1 text-sm text-nexa-text-secondary">
                Our team will contact you shortly to raise an invoice.
              </p>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-nexa-text-secondary">Company name</span>
                <input
                  className="nexa-input"
                  required
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-nexa-text-secondary">Fleet size</span>
                <input
                  className="nexa-input"
                  type="number"
                  min={1}
                  required
                  value={form.fleetSize}
                  onChange={(e) => update('fleetSize', e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-nexa-text-secondary">Contact person</span>
                <input
                  className="nexa-input"
                  required
                  value={form.contactPerson}
                  onChange={(e) => update('contactPerson', e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-nexa-text-secondary">Business email</span>
                <input
                  className="nexa-input"
                  type="email"
                  required
                  value={form.businessEmail}
                  onChange={(e) => update('businessEmail', e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-nexa-text-secondary">Business phone</span>
                <input
                  className="nexa-input"
                  required
                  value={form.businessPhone}
                  onChange={(e) => update('businessPhone', e.target.value)}
                />
              </label>

              {error && <p className="text-sm text-nexa-error">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit enquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
