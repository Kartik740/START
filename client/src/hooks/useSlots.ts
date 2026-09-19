import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from '../services/dataService.ts';
import { storage } from '../lib/storage.ts';
import { WorkSlot } from '../types/models.ts';
import { getTodayString } from '../utils/dates.ts';

export function useSlots(date: string = getTodayString()) {
  const queryClient = useQueryClient();

  useEffect(() => {
    return storage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    });
  }, [queryClient]);

  const slotsQuery = useQuery({
    queryKey: ['slots', date],
    queryFn: () => dataService.getSlots(date),
  });

  const saveSlotMutation = useMutation({
    mutationFn: (slot: WorkSlot) => dataService.saveSlot(slot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => dataService.deleteSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });

  return {
    slots: slotsQuery.data || [],
    isLoading: slotsQuery.isLoading,
    error: slotsQuery.error,
    saveSlot: saveSlotMutation.mutateAsync,
    deleteSlot: deleteSlotMutation.mutateAsync,
  };
}
