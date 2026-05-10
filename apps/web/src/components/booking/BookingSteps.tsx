import type { CreateBookingDto, VehicleResponse } from '@nexa/shared'
import { ServiceType } from '@nexa/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVehicles } from '../../hooks/useVehicles'
import { api } from '../../lib/api-client'
import { describeError } from '../../lib/errors'

const SERVICES = [
  {
    value: ServiceType.BASIC,
    label: 'Basic Wash',
    price: '£29.99',
    features: ['Exterior hand wash', 'Wheel clean', 'Tyre dressing', 'Window polish'],
  },
  {
    value: ServiceType.FULL,
    label: 'Full Detail',
    price: '£59.99',
    features: ['Everything in Basic', 'Interior vacuum', 'Dashboard & console wipe', 'Air freshener'],
  },
  {
    value: ServiceType.PREMIUM,
    label: 'Premium Detail',
    price: '£99.99',
    features: ['Everything in Full', 'Clay bar treatment', 'Machine polish', 'Ceramic sealant', 'Leather conditioning'],
  },
]

interface BookingStepsProps {
  onSuccess: () => void
}

export function BookingSteps({ onSuccess }: BookingStepsProps) {
  const navigate = useNavigate()
  const { vehicles, isLoading: loadingVehicles } = useVehicles()

  const [step, setStep] = useState(0)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null)
  const [selectedService, setSelectedService] = useState<typeof SERVICES[0] | null>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('10:00')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canNext = () => {
    if (step === 0) return !!selectedVehicle
    if (step === 1) return !!selectedService
    if (step === 2) return !!bookingDate && !!bookingTime && !!address.trim()
    return false
  }

  const handleSubmit = async () => {
    if (!selectedVehicle || !selectedService) return
    setSubmitting(true)
    setError(null)

    const dto: CreateBookingDto = {
      vehicleId: selectedVehicle.vehicleId,
      serviceType: selectedService.value,
      bookingTime: new Date(`${bookingDate}T${bookingTime}:00`).toISOString(),
      serviceAddress: address.trim(),
    }

    try {
      await api.post('/bookings', dto)
      onSuccess()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const STEP_TITLES = ['Select Vehicle', 'Choose Service', 'Date & Location']

  if (loadingVehicles) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="nexa-card p-8 text-center">
        <p className="text-nexa-text-secondary">You need to add a vehicle first.</p>
        <button onClick={() => navigate('/garage')} className="btn-primary mt-4 text-sm">
          Go to Garage
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEP_TITLES.map((title, i) => (
          <div key={title} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              i <= step ? 'bg-nexa-mint text-nexa-text-dark' : 'bg-nexa-bg-elevated text-nexa-text-muted'
            }`}>
              {i + 1}
            </div>
            <span className={`hidden text-sm sm:inline ${i <= step ? 'text-white' : 'text-nexa-text-muted'}`}>
              {title}
            </span>
            {i < STEP_TITLES.length - 1 && (
              <div className={`h-px w-8 ${i < step ? 'bg-nexa-mint' : 'bg-nexa-border-subtle'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Vehicle */}
      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <button
              key={v.vehicleId}
              onClick={() => setSelectedVehicle(v)}
              className={`nexa-card p-4 text-left transition-all ${
                selectedVehicle?.vehicleId === v.vehicleId
                  ? 'border-nexa-mint ring-1 ring-nexa-mint/30'
                  : 'hover:border-white/15'
              }`}
            >
              <h4 className="font-semibold text-white">{v.make} {v.model}</h4>
              <p className="mt-1 font-mono text-xs text-nexa-text-muted">{v.registrationNumber}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 1 — Service */}
      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {SERVICES.map((svc) => (
            <button
              key={svc.value}
              onClick={() => setSelectedService(svc)}
              className={`nexa-card flex flex-col p-5 text-left transition-all ${
                selectedService?.value === svc.value
                  ? 'border-nexa-mint ring-1 ring-nexa-mint/30'
                  : 'hover:border-white/15'
              }`}
            >
              <h4 className="text-lg font-semibold text-white">{svc.label}</h4>
              <p className="mt-1 text-2xl font-bold text-nexa-mint">{svc.price}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {svc.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-nexa-text-secondary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-nexa-mint">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Date/Time & Address */}
      {step === 2 && (
        <div className="mx-auto max-w-md space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-nexa-text-secondary">Date</span>
            <input
              type="date"
              className="nexa-input"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-nexa-text-secondary">Time</span>
            <input
              type="time"
              className="nexa-input"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              min="08:00"
              max="18:00"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-nexa-text-secondary">Service Address</span>
            <input
              className="nexa-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 King Street, Aberdeen, AB24 5AA"
            />
          </label>

          {/* Summary */}
          {selectedVehicle && selectedService && (
            <div className="nexa-card-solid mt-6 p-4">
              <h4 className="text-sm font-medium text-nexa-text-muted">Booking Summary</h4>
              <div className="mt-2 space-y-1.5">
                <p className="text-sm text-white">
                  <span className="text-nexa-text-secondary">Vehicle: </span>
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.registrationNumber})
                </p>
                <p className="text-sm text-white">
                  <span className="text-nexa-text-secondary">Service: </span>
                  {selectedService.label}
                </p>
                <p className="text-sm text-white">
                  <span className="text-nexa-text-secondary">Price: </span>
                  <span className="font-semibold text-nexa-mint">{selectedService.price}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm text-nexa-error">{error}</p>}

      {/* Navigation */}
      <div className="mt-8 flex justify-between gap-3">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="btn-secondary text-sm disabled:opacity-30"
        >
          Back
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </button>
        )}
      </div>
    </div>
  )
}
