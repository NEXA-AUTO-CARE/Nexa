import type { Permission, UserRole } from '@nexa/shared'
import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: ReactNode
  /** Role names (system or custom) the route requires. Empty/omitted = any authenticated user. */
  roles?: Array<UserRole | string>
  /** Required permission codes. ALL must be present. */
  permissions?: Permission[]
}

export function ProtectedRoute({ children, roles, permissions }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-nexa-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-sm text-nexa-text-secondary">Loading…</span>
        </div>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (roles && roles.length > 0) {
    const hasRole = roles.some((r) => r.toUpperCase() === user.role.toUpperCase())
    if (!hasRole) return <AccessDenied />
  }
  if (permissions && permissions.length > 0) {
    const have = new Set(user.permissions ?? [])
    const missing = permissions.filter((p) => !have.has(p))
    if (missing.length > 0) return <AccessDenied />
  }
  return <>{children}</>
}

function AccessDenied() {
  return (
    <div className="flex h-full items-center justify-center bg-nexa-bg">
      <div className="nexa-card p-8 text-center">
        <p className="text-nexa-error font-medium">You don't have access to this page.</p>
      </div>
    </div>
  )
}
