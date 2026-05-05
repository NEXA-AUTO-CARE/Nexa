import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { GaragePage } from './pages/GaragePage'
import { LoginPage } from './pages/LoginPage'
import { OtpPage } from './pages/OtpPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { SignupPage } from './pages/SignupPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? '/garage' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/garage"
        element={
          <ProtectedRoute>
            <GaragePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
