import { Link, useNavigate } from 'react-router-dom'
import { BookingSteps } from '../components/booking/BookingSteps'
import { useAuth } from '../contexts/AuthContext'

export function BookingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="nexa-bg-pattern min-h-full bg-nexa-bg">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(15, 25, 35, 0.85)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            nexa<span className="text-nexa-mint">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/bookings" className="text-sm text-nexa-text-secondary hover:text-white transition-colors">
              My Bookings
            </Link>
            <Link to="/garage" className="text-sm text-nexa-text-secondary hover:text-white transition-colors">
              Garage
            </Link>
            <span className="hidden text-sm text-nexa-text-secondary sm:inline">
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
          <h1 className="text-2xl font-bold text-white">Book a Wash</h1>
          <p className="mt-1 text-sm text-nexa-text-secondary">
            Select your vehicle, choose a service, and pick a time
          </p>
        </div>

        <BookingSteps onSuccess={() => navigate('/bookings')} />
      </div>
    </div>
  )
}
