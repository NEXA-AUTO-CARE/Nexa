import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api-client'
import {
  Mail,
  Phone,
  ShieldCheck,
  BadgeCheck,
  CalendarDays,
  Clock,
  ArrowLeft,
  MapPin,
  AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AdminUser {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  displayName: string
  role: string
  otpVerified: boolean
  createdAt: string
  stripeAccountId: string | null
  isActive: boolean
}

interface Booking {
  bookingId: string
  bookingReference?: string
  vehicleSummary?: string
  serviceType: string
  bookingTime: string
  serviceAddress: string
  price: string
  status: string
  paymentStatus: string
  createdAt: string
}

const ROLE_STYLES: Record<string, string> = {
  customer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  admin: 'bg-nexa-mint/10 text-nexa-mint border-nexa-mint/20',
  super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  vendor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const STATUS_STYLES: Record<string, string> = {
  BOOKED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACCEPTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-nexa-mint/10 text-nexa-mint border-nexa-mint/20',
  CANCELLED: 'bg-nexa-error/10 text-nexa-error border-nexa-error/20',
}

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<AdminUser | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [userRes, bookingsRes] = await Promise.all([
        api.get<AdminUser>(`/admin/users/${id}`),
        api.get<Booking[]>(`/admin/users/${id}/bookings`),
      ])
      setUser(userRes.data)
      setBookings(bookingsRes.data)
    } catch (err) {
      console.error('Failed to load user details', err)
      setError('Could not fetch user details. They might not exist.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await api.patch<AdminUser>(`/admin/users/${user.userId}`, { isActive: !user.isActive })
      setUser(res.data)
    } catch (err) {
      console.error('Failed to update user status', err)
      setError('Could not update user status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
        <span className="text-nexa-text-secondary text-sm">Retrieving user details…</span>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="glass-card p-12 text-center text-nexa-text-secondary">
        <AlertCircle className="w-12 h-12 mx-auto text-nexa-error mb-4" />
        <h3 className="font-display font-bold text-lg mb-1">User Not Found</h3>
        <p className="text-sm mb-6">{error || 'We couldn\'t find the requested user.'}</p>
        <button onClick={() => navigate('/admin/users')} className="text-nexa-mint hover:underline text-sm">
          Return to Users List
        </button>
      </div>
    )
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/users')}
          className="p-2 rounded-xl bg-nexa-bg hover:bg-nexa-bg-elevated border border-nexa-border-subtle transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-nexa-text" />
        </button>
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">
            User Details
          </h1>
          <p className="text-nexa-text-secondary text-sm mt-1">
            View user profile and booking history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: User Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border border-nexa-border-subtle text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-nexa-bg-elevated border-2 border-nexa-mint/30 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-nexa-text-secondary">{getInitials(user.displayName)}</span>
            </div>
            <h2 className="text-xl font-bold text-nexa-text truncate">{user.displayName}</h2>
            <div className="flex justify-center mt-2 mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${ROLE_STYLES[user.role] || ROLE_STYLES.customer}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
            
            <div className="space-y-3 text-left mt-6 pt-6 border-t border-nexa-border-subtle/50">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-nexa-text-muted shrink-0" />
                <span className="text-nexa-text-secondary truncate">{user.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-nexa-text-muted shrink-0" />
                <span className="text-nexa-text-secondary">{user.phoneNumber || 'No phone provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="w-4 h-4 text-nexa-text-muted shrink-0" />
                <span className="text-nexa-text-secondary">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-nexa-border-subtle/50 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-nexa-text-muted">Status</span>
                {user.otpVerified ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-nexa-mint">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pending Verification
                  </span>
                )}
              </div>
              {user.stripeAccountId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexa-text-muted">Stripe Account</span>
                  <span className="font-mono text-xs text-nexa-text-secondary">{user.stripeAccountId}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-nexa-text-muted">Account Access</span>
                <button
                  onClick={handleToggleActive}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    user.isActive
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      : 'bg-nexa-mint/10 text-nexa-mint border-nexa-mint/20 hover:bg-nexa-mint/20'
                  }`}
                >
                  {user.isActive ? 'Deactivate User' : 'Activate User'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Bookings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-nexa-border-subtle">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-nexa-border-subtle">
              <h2 className="text-lg font-bold text-nexa-text flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-nexa-mint" />
                Booking History
              </h2>
              <span className="text-xs font-semibold bg-nexa-bg-elevated px-3 py-1 rounded-full text-nexa-text-secondary border border-nexa-border-subtle">
                {bookings.length} Total Bookings
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarDays className="w-12 h-12 mx-auto text-nexa-text-muted mb-3 opacity-50" />
                <p className="text-nexa-text-secondary text-sm">This user hasn't made any bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <motion.div
                    key={booking.bookingId}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/admin/bookings/${booking.bookingId}`)}
                    className="p-4 rounded-xl border border-nexa-border-subtle bg-nexa-bg/50 hover:bg-nexa-bg-elevated hover:border-nexa-mint/30 cursor-pointer transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-nexa-text-secondary bg-nexa-bg-deep px-2 py-1 rounded border border-nexa-border-subtle">
                          {booking.bookingReference || booking.bookingId.slice(0, 8)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${STATUS_STYLES[booking.status] || STATUS_STYLES.BOOKED}`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-nexa-mint">£{parseFloat(booking.price).toFixed(2)}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          booking.paymentStatus === 'CAPTURED' ? 'text-nexa-mint' : 
                          booking.paymentStatus === 'FAILED' ? 'text-nexa-error' : 
                          booking.paymentStatus === 'REFUNDED' ? 'text-blue-400' : 'text-amber-400'
                        }`}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-nexa-text-secondary">
                          <MapPin className="w-4 h-4 text-nexa-text-muted shrink-0" />
                          <span className="truncate">{booking.serviceAddress}</span>
                        </div>
                        <div className="flex items-center gap-2 text-nexa-text-secondary">
                          <Clock className="w-4 h-4 text-nexa-text-muted shrink-0" />
                          <span>{fmtDate(booking.bookingTime)}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:text-right">
                        <div className="text-nexa-text font-medium truncate">
                          {booking.vehicleSummary || 'Vehicle Booking'}
                        </div>
                        <div className="text-nexa-text-secondary capitalize text-xs">
                          {booking.serviceType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
