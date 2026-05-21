import { useState } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Sparkles,
  Settings,
  ArrowLeftRight,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      desc: 'Overview & metrics',
    },
    {
      name: 'Bookings & Matching',
      path: '/admin/bookings',
      icon: CalendarDays,
      desc: 'Job scheduling & matching',
    },
    {
      name: 'Corporate Fleet',
      path: '/admin/corporate',
      icon: Building2,
      desc: 'Company leads & invoicing',
    },
    {
      name: 'Add-on Services',
      path: '/admin/addons',
      icon: Sparkles,
      desc: 'Manage valeting extras',
    },
    {
      name: 'Dynamic Settings',
      path: '/admin/settings',
      icon: Settings,
      desc: 'Pricing, FAQs, & T&Cs',
    },
  ]

  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-nexa-bg-deep text-nexa-text flex font-body relative overflow-hidden">
      {/* Background radial elements for premium dark mode */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-nexa-mint/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-80 shrink-0 border-r border-nexa-border-subtle bg-nexa-bg/95 backdrop-blur-md z-30">
        {/* Branding header */}
        <div className="h-20 px-6 border-b border-nexa-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 flex items-center justify-center border border-nexa-mint/20 shadow-[0_0_15px_rgba(160,255,200,0.1)]">
              <ShieldCheck className="w-6 h-6 text-nexa-mint" />
            </div>
            <div>
              <span className="font-display font-bold text-xl text-nexa-mint tracking-wide uppercase">Nexa Control</span>
              <span className="block text-[10px] text-nexa-text-secondary uppercase tracking-widest font-semibold">Admin Panel</span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${
                  Active
                    ? 'bg-nexa-mint/10 text-nexa-mint border border-nexa-mint/20 shadow-[0_0_20px_rgba(160,255,200,0.05)]'
                    : 'text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-bg-elevated/40 border border-transparent'
                }`}
              >
                {Active && (
                  <div className="absolute left-[-1px] top-1/4 bottom-1/4 w-[3px] bg-nexa-mint rounded-r-md" />
                )}
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${Active ? 'text-nexa-mint' : 'text-nexa-text-secondary group-hover:text-nexa-mint'}`} />
                <div>
                  <span className="block font-semibold text-sm">{item.name}</span>
                  <span className="block text-[11px] text-nexa-text-muted group-hover:text-nexa-text-secondary transition-colors">{item.desc}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer info & toggle back */}
        <div className="p-4 border-t border-nexa-border-subtle bg-nexa-bg-deep/50 space-y-3">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-nexa-mint/20 bg-nexa-mint/5 hover:bg-nexa-mint/10 text-nexa-mint text-sm font-semibold transition-all duration-300"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Customer Portal</span>
          </Link>
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <span className="block font-semibold text-sm truncate">{user?.displayName}</span>
              <span className="block text-xs text-nexa-text-secondary capitalize truncate">{user?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-nexa-text-secondary hover:text-nexa-error rounded-lg hover:bg-nexa-error/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-nexa-bg/95 border-b border-nexa-border-subtle flex items-center justify-between px-4 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-nexa-mint" />
          <span className="font-display font-bold text-lg text-nexa-mint">NEXA CONTROL</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-nexa-text hover:bg-nexa-bg-elevated rounded-lg border border-nexa-border-subtle transition-all duration-300"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER SIDEBAR */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside
            className="w-80 h-full bg-nexa-bg flex flex-col border-r border-nexa-border-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 px-6 border-b border-nexa-border-subtle flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-nexa-mint" />
              <span className="font-display font-bold text-lg text-nexa-mint">NEXA CONTROL</span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Active = isActive(item.path)
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                      Active
                        ? 'bg-nexa-mint/10 text-nexa-mint border border-nexa-mint/20'
                        : 'text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-bg-elevated/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="block font-semibold text-sm">{item.name}</span>
                      <span className="block text-[11px] text-nexa-text-muted">{item.desc}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-nexa-border-subtle bg-nexa-bg-deep/50 space-y-3">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-nexa-mint/20 bg-nexa-mint/5 text-nexa-mint text-sm font-semibold"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Customer Portal</span>
              </Link>
              <div className="flex items-center justify-between gap-2 px-2">
                <div className="min-w-0">
                  <span className="block font-semibold text-sm truncate">{user?.displayName}</span>
                  <span className="block text-xs text-nexa-text-secondary capitalize truncate">{user?.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-nexa-text-secondary hover:text-nexa-error rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
