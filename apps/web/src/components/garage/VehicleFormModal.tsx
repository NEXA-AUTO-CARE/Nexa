import { VehicleType } from '@nexa/shared'
import type { CreateVehicleDto, UpdateVehicleDto, VehicleResponse } from '@nexa/shared'
import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { CATEGORY_DEFS } from '../VehicleCategorySelector'

interface VehicleFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateVehicleDto | UpdateVehicleDto) => Promise<void>
  /** If provided, the modal is in "edit" mode with pre-filled values */
  vehicle?: VehicleResponse | null
  isSubmitting?: boolean
}

export function VehicleFormModal({
  open,
  onClose,
  onSubmit,
  vehicle,
  isSubmitting,
}: VehicleFormModalProps) {
  const { priceFor, labelFor } = useSettings()

  const VEHICLE_TYPES = useMemo(
    () =>
      CATEGORY_DEFS.filter((def) => def.vehicleType !== null).map((def) => ({
        value: def.vehicleType as VehicleType,
        label: `${labelFor(def.vehicleType as string)} — £${priceFor(def.vehicleType as string)}`,
      })),
    [priceFor, labelFor],
  )

  const isEdit = !!vehicle
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.STANDARD)
  const [colour, setColour] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Populate form when vehicle changes (edit mode)
  useEffect(() => {
    // Defer setState to avoid synchronous setState in effect body
    Promise.resolve().then(() => {
      if (vehicle) {
        setRegistrationNumber(vehicle.registrationNumber)
        setMake(vehicle.make)
        setModel(vehicle.model)
        setVehicleType(vehicle.vehicleType)
        setColour(vehicle.colour ?? '')
      } else {
        setRegistrationNumber('')
        setMake('')
        setModel('')
        setVehicleType(VehicleType.STANDARD)
        setColour('')
      }
      setError(null)
    })
  }, [vehicle, open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!registrationNumber.trim() || !make.trim() || !model.trim()) {
      setError('Registration, make, and model are required')
      return
    }

    try {
      await onSubmit({
        registrationNumber: registrationNumber.trim(),
        make: make.trim(),
        model: model.trim(),
        vehicleType,
        colour: colour.trim() || null,
      })
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Something went wrong')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[92vw] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-nexa-border-card bg-nexa-bg-card-solid p-5 sm:p-6 shadow-2xl animate-fade-in-up">
        <h2 className="text-xl font-semibold text-white">
          {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
        </h2>
        <p className="mt-1 text-sm text-nexa-text-secondary">
          {isEdit
            ? 'Update the details for this vehicle.'
            : 'Enter your vehicle details to add it to your garage.'}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-nexa-text-secondary">
              Registration Number
            </span>
            <input
              className="nexa-input"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="AB12 CDE"
              maxLength={15}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-nexa-text-secondary">
                Make
              </span>
              <input
                className="nexa-input"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="BMW"
                maxLength={50}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-nexa-text-secondary">
                Model
              </span>
              <input
                className="nexa-input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="3 Series"
                maxLength={50}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-nexa-text-secondary">
              Vehicle Category
            </span>
            <select
              className="nexa-select"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-nexa-text-secondary">
              Colour (optional)
            </span>
            <input
              className="nexa-input"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              placeholder="Black"
              maxLength={30}
            />
          </label>

          {error && <p className="text-sm text-nexa-error">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 text-sm"
            >
              {isSubmitting
                ? isEdit
                  ? 'Saving…'
                  : 'Adding…'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Vehicle'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
