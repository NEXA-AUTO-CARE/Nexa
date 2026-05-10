import type { CreateVehicleDto, UpdateVehicleDto, VehicleResponse } from '@nexa/shared'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDeleteModal } from '../components/garage/ConfirmDeleteModal'
import { VehicleCard } from '../components/garage/VehicleCard'
import { VehicleFormModal } from '../components/garage/VehicleFormModal'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api-client'
import { describeError } from '../lib/errors'
import { useVehicles } from '../hooks/useVehicles'

export function GaragePage() {
  const { user, logout } = useAuth()
  const { vehicles, isLoading, refetch } = useVehicles()

  // Modal state
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<VehicleResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const openAdd = () => {
    setEditTarget(null)
    setFormOpen(true)
  }
  const openEdit = (v: VehicleResponse) => {
    setEditTarget(v)
    setFormOpen(true)
  }
  const openDelete = (v: VehicleResponse) => {
    setDeleteTarget(v)
  }

  const handleSubmit = useCallback(
    async (data: CreateVehicleDto | UpdateVehicleDto) => {
      setSubmitting(true)
      try {
        if (editTarget) {
          await api.patch(`/vehicles/${editTarget.vehicleId}`, data)
        } else {
          await api.post('/vehicles', data)
        }
        await refetch()
      } catch (err) {
        throw new Error(describeError(err))
      } finally {
        setSubmitting(false)
      }
    },
    [editTarget, refetch],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/vehicles/${deleteTarget.vehicleId}`)
      setDeleteTarget(null)
      await refetch()
    } catch {
      // silently fail for now — user will see vehicle still there
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, refetch])

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
            <Link to="/book" className="text-sm text-nexa-text-secondary hover:text-white transition-colors">
              Book a Wash
            </Link>
            <Link to="/bookings" className="text-sm text-nexa-text-secondary hover:text-white transition-colors">
              My Bookings
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
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Garage</h1>
            <p className="mt-1 text-sm text-nexa-text-secondary">
              Manage your vehicles and book washes
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary text-sm">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Vehicle
          </button>
        </div>

        {/* Vehicle Grid / Loading / Empty State */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
                <span className="text-sm text-nexa-text-secondary">
                  Loading your vehicles…
                </span>
              </div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="nexa-card flex flex-col items-center justify-center p-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nexa-mint/10">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-nexa-mint"
                >
                  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                  <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9" />
                  <path d="M10 6l-1 5h7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                No vehicles yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-nexa-text-secondary">
                Add your first vehicle to get started with booking a wash.
              </p>
              <button onClick={openAdd} className="btn-primary mt-6 text-sm">
                Add Your First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => (
                <VehicleCard
                  key={v.vehicleId}
                  vehicle={v}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <VehicleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        vehicle={editTarget}
        isSubmitting={submitting}
      />
      <ConfirmDeleteModal
        open={!!deleteTarget}
        vehicle={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleting}
      />
    </div>
  )
}
