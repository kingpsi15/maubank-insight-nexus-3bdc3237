
import { useQuery } from '@tanstack/react-query';
import { mysqlAnalyticsService } from '@/services/mysqlAnalyticsService';

export const useMysqlAnalytics = (filters: any = {}) => {
  const queryOptions = {
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  };

  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ['mysql-analytics', 'sentiment', filters],
    queryFn: () => mysqlAnalyticsService.getSentimentData(filters),
    ...queryOptions,
  });

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ['mysql-analytics', 'service', filters],
    queryFn: () => mysqlAnalyticsService.getServiceData(filters),
    ...queryOptions,
  });

  const { data: locationData, isLoading: locationLoading } = useQuery({
    queryKey: ['mysql-analytics', 'location', filters],
    queryFn: () => mysqlAnalyticsService.getLocationData(filters),
    ...queryOptions,
  });

  const { data: ratingData, isLoading: ratingLoading } = useQuery({
    queryKey: ['mysql-analytics', 'rating', filters],
    queryFn: () => mysqlAnalyticsService.getRatingDistribution(filters),
    ...queryOptions,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['mysql-analytics', 'timeline', filters],
    queryFn: () => mysqlAnalyticsService.getTimelineData(filters),
    ...queryOptions,
  });

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['mysql-analytics', 'issues', filters],
    queryFn: () => mysqlAnalyticsService.getTopIssues(filters),
    ...queryOptions,
  });

  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['mysql-analytics', 'employees', filters],
    queryFn: () => mysqlAnalyticsService.getEmployeeStats(filters),
    ...queryOptions,
  });

  return {
    sentimentData,
    serviceData,
    locationData,
    ratingData,
    timelineData,
    issuesData,
    employeeData,
    isLoading: sentimentLoading || serviceLoading || locationLoading || 
               ratingLoading || timelineLoading || issuesLoading || employeeLoading,
  };
};
