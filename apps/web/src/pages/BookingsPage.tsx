import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { BookingResponse } from '@nexa/shared'
import { BookingCard } from '../components/booking/BookingCard'
import { PaymentModal } from '../components/payment/PaymentModal'
import { useAuth } from '../contexts/AuthContext'
import { useBookings } from '../hooks/useBookings'
import { api } from '../lib/api-client'

export function BookingsPage() {
  const { user, logout } = useAuth()
  const { bookings, isLoading, refetch } = useBookings()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  
  // Payment states
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>('0.00')

  const handleCancel = async (booking: BookingResponse) => {
    if (!confirm(`Cancel booking for ${booking.vehicleSummary}?`)) return
    setCancellingId(booking.bookingId)
    try {
      await api.delete(`/bookings/${booking.bookingId}`)
      await refetch()
    } catch {
      // booking stays visible
    } finally {
      setCancellingId(null)
    }
  }

  const handlePay = async (booking: BookingResponse) => {
    try {
      const { data } = await api.post<{ clientSecret: string; amount: string }>('/payments/intent', {
        bookingId: booking.bookingId,
      })
      if (data.clientSecret) {
        setPaymentClientSecret(data.clientSecret)
        setPaymentAmount(data.amount)
      }
    } catch (err) {
      alert('Failed to initialize payment. It may already be paid or completed.')
    }
  }

  const handlePaymentSuccess = () => {
    setPaymentClientSecret(null)
    void refetch()
    // Ideally show a success toast here
  }

  const activeBookings = bookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled')
  const pastBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled')

  return (
    <div className="nexa-bg-pattern min-h-full bg-nexa-bg">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(15, 25, 35, 0.85)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            nexa<span className="text-nexa-mint">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/book" className="text-sm text-nexa-text-secondary hover:text-white transition-colors">
              Book a Wash
            </Link>
            <Link to="/garage" className="text-sm text-nexa-text-secondary hover:text-white transition-colors">
              Garage
            </Link>
            <span className="hidden text-sm text-nexa-text-secondary sm:inline">
              {user?.displayName}
            </span>
            <button
              onClick={() => void logout()}
              className="btn-secondary text-sm px-4 py-1.5"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Bookings</h1>
            <p className="mt-1 text-sm text-nexa-text-secondary">
              Track and manage your car wash bookings
            </p>
          </div>
          <Link to="/book" className="btn-primary text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Booking
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
              <span className="text-sm text-nexa-text-secondary">Loading bookings…</span>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="nexa-card mt-8 flex flex-col items-center justify-center p-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nexa-mint/10">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-nexa-mint">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">No bookings yet</h3>
            <p className="mt-2 max-w-sm text-sm text-nexa-text-secondary">
              Book your first car wash and we'll take care of the rest.
            </p>
            <Link to="/book" className="btn-primary mt-6 text-sm">
              Book Your First Wash
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {activeBookings.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-white">Active</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeBookings.map((b) => (
                    <BookingCard
                      key={b.bookingId}
                      booking={b}
                      onCancel={handleCancel}
                      onPay={handlePay}
                    />
                  ))}
                </div>
              </div>
            )}

            {pastBookings.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-nexa-text-muted">Past</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastBookings.map((b) => (
                    <BookingCard key={b.bookingId} booking={b} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {paymentClientSecret && (
        <PaymentModal
          clientSecret={paymentClientSecret}
          amount={paymentAmount}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setPaymentClientSecret(null)}
        />
      )}
    </div>
  )
}
