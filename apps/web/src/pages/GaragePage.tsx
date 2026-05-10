import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function GaragePage() {
  const { user, logout } = useAuth()
  return (
    <div className="nexa-bg-pattern min-h-full bg-nexa-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 25, 35, 0.85)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            nexa<span className="text-nexa-mint">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-nexa-text-secondary">
              {user?.displayName}
            </span>
            <button
              onClick={() => void logout()}
              className="btn-secondary text-sm px-4 py-1.5"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Garage</h1>
          <p className="mt-1 text-sm text-nexa-text-secondary">
            {user?.email ?? user?.phoneNumber} · {user?.role}
          </p>
        </div>

        {/* Empty state — will be replaced in Phase 2 */}
        <div className="nexa-card flex flex-col items-center justify-center p-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nexa-mint/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-nexa-mint">
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9" />
              <path d="M10 6l-1 5h7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No vehicles yet</h3>
          <p className="mt-2 max-w-sm text-sm text-nexa-text-secondary">
            Add your first vehicle to get started with booking a wash. Your Garage is coming in the next update!
          </p>
          <button className="btn-primary mt-6" disabled>
            Add Vehicle (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
