import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api-client'
import {
  TrendingUp,
  Calendar,
  Clock,
  Building,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Booking {
  bookingId: string
  price: string
  status: string
  bookingTime: string
  vehicleSummary?: string
  customerName?: string
  vendorId?: string
  paymentStatus?: string
}

interface CorporateLead {
  enquiryId: string
  companyName: string
  contactName: string
  fleetSize: number
  isInvoiced: boolean
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [corporateLeads, setCorporateLeads] = useState<CorporateLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [bookingsRes, corporateRes] = await Promise.all([
          api.get<Booking[]>('/admin/bookings'),
          api.get<CorporateLead[]>('/corporate-fleet'),
        ])
        setBookings(bookingsRes.data)
        setCorporateLeads(corporateRes.data)
      } catch (err) {
        console.error('Failed to load dashboard data', err)
        setError('Could not fetch metrics. Please check your credentials or try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Calculations
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'CAPTURED' && b.status.toLowerCase() !== 'cancelled')
    .reduce((sum, b) => {
      const parsed = parseFloat(b.price || '0')
      return sum + (Number.isNaN(parsed) ? 0 : parsed)
    }, 0)

  const activeLeads = corporateLeads.filter((lead) => !lead.isInvoiced)
  const unassignedJobs = bookings.filter(
    (b) => !b.vendorId && b.paymentStatus === 'CAPTURED' && b.status.toLowerCase() !== 'cancelled'
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  } as const

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
        <span className="text-nexa-text-secondary text-sm">Aggregating Nexa metrics…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6 border border-nexa-error/20 bg-nexa-error/5 max-w-2xl mx-auto my-12 text-center">
        <AlertTriangle className="w-12 h-12 text-nexa-error mx-auto mb-4" />
        <h3 className="font-display font-bold text-xl text-nexa-error mb-2">Dashboard Error</h3>
        <p className="text-nexa-text-secondary text-sm mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-nexa-mint/20 border border-nexa-mint/30 text-nexa-mint font-semibold hover:bg-nexa-mint/30 transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* HEADER AREA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">
            Dashboard
          </h1>
          <p className="text-nexa-text-secondary text-sm">
            Nexa Valet Operations & Commercial Analytics Hub.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nexa-mint/10 border border-nexa-mint/20 text-nexa-mint text-xs font-semibold self-start md:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>System Status: Optimal</span>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* TOTAL REVENUE */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-6 glow-teal flex flex-col justify-between group hover:border-nexa-mint/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-nexa-text-secondary uppercase tracking-widest">
              Total Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 flex items-center justify-center text-nexa-mint">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-3xl tracking-tight text-nexa-text mb-1">
              £{totalRevenue.toFixed(2)}
            </h3>
            <p className="text-[11px] text-nexa-text-secondary">
              From completed customer washes
            </p>
          </div>
        </motion.div>

        {/* TOTAL BOOKINGS */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-6 flex flex-col justify-between group hover:border-nexa-mint/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-nexa-text-secondary uppercase tracking-widest">
              Total Bookings
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-3xl tracking-tight text-nexa-text mb-1">
              {bookings.length}
            </h3>
            <p className="text-[11px] text-nexa-text-secondary">
              Lifetime requests received
            </p>
          </div>
        </motion.div>

        {/* UNASSIGNED JOBS */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-6 flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-nexa-text-secondary uppercase tracking-widest">
              Unassigned Jobs
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-3xl tracking-tight text-nexa-text mb-1">
              {unassignedJobs.length}
            </h3>
            <p className="text-[11px] text-nexa-text-secondary">
              Bookings awaiting detailer match
            </p>
          </div>
        </motion.div>

        {/* ACTIVE CORP LEADS */}
        <motion.div
          variants={itemVariants}
          className="glass-card p-6 flex flex-col justify-between group hover:border-purple-500/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-nexa-text-secondary uppercase tracking-widest">
              Active Corporate Leads
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-3xl tracking-tight text-nexa-text mb-1">
              {activeLeads.length}
            </h3>
            <p className="text-[11px] text-nexa-text-secondary">
              Uninvoiced company requests
            </p>
          </div>
        </motion.div>
      </div>

      {/* OPERATIONS INSIGHTS & RECENT ACTIVITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT BOOKINGS */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-nexa-text">Recent Bookings</h2>
              <p className="text-xs text-nexa-text-secondary">Latest wash requests & status log</p>
            </div>
            <Link
              to="/admin/bookings"
              className="flex items-center gap-1.5 text-xs text-nexa-mint font-semibold hover:underline"
            >
              <span>Manage all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-nexa-border-subtle/50">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.bookingId} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate block">
                      {b.vehicleSummary || 'Wash Request'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full capitalize font-semibold bg-nexa-bg-elevated border border-nexa-border-subtle text-nexa-text-secondary">
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-nexa-text-secondary">
                    {new Date(b.bookingTime).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-bold text-sm text-nexa-text">£{parseFloat(b.price).toFixed(2)}</span>
                  <span className="text-[10px] text-nexa-text-muted">
                    {b.vendorId ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="text-center py-12 text-nexa-text-secondary text-sm">
                No bookings registered in the system yet.
              </div>
            )}
          </div>
        </motion.div>

        {/* OPERATIONS ASSISTANT */}
        <motion.div variants={itemVariants} className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-lg text-nexa-text">Operational Center</h2>
              <p className="text-xs text-nexa-text-secondary">Action items requiring attention</p>
            </div>

            <div className="space-y-4">
              {unassignedJobs.length > 0 ? (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-300">Assign Detailers</h4>
                    <p className="text-xs text-nexa-text-secondary mt-1">
                      {unassignedJobs.length} booking(s) require detailer assignment to ensure service delivery.
                    </p>
                    <Link
                      to="/admin/bookings"
                      className="inline-flex items-center gap-1 text-xs text-amber-300 font-semibold hover:underline mt-2"
                    >
                      <span>Matchmaker</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-nexa-mint/20 bg-nexa-mint/5 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-nexa-mint shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-nexa-mint">All Jobs Matched</h4>
                    <p className="text-xs text-nexa-text-secondary mt-1">
                      All currently scheduled customer bookings have been matched with certified detailers.
                    </p>
                  </div>
                </div>
              )}

              {activeLeads.length > 0 && (
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex gap-3">
                  <Building className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-purple-300">Corporate Billings</h4>
                    <p className="text-xs text-nexa-text-secondary mt-1">
                      You have {activeLeads.length} active fleet pipeline leads waiting for custom invoice generation.
                    </p>
                    <Link
                      to="/admin/corporate"
                      className="inline-flex items-center gap-1 text-xs text-purple-300 font-semibold hover:underline mt-2"
                    >
                      <span>Generate Invoices</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-nexa-border-subtle/50 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-nexa-text-secondary block mb-1">
              Version controls
            </span>
            <span className="text-xs text-nexa-text-muted">Nexa MVP v1.1.0-alpha</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
