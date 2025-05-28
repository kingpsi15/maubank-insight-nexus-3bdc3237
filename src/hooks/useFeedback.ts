
import { useQuery } from '@tanstack/react-query';
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
  return useQuery({
    queryKey: ['feedback', filters],
    queryFn: () => feedbackService.getAll(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};
