import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api-client'
import {
  CalendarDays,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserPlus,
  CreditCard,
  CheckSquare,
  AlertCircle,
  ArrowLeft,
  Settings,
  Trash2,
  Edit,
  X,
  Clock
} from 'lucide-react'
import { BookingStatus, PaymentStatus } from '@nexa/shared'
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
  paymentStatus: string
  createdAt: string
  addons?: Addon[]
  vendorId?: string
  vendorName?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  stripePaymentIntentId?: string
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

export default function AdminBookingDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [vendors, setVendors] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [newPaymentStatus, setNewPaymentStatus] = useState('')

  const [showEditModal, setShowEditModal] = useState(false)
  const [editBookingTime, setEditBookingTime] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editAddonIds, setEditAddonIds] = useState<string[]>([])
  const [allAddons, setAllAddons] = useState<Addon[]>([])

  type RawBooking = {
    customer?: { firstName?: string; lastName?: string; displayName?: string; email?: string; phoneNumber?: string }
    vendor?: { firstName?: string; lastName?: string; displayName?: string }
    [key: string]: unknown
  }

  const loadData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [bookingRes, vendorsRes, addonsRes] = await Promise.all([
        api.get<RawBooking>(`/admin/bookings/${id}`),
        api.get<any[]>('/admin/vendors'),
        api.get<any[]>('/addons'),
      ])

      const b = bookingRes.data as any
      const custName = b.customerName || 'Unknown'
      const vendName = b.vendorName || undefined

      const bookingData = {
        ...b,
        customerName: custName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone,
        vendorName: vendName,
        stripePaymentIntentId: b.stripePaymentIntentId,
      } as Booking

      setBooking(bookingData)
      setNewStatus(bookingData.status)
      setNewPaymentStatus(bookingData.paymentStatus)
      
      const activeVendors = vendorsRes.data
        .filter((v: any) => v.approvalStatus === 'ACTIVE')
        .map((v: any) => {
          const user = v.user || {};
          return {
            userId: user.userId || '',
            displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '',
            role: user.role || 'vendor',
            email: user.email || '',
            firstName: user.firstName,
            lastName: user.lastName,
          } as SystemUser;
        });
        
      setVendors(activeVendors)
      setAllAddons(addonsRes.data || [])
    } catch (err) {
      console.error('Failed to load booking data', err)
      setActionError('Could not fetch booking details. Please check authorization or if the booking exists.')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = () => {
    if (!booking) return
    const dt = booking.bookingTime ? new Date(booking.bookingTime) : new Date()
    // format as YYYY-MM-DDTHH:mm
    const tzOffset = dt.getTimezoneOffset() * 60000
    const localIso = new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16)
    setEditBookingTime(localIso)
    setEditAddress(booking.serviceAddress || '')
    setEditAddonIds((booking.addons || []).map((a) => a.addonId))
    setShowEditModal(true)
  }

  const handleSaveEdit = () => handleAction(async () => {
    if (!editBookingTime) throw new Error('Please specify a date and time')
    if (!editAddress.trim()) throw new Error('Please specify a service address')

    await api.patch(`/admin/bookings/${id}/edit`, {
      bookingTime: new Date(editBookingTime).toISOString(),
      serviceAddress: editAddress.trim(),
      addonIds: editAddonIds,
    })
    setActionSuccess('Booking updated successfully.')
    setShowEditModal(false)
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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

  const handleAction = async (action: () => Promise<void>) => {
    try {
      setProcessing(true)
      setActionError(null)
      setActionSuccess(null)
      await action()
      await loadData()
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setActionError(message || 'Action failed.')
    } finally {
      setProcessing(false)
    }
  }

  const handleAssignVendor = () => handleAction(async () => {
    if (!selectedVendorId) {
      throw new Error('Please select a detailer to assign')
    }
    await api.patch(`/admin/bookings/${id}/assign-vendor`, { vendorId: selectedVendorId })
    setActionSuccess('Detailer assigned successfully.')
    setSelectedVendorId('')
  })

  const handleUpdateStatus = () => handleAction(async () => {
    if (!newStatus) return
    await api.patch(`/admin/bookings/${id}/status`, { status: newStatus })
    setActionSuccess('Booking status updated.')
  })

  const handleUpdatePaymentStatus = () => handleAction(async () => {
    if (!newPaymentStatus) return
    await api.patch(`/admin/bookings/${id}/payment-status`, { status: newPaymentStatus })
    setActionSuccess('Payment status updated.')
  })

  const handleSyncPaymentStatus = () => handleAction(async () => {
    await api.post(`/admin/bookings/${id}/sync-payment`)
    setActionSuccess('Payment status successfully synced from Stripe.')
    await loadData()
  })

  const handlePayout = () => handleAction(async () => {
    if (!window.confirm('Are you sure you want to trigger the vendor payout split (85% to vendor, 15% platform)?')) {
      return
    }
    await api.post(`/payments/bookings/${id}/payout`)
    setActionSuccess('Vendor payout successfully initiated.')
  })

  const handleRefund = () => handleAction(async () => {
    if (!booking) return
    if (booking.paymentStatus.toLowerCase() !== 'captured') {
      throw new Error(`Only confirmed paid bookings (Captured) can be refunded. Current payment status is "${booking.paymentStatus}".`)
    }
    const isAlreadyCompleted = booking.status.toLowerCase() === 'completed'
    const promptMessage = isAlreadyCompleted
      ? 'This booking is marked as Completed. Refunding will issue a full refund via Stripe and cancel the booking. Are you sure you want to proceed?'
      : 'Are you sure you want to refund this booking in full via Stripe? This will issue a full refund and cancel the job.'

    if (!window.confirm(promptMessage)) {
      return
    }
    await api.post(`/payments/bookings/${id}/refund`)
    setActionSuccess('Customer refund successfully processed in Stripe and booking marked as cancelled.')
  })

  const handleDeleteBooking = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this booking? This action cannot be undone.')) {
      return
    }
    try {
      setProcessing(true)
      await api.delete(`/bookings/${id}`)
      navigate('/admin/bookings')
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setActionError(message || 'Failed to delete booking.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
        <span className="text-nexa-text-secondary text-sm">Retrieving booking details…</span>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="glass-card p-12 text-center text-nexa-text-secondary">
        <AlertCircle className="w-12 h-12 mx-auto text-nexa-error mb-4" />
        <h3 className="font-display font-bold text-lg mb-1">Booking Not Found</h3>
        <p className="text-sm mb-6">We couldn't find the requested booking.</p>
        <button onClick={() => navigate('/admin/bookings')} className="text-nexa-mint hover:underline text-sm">
          Return to Bookings List
        </button>
      </div>
    )
  }

  const isCompleted = booking.status.toLowerCase() === 'completed'
  const isCancelled = booking.status.toLowerCase() === 'cancelled'

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/bookings')}
            className="p-2 rounded-xl bg-nexa-bg hover:bg-nexa-bg-elevated border border-nexa-border-subtle transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-nexa-text" />
          </button>
          <div>
            <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight flex items-center gap-3">
              Booking Details
              <span className="text-xs text-nexa-text-muted font-mono bg-nexa-bg-elevated px-2 py-1 rounded border border-nexa-border-subtle">
                {booking.bookingId.slice(0, 8)}...
              </span>
            </h1>
            <p className="text-nexa-text-secondary text-sm mt-1">
              Manage booking state, vendor assignment, and payments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEditModal}
            disabled={processing || isCompleted || isCancelled}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-nexa-mint/30 bg-nexa-mint/10 hover:bg-nexa-mint/20 text-nexa-mint text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Booking</span>
          </button>
          <button
            onClick={loadData}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-nexa-text text-sm transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-nexa-border-subtle">
            <h2 className="text-lg font-bold text-nexa-text mb-4 border-b border-nexa-border-subtle pb-3">
              Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Vehicle</p>
                  <p className="font-semibold text-nexa-text">{booking.vehicleSummary || 'Wash Booking'}</p>
                </div>
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Service Type</p>
                  <p className="font-semibold text-nexa-text capitalize">{booking.serviceType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Total Price</p>
                  <p className="font-bold text-nexa-mint text-lg">£{parseFloat(booking.price).toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Customer</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-nexa-text-muted" />
                    <span className="text-nexa-text">{booking.customerName}</span>
                  </div>
                  {(booking.customerPhone || booking.customerEmail) && (
                    <p className="text-xs text-nexa-text-muted mt-1">
                      {booking.customerPhone} {booking.customerEmail ? `| ${booking.customerEmail}` : ''}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Booking Placed On</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-nexa-text-muted" />
                    <span className="text-nexa-text">
                      {booking.createdAt
                        ? new Date(booking.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Service Date & Time</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-nexa-text-muted" />
                    <span className="text-nexa-text">
                      {new Date(booking.bookingTime).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-1">Location</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-nexa-text-muted shrink-0 mt-0.5" />
                    <span className="text-nexa-text">{booking.serviceAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            {booking.addons && booking.addons.length > 0 && (
              <div className="mt-6 pt-4 border-t border-nexa-border-subtle/50">
                <p className="text-nexa-text-secondary text-xs uppercase tracking-wider mb-2">Selected Add-ons</p>
                <div className="flex flex-wrap gap-2">
                  {booking.addons.map((a) => (
                    <span
                      key={a.addonId}
                      className="text-xs px-3 py-1.5 rounded-lg bg-nexa-bg border border-nexa-border-subtle text-nexa-text flex items-center gap-2"
                    >
                      <span>{a.name}</span>
                      <span className="text-nexa-text-muted">+£{parseFloat(a.price).toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vendor Assignment */}
          <div className="glass-card p-6 border border-nexa-border-subtle">
            <h2 className="text-lg font-bold text-nexa-text mb-4 border-b border-nexa-border-subtle pb-3">
              Detailer Assignment
            </h2>

            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                <strong>48-Hour Vendor Window:</strong> Customers book at least 48 hours in advance. Please assign a detailer promptly to allow them time to accept or reject the booking before the service date.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                {booking.vendorId ? (
                  <div className="flex items-center gap-2 text-sm text-nexa-mint">
                    <CheckSquare className="w-5 h-5" />
                    <span>
                      Assigned to: <strong className="font-semibold text-nexa-text">{booking.vendorName}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>Awaiting Detailer Match</span>
                  </div>
                )}
              </div>
              
              {!isCancelled && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="flex-1 sm:w-48 text-sm bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl px-3 py-2 focus:border-nexa-mint/40 focus:ring-0"
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.userId} value={v.userId}>
                        {v.displayName || `${v.firstName} ${v.lastName}`}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={processing || !selectedVendorId}
                    onClick={handleAssignVendor}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-nexa-bg hover:bg-nexa-bg-elevated border border-nexa-border-subtle text-nexa-text text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Controls */}
        <div className="space-y-6">
          {/* Booking State Management */}
          <div className="glass-card p-6 border border-nexa-border-subtle">
            <h2 className="text-lg font-bold text-nexa-text mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-nexa-mint" />
              Booking Status
            </h2>
            
            <div className="mb-4">
              <span
                className={`inline-block text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                  booking.status === BookingStatus.COMPLETED
                    ? 'bg-nexa-mint/10 text-nexa-mint border border-nexa-mint/20'
                    : booking.status === BookingStatus.CANCELLED
                    ? 'bg-nexa-error/10 text-nexa-error border border-nexa-error/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                Current: {booking.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-nexa-text-secondary">Override booking state:</p>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full text-sm bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl px-3 py-2.5 focus:border-nexa-mint/40 focus:ring-0"
              >
                <option value={BookingStatus.BOOKED}>Booked (Pending Match)</option>
                <option value={BookingStatus.ASSIGNED}>Assigned (Detailer Linked)</option>
                <option value={BookingStatus.ACCEPTED}>Accepted (Confirmed by Detailer)</option>
                <option value={BookingStatus.IN_PROGRESS}>In Progress</option>
                <option value={BookingStatus.COMPLETED}>Completed</option>
                <option value={BookingStatus.CANCELLED}>Cancelled</option>
              </select>
              <button
                disabled={processing || newStatus === booking.status}
                onClick={handleUpdateStatus}
                className="w-full py-2.5 rounded-xl bg-nexa-bg hover:bg-nexa-bg-elevated border border-nexa-border-subtle text-nexa-text text-sm font-semibold transition-all disabled:opacity-50"
              >
                Update Status
              </button>
            </div>
          </div>

          {/* Payment State Management */}
          <div className="glass-card p-6 border border-nexa-border-subtle">
            <h2 className="text-lg font-bold text-nexa-text mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-nexa-mint" />
              Payment Status
            </h2>

            <div className="mb-4 flex items-center justify-between">
              <span
                className={`inline-block text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                  booking.paymentStatus === PaymentStatus.CAPTURED
                    ? 'bg-nexa-mint/10 text-nexa-mint border border-nexa-mint/20'
                    : booking.paymentStatus === PaymentStatus.REFUNDED
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : booking.paymentStatus === PaymentStatus.FAILED
                    ? 'bg-nexa-error/10 text-nexa-error border border-nexa-error/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                Current: {booking.paymentStatus}
              </span>
              
              {booking.stripePaymentIntentId && (
                <button
                  onClick={handleSyncPaymentStatus}
                  disabled={processing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-nexa-mint/20 bg-nexa-mint/5 hover:bg-nexa-mint/10 text-nexa-mint text-xs font-semibold transition-all duration-300 disabled:opacity-50"
                  title="Sync latest payment status from Stripe"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                  Sync from Stripe
                </button>
              )}
            </div>

            <div className="space-y-3 pb-4 border-b border-nexa-border-subtle/50 mb-4">
              <p className="text-xs text-nexa-text-secondary">Override payment state:</p>
              <select
                value={newPaymentStatus}
                onChange={(e) => setNewPaymentStatus(e.target.value)}
                className="w-full text-sm bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl px-3 py-2.5 focus:border-nexa-mint/40 focus:ring-0"
              >
                <option value={PaymentStatus.PENDING}>Pending (Unpaid)</option>
                <option value={PaymentStatus.PROCESSING}>Processing</option>
                <option value={PaymentStatus.CAPTURED}>Captured (Paid)</option>
                <option value={PaymentStatus.FAILED}>Failed</option>
                <option value={PaymentStatus.REFUNDED}>Refunded</option>
              </select>
              <button
                disabled={processing || newPaymentStatus === booking.paymentStatus}
                onClick={handleUpdatePaymentStatus}
                className="w-full py-2.5 rounded-xl bg-nexa-bg hover:bg-nexa-bg-elevated border border-nexa-border-subtle text-nexa-text text-sm font-semibold transition-all disabled:opacity-50"
              >
                Update Payment Status
              </button>
            </div>

            {/* Refund and Payout Actions */}
            <div className="space-y-3">
              <p className="text-xs text-nexa-text-secondary">Financial Actions:</p>
              <button
                disabled={processing || booking.paymentStatus !== PaymentStatus.CAPTURED}
                onClick={handleRefund}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  booking.paymentStatus === PaymentStatus.CAPTURED
                    ? 'border-nexa-error/25 bg-nexa-error/5 hover:bg-nexa-error/10 text-nexa-error'
                    : 'border-nexa-border-subtle bg-nexa-bg-deep/50 text-nexa-text-muted cursor-not-allowed opacity-60'
                }`}
                title={
                  booking.paymentStatus !== PaymentStatus.CAPTURED
                    ? 'Only confirmed paid bookings (Captured) can be refunded'
                    : 'Initiate full customer refund in Stripe'
                }
              >
                <XCircle className="w-4 h-4" />
                Initiate Refund
              </button>
              <button
                disabled={processing || !booking.vendorId || !isCompleted}
                onClick={handlePayout}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
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
                <CreditCard className="w-4 h-4" />
                Process Payout
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-6 border border-nexa-border-subtle">
            <h2 className="text-lg font-bold text-nexa-text mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-nexa-error" />
              Danger Zone
            </h2>
            <div className="space-y-3">
              <p className="text-xs text-nexa-text-secondary">Permanently remove this booking:</p>
              <button
                disabled={processing}
                onClick={handleDeleteBooking}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-nexa-error/25 bg-nexa-error/5 hover:bg-nexa-error/10 text-nexa-error text-sm font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT BOOKING MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-lg p-6 space-y-6 border border-nexa-border-subtle bg-nexa-bg-card-solid"
            >
              <div className="flex items-center justify-between border-b border-nexa-border-subtle pb-3">
                <h3 className="text-lg font-bold text-nexa-text flex items-center gap-2">
                  <Edit className="w-5 h-5 text-nexa-mint" />
                  Edit Booking
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-bg-elevated transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary mb-1.5">
                    Service Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editBookingTime}
                    onChange={(e) => setEditBookingTime(e.target.value)}
                    className="w-full bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl p-3 text-sm focus:border-nexa-mint/40 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary mb-1.5">
                    Service Address
                  </label>
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl p-3 text-sm focus:border-nexa-mint/40 focus:ring-0 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary mb-2">
                    Service Add-ons
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {allAddons.map((addon) => {
                      const isChecked = editAddonIds.includes(addon.addonId)
                      return (
                        <label
                          key={addon.addonId}
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                            isChecked
                              ? 'border-nexa-mint/40 bg-nexa-mint/10 text-nexa-text'
                              : 'border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-nexa-text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditAddonIds([...editAddonIds, addon.addonId])
                                } else {
                                  setEditAddonIds(editAddonIds.filter((id) => id !== addon.addonId))
                                }
                              }}
                              className="accent-nexa-mint h-4 w-4 rounded"
                            />
                            <span className="font-medium text-nexa-text">{addon.name}</span>
                          </div>
                          <span className="text-xs text-nexa-mint font-semibold">+£{parseFloat(addon.price).toFixed(2)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Live price preview */}
                {booking && (
                  <div className="p-3 rounded-xl bg-nexa-bg border border-nexa-border-subtle flex items-center justify-between">
                    <div>
                      <p className="text-xs text-nexa-text-secondary">Estimated Total</p>
                      <p className="text-[11px] text-nexa-text-muted">
                        Base service + {editAddonIds.length} add-on(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-nexa-mint text-base">
                        £{(() => {
                          const currentAddonsSum = (booking.addons || []).reduce((sum, a) => sum + parseFloat(a.price || '0'), 0)
                          const basePrice = Math.max(0, parseFloat(booking.price || '0') - currentAddonsSum)
                          const newAddonsSum = allAddons
                            .filter((a) => editAddonIds.includes(a.addonId))
                            .reduce((sum, a) => sum + parseFloat(a.price || '0'), 0)
                          return (basePrice + newAddonsSum).toFixed(2)
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-nexa-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-nexa-text text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 rounded-xl bg-nexa-mint text-nexa-text-dark font-semibold text-sm hover:bg-nexa-mint-hover transition-all disabled:opacity-50"
                >
                  {processing ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
