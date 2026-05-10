import { useQuery } from '@tanstack/react-query';
import type { AddonResponse } from '@nexa/shared';
import { api } from '../lib/api-client';

export function useAddons() {
  const { data, isLoading, error, refetch } = useQuery<AddonResponse[]>({
    queryKey: ['addons'],
    queryFn: async () => {
      const res = await api.get<AddonResponse[]>('/addons');
      return res.data;
    },
  });

  return { addons: data ?? [], isLoading, error, refetch };
}
