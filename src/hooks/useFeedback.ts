
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '@/services/feedbackService';

export const useFeedbackMetrics = (filters: any = {}) => {
  return useQuery({
    queryKey: ['feedback-metrics', filters],
    queryFn: async () => {
      console.log('useFeedbackMetrics called with filters:', filters);
      
      const metrics = await feedbackService.getMetrics(filters);
      console.log('Raw metrics from feedbackService:', metrics);
      
      // The feedbackService.getMetrics already returns the correct structure
      // but we need to ensure resolved/pending are calculated correctly
      const result = {
        total: metrics.total || 0,
        positive: metrics.positive || 0,
        negative: metrics.negative || 0,
        neutral: metrics.neutral || 0,
        resolved: metrics.resolved || 0,
        pending: metrics.pending || 0,
        escalated: metrics.escalated || 0,
        avgRating: metrics.avgRating || 0,
        trend: metrics.trend || 0,
        ratingDistribution: metrics.ratingDistribution || {},
        data: metrics.data || []
      };
      
      console.log('Final metrics returned by useFeedbackMetrics:', result);
      return result;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useFeedback = (filters: any = {}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['feedback', filters],
    queryFn: () => feedbackService.getAll(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: feedbackService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-metrics'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      feedbackService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-metrics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: feedbackService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-metrics'] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    feedback: query.data || [],
    createFeedback: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateFeedback: updateMutation.mutate,
    deleteFeedback: deleteMutation.mutate,
  };
};
