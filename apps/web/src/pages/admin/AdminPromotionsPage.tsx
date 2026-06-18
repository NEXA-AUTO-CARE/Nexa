import { useEffect, useState } from 'react'
import { api } from '../../lib/api-client'
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  Percent,
  Gift,
  Save,
  X,
  Clock,
  Users,
  TrendingUp,
  Search,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PromotionType = 'announcement' | 'percentage_discount' | 'bonanza'
type PromotionStatus = 'draft' | 'active' | 'ended'

interface Promotion {
  promotionId: string
  title: string
  message: string
  type: PromotionType
  status: PromotionStatus
  discountPercent: number | null
  bonanzaThreshold: number | null
  bonanzaRecurring: boolean
  startDate: string | null
  endDate: string | null
  startedAt: string | null
  endedAt: string | null
  totalRedemptions: number
  createdAt: string
  assignedUserCount?: number
}

interface AdminUser {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phoneNumber: string | null
  displayName: string
  role: string
}

const TYPE_META: Record<PromotionType, { label: string; icon: typeof Megaphone; color: string }> = {
  announcement: { label: 'Announcement', icon: Megaphone, color: 'text-blue-400' },
  percentage_discount: { label: 'Discount', icon: Percent, color: 'text-amber-400' },
  bonanza: { label: 'Bonanza', icon: Gift, color: 'text-purple-400' },
}

