'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Profile, UpdateProfileRequest } from '@/domain/types';
import { apiFetch } from '@/lib/api-client';
import { profileQueryKey } from '@/lib/query-keys';

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: () => apiFetch<Profile>('/api/me'),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateProfileRequest) =>
      apiFetch<Profile>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey, profile),
  });
}
