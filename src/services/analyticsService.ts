import { supabase } from '@/integrations/supabase/client';

export const analyticsService = {
  async getSentimentData(filters: any = {}) {
    console.log('analyticsService.getSentimentData called with filters:', filters);
    
    let query = supabase.from('feedback').select('sentiment');
    
    // Apply the same filtering logic as metrics
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    // Apply date filters
    if (filters.customDateFrom && filters.customDateTo) {
      query = query.gte('created_at', filters.customDateFrom).lte('created_at', filters.customDateTo);
    } else if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last_year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sentiment data:', error);
      return [];
    }

    // Process sentiment data
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0
    };

    data?.forEach(item => {
      if (item.sentiment === 'positive') sentimentCounts.positive++;
      else if (item.sentiment === 'negative') sentimentCounts.negative++;
      else sentimentCounts.neutral++;
    });

    console.log('getSentimentData returning:', sentimentCounts);
    return [
      { name: 'Positive', value: sentimentCounts.positive, fill: '#10B981' },
      { name: 'Negative', value: sentimentCounts.negative, fill: '#EF4444' },
      { name: 'Neutral', value: sentimentCounts.neutral, fill: '#6B7280' }
    ];
  },

  async getServiceData(filters: any = {}) {
    console.log('analyticsService.getServiceData called with filters:', filters);
    
    let query = supabase.from('feedback').select('service_type, sentiment');
    
    // Apply location and date filters but NOT service filter since we want to see all services
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    // Apply date filters
    if (filters.customDateFrom && filters.customDateTo) {
      query = query.gte('created_at', filters.customDateFrom).lte('created_at', filters.customDateTo);
    } else if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last_year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching service data:', error);
      return [];
    }

    // Process service data by sentiment - ensure all three services are included
    const serviceData: { [key: string]: { positive: number, negative: number, total: number } } = {
      'ATM': { positive: 0, negative: 0, total: 0 },
      'CoreBanking': { positive: 0, negative: 0, total: 0 },
      'OnlineBanking': { positive: 0, negative: 0, total: 0 }
    };

    data?.forEach(item => {
      const service = item.service_type || 'Unknown';
      if (serviceData[service]) {
        serviceData[service].total++;
        if (item.sentiment === 'positive') {
          serviceData[service].positive++;
        } else if (item.sentiment === 'negative') {
          serviceData[service].negative++;
        }
      }
    });

    // Only return services that have data, but ensure all three main services are represented
    const result = Object.entries(serviceData)
      .filter(([service, data]) => data.total > 0 || ['ATM', 'CoreBanking', 'OnlineBanking'].includes(service))
      .map(([service, data]) => ({
        service,
        positive: data.positive,
        negative: data.negative,
        total: data.total
      }));

    console.log('getServiceData returning:', result);
    return result;
  },

  async getLocationData(filters: any = {}) {
    console.log('analyticsService.getLocationData called with filters:', filters);
    
    let query = supabase.from('feedback').select('issue_location, sentiment');
    
    // Apply service and date filters but NOT location filter since we want to see all locations
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }

    // Apply date filters
    if (filters.customDateFrom && filters.customDateTo) {
      query = query.gte('created_at', filters.customDateFrom).lte('created_at', filters.customDateTo);
    } else if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last_year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching location data:', error);
      return [];
    }

    // Process location data
    const locationData: { [key: string]: { positive: number, negative: number, total: number } } = {};

    data?.forEach(item => {
      const location = item.issue_location || 'Unknown';
      if (!locationData[location]) {
        locationData[location] = { positive: 0, negative: 0, total: 0 };
      }
      
      locationData[location].total++;
      if (item.sentiment === 'positive') {
        locationData[location].positive++;
      } else if (item.sentiment === 'negative') {
        locationData[location].negative++;
      }
    });

    const result = Object.entries(locationData).map(([location, data]) => ({
      location,
      positive: data.positive,
      negative: data.negative,
      total: data.total
    }));

    console.log('getLocationData returning:', result);
    return result;
  },

  async getRatingDistribution(filters: any = {}) {
    console.log('analyticsService.getRatingDistribution called with filters:', filters);
    
    let query = supabase.from('feedback').select('review_rating');
    
    // Apply all filters
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    // Apply date filters
    if (filters.customDateFrom && filters.customDateTo) {
      query = query.gte('created_at', filters.customDateFrom).lte('created_at', filters.customDateTo);
    } else if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last_year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching rating distribution:', error);
      return [];
    }

    // Process rating distribution
    const ratingCounts: { [key: number]: number } = {};
    [0, 1, 2, 3, 4, 5].forEach(rating => ratingCounts[rating] = 0);

    data?.forEach(item => {
      const rating = item.review_rating || 0;
      ratingCounts[rating]++;
    });

    const result = Object.entries(ratingCounts).map(([rating, count]) => ({
      rating: `${rating} Stars`,
      count: count,
      fill: rating === '5' ? '#10B981' : rating === '4' ? '#3B82F6' : rating === '3' ? '#F59E0B' : rating === '2' ? '#F97316' : '#EF4444'
    }));

    console.log('getRatingDistribution returning:', result);
    return result;
  },

  async getTimelineData(filters: any = {}) {
    console.log('analyticsService.getTimelineData called with filters:', filters);
    
    let query = supabase.from('feedback').select('created_at, sentiment');
    
    // Apply all filters
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    // Apply date filters
    if (filters.customDateFrom && filters.customDateTo) {
      query = query.gte('created_at', filters.customDateFrom).lte('created_at', filters.customDateTo);
    } else if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last_year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching timeline data:', error);
      return [];
    }

    // Group by date and sentiment
    const timelineData: { [key: string]: { positive: number, negative: number, neutral: number, date: string } } = {};

    data?.forEach(item => {
      const date = new Date(item.created_at).toDateString();
      if (!timelineData[date]) {
        timelineData[date] = { positive: 0, negative: 0, neutral: 0, date };
      }
      
      if (item.sentiment === 'positive') {
        timelineData[date].positive++;
      } else if (item.sentiment === 'negative') {
        timelineData[date].negative++;
      } else {
        timelineData[date].neutral++;
      }
    });

    const result = Object.values(timelineData);
    console.log('getTimelineData returning:', result);
    return result;
  },

  async getTopIssues(filters: any = {}) {
    console.log('analyticsService.getTopIssues called with filters:', filters);
    
    // Fetch approved issues with their feedback counts from the issues table
    let query = supabase
      .from('issues')
      .select('title, feedback_count, category, status, description')
      .eq('status', 'approved')
      .order('feedback_count', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching approved issues:', error);
      return [];
    }

    console.log('Raw issues data from database:', data);

    // Filter out issues with zero feedback count and format the data
    const result = data
      ?.filter(issue => (issue.feedback_count || 0) > 0) // Only show issues with actual feedback
      ?.map(issue => ({
        issue: issue.title,
        count: issue.feedback_count || 0,
        category: issue.category,
        description: issue.description
      })) || [];

    console.log('getTopIssues returning:', result);
    console.log('Total issues found:', result.length);
    console.log('Total feedback across all issues:', result.reduce((sum, issue) => sum + issue.count, 0));
    
    return result;
  }
};
