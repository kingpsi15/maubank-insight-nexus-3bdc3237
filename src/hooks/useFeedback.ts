
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mysqlService } from '@/services/mysqlService';

// Issue detection function
const detectIssuesFromText = (reviewText: string, serviceType: string): string[] => {
  const text = reviewText.toLowerCase();
  const issues: string[] = [];

  // ATM-specific issues
  if (serviceType === 'ATM') {
    if (text.includes('closed') || text.includes('not working') || text.includes('out of order')) {
      issues.push('ATM Unavailability');
    }
    if (text.includes('no cash') || text.includes('cash not available') || text.includes('empty')) {
      issues.push('Cash Unavailability');
    }
    if (text.includes('card stuck') || text.includes('card reader')) {
      issues.push('Card Reader Issues');
    }
    if (text.includes('slow') || text.includes('taking time')) {
      issues.push('Transaction Speed');
    }
  }

  // Online Banking issues
  if (serviceType === 'OnlineBanking') {
    if (text.includes('login') || text.includes('password') || text.includes('access')) {
      issues.push('Login Issues');
    }
    if (text.includes('slow') || text.includes('loading')) {
      issues.push('Performance Issues');
    }
    if (text.includes('error') || text.includes('failed')) {
      issues.push('Transaction Errors');
    }
  }

  // Core Banking issues
  if (serviceType === 'CoreBanking') {
    if (text.includes('balance') || text.includes('minimum')) {
      issues.push('Balance Issues');
    }
    if (text.includes('queue') || text.includes('wait') || text.includes('long time')) {
      issues.push('Waiting Time');
    }
    if (text.includes('staff') || text.includes('service')) {
      issues.push('Service Quality');
    }
  }

  // Common issues across all services
  if (text.includes('inconvenient') || text.includes('difficult')) {
    issues.push('User Experience');
  }
  if (text.includes('accessibility') || text.includes('disabled') || text.includes('elderly')) {
    issues.push('Accessibility');
  }

  return issues;
};

export const useFeedbackMetrics = (filters: any = {}) => {
  return useQuery({
    queryKey: ['mysql-feedback-metrics', filters],
    queryFn: async () => {
      console.log('useFeedbackMetrics using MySQL service with filters:', filters);
      
      const metrics = await mysqlService.getMetrics(filters);
      console.log('MySQL metrics:', metrics);
      
      return {
        total: metrics.total || 0,
        positive: metrics.positive || 0,
        negative: metrics.negative || 0,
        neutral: 0,
        resolved: metrics.resolved || 0,
        pending: metrics.pending || 0,
        escalated: 0,
        avgRating: metrics.avgRating || 0,
        trend: metrics.trend || 0,
        ratingDistribution: {},
        data: []
      };
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
    queryKey: ['mysql-feedback', filters],
    queryFn: () => mysqlService.getFeedback(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: async (feedbackData: any) => {
      // Detect issues from the review text before sending to backend
      const detectedIssues = detectIssuesFromText(feedbackData.review_text, feedbackData.service_type);
      
      // Add detected issues to the feedback data
      const enhancedFeedbackData = {
        ...feedbackData,
        detected_issues: detectedIssues
      };

      console.log('Creating feedback with detected issues:', detectedIssues);
      
      return mysqlService.createFeedback(enhancedFeedbackData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback-metrics'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      mysqlService.updateFeedback(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback-metrics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mysqlService.deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['mysql-feedback-metrics'] });
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
