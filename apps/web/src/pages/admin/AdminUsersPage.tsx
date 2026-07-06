import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api-client'
import {
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Mail,
  Phone,
  BadgeCheck,
  Clock,
  Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

const ROLE_STYLES: Record<string, string> = {
  customer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  admin: 'bg-nexa-mint/10 text-nexa-mint border-nexa-mint/20',
  super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  vendor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const AVAILABLE_ROLES = ['customer', 'admin', 'super_admin', 'vendor']

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<AdminUser[]>(`/admin/users?status=${statusFilter}`)
      setUsers(data)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() setState is deferred behind await
    load()
  }, [statusFilter])

  useEffect(() => {
    if (!success && !error) return
    const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000)
    return () => clearTimeout(t)
  }, [success, error])

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    try {
      setError(null)
      await api.patch(`/admin/users/${user.userId}`, { role: newRole })
      setUsers(users.map((u) =>
        u.userId === user.userId ? { ...u, role: newRole } : u
      ))
      setSuccess(`${user.displayName}'s role updated to ${newRole}.`)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to update role.')
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Are you sure you want to delete ${user.displayName}?`)) return
    try {
      setError(null)
      await api.delete(`/admin/users/${user.userId}`)
      setUsers(users.filter(u => u.userId !== user.userId))
      setSuccess(`${user.displayName} was deleted successfully.`)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Failed to delete user.')
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q)) ||
      (u.phoneNumber?.includes(q)) ||
      (u.firstName?.toLowerCase().includes(q)) ||
      (u.lastName?.toLowerCase().includes(q))
    )
  })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const getInitials = (name: string) => {
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
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">Users</h1>
          <p className="text-nexa-text-secondary text-sm">Manage users, roles, and account statuses.</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Users</option>
          </select>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexa-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text placeholder-nexa-text-muted transition-all duration-300"
            />
          </div>
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

      {/* User count */}
      {!loading && (
        <div className="flex items-center gap-2 text-xs text-nexa-text-muted">
          <Users className="w-4 h-4" />
          <span>{filtered.length} user{filtered.length !== 1 ? 's' : ''}{search.trim() ? ` matching "${search}"` : ''}</span>
        </div>
      )}

      {/* LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-nexa-text-secondary text-sm">Loading users…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-nexa-text-secondary">
          <Users className="w-12 h-12 mx-auto text-nexa-text-muted mb-4" />
          <h3 className="font-display font-bold text-lg mb-1">
            {search.trim() ? 'No Matches' : 'No Users Found'}
          </h3>
          <p className="text-sm">
            {search.trim() ? 'Try adjusting your search query.' : 'Users will appear here once they sign up.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-nexa-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexa-border-subtle bg-nexa-bg-deep/50">
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted">User</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted hidden md:table-cell">Contact</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted">Role</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted hidden lg:table-cell">Status</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted hidden lg:table-cell">Joined</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-nexa-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr 
                    key={u.userId} 
                    onClick={() => navigate(`/admin/users/${u.userId}`)}
                    className="border-b border-nexa-border-subtle/50 hover:bg-nexa-bg-elevated/40 transition-colors cursor-pointer"
                  >
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${u.isActive ? 'bg-nexa-bg-elevated border-nexa-border-subtle' : 'bg-red-500/10 border-red-500/20'}`}>
                          <span className={`text-xs font-bold ${u.isActive ? 'text-nexa-text-secondary' : 'text-red-400'}`}>{getInitials(u.displayName)}</span>
                        </div>
                        <div className="min-w-0">
                          <span className={`block font-semibold truncate ${u.isActive ? 'text-nexa-text' : 'text-nexa-text-muted line-through'}`}>
                            {u.displayName}
                          </span>
                          <span className="block text-[11px] text-nexa-text-muted truncate md:hidden">
                            {u.email || u.phoneNumber || '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {u.email && (
                          <span className="flex items-center gap-1.5 text-xs text-nexa-text-secondary">
                            <Mail className="w-3 h-3 text-nexa-text-muted" /> {u.email}
                          </span>
                        )}
                        {u.phoneNumber && (
                          <span className="flex items-center gap-1.5 text-xs text-nexa-text-secondary">
                            <Phone className="w-3 h-3 text-nexa-text-muted" /> {u.phoneNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border cursor-pointer bg-transparent focus:ring-0 focus:outline-none ${ROLE_STYLES[u.role] || ROLE_STYLES.customer}`}
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r} value={r} className="bg-nexa-bg text-nexa-text">
                            {r.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        {u.otpVerified ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-nexa-mint">
                            <BadgeCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                            <ShieldCheck className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Joined */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-xs text-nexa-text-muted">
                        <Clock className="w-3 h-3" /> {fmtDate(u.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUser(u)
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
