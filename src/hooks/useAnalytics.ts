
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services';

export const useAnalytics = (filters: any = {}) => {
  const queryOptions = {
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results
  };

  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ['analytics', 'sentiment', filters],
    queryFn: () => analyticsService.getSentimentData(filters),
    ...queryOptions,
  });

  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ['analytics', 'service', filters],
    queryFn: () => analyticsService.getServiceData(filters),
    ...queryOptions,
  });

  const { data: locationData, isLoading: locationLoading } = useQuery({
    queryKey: ['analytics', 'location', filters],
    queryFn: () => analyticsService.getLocationData(filters),
    ...queryOptions,
  });

  const { data: ratingData, isLoading: ratingLoading } = useQuery({
    queryKey: ['analytics', 'rating', filters],
    queryFn: () => analyticsService.getRatingDistribution(filters),
    ...queryOptions,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['analytics', 'timeline', filters],
    queryFn: () => analyticsService.getTimelineData(filters),
    ...queryOptions,
  });

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['analytics', 'issues', filters],
    queryFn: () => analyticsService.getTopIssues(filters),
    ...queryOptions,
  });

  return {
    sentimentData,
    serviceData,
    locationData,
    ratingData,
    timelineData,
    issuesData,
    isLoading: sentimentLoading || serviceLoading || locationLoading || 
               ratingLoading || timelineLoading || issuesLoading,
  };
};