const STATUS_STYLES: Record<PromotionStatus, string> = {
  draft: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  active: 'border-nexa-mint/30 bg-nexa-mint/10 text-nexa-mint',
  ended: 'border-nexa-text-muted/30 bg-nexa-text-muted/10 text-nexa-text-muted',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)

  // User assignment states
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningPromotion, setAssigningPromotion] = useState<Promotion | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])
  const [assignSearch, setAssignSearch] = useState('')
  const [submittingAssign, setSubmittingAssign] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Form
  const [formTitle, setFormTitle] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formType, setFormType] = useState<PromotionType>('announcement')
  const [formDiscount, setFormDiscount] = useState('10')
  const [formThreshold, setFormThreshold] = useState('2')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')

  // Feedback
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<Promotion[]>('/admin/promotions')
      setPromotions(data)
    } catch {
      setError('Failed to load promotions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is deferred behind await
    load()
  }, [])

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000)
      return () => clearTimeout(t)
    }
  }, [success, error])

  /* ---- Modal helpers ---- */

  const openCreate = () => {
    setEditing(null)
    setFormTitle('')
    setFormMessage('')
    setFormType('announcement')
    setFormDiscount('10')
    setFormThreshold('2')
    setFormRecurring(false)
    setFormStartDate('')
    setFormEndDate('')
    setShowModal(true)
  }

  const openEdit = (p: Promotion) => {
    setEditing(p)
    setFormTitle(p.title)
    setFormMessage(p.message)
    setFormType(p.type)
    setFormDiscount(p.discountPercent?.toString() ?? '10')
    setFormThreshold(p.bonanzaThreshold?.toString() ?? '2')
    setFormRecurring(p.bonanzaRecurring ?? false)
    setFormStartDate(p.startDate ? p.startDate.slice(0, 16) : '')
    setFormEndDate(p.endDate ? p.endDate.slice(0, 16) : '')
    setShowModal(true)
  }

  /* ---- CRUD handlers ---- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formMessage.trim()) return

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      message: formMessage.trim(),
      type: formType,
      startDate: formStartDate || undefined,
      endDate: formEndDate || undefined,
    }
    if (formType === 'percentage_discount') payload.discountPercent = parseFloat(formDiscount)
    if (formType === 'bonanza') {
      payload.bonanzaThreshold = parseInt(formThreshold, 10)
      payload.bonanzaRecurring = formRecurring
    }

    try {
      setSaving(true)
      setError(null)
      if (editing) {
        await api.patch(`/admin/promotions/${editing.promotionId}`, payload)
        setSuccess('Promotion updated successfully.')
      } else {
        await api.post('/admin/promotions', payload)
        setSuccess('Promotion created as draft.')
      }
      setShowModal(false)
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to save promotion.')
    } finally {
      setSaving(false)
    }
  }

  const handleStart = async (p: Promotion) => {
    if (!window.confirm(`Activate "${p.title}" and broadcast to all customers?`)) return
    try {
      setError(null)
      await api.post(`/admin/promotions/${p.promotionId}/start`)
      setSuccess(`"${p.title}" is now live! Notifications are being sent.`)
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to start promotion.')
    }
  }

  const handleEnd = async (p: Promotion) => {
    if (!window.confirm(`End "${p.title}"? New bookings will no longer receive this discount.`)) return
    try {
      setError(null)
      await api.post(`/admin/promotions/${p.promotionId}/end`)
      setSuccess(`"${p.title}" has been ended.`)
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to end promotion.')
    }
  }

  const handleDelete = async (p: Promotion) => {
    if (!window.confirm(`Permanently delete draft "${p.title}"?`)) return
    try {
      setError(null)
      await api.delete(`/admin/promotions/${p.promotionId}`)
      setSuccess(`"${p.title}" deleted.`)
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to delete promotion.')
    }
  }

  const openAssignModal = async (p: Promotion) => {
    try {
      setAssigningPromotion(p)
      setLoadingAssignments(true)
      setError(null)
      
      const { data: usersData } = await api.get<AdminUser[]>('/admin/users')
      setUsers(usersData)

      const { data: assignmentsData } = await api.get<string[]>(`/admin/promotions/${p.promotionId}/assignments`)
      setAssignedUserIds(assignmentsData)
      setShowAssignModal(true)
    } catch {
      setError('Failed to load user assignments.')
    } finally {
      setLoadingAssignments(false)
    }
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningPromotion) return

    try {
      setSubmittingAssign(true)
      setError(null)
      await api.post(`/admin/promotions/${assigningPromotion.promotionId}/assign`, {
        userIds: assignedUserIds,
      })
      setSuccess('User assignments updated successfully.')
      setShowAssignModal(false)
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to update user assignments.')
    } finally {
      setSubmittingAssign(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSelectAllVisible = (visibleUsers: AdminUser[]) => {
    const visibleIds = visibleUsers.map((u) => u.userId)
    const allVisibleSelected = visibleIds.every((id) => assignedUserIds.includes(id))

    if (allVisibleSelected) {
      setAssignedUserIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setAssignedUserIds((prev) => {
        const next = [...prev]
        for (const id of visibleIds) {
          if (!next.includes(id)) next.push(id)
        }
        return next
      })
    }
  }

  const filteredModalUsers = users.filter((u) => {
    if (!assignSearch.trim()) return true
    const q = assignSearch.toLowerCase()
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phoneNumber?.includes(q)
    )
  })

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  /* ---- Render ---- */

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">Promotions</h1>
          <p className="text-nexa-text-secondary text-sm">Create campaigns, activate broadcasts, and manage discounts.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:shadow-[0_0_15px_rgba(160,255,200,0.2)] hover:bg-nexa-mint/90 transition-all duration-300 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Promotion</span>
        </button>
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

      {/* LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-nexa-text-secondary text-sm">Loading promotions…</span>
        </div>
      ) : promotions.length === 0 ? (
        <div className="glass-card p-12 text-center text-nexa-text-secondary">
          <Megaphone className="w-12 h-12 mx-auto text-nexa-text-muted mb-4" />
          <h3 className="font-display font-bold text-lg mb-1">No Promotions Yet</h3>
          <p className="text-sm">Create your first promotional campaign to engage customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {promotions.map((p) => {
            const meta = TYPE_META[p.type]
            const Icon = meta.icon
            return (
              <motion.div
                layout
                key={p.promotionId}
                className={`glass-card p-6 border flex flex-col gap-5 transition-all duration-300 relative overflow-hidden group ${
                  p.status === 'active'
                    ? 'border-nexa-mint/20 shadow-[0_0_25px_rgba(160,255,200,0.04)]'
                    : p.status === 'ended'
                      ? 'border-nexa-border-subtle opacity-60'
                      : 'border-nexa-border-subtle hover:border-amber-500/20'
                }`}
              >
                {/* Active glow indicator */}
                {p.status === 'active' && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-nexa-mint/60 via-nexa-mint to-nexa-mint/60" />
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      p.status === 'active' ? 'bg-nexa-mint/15 border border-nexa-mint/20' : 'bg-nexa-bg-elevated border border-nexa-border-subtle'
                    }`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base text-nexa-text truncate group-hover:text-nexa-mint transition-colors">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${STATUS_STYLES[p.status]}`}>
                          {p.status}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message preview */}
                <p className="text-xs text-nexa-text-secondary leading-relaxed line-clamp-2">{p.message}</p>

                {/* Type-specific details */}
                {p.type === 'percentage_discount' && p.discountPercent && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Percent className="w-4 h-4" />
                    <span className="text-sm font-bold">{p.discountPercent}% off</span>
                    <span className="text-xs text-nexa-text-muted">every booking</span>
                  </div>
                )}
                {p.type === 'bonanza' && p.bonanzaThreshold && (
                  <div className="flex items-center gap-2 text-purple-400">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm font-bold">Book {p.bonanzaThreshold}, get next FREE</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      p.bonanzaRecurring
                        ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                        : 'border-nexa-text-muted/30 bg-nexa-text-muted/10 text-nexa-text-muted'
                    }`}>
                      {p.bonanzaRecurring ? 'Recurring' : 'One-off'}
                    </span>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 text-[11px] text-nexa-text-muted">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Created {fmtDate(p.createdAt)}</span>
                  {p.startedAt && <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5" /> Live {fmtDate(p.startedAt)}</span>}
                  {p.totalRedemptions > 0 && (
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {p.totalRedemptions} redeemed</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />{' '}
                    {p.assignedUserCount && p.assignedUserCount > 0 ? (
                      <span className="text-nexa-mint font-bold">Targeted ({p.assignedUserCount} users)</span>
                    ) : (
                      <span>Global (All users)</span>
                    )}
                  </span>
                </div>

                {/* Scheduled dates */}
                {(p.startDate || p.endDate) && (
                  <div className="flex items-center gap-4 text-[11px] text-nexa-text-muted border-t border-nexa-border-subtle/50 pt-3">
                    {p.startDate && <span>Starts: {fmtDate(p.startDate)}</span>}
                    {p.endDate && <span>Ends: {fmtDate(p.endDate)}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-nexa-border-subtle/50 pt-4 mt-auto">
                  {p.status === 'draft' && (
                    <>
                      <button onClick={() => handleStart(p)}
                        className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-nexa-mint/10 border border-nexa-mint/20 text-nexa-mint text-xs font-bold hover:bg-nexa-mint/20 transition-all duration-300">
                        <Play className="w-3.5 h-3.5" /> Go Live
                      </button>
                      <button onClick={() => openAssignModal(p)} disabled={loadingAssignments}
                        className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-nexa-mint/10 border border-nexa-mint/20 text-nexa-mint text-xs font-bold hover:bg-nexa-mint/20 transition-all duration-300 disabled:opacity-50">
                        <Users className="w-3.5 h-3.5" /> Assign Users
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="p-2 text-nexa-text-secondary hover:text-nexa-mint hover:bg-nexa-mint/10 rounded-xl transition-all duration-300" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p)}
                        className="p-2 text-nexa-text-secondary hover:text-nexa-error hover:bg-nexa-error/10 rounded-xl transition-all duration-300" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {p.status === 'active' && (
                    <>
                      <button onClick={() => handleEnd(p)}
                        className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-nexa-error/10 border border-nexa-error/20 text-nexa-error text-xs font-bold hover:bg-nexa-error/20 transition-all duration-300">
                        <Square className="w-3.5 h-3.5" /> End Promotion
                      </button>
                      <button onClick={() => openAssignModal(p)} disabled={loadingAssignments}
                        className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-nexa-mint/10 border border-nexa-mint/20 text-nexa-mint text-xs font-bold hover:bg-nexa-mint/20 transition-all duration-300 disabled:opacity-50">
                        <Users className="w-3.5 h-3.5" /> Assign Users
                      </button>
                    </>
                  )}
                  {p.status === 'ended' && (
                    <span className="text-xs text-nexa-text-muted italic flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {p.totalRedemptions} total redemptions
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
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
              className="bg-nexa-bg border border-nexa-border-subtle w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-nexa-border-subtle flex items-center justify-between sticky top-0 bg-nexa-bg z-10">
                <h3 className="font-display font-bold text-lg text-nexa-text">
                  {editing ? 'Edit Promotion' : 'New Promotion'}
                </h3>
                <button onClick={() => setShowModal(false)}
                  className="p-1 text-nexa-text-secondary hover:text-nexa-text rounded bg-nexa-bg border border-nexa-border-subtle">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">Campaign Title</label>
                  <input type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Summer Flash Sale"
                    className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text placeholder-nexa-text-muted transition-all duration-300" />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">Promotional Message</label>
                  <textarea rows={3} required value={formMessage} onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="The message your customers will receive..."
                    className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-xs text-nexa-text-secondary placeholder-nexa-text-muted resize-none transition-all duration-300" />
                </div>

                {/* Promotion Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">Promotion Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['announcement', 'percentage_discount', 'bonanza'] as PromotionType[]).map((t) => {
                      const m = TYPE_META[t]
                      const TypeIcon = m.icon
                      return (
                        <button key={t} type="button" onClick={() => setFormType(t)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all duration-300 ${
                            formType === t
                              ? 'border-nexa-mint/40 bg-nexa-mint/10 text-nexa-mint'
                              : 'border-nexa-border-subtle text-nexa-text-secondary hover:border-nexa-mint/20'
                          }`}>
                          <TypeIcon className={`w-5 h-5 ${formType === t ? 'text-nexa-mint' : m.color}`} />
                          <span>{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Conditional fields */}
                <AnimatePresence mode="wait">
                  {formType === 'percentage_discount' && (
                    <motion.div key="discount" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden">
                      <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">Discount Percentage</label>
                      <div className="relative">
                        <input type="number" min="1" max="100" step="1" required value={formDiscount}
                          onChange={(e) => setFormDiscount(e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300" />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-nexa-text-secondary text-sm font-semibold">%</span>
                      </div>
                      <p className="text-[10px] text-nexa-text-muted">Customers get this percentage off each booking during the promotion.</p>
                    </motion.div>
                  )}
                  {formType === 'bonanza' && (
                    <motion.div key="bonanza" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">Paid Bookings Before Free</label>
                        <input type="number" min="1" max="20" step="1" required value={formThreshold}
                          onChange={(e) => setFormThreshold(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300" />
                        <p className="text-[10px] text-nexa-text-muted">
                          After {formThreshold || '?'} paid booking{parseInt(formThreshold) !== 1 ? 's' : ''}, the customer gets the next one free.
                        </p>
                      </div>

                      {/* Recurring toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg-elevated/30">
                        <div>
                          <span className="text-xs font-bold text-nexa-text">Recurring cycle</span>
                          <p className="text-[10px] text-nexa-text-muted mt-0.5">
                            {formRecurring
                              ? `Repeats: pay ${formThreshold || '?'}× → free → pay ${formThreshold || '?'}× → free → …`
                              : `One-off: pay ${formThreshold || '?'}× → 1 free booking, then normal pricing.`
                            }
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormRecurring(!formRecurring)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            formRecurring ? 'bg-nexa-mint' : 'bg-nexa-border-subtle'
                          }`}
                          role="switch"
                          aria-checked={formRecurring}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            formRecurring ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">Start Date <span className="text-nexa-text-muted">(optional)</span></label>
                    <input type="datetime-local" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-xs text-nexa-text transition-all duration-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">End Date <span className="text-nexa-text-muted">(optional)</span></label>
                    <input type="datetime-local" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-xs text-nexa-text transition-all duration-300" />
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={saving || !formTitle.trim() || !formMessage.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nexa-mint text-nexa-bg font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving…' : editing ? 'Update Promotion' : 'Create Draft'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER ASSIGNMENT MODAL */}
      <AnimatePresence>
        {showAssignModal && assigningPromotion && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-nexa-bg border border-nexa-border-subtle w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-nexa-border-subtle flex items-center justify-between bg-nexa-bg">
                <div>
                  <h3 className="font-display font-bold text-lg text-nexa-text">
                    Assign Users
                  </h3>
                  <p className="text-xs text-nexa-text-muted mt-0.5">
                    Target promotion "{assigningPromotion.title}" to specific users
                  </p>
                </div>
                <button onClick={() => setShowAssignModal(false)}
                  className="p-1 text-nexa-text-secondary hover:text-nexa-text rounded bg-nexa-bg border border-nexa-border-subtle">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Search and Select All controls */}
              <div className="p-6 pb-4 border-b border-nexa-border-subtle/50 space-y-4">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexa-text-muted" />
                  <input
                    type="text"
                    placeholder="Search users by name, email..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text placeholder-nexa-text-muted transition-all duration-300"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-nexa-text-secondary">
                  <span>
                    {assignedUserIds.length} user{assignedUserIds.length !== 1 ? 's' : ''} selected
                  </span>
                  {filteredModalUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectAllVisible(filteredModalUsers)}
                      className="text-nexa-mint hover:underline font-bold"
                    >
                      {filteredModalUsers.every((u) => assignedUserIds.includes(u.userId))
                        ? 'Deselect All Visible'
                        : 'Select All Visible'
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* User list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[250px] max-h-[400px]">
                {filteredModalUsers.length === 0 ? (
                  <div className="text-center py-10 text-nexa-text-muted text-sm">
                    No users found
                  </div>
                ) : (
                  filteredModalUsers.map((u) => {
                    const isSelected = assignedUserIds.includes(u.userId)
                    return (
                      <div
                        key={u.userId}
                        onClick={() => toggleUserSelection(u.userId)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'border-nexa-mint/40 bg-nexa-mint/5 text-nexa-text'
                            : 'border-nexa-border-subtle text-nexa-text-secondary hover:border-nexa-mint/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block font-semibold text-sm text-nexa-text truncate">
                            {u.displayName}
                          </span>
                          <span className="block text-[10px] text-nexa-text-muted truncate">
                            {u.email || 'No Email'} • Role: {u.role}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded border-nexa-border-subtle text-nexa-mint focus:ring-0 focus:ring-offset-0 bg-transparent h-4 w-4"
                        />
                      </div>
                    )
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-nexa-border-subtle bg-nexa-bg">
                <button
                  type="button"
                  onClick={handleAssignSubmit}
                  disabled={submittingAssign}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-nexa-mint text-nexa-bg font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{submittingAssign ? 'Saving...' : 'Save Assignments'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
