import type { BookingResponse } from '@nexa/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api-client'

export function useBookings() {
  const query = useQuery<BookingResponse[]>({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data } = await api.get<BookingResponse[]>('/bookings')
      return data
    },
  })

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
