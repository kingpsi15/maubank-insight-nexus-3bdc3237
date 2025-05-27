
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMysqlAnalytics = (filters: any) => {
  const sentimentQuery = useQuery({
    queryKey: ['mysql-sentiment-data', filters],
    queryFn: async () => {
      let query = supabase.from('feedback').select('positive_flag, negative_flag');
      
      // Apply filters (same logic as above)
      if (filters.service && filters.service !== 'all') {
        query = query.eq('service_type', filters.service);
      }
      
      const { data } = await query;
      const feedback = data || [];
      
      const positive = feedback.filter(f => f.positive_flag).length;
      const negative = feedback.filter(f => f.negative_flag).length;
      
      return [
        { name: 'Positive', value: positive, fill: '#10B981' },
        { name: 'Negative', value: negative, fill: '#EF4444' }
      ];
    }
  });

  const serviceQuery = useQuery({
    queryKey: ['mysql-service-data', filters],
    queryFn: async () => {
      const { data } = await supabase.from('feedback').select('service_type, positive_flag, negative_flag');
      const feedback = data || [];
      
      const services = ['ATM', 'OnlineBanking', 'CoreBanking'];
      return services.map(service => {
        const serviceData = feedback.filter(f => f.service_type === service);
        return {
          service,
          positive: serviceData.filter(f => f.positive_flag).length,
          negative: serviceData.filter(f => f.negative_flag).length
        };
      });
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
        avg_rating: 4.2, // Mock data
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
