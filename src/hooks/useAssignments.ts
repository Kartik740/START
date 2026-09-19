import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from '../services/dataService.ts';
import { Assignment } from '../types/models.ts';

export function useAssignments() {
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: () => dataService.getAssignments(),
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: (assignment: Assignment) => dataService.saveAssignment(assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => dataService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    error: assignmentsQuery.error,
    saveAssignment: saveAssignmentMutation.mutateAsync,
    deleteAssignment: deleteAssignmentMutation.mutateAsync,
  };
}
