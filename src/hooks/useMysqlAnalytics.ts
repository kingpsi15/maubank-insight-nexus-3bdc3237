
import { useQuery } from '@tanstack/react-query';
import { mysqlService } from '@/services/mysqlService';

export const useMysqlAnalytics = (filters: any) => {
  const sentimentQuery = useQuery({
    queryKey: ['mysql-sentiment-data', filters],
    queryFn: () => mysqlService.getSentimentData(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const serviceQuery = useQuery({
    queryKey: ['mysql-service-data', filters],
    queryFn: () => mysqlService.getServiceData(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const employeeQuery = useQuery({
    queryKey: ['mysql-employee-data', filters],
    queryFn: async () => {
      // This would fetch from your MySQL employee table
      // For now returning empty array until MySQL backend is set up
      return [];
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
