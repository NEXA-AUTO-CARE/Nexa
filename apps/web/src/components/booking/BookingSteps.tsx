import type { CreateBookingDto, VehicleResponse } from '@nexa/shared'
import { useSettings } from '../../contexts/SettingsContext'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVehicles } from '../../hooks/useVehicles'
import { useAddons } from '../../hooks/useAddons'
import { api } from '../../lib/api-client'
import { describeError } from '../../lib/errors'

interface BookingStepsProps {
  onSuccess: () => void
}

export function BookingSteps({ onSuccess }: BookingStepsProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { vehicles, isLoading: loadingVehicles } = useVehicles()
  const { addons, isLoading: loadingAddons } = useAddons()
  const { priceFor, labelFor } = useSettings()

  const [step, setStep] = useState(0)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('10:00')
  const [address, setAddress] = useState('')
  const [agreedSafeSpace, setAgreedSafeSpace] = useState(false)
  const [agreedDetailsCorrect, setAgreedDetailsCorrect] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preselect a vehicle when arriving from "Book a Wash" on the garage card.
  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId')
    if (vehicleId && vehicles.length > 0 && !selectedVehicle) {
      const match = vehicles.find((v) => v.vehicleId === vehicleId)
      if (match) {
        setSelectedVehicle(match)
        setStep(1)
      }
    }
  }, [searchParams, vehicles, selectedVehicle])

  const basePrice = selectedVehicle
    ? parseFloat(priceFor(selectedVehicle.vehicleType))
    : 0
  const addonsTotal = selectedAddonIds.reduce((sum, id) => {
    const addon = addons.find((a) => a.addonId === id)
    return sum + (addon ? parseFloat(addon.price) : 0)
  }, 0)
  const total = (basePrice + addonsTotal).toFixed(2)

  const canNext = () => {
    if (step === 0) return !!selectedVehicle
    if (step === 1) return true // addons are optional
    if (step === 2)
      return (
        !!bookingDate &&
        !!bookingTime &&
        !!address.trim() &&
        agreedSafeSpace &&
        agreedDetailsCorrect
      )
    return false
  }

  const handleSubmit = async () => {
    if (!selectedVehicle) return
    setSubmitting(true)
    setError(null)

    const dto: CreateBookingDto = {
      vehicleId: selectedVehicle.vehicleId,
      bookingTime: new Date(`${bookingDate}T${bookingTime}:00`).toISOString(),
      serviceAddress: address.trim(),
      addonIds: selectedAddonIds,
      agreedSafeSpace,
      agreedDetailsCorrect,
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

  const STEP_TITLES = ['Select Vehicle', 'Add-ons', 'Date & Location']

  if (loadingVehicles || loadingAddons) {
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
              <p className="mt-1 text-xs text-nexa-text-secondary">
                {labelFor(v.vehicleType)} — Mini Valet £{priceFor(v.vehicleType)}
              </p>
              <p className="mt-1 font-mono text-xs text-nexa-text-muted">{v.registrationNumber}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 1 — Add-ons */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {addons.map((addon) => {
            const isSelected = selectedAddonIds.includes(addon.addonId)
            return (
              <button
                key={addon.addonId}
                onClick={() => {
                  setSelectedAddonIds((prev) =>
                    isSelected
                      ? prev.filter((id) => id !== addon.addonId)
                      : [...prev, addon.addonId]
                  )
                }}
                className={`nexa-card flex flex-col p-5 text-left transition-all ${
                  isSelected
                    ? 'border-nexa-mint ring-1 ring-nexa-mint/30 bg-nexa-mint/5'
                    : 'hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-white">{addon.name}</h4>
                  <span className="text-sm font-bold text-nexa-mint">+£{addon.price}</span>
                </div>
                {addon.description && (
                  <p className="mt-2 text-sm text-nexa-text-secondary">{addon.description}</p>
                )}
              </button>
            )
          })}
          {addons.length === 0 && (
            <div className="col-span-full py-8 text-center text-nexa-text-muted">
              No add-ons available at this time.
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Date/Time, Address & Legal consent */}
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
          {selectedVehicle && (
            <div className="nexa-card-solid mt-6 p-4">
              <h4 className="text-sm font-medium text-nexa-text-muted">Booking Summary</h4>
              <div className="mt-2 space-y-1.5">
                <p className="text-sm text-white">
                  <span className="text-nexa-text-secondary">Vehicle: </span>
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.registrationNumber})
                </p>
                <p className="flex justify-between text-sm text-white">
                  <span className="text-nexa-text-secondary">
                    Mini Valet — {labelFor(selectedVehicle.vehicleType)}
                  </span>
                  <span>£{basePrice.toFixed(2)}</span>
                </p>
                {selectedAddonIds.map((id) => {
                  const addon = addons.find((a) => a.addonId === id)
                  if (!addon) return null
                  return (
                    <p key={id} className="flex justify-between text-sm text-white">
                      <span className="text-nexa-text-secondary">Add-on: {addon.name}</span>
                      <span>+£{addon.price}</span>
                    </p>
                  )
                })}
                <div className="mt-2 border-t border-white/10 pt-2 flex justify-between text-base font-bold text-white">
                  <span>Total</span>
                  <span className="text-nexa-mint">£{total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legal consent — required before payment can be initiated */}
          <div className="nexa-card-solid space-y-3 p-4">
            <h4 className="text-sm font-medium text-nexa-text-muted">Before you book</h4>
            <label className="flex items-start gap-2.5 text-sm text-nexa-text-secondary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-nexa-mint"
                checked={agreedSafeSpace}
                onChange={(e) => setAgreedSafeSpace(e.target.checked)}
              />
              <span>I confirm I have a safe space to wash the vehicle.</span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-nexa-text-secondary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-nexa-mint"
                checked={agreedDetailsCorrect}
                onChange={(e) => setAgreedDetailsCorrect(e.target.checked)}
              />
              <span>All details provided about the vehicle are correct.</span>
            </label>
          </div>
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
