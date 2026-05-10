import type { VehicleResponse } from '@nexa/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api-client'

export function useVehicles() {
  const query = useQuery<VehicleResponse[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await api.get<VehicleResponse[]>('/vehicles')
      return data
    },
  })

  return {
    vehicles: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
