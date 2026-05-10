import type { VehicleResponse } from '@nexa/shared'
import { VehicleType } from '@nexa/shared'

const TYPE_LABELS: Record<string, string> = {
  [VehicleType.CAR]: 'Car',
  [VehicleType.SUV]: 'SUV / 4×4',
  [VehicleType.VAN]: 'Van',
  [VehicleType.OTHER]: 'Other',
}

interface VehicleCardProps {
  vehicle: VehicleResponse
  onEdit: (v: VehicleResponse) => void
  onDelete: (v: VehicleResponse) => void
}

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  return (
    <div className="nexa-card group flex flex-col justify-between p-6 transition-transform duration-200 hover:-translate-y-0.5">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {vehicle.make} {vehicle.model}
            </h3>
            <span className="mt-0.5 inline-block rounded-full bg-nexa-mint/15 px-2.5 py-0.5 text-xs font-medium text-nexa-mint">
              {TYPE_LABELS[vehicle.vehicleType] ?? vehicle.vehicleType}
            </span>
          </div>

          {/* Colour swatch */}
          {vehicle.colour && (
            <span className="text-xs text-nexa-text-muted">{vehicle.colour}</span>
          )}
        </div>

        {/* Registration */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-nexa-bg-elevated px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-nexa-text-muted">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 6v12M18 6v12" />
          </svg>
          <span className="font-mono text-sm font-semibold tracking-wider text-white">
            {vehicle.registrationNumber}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2 border-t border-nexa-border-subtle pt-4">
        <button
          onClick={() => onEdit(vehicle)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-nexa-text-secondary transition-colors hover:bg-nexa-bg-elevated hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => onDelete(vehicle)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-nexa-error/80 transition-colors hover:bg-nexa-error/10 hover:text-nexa-error"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Remove
        </button>
      </div>
    </div>
  )
}
