/**
 * Mock data for features that have no backend endpoint yet.
 * Every consumer is marked `TODO(api)` so the wiring points are greppable.
 * See plan: photos, reviews, saved payment methods, gift bookings, and the
 * status-page vendor/ETA overlay are presentational until the API exists.
 */

export interface MockGiftBooking {
  id: string
  vehicle: string
  recipient: string
  recipientEmail: string
  service: string
  date: string
  status: string
  statusColor: string
}

export interface MockSavedCard {
  id: string
  last4: string
  brand: string
  expiry: string
  isDefault: boolean
}

export interface MockVendor {
  name: string
  rating: number
}

// TODO(api): replace with real gift-bookings endpoint
export const mockGiftBookings: MockGiftBooking[] = [
  {
    id: 'g1',
    vehicle: 'BMW 3 Series',
    recipient: 'John Doe',
    recipientEmail: 'john@example.com',
    service: 'Mini Valet & Spray Polish',
    date: '14 Mar 2026',
    status: 'Pending',
    statusColor: 'text-warning',
  },
  {
    id: 'g2',
    vehicle: 'Range Rover Sport',
    recipient: 'Jane Smith',
    recipientEmail: 'jane@example.com',
    service: 'Mini Valet & Spray Polish',
    date: '12 Mar 2026',
    status: 'Delivered',
    statusColor: 'text-success',
  },
]

// TODO(api): replace with real saved-payment-methods endpoint
export const mockSavedCards: MockSavedCard[] = [
  { id: '1', last4: '4242', brand: 'Visa', expiry: '12/28', isDefault: true },
]

// TODO(api): replace with real assigned-vendor data on the booking
export const mockVendor: MockVendor = { name: 'James M.', rating: 4.8 }
