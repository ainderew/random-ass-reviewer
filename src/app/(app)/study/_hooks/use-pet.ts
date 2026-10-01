'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CareRequest,
  CareResult,
  PetView,
  UpdatePetRequest,
} from '@/domain/types';
import { apiFetch, postJson } from '@/lib/api-client';
import { petQueryKey } from '@/lib/query-keys';

// The study cat, as the server sees her. Counts, weight and happiness are
// never computed here.
export function usePet() {
  return useQuery({
    queryKey: petQueryKey,
    queryFn: () => apiFetch<PetView>('/api/pet'),
  });
}

export function useCare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CareRequest) =>
      postJson<CareResult>('/api/pet/care', request),
    onSuccess: (result) => queryClient.setQueryData(petQueryKey, result.pet),
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdatePetRequest) =>
      apiFetch<PetView>('/api/pet', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (pet) => queryClient.setQueryData(petQueryKey, pet),
  });
}
