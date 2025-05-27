
import { supabase } from '@/integrations/supabase/client';

// Analytics operations
export const analyticsService = {
  async getSentimentData(filters: any = {}) {
    let query = supabase.from('feedback').select('sentiment');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    const { data, error } = await query;
    if (error) throw error;

    const sentimentCounts = (data || []).reduce((acc: any, item) => {
      const sentiment = item.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Positive', value: sentimentCounts.positive || 0, color: '#10B981' },
      { name: 'Negative', value: sentimentCounts.negative || 0, color: '#EF4444' },
      { name: 'Neutral', value: sentimentCounts.neutral || 0, color: '#6B7280' }
    ];
  },

  async getServiceData(filters: any = {}) {
    let query = supabase.from('feedback').select('service_type, sentiment');
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const services = ['ATM', 'OnlineBanking', 'CoreBanking'];
    return services.map(service => {
      const serviceData = (data || []).filter(f => f.service_type === service);
      return {
        service,
        positive: serviceData.filter(f => f.sentiment === 'positive').length,
        negative: serviceData.filter(f => f.sentiment === 'negative').length,
        total: serviceData.length
      };
    });
  },

  async getLocationData(filters: any = {}) {
    let query = supabase.from('feedback').select('issue_location, sentiment, review_rating');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const locationStats = (data || []).reduce((acc: any, feedback) => {
      const location = feedback.issue_location || 'Unknown';
      if (!acc[location]) {
        acc[location] = { location, positive: 0, negative: 0, total: 0, ratings: [] };
      }
      
      acc[location].total++;
      acc[location].ratings.push(feedback.review_rating);
      
      if (feedback.sentiment === 'positive') acc[location].positive++;
      if (feedback.sentiment === 'negative') acc[location].negative++;
      
      return acc;
    }, {});

    return Object.values(locationStats).map((loc: any) => ({
      ...loc,
      avgRating: loc.ratings.length > 0 ? loc.ratings.reduce((a: number, b: number) => a + b, 0) / loc.ratings.length : 0
    }));
  },

  async getRatingDistribution(filters: any = {}) {
    let query = supabase.from('feedback').select('review_rating');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
      rating: rating.toString(),
      count: (data || []).filter(f => f.review_rating === rating).length,
      label: ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][rating - 1]
    }));

    return ratingCounts;
  },

  async getTimelineData(filters: any = {}) {
    let query = supabase.from('feedback').select('created_at, sentiment, review_rating');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const monthlyData = (data || []).reduce((acc: any, feedback) => {
      const month = new Date(feedback.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!acc[month]) {
        acc[month] = { month, positive: 0, negative: 0, ratings: [] };
      }
      
      acc[month].ratings.push(feedback.review_rating);
      if (feedback.sentiment === 'positive') acc[month].positive++;
      if (feedback.sentiment === 'negative') acc[month].negative++;
      
      return acc;
    }, {});

    return Object.values(monthlyData).map((month: any) => ({
      ...month,
      avgRating: month.ratings.length > 0 ? month.ratings.reduce((a: number, b: number) => a + b, 0) / month.ratings.length : 0
    }));
  },

  async getTopIssues(filters: any = {}) {
    let query = supabase.from('feedback').select('detected_issues, service_type');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const issueCounts = (data || []).reduce((acc: any, feedback) => {
      const issues = feedback.detected_issues || [];
      issues.forEach((issue: string) => {
        if (!acc[issue]) {
          acc[issue] = { issue, count: 0, service: feedback.service_type };
        }
        acc[issue].count++;
      });
      return acc;
    }, {});

    return Object.values(issueCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 8);
  }
};
