
import { useQuery } from '@tanstack/react-query';
import { mysqlService } from '@/services/mysqlService';

export const useMysqlAnalytics = (filters: any) => {
  const sentimentQuery = useQuery({
    queryKey: ['mysql-sentiment-data', filters],
    queryFn: () => mysqlService.getSentimentData(filters),
    staleTime: 30000,
    refetchOnMount: 'always',
  });

  const serviceQuery = useQuery({
    queryKey: ['mysql-service-data', filters],
    queryFn: () => mysqlService.getServiceData(filters),
    staleTime: 30000,
    refetchOnMount: 'always',
  });

  return {
    sentimentData: sentimentQuery.data || [],
    serviceData: serviceQuery.data || [],
    isLoading: sentimentQuery.isLoading || serviceQuery.isLoading
  };
};
