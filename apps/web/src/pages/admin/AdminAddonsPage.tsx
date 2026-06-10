import { useEffect, useState } from 'react'
import { api } from '../../lib/api-client'
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Addon {
  addonId: string
  name: string
  description?: string
  price: string
  isActive: boolean
}

export default function AdminAddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals state
  const [showModal, setShowModal] = useState(false)
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null)
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('10.00')
  const [formIsActive, setFormIsActive] = useState(true)

  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadAddons = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<Addon[]>('/addons?all=true')
      setAddons(data)
    } catch (err) {
      console.error(err)
      setActionError('Failed to fetch addons from the system.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is deferred behind await
    loadAddons()
  }, [])

  const openCreateModal = () => {
    setEditingAddon(null)
    setFormName('')
    setFormDescription('')
    setFormPrice('10.00')
    setFormIsActive(true)
    setShowModal(true)
  }

  const openEditModal = (addon: Addon) => {
    setEditingAddon(addon)
    setFormName(addon.name)
    setFormDescription(addon.description || '')
    setFormPrice(parseFloat(addon.price).toFixed(2))
    setFormIsActive(addon.isActive)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formPrice) return

    try {
      setSaving(true)
      setActionError(null)
      
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        price: parseFloat(formPrice).toFixed(2),
        isActive: formIsActive,
      }

      if (editingAddon) {
        await api.put(`/addons/${editingAddon.addonId}`, payload)
        setActionSuccess('Add-on service successfully updated.')
      } else {
        await api.post('/addons', payload)
        setActionSuccess('New add-on service successfully created.')
      }

      setShowModal(false)
      await loadAddons()
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setActionError(message || 'Failed to save add-on details.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (addon: Addon) => {
    try {
      setActionError(null)
      const updatedStatus = !addon.isActive
      
      await api.put(`/addons/${addon.addonId}`, {
        isActive: updatedStatus,
      })

      setAddons(addons.map(a => a.addonId === addon.addonId ? { ...a, isActive: updatedStatus } : a))
      setActionSuccess(`Add-on "${addon.name}" is now ${updatedStatus ? 'active' : 'inactive'}.`)
    } catch (err) {
      console.error(err)
      setActionError('Failed to toggle active status.')
    }
  }

  const handleDelete = async (addon: Addon) => {
    if (!window.confirm(`Are you sure you want to delete the "${addon.name}" extra permanently?`)) {
      return
    }
    try {
      setActionError(null)
      await api.delete(`/addons/${addon.addonId}`)
      setActionSuccess(`Add-on "${addon.name}" deleted successfully.`)
      await loadAddons()
    } catch (err) {
      console.error(err)
      setActionError('Failed to delete add-on service.')
    }
  }

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
            Add-on Services
          </h1>
          <p className="text-nexa-text-secondary text-sm">
            Configure premium valeting extras, pricing, and availability states.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:shadow-[0_0_15px_rgba(160,255,200,0.2)] hover:bg-nexa-mint/90 transition-all duration-300 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Extra</span>
        </button>
      </div>

      {/* TOAST NOTIFICATION */}
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

      {/* ADDONS CONTAINER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-nexa-text-secondary text-sm">Loading service extras…</span>
        </div>
      ) : addons.length === 0 ? (
        <div className="glass-card p-12 text-center text-nexa-text-secondary">
          <Sparkles className="w-12 h-12 mx-auto text-nexa-text-muted mb-4" />
          <h3 className="font-display font-bold text-lg mb-1">No Add-ons Configured</h3>
          <p className="text-sm">There are no custom extras defined in the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addons.map((addon) => (
            <motion.div
              layout
              key={addon.addonId}
              className={`glass-card p-5 border flex flex-col justify-between gap-5 transition-all duration-300 relative overflow-hidden group ${
                addon.isActive
                  ? 'border-nexa-border-subtle hover:border-nexa-mint/20'
                  : 'border-nexa-border-subtle bg-nexa-bg-deep/40 opacity-70'
              }`}
            >
              {/* Core Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-nexa-text truncate group-hover:text-nexa-mint transition-colors">
                    {addon.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-nexa-text shrink-0 bg-nexa-bg-elevated px-2 py-0.5 rounded border border-nexa-border-subtle/50">
                    £{parseFloat(addon.price).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-nexa-text-secondary leading-relaxed line-clamp-3">
                  {addon.description || 'No description provided.'}
                </p>
              </div>

              {/* Status & Control Panel */}
              <div className="flex items-center justify-between border-t border-nexa-border-subtle/50 pt-4 mt-auto">
                {/* Active Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(addon)}
                  className="flex items-center gap-2 text-xs font-semibold text-nexa-text-secondary hover:text-nexa-text transition-colors"
                  title="Toggle availability"
                >
                  {addon.isActive ? (
                    <ToggleRight className="w-6 h-6 text-nexa-mint" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-nexa-text-muted" />
                  )}
                  <span>{addon.isActive ? 'Active' : 'Inactive'}</span>
                </button>

                {/* Edit & Delete Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(addon)}
                    className="p-2 text-nexa-text-secondary hover:text-nexa-mint hover:bg-nexa-mint/10 rounded-xl transition-all duration-300"
                    title="Edit Service Extra"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addon)}
                    className="p-2 text-nexa-text-secondary hover:text-nexa-error hover:bg-nexa-error/10 rounded-xl transition-all duration-300"
                    title="Delete Service Extra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* FORM MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-nexa-bg border border-nexa-border-subtle w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-nexa-border-subtle flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-nexa-text">
                  {editingAddon ? 'Edit Add-on Service' : 'Add Custom Extra'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-nexa-text-secondary hover:text-nexa-text rounded bg-nexa-bg border border-nexa-border-subtle"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Service Extra Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine bay clean"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text placeholder-nexa-text-muted transition-all duration-300"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Pricing Rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nexa-text-secondary text-sm font-semibold">
                      £
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a clear, rich explanation of what this extra service includes..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-xs text-nexa-text-secondary placeholder-nexa-text-muted resize-none transition-all duration-300"
                  />
                </div>

                {/* Toggle Status */}
                <div className="flex items-center justify-between py-2 border-t border-b border-nexa-border-subtle/50 my-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Enable Availability State
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className="flex items-center gap-2"
                  >
                    {formIsActive ? (
                      <ToggleRight className="w-7 h-7 text-nexa-mint" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-nexa-text-muted" />
                    )}
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nexa-mint text-nexa-bg font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Extra'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
