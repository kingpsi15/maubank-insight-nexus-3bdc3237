
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/database';

export const useAnalytics = (filters: any = {}) => {
  const sentimentQuery = useQuery({
    queryKey: ['analytics-sentiment', filters],
    queryFn: () => analyticsService.getSentimentData(filters),
  });

  const serviceQuery = useQuery({
    queryKey: ['analytics-service', filters],
    queryFn: () => analyticsService.getServiceData(filters),
  });

  const locationQuery = useQuery({
    queryKey: ['analytics-location', filters],
    queryFn: () => analyticsService.getLocationData(filters),
  });

  const ratingQuery = useQuery({
    queryKey: ['analytics-rating', filters],
    queryFn: () => analyticsService.getRatingDistribution(filters),
  });

  const timelineQuery = useQuery({
    queryKey: ['analytics-timeline', filters],
    queryFn: () => analyticsService.getTimelineData(filters),
  });

  const issuesQuery = useQuery({
    queryKey: ['analytics-issues', filters],
    queryFn: () => analyticsService.getTopIssues(filters),
  });

  return {
    sentimentData: sentimentQuery.data || [],
    serviceData: serviceQuery.data || [],
    locationData: locationQuery.data || [],
    ratingData: ratingQuery.data || [],
    timelineData: timelineQuery.data || [],
    issuesData: issuesQuery.data || [],
    isLoading: sentimentQuery.isLoading || serviceQuery.isLoading || locationQuery.isLoading,
  };
};
