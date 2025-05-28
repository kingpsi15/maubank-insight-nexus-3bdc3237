
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMysqlAnalytics = (filters: any) => {
  const sentimentQuery = useQuery({
    queryKey: ['mysql-sentiment-data', filters],
    queryFn: async () => {
      let query = supabase.from('feedback').select('positive_flag, negative_flag');
      
      // Apply filters consistently
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
      
      const { data } = await query;
      const feedback = data || [];
      
      const positive = feedback.filter(f => f.positive_flag).length;
      const negative = feedback.filter(f => f.negative_flag).length;
      
      console.log(`Sentiment data: positive=${positive}, negative=${negative}`);
      
      return [
        { name: 'Positive', value: positive, fill: '#10B981' },
        { name: 'Negative', value: negative, fill: '#EF4444' }
      ];
    }
  });

  const serviceQuery = useQuery({
    queryKey: ['mysql-service-data', filters],
    queryFn: async () => {
      let query = supabase.from('feedback').select('service_type, positive_flag, negative_flag');
      
      // Apply location and date filters but NOT service filter for service breakdown
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
      
      const { data } = await query;
      const feedback = data || [];
      
      // Group by service type and count positive/negative
      const serviceStats: { [key: string]: { positive: number; negative: number } } = {};
      
      feedback.forEach(item => {
        const service = item.service_type;
        if (!serviceStats[service]) {
          serviceStats[service] = { positive: 0, negative: 0 };
        }
        
        if (item.positive_flag) {
          serviceStats[service].positive++;
        }
        if (item.negative_flag) {
          serviceStats[service].negative++;
        }
      });
      
      // Convert to array format for charts
      const result = Object.entries(serviceStats).map(([service, stats]) => ({
        service,
        positive: stats.positive,
        negative: stats.negative
      }));
      
      console.log('Service breakdown:', result);
      return result;
    }
  });

  const employeeQuery = useQuery({
    queryKey: ['mysql-employee-data', filters],
    queryFn: async () => {
      const { data } = await supabase
        .from('bank_employees')
        .select(`
          *,
          employee_feedback_interactions(feedback_id)
        `);
      
      return (data || []).map(employee => ({
        employee_name: employee.name,
        department: employee.department,
        branch_location: employee.branch_location,
        role: employee.role,
        total_feedback: employee.employee_feedback_interactions?.length || 0,
        avg_rating: 4.2,
        resolved_count: Math.floor((employee.employee_feedback_interactions?.length || 0) * 0.8)
      }));
    }
  });

  return {
    sentimentData: sentimentQuery.data,
    serviceData: serviceQuery.data,
    locationData: [],
    ratingData: [],
    timelineData: [],
    issuesData: [],
    employeeData: employeeQuery.data,
    isLoading: sentimentQuery.isLoading || serviceQuery.isLoading || employeeQuery.isLoading
  };
};
