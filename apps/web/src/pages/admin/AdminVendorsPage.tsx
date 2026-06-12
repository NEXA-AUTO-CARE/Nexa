import { useEffect, useState } from 'react'
import { api } from '../../lib/api-client'
import {
  Search,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Clock,
  Truck,
  Plus,
  X,
  MapPin
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AdminVendor {
  vendorId: string
  companyName: string
  approvalStatus: string
  latitude: string | null
  longitude: string | null
  user: {
    userId: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phoneNumber: string | null
    displayName: string
    createdAt: string
  }
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-nexa-mint/10 text-nexa-mint border-nexa-mint/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  SUSPENDED: 'bg-nexa-error/10 text-nexa-error border-nexa-error/20',
}

const AVAILABLE_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED']

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<AdminVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Create form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    latitude: '',
    longitude: ''
  })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<AdminVendor[]>('/admin/vendors')
      setVendors(data)
    } catch {
      setError('Failed to load vendors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!success && !error) return
    const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000)
    return () => clearTimeout(t)
  }, [success, error])

  const handleStatusChange = async (vendor: AdminVendor, newStatus: string) => {
    try {
      setError(null)
      await api.patch(`/admin/vendors/${vendor.vendorId}`, { approvalStatus: newStatus })
      setVendors(vendors.map((v) =>
        v.vendorId === vendor.vendorId ? { ...v, approvalStatus: newStatus } : v
      ))
      setSuccess(`Vendor status updated to ${newStatus}.`)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to update status.')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)
      setError(null)
      
      const payload: any = { ...formData }
      if (payload.latitude) payload.latitude = parseFloat(payload.latitude)
      if (payload.longitude) payload.longitude = parseFloat(payload.longitude)
        
      const { data } = await api.post('/admin/vendors', payload)
      
      setSuccess(`Vendor ${data.companyName || data.user?.displayName} created successfully!`)
      setIsCreateModalOpen(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        companyName: '',
        latitude: '',
        longitude: ''
      })
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      setError(Array.isArray(message) ? message[0] : message || 'Failed to create vendor.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = vendors.filter((v) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      v.companyName?.toLowerCase().includes(q) ||
      v.user?.displayName.toLowerCase().includes(q) ||
      (v.user?.email?.toLowerCase().includes(q)) ||
      (v.user?.phoneNumber?.includes(q))
    )
  })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const getInitials = (name: string) => {
    if (!name) return 'V'
    const parts = name.split(' ')
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">Vendors</h1>
          <p className="text-nexa-text-secondary text-sm">Manage vendor partners, locations, and onboarding.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexa-text-muted" />
            <input
              type="text"
              placeholder="Search vendors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text placeholder-nexa-text-muted transition-all duration-300"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-nexa-mint text-nexa-bg-deep rounded-xl font-semibold text-sm hover:bg-nexa-mint/90 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Vendor
          </button>
        </div>
      </div>

      {/* TOAST */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-nexa-mint/35 bg-nexa-mint/5 text-nexa-mint text-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" /><span>{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-nexa-error/35 bg-nexa-error/5 text-nexa-error text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-2 text-xs text-nexa-text-muted">
          <Truck className="w-4 h-4" />
          <span>{filtered.length} vendor{filtered.length !== 1 ? 's' : ''}{search.trim() ? ` matching "${search}"` : ''}</span>
        </div>
      )}

      {/* LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-nexa-text-secondary text-sm">Loading vendors…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-nexa-text-secondary">
          <Truck className="w-12 h-12 mx-auto text-nexa-text-muted mb-4" />
          <h3 className="font-display font-bold text-lg mb-1">
            {search.trim() ? 'No Matches' : 'No Vendors Found'}
          </h3>
          <p className="text-sm">
            {search.trim() ? 'Try adjusting your search query.' : 'Vendors will appear here once registered.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-nexa-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexa-border-subtle bg-nexa-bg-deep/50">
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted">Vendor</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted hidden md:table-cell">Contact</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted">Location</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted hidden lg:table-cell">Status</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted hidden lg:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.vendorId} className="border-b border-nexa-border-subtle/50 hover:bg-nexa-bg-elevated/20 transition-colors">
                    {/* Vendor Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-nexa-bg-elevated border border-nexa-border-subtle flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-nexa-text-secondary">{getInitials(v.companyName || v.user?.displayName)}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="block font-semibold text-nexa-text truncate">{v.companyName || 'No Company Name'}</span>
                          <span className="block text-[11px] text-nexa-text-muted truncate">
                            {v.user?.displayName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {v.user?.email && (
                          <span className="flex items-center gap-1.5 text-xs text-nexa-text-secondary">
                            <Mail className="w-3 h-3 text-nexa-text-muted" /> {v.user.email}
                          </span>
                        )}
                        {v.user?.phoneNumber && (
                          <span className="flex items-center gap-1.5 text-xs text-nexa-text-secondary">
                            <Phone className="w-3 h-3 text-nexa-text-muted" /> {v.user.phoneNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Location */}
                    <td className="py-3 px-4">
                       <span className="flex items-center gap-1.5 text-xs text-nexa-text-secondary">
                          <MapPin className="w-3 h-3 text-nexa-text-muted" /> {v.latitude && v.longitude ? `${v.latitude}, ${v.longitude}` : 'Not set'}
                       </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <select
                        value={v.approvalStatus}
                        onChange={(e) => handleStatusChange(v, e.target.value)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border cursor-pointer bg-transparent focus:ring-0 focus:outline-none ${STATUS_STYLES[v.approvalStatus] || STATUS_STYLES.PENDING}`}
                      >
                        {AVAILABLE_STATUSES.map((r) => (
                          <option key={r} value={r} className="bg-nexa-bg text-nexa-text">
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Joined */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-xs text-nexa-text-muted">
                        <Clock className="w-3 h-3" /> {fmtDate(v.user?.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE VENDOR MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg z-50 glass-card border border-nexa-border-subtle overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-nexa-border-subtle shrink-0">
                <h3 className="font-display font-bold text-xl text-nexa-text">Create Vendor Profile</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-nexa-bg-elevated transition-colors text-nexa-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="createVendorForm" onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">Last Name</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                      placeholder="+1234567890"
                    />
                    <p className="text-[10px] text-nexa-text-muted mt-1">Provide at least an email or phone number for the vendor to login.</p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                      placeholder="Nexa Valeting Ltd"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                        placeholder="51.5072"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                        placeholder="0.1276"
                      />
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-nexa-border-subtle shrink-0 flex justify-end gap-3 bg-nexa-bg-deep/50">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-nexa-text-secondary hover:text-nexa-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="createVendorForm"
                  disabled={creating}
                  className="px-6 py-2 bg-nexa-mint text-nexa-bg-deep rounded-xl font-semibold text-sm hover:bg-nexa-mint/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating && <div className="w-4 h-4 border-2 border-nexa-bg-deep/30 border-t-nexa-bg-deep rounded-full animate-spin" />}
                  {creating ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
