import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { useAuth } from './contexts/AuthContext'
import BookingPage from './pages/BookingPage'
import BookingStatusPage from './pages/BookingStatusPage'
import BookingsPage from './pages/BookingsPage'
import GaragePage from './pages/GaragePage'
import HomePage from './pages/HomePage'
import LandingPage from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import NotFound from './pages/NotFound'
import { OtpPage } from './pages/OtpPage'
import PaymentMethodsPage from './pages/PaymentMethodsPage'
import PaymentPage from './pages/PaymentPage'
import PhotosPage from './pages/PhotosPage'
import ProfilePage from './pages/ProfilePage'
import ReviewPage from './pages/ReviewPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { SignupPage } from './pages/SignupPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/garage" element={<GaragePage />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/booking" element={<Navigate to="/book" replace />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payments" element={<PaymentMethodsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/status/:id" element={<BookingStatusPage />} />
        <Route path="/bookings/photos/:id" element={<PhotosPage />} />
        <Route path="/bookings/review/:id" element={<ReviewPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
