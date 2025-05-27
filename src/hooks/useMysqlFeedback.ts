
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackMetrics {
  total: number;
  positive: number;
  negative: number;
  resolved: number;
  pending: number;
  avgRating: number;
  trend?: number;
}

export const useMysqlFeedbackMetrics = (filters: any) => {
  return useQuery({
    queryKey: ['mysql-feedback-metrics', filters],
    queryFn: async (): Promise<FeedbackMetrics> => {
      let query = supabase.from('feedback').select('*');
      
      // Apply filters
      if (filters.service && filters.service !== 'all') {
        query = query.eq('service_type', filters.service);
      }
      
      if (filters.location && filters.location !== 'all') {
        query = query.eq('issue_location', filters.location);
      }
      
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filters.dateRange) {
          case 'last_week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'last_month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'last_quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'last_year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }
      
      if (filters.customDateFrom) {
        query = query.gte('created_at', filters.customDateFrom);
      }
      
      if (filters.customDateTo) {
        query = query.lte('created_at', filters.customDateTo);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching feedback metrics:', error);
        throw error;
      }
      
      const feedback = data || [];
      
      const total = feedback.length;
      const positive = feedback.filter(f => f.positive_flag).length;
      const negative = feedback.filter(f => f.negative_flag).length;
      const resolved = feedback.filter(f => f.status === 'resolved').length;
      const pending = feedback.filter(f => f.status === 'new' || f.status === 'in_progress').length;
      const avgRating = total > 0 ? feedback.reduce((sum, f) => sum + (f.review_rating || 0), 0) / total : 0;
      
      return {
        total,
        positive,
        negative,
        resolved,
        pending,
        avgRating,
        trend: Math.random() * 10 - 5 // Mock trend data
      };
    }
  });
};
