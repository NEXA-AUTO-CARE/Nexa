import type { BookingResponse } from '@nexa/shared'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  booked: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Booked' },
  accepted: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Accepted' },
  in_progress: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'In Progress' },
  completed: { bg: 'bg-nexa-mint/15', text: 'text-nexa-mint', label: 'Completed' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Cancelled' },
}

const SERVICE_LABELS: Record<string, string> = {
  basic: 'Mini Valet & Spray Polish',
  full: 'Mini Valet & Spray Polish',
  premium: 'Mini Valet & Spray Polish',
}

interface BookingCardProps {
  booking: BookingResponse
  onCancel?: (b: BookingResponse) => void
  onPay?: (b: BookingResponse) => void
  onRebook?: (b: BookingResponse) => void
}

export function BookingCard({ booking, onCancel, onPay, onRebook }: BookingCardProps) {
  const status = STATUS_STYLES[booking.status] ?? STATUS_STYLES.booked
  const canCancel = booking.status === 'booked' || booking.status === 'accepted'
  const canRebook = booking.status === 'completed' || booking.status === 'cancelled'

  const dateStr = new Date(booking.bookingTime).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = new Date(booking.bookingTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="nexa-card p-5 transition-transform duration-200 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">
            {booking.vehicleSummary}
          </h3>
          <span className="mt-0.5 inline-block text-xs text-nexa-text-muted">
            {SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-nexa-text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>{dateStr} at {timeStr}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-nexa-text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">{booking.serviceAddress}</span>
        </div>
      </div>

      {/* Price + Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-nexa-border-subtle pt-3">
        <span className="text-lg font-bold text-nexa-mint">£{booking.price}</span>
        <div className="flex items-center gap-2">
          {onRebook && canRebook && (
            <button
              onClick={() => onRebook(booking)}
              className="btn-primary text-xs px-3 py-1"
            >
              Book again
            </button>
          )}
          {onPay && canCancel && (
             <button
              onClick={() => onPay(booking)}
              className="btn-primary text-xs px-3 py-1"
            >
              Pay Now
            </button>
          )}
          {canCancel && onCancel && (
            <button
              onClick={() => onCancel(booking)}
              className="rounded-lg px-3 py-1 text-xs text-nexa-error/80 transition-colors hover:bg-nexa-error/10 hover:text-nexa-error"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
