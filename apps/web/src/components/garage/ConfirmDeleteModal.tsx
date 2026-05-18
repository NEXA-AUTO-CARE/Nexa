import type { VehicleResponse } from '@nexa/shared'
import { createPortal } from 'react-dom'

interface ConfirmDeleteModalProps {
  open: boolean
  vehicle: VehicleResponse | null
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export function ConfirmDeleteModal({
  open,
  vehicle,
  onConfirm,
  onCancel,
  isDeleting,
}: ConfirmDeleteModalProps) {
  if (!open || !vehicle) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-nexa-border-card bg-nexa-bg-card-solid p-6 shadow-2xl animate-fade-in-up">
        <h2 className="text-lg font-semibold text-white">Remove Vehicle</h2>
        <p className="mt-2 text-sm text-nexa-text-secondary">
          Are you sure you want to remove{' '}
          <span className="font-medium text-white">
            {vehicle.make} {vehicle.model}
          </span>{' '}
          (<span className="font-mono text-nexa-mint">{vehicle.registrationNumber}</span>)
          from your garage?
        </p>
        <p className="mt-1.5 text-xs text-nexa-text-muted">
          This action cannot be undone.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-full bg-nexa-error px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-nexa-error/90 disabled:opacity-50"
          >
            {isDeleting ? 'Removing…' : 'Yes, Remove'}
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
