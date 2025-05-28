
import { useQuery } from '@tanstack/react-query';
import { mysqlService } from '@/services/mysqlService';

export const useMySQLFeedback = (filters: any = {}) => {
  return useQuery({
    queryKey: ['mysql-feedback', filters],
    queryFn: () => mysqlService.getFeedback(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useMySQLMetrics = (filters: any = {}) => {
  return useQuery({
    queryKey: ['mysql-metrics', filters],
    queryFn: () => mysqlService.getMetrics(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useMySQLAnalytics = (filters: any = {}) => {
  const sentimentQuery = useQuery({
    queryKey: ['mysql-sentiment', filters],
    queryFn: () => mysqlService.getSentimentData(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const serviceQuery = useQuery({
    queryKey: ['mysql-service', filters],
    queryFn: () => mysqlService.getServiceData(filters),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  return {
    sentimentData: sentimentQuery.data,
    serviceData: serviceQuery.data,
    isLoading: sentimentQuery.isLoading || serviceQuery.isLoading,
  };
};
