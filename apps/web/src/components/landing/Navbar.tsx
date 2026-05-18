import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../ui/Logo'

export function Navbar() {
  const { user } = useAuth()

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Logo />

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/garage" className="btn-primary text-sm">
              My Garage
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-nexa-text-secondary transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link to="/signup" className="btn-primary text-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
