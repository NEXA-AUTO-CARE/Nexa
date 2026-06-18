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

interface PostcodeAddress {
  line_1: string
  line_2: string | null
  line_3: string | null
  post_town: string
  postcode: string
  latitude?: number | null
  longitude?: number | null
  uprn?: string | null
}

interface AdminVendor {
  vendorId: string
  companyName: string
  approvalStatus: string
  latitude: string | null
  longitude: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  addressLine3?: string | null
  postTown?: string | null
  postcode?: string | null
  uprn?: string | null
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
    longitude: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    postTown: '',
    postcode: '',
    uprn: ''
  })
  const [creating, setCreating] = useState(false)

  // Postcode search state inside the modal
  const [postcodeQuery, setPostcodeQuery] = useState('')
  const [lookupResults, setLookupResults] = useState<PostcodeAddress[]>([])
  const [searchingPostcode, setSearchingPostcode] = useState(false)
  const [selectedResult, setSelectedResult] = useState<PostcodeAddress | null>(null)
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [showManualAddress, setShowManualAddress] = useState(false)

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      companyName: '',
      latitude: '',
      longitude: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      postTown: '',
      postcode: '',
      uprn: ''
    })
    setPostcodeQuery('')
    setLookupResults([])
    setSelectedResult(null)
    setAddressConfirmed(false)
    setShowManualAddress(false)
  }

  const handlePostcodeSearch = async () => {
    if (!postcodeQuery.trim()) return
    setSearchingPostcode(true)
    setError(null)
    setLookupResults([])
    setSelectedResult(null)
    try {
      const response = await api.get<PostcodeAddress[]>('/postcode-lookup', {
        params: { postcode: postcodeQuery.trim() }
      })
      setLookupResults(response.data)
      if (response.data.length === 0) {
        setShowManualAddress(true)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to search postcode.'
      setError(msg)
    } finally {
      setSearchingPostcode(false)
    }
  }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() setState is deferred behind await
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
    if (!addressConfirmed) {
      setError('Please search and confirm the vendor\'s service address.')
      return
    }
    try {
      setCreating(true)
      setError(null)
      
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        companyName: formData.companyName,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        addressLine1: formData.addressLine1 || null,
        addressLine2: formData.addressLine2 || null,
        addressLine3: formData.addressLine3 || null,
        postTown: formData.postTown || null,
        postcode: formData.postcode || null,
        uprn: formData.uprn || null,
      }
        
      const { data } = await api.post('/admin/vendors', payload)
      
      setSuccess(`Vendor ${data.companyName || data.user?.displayName} created successfully!`)
      setIsCreateModalOpen(false)
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
            onClick={openCreateModal}
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
                      <div className="space-y-0.5">
                        {v.addressLine1 ? (
                          <>
                            <span className="block text-xs font-semibold text-nexa-text truncate max-w-[180px]">
                              {v.addressLine1}{v.addressLine2 ? `, ${v.addressLine2}` : ''}
                            </span>
                            <span className="block text-[10px] text-nexa-text-muted">
                              {v.postTown}, {v.postcode}
                            </span>
                          </>
                        ) : v.latitude && v.longitude ? (
                          <span className="flex items-center gap-1.5 text-xs text-nexa-text-secondary">
                            <MapPin className="w-3 h-3 text-nexa-text-muted" /> {Number(v.latitude).toFixed(4)}, {Number(v.longitude).toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-xs text-nexa-text-muted italic">Not set</span>
                        )}
                      </div>
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
                  
                  {/* Address Section */}
                  <div className="space-y-2 border-t border-nexa-border-subtle/50 pt-4">
                    <label className="text-xs font-semibold text-nexa-text-secondary uppercase tracking-wider block">Company Address</label>
                    {addressConfirmed ? (
                      <div className="p-4 rounded-xl border border-nexa-mint/30 bg-nexa-mint/5 relative space-y-1">
                        <p className="text-sm font-semibold text-nexa-text">{formData.addressLine1}</p>
                        {formData.addressLine2 && <p className="text-xs text-nexa-text-secondary">{formData.addressLine2}</p>}
                        {formData.addressLine3 && <p className="text-xs text-nexa-text-secondary">{formData.addressLine3}</p>}
                        <p className="text-xs text-nexa-text-secondary">{formData.postTown}, {formData.postcode}</p>
                        {formData.latitude && formData.longitude && (
                          <p className="text-[10px] text-nexa-text-muted mt-1">
                            Verified Coordinates: {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAddressConfirmed(false)
                            setFormData({
                              ...formData,
                              addressLine1: '',
                              addressLine2: '',
                              addressLine3: '',
                              postTown: '',
                              postcode: '',
                              uprn: '',
                              latitude: '',
                              longitude: ''
                            })
                            setSelectedResult(null)
                            setLookupResults([])
                          }}
                          className="absolute top-3 right-3 text-xs text-nexa-mint font-semibold hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : showManualAddress ? (
                      <div className="p-4 rounded-xl border border-nexa-border-subtle bg-nexa-bg-deep/30 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-nexa-text">Manual Address Entry</span>
                          <button
                            type="button"
                            onClick={() => setShowManualAddress(false)}
                            className="text-[11px] text-nexa-mint font-semibold hover:underline"
                          >
                            Use Postcode Lookup
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Address Line 1 *"
                            value={formData.addressLine1}
                            onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                          />
                          <input
                            type="text"
                            placeholder="Address Line 2 (Optional)"
                            value={formData.addressLine2}
                            onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                          />
                          <input
                            type="text"
                            placeholder="Address Line 3 (Optional)"
                            value={formData.addressLine3}
                            onChange={e => setFormData({ ...formData, addressLine3: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Town/City *"
                              value={formData.postTown}
                              onChange={e => setFormData({ ...formData, postTown: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                            />
                            <input
                              type="text"
                              placeholder="Postcode *"
                              value={formData.postcode}
                              onChange={e => setFormData({ ...formData, postcode: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="any"
                              placeholder="Latitude *"
                              value={formData.latitude}
                              onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="Longitude *"
                              value={formData.longitude}
                              onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!formData.addressLine1.trim() || !formData.postTown.trim() || !formData.postcode.trim() || !formData.latitude.trim() || !formData.longitude.trim()}
                          onClick={() => {
                            setAddressConfirmed(true)
                            setShowManualAddress(false)
                          }}
                          className="w-full py-2 bg-nexa-mint text-nexa-bg-deep rounded-xl font-semibold text-sm hover:bg-nexa-mint/90 transition-colors disabled:opacity-50"
                        >
                          Confirm Manual Address
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter postcode (e.g. ID1 1QD)"
                            value={postcodeQuery}
                            onChange={e => setPostcodeQuery(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handlePostcodeSearch();
                              }
                            }}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg text-sm text-nexa-text focus:border-nexa-mint/40 focus:ring-0 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={handlePostcodeSearch}
                            disabled={searchingPostcode || !postcodeQuery.trim()}
                            className="px-4 py-2.5 bg-nexa-bg-elevated border border-nexa-border-subtle text-nexa-text rounded-xl font-semibold text-sm hover:bg-nexa-border-subtle transition-colors disabled:opacity-50"
                          >
                            {searchingPostcode ? 'Searching...' : 'Find'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualAddress(true)
                            if (postcodeQuery) setFormData({ ...formData, postcode: postcodeQuery })
                          }}
                          className="text-[11px] text-nexa-text-muted hover:text-nexa-text transition-colors"
                        >
                          Or enter manually with coordinates
                        </button>

                        {lookupResults.length > 0 && (
                          <div className="max-h-40 overflow-y-auto border border-nexa-border-subtle bg-nexa-bg p-1 space-y-0.5 rounded-xl shadow-inner">
                            {lookupResults.map((addr, idx) => {
                              const formatted = [addr.line_1, addr.line_2, addr.line_3]
                                .filter(Boolean)
                                .join(', ')
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedResult(addr)}
                                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex justify-between items-center ${
                                    selectedResult === addr ? 'bg-nexa-mint/10 text-nexa-mint font-medium' : 'text-nexa-text hover:bg-nexa-bg-elevated'
                                  }`}
                                >
                                  <div>
                                    <p className="font-semibold">{formatted}</p>
                                    <p className="text-[10px] text-nexa-text-muted">{addr.post_town}, {addr.postcode}</p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {selectedResult && (
                          <div className="p-3 border border-nexa-mint/35 bg-nexa-mint/5 rounded-xl space-y-3">
                            <div className="text-xs text-nexa-text-secondary">
                              <span className="font-bold text-nexa-text block mb-1">Confirm Selected Address:</span>
                              <p className="font-semibold">{selectedResult.line_1}</p>
                              {selectedResult.line_2 && <p>{selectedResult.line_2}</p>}
                              {selectedResult.line_3 && <p>{selectedResult.line_3}</p>}
                              <p>{selectedResult.post_town}, {selectedResult.postcode}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedResult(null)}
                                className="flex-1 py-1.5 border border-nexa-border-subtle hover:bg-nexa-bg-elevated rounded-lg text-xs font-semibold text-nexa-text"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    addressLine1: selectedResult.line_1 || '',
                                    addressLine2: selectedResult.line_2 || '',
                                    addressLine3: selectedResult.line_3 || '',
                                    postTown: selectedResult.post_town || '',
                                    postcode: selectedResult.postcode || '',
                                    uprn: selectedResult.uprn || '',
                                    latitude: selectedResult.latitude?.toString() || '',
                                    longitude: selectedResult.longitude?.toString() || ''
                                  })
                                  setAddressConfirmed(true)
                                  setSelectedResult(null)
                                  setLookupResults([])
                                }}
                                className="flex-1 py-1.5 bg-nexa-mint text-nexa-bg-deep rounded-lg text-xs font-semibold hover:bg-nexa-mint/90"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
