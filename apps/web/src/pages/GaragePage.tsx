import { useAuth } from '../contexts/AuthContext'

export function GaragePage() {
  const { user, logout } = useAuth()
  return (
    <div className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Hello, {user?.displayName}</h1>
          <p className="text-sm text-gray-500">
            {user?.email ?? user?.phoneNumber} · {user?.role}
          </p>
        </div>
        <button
          onClick={() => void logout()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Log out
        </button>
      </header>
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
        Your Garage will appear here in Sprint 3.
      </div>
    </div>
  )
}
