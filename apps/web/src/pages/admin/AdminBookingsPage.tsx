import { useEffect, useState } from 'react'
import { api } from '../../lib/api-client'
import {
  CalendarDays,
  User,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserPlus,
  CreditCard,
  CheckSquare,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Addon {
  addonId: string
  name: string
  price: string
}

interface Booking {
  bookingId: string
  vehicleId: string
  vehicleSummary?: string
  serviceType: string
  bookingTime: string
  serviceAddress: string
  price: string
  status: string
  createdAt: string
  addons?: Addon[]
  vendorId?: string
  vendorName?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

interface SystemUser {
  userId: string
  displayName: string
  role: string
  email: string
  stripeAccountId?: string
  firstName?: string
  lastName?: string
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [vendors, setVendors] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  type RawBooking = {
    customer?: { firstName?: string; lastName?: string; displayName?: string; email?: string; phoneNumber?: string }
    vendor?: { firstName?: string; lastName?: string; displayName?: string }
    [key: string]: unknown
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [bookingsRes, usersRes] = await Promise.all([
        api.get<RawBooking[]>('/admin/bookings'),
        api.get<SystemUser[]>('/admin/users'),
      ])

      // Map raw backend responses
      const bookingsData = bookingsRes.data.map((b: RawBooking) => {
        const custName = b.customer
          ? `${b.customer.firstName} ${b.customer.lastName}`.trim() || b.customer.displayName
          : 'Unknown'
        const vendName = b.vendor
          ? `${b.vendor.firstName} ${b.vendor.lastName}`.trim() || b.vendor.displayName
          : undefined

        return {
          ...b,
          customerName: custName,
          customerEmail: b.customer?.email,
          customerPhone: b.customer?.phoneNumber,
          vendorName: vendName,
        } as Booking
      })

      setBookings(bookingsData)
      setVendors(usersRes.data.filter((u) => u.role.toLowerCase() === 'vendor'))
    } catch (err) {
      console.error('Failed to load admin bookings data', err)
      setActionError('Could not fetch bookings list. Please check authorization.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is deferred behind await
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is stable
  }, [])

  const handleAssignVendor = async (bookingId: string) => {
    if (!selectedVendorId) return
    try {
      setProcessingId(bookingId)
      setActionError(null)
      setActionSuccess(null)

      await api.patch(`/admin/bookings/${bookingId}/assign-vendor`, {
        vendorId: selectedVendorId,
      })

      setActionSuccess('Certified detailer assigned successfully.')
      setAssigningId(null)
      setSelectedVendorId('')
      await loadData()
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setActionError(message || 'Failed to assign detailer.')
    } finally {
      setProcessingId(null)
    }
  }

  const handlePayout = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to trigger the vendor payout split (85% to vendor, 15% platform)?')) {
      return
    }
    try {
      setProcessingId(bookingId)
      setActionError(null)
      setActionSuccess(null)

      await api.post(`/payments/bookings/${bookingId}/payout`)
      setActionSuccess('Vendor payout successfully initiated.')
      await loadData()
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setActionError(message || 'Failed to trigger payout.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRefund = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to refund this booking in full? This will also cancel the job.')) {
      return
    }
    try {
      setProcessingId(bookingId)
      setActionError(null)
      setActionSuccess(null)

      await api.post(`/payments/bookings/${bookingId}/refund`)
      setActionSuccess('Customer refund successfully processed.')
      await loadData()
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setActionError(message || 'Failed to process refund.')
    } finally {
      setProcessingId(null)
    }
  }

  // Filter & Search logic
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.vehicleSummary?.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      b.serviceAddress?.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingId.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || b.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Close notifications after a delay
  useEffect(() => {
    if (actionSuccess || actionError) {
      const t = setTimeout(() => {
        setActionSuccess(null)
        setActionError(null)
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [actionSuccess, actionError])

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">
            Bookings & Matching
          </h1>
          <p className="text-nexa-text-secondary text-sm">
            Match customers with detailers, manage payouts, and issue refunds.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-nexa-text text-sm transition-all duration-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* STATUS NOTIFICATIONS */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-nexa-mint/35 bg-nexa-mint/5 text-nexa-mint text-sm flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-nexa-error/35 bg-nexa-error/5 text-nexa-error text-sm flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{actionError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER & SEARCH BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nexa-text-muted" />
          <input
            type="text"
            placeholder="Search by vehicle make, plate, customer name, address, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 backdrop-blur-sm focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text placeholder-nexa-text-muted transition-all duration-300"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nexa-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 backdrop-blur-sm focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300 appearance-none cursor-pointer"
          >
            <option value="all">All Bookings</option>
            <option value="booked">Booked (Pending Match)</option>
            <option value="accepted">Accepted (Matched)</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* BOOKINGS TABLE/LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-nexa-text-secondary text-sm">Retrieving bookings registry…</span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-card p-12 text-center text-nexa-text-secondary">
          <CalendarDays className="w-12 h-12 mx-auto text-nexa-text-muted mb-4" />
          <h3 className="font-display font-bold text-lg mb-1">No Bookings Found</h3>
          <p className="text-sm">No wash bookings matched your current filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((booking) => {
            const isCompleted = booking.status.toLowerCase() === 'completed'
            const isCancelled = booking.status.toLowerCase() === 'cancelled'
            const isProcessing = processingId === booking.bookingId

            return (
              <motion.div
                layout
                key={booking.bookingId}
                className="glass-card p-6 flex flex-col lg:flex-row justify-between gap-6 border border-nexa-border-subtle hover:border-nexa-mint/20 transition-all duration-300 relative overflow-hidden"
              >
                {/* Details Section */}
                <div className="flex-1 space-y-4">
                  {/* Title & Status */}
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display font-bold text-base text-nexa-text">
                      {booking.vehicleSummary || 'Wash Booking'}
                    </h3>
                    <span className="text-[10px] text-nexa-text-muted font-mono bg-nexa-bg-elevated px-2 py-0.5 rounded border border-nexa-border-subtle">
                      ID: {booking.bookingId.slice(0, 8)}...
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                        booking.status === 'completed'
                          ? 'bg-nexa-mint/10 text-nexa-mint border border-nexa-mint/20'
                          : booking.status === 'cancelled'
                          ? 'bg-nexa-error/10 text-nexa-error border border-nexa-error/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {booking.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Core Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="flex items-center gap-2 text-nexa-text-secondary">
                      <CalendarDays className="w-4 h-4 text-nexa-mint" />
                      <span>
                        {new Date(booking.bookingTime).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-nexa-text-secondary">
                      <User className="w-4 h-4 text-nexa-mint" />
                      <span>
                        {booking.customerName} ({booking.customerPhone || 'No Phone'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-nexa-text-secondary md:col-span-2">
                      <MapPin className="w-4 h-4 text-nexa-mint shrink-0" />
                      <span className="truncate">{booking.serviceAddress}</span>
                    </div>
                  </div>

                  {/* Add-ons List */}
                  {booking.addons && booking.addons.length > 0 && (
                    <div className="pt-2 border-t border-nexa-border-subtle/50">
                      <p className="text-[11px] font-bold text-nexa-text-secondary uppercase tracking-wider mb-1">
                        Add-ons Included:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {booking.addons.map((a) => (
                          <span
                            key={a.addonId}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-nexa-bg border border-nexa-border-subtle text-nexa-text-secondary"
                          >
                            {a.name} (+£{parseFloat(a.price).toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailer Matching Status */}
                  <div className="pt-2">
                    {booking.vendorId ? (
                      <div className="flex items-center gap-2 text-xs text-nexa-mint">
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          Assigned to: <strong className="font-semibold">{booking.vendorName}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>Awaiting Detailer Match</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing & Control Actions */}
                <div className="flex flex-col justify-between items-end gap-4 shrink-0 lg:border-l lg:border-nexa-border-subtle/50 lg:pl-6 min-w-[200px]">
                  {/* Price */}
                  <div className="text-right">
                    <span className="block text-[10px] text-nexa-text-secondary uppercase tracking-widest">
                      Total Paid
                    </span>
                    <span className="font-display font-extrabold text-2xl text-nexa-text block">
                      £{parseFloat(booking.price).toFixed(2)}
                    </span>
                  </div>

                  {/* Action Panel */}
                  <div className="w-full space-y-2">
                    {/* Assign Matching Controls */}
                    {!isCancelled && (
                      <div className="space-y-1">
                        {assigningId === booking.bookingId ? (
                          <div className="flex gap-2">
                            <select
                              value={selectedVendorId}
                              onChange={(e) => setSelectedVendorId(e.target.value)}
                              className="flex-1 text-xs bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-lg px-2 py-1.5 focus:border-nexa-mint/40 focus:ring-0"
                            >
                              <option value="">Select Vendor...</option>
                              {vendors.map((v) => (
                                <option key={v.userId} value={v.userId}>
                                  {v.displayName || `${v.firstName} ${v.lastName}`}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={isProcessing || !selectedVendorId}
                              onClick={() => handleAssignVendor(booking.bookingId)}
                              className="px-2.5 py-1.5 rounded-lg bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/80 transition-colors"
                            >
                              Go
                            </button>
                            <button
                              onClick={() => {
                                setAssigningId(null)
                                setSelectedVendorId('')
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-nexa-bg-elevated border border-nexa-border-subtle text-xs font-semibold hover:bg-nexa-bg transition-colors"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isProcessing}
                            onClick={() => {
                              setAssigningId(booking.bookingId)
                              setSelectedVendorId(booking.vendorId || '')
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-xs font-semibold text-nexa-text transition-all duration-300"
                          >
                            <UserPlus className="w-4 h-4 text-nexa-mint" />
                            <span>{booking.vendorId ? 'Reassign Detailer' : 'Match Detailer'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Payout & Refund Buttons */}
                    {!isCancelled && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Refund Booking */}
                        <button
                          disabled={isProcessing}
                          onClick={() => handleRefund(booking.bookingId)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-nexa-error/25 bg-nexa-error/5 hover:bg-nexa-error/10 text-xs font-semibold text-nexa-error transition-all duration-300"
                          title="Issue Full Refund & Cancel"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Refund</span>
                        </button>

                        {/* Payout Vendor */}
                        <button
                          disabled={isProcessing || !booking.vendorId || !isCompleted}
                          onClick={() => handlePayout(booking.bookingId)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-300 ${
                            isCompleted && booking.vendorId
                              ? 'border-nexa-mint/25 bg-nexa-mint/5 hover:bg-nexa-mint/10 text-nexa-mint'
                              : 'border-nexa-border-subtle bg-nexa-bg-deep/50 text-nexa-text-muted cursor-not-allowed'
                          }`}
                          title={
                            !isCompleted
                              ? 'Wash must be Completed first'
                              : !booking.vendorId
                              ? 'Assign a detailer first'
                              : 'Trigger payout transfer'
                          }
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Payout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
