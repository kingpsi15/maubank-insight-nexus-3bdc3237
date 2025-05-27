
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mysqlFeedbackService, Feedback } from '@/services/mysqlFeedbackService';

export const useMysqlFeedback = (filters: any = {}) => {
  return useQuery({
    queryKey: ['mysql-feedback', filters],
    queryFn: () => mysqlFeedbackService.getAll(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });
};

export const useMysqlFeedbackMetrics = (filters: any = {}) => {
  return useQuery({
    queryKey: ['mysql-feedback-metrics', filters],
    queryFn: () => mysqlFeedbackService.getMetrics(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });
};

export const useCreateMysqlFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (feedback: Omit<Feedback, 'id' | 'created_at' | 'updated_at'>) =>
      mysqlFeedbackService.create(feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback-metrics'] });
    },
  });
};

export const useUpdateMysqlFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Feedback> }) =>
      mysqlFeedbackService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback-metrics'] });
    },
  });
};

export const useDeleteMysqlFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => mysqlFeedbackService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback-metrics'] });
    },
  });
};
