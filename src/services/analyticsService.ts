
import { feedbackService } from './feedbackService';

// Analytics operations
export const analyticsService = {
  async getSentimentData(filters: any = {}) {
    const { data } = await feedbackService.getMetrics(filters);
    return [
      { name: 'Positive', value: data.filter(f => f.sentiment === 'positive').length, color: '#10B981' },
      { name: 'Negative', value: data.filter(f => f.sentiment === 'negative').length, color: '#EF4444' },
      { name: 'Neutral', value: data.filter(f => f.sentiment === 'neutral').length, color: '#6B7280' }
    ];
  },

  async getServiceData(filters: any = {}) {
    const { data } = await feedbackService.getMetrics(filters);
    
    const services = ['ATM', 'OnlineBanking', 'CoreBanking'];
    return services.map(service => {
      const serviceData = data.filter(f => f.service_type === service);
      return {
        service,
        positive: serviceData.filter(f => f.sentiment === 'positive').length,
        negative: serviceData.filter(f => f.sentiment === 'negative').length,
        total: serviceData.length
      };
    });
  },

  async getLocationData(filters: any = {}) {
    const { data } = await feedbackService.getMetrics(filters);
    
    const locationStats = data.reduce((acc: any, feedback) => {
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
    const { data } = await feedbackService.getMetrics(filters);
    
    const ratingCounts = [1, 2, 3, 4, 5].map(rating => ({
      rating: rating.toString(),
      count: data.filter(f => f.review_rating === rating).length,
      label: ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][rating - 1]
    }));

    return ratingCounts;
  },

  async getTimelineData(filters: any = {}) {
    const { data } = await feedbackService.getMetrics(filters);
    
    const monthlyData = data.reduce((acc: any, feedback) => {
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
    const { data } = await feedbackService.getMetrics(filters);
    
    const issueCounts = data.reduce((acc: any, feedback) => {
      feedback.detected_issues.forEach((issue: string) => {
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
