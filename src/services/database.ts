
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface Feedback {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_type: 'ATM' | 'OnlineBanking' | 'CoreBanking';
  review_text: string;
  review_rating: number;
  issue_location?: string;
  contacted_bank_person?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'escalated';
  sentiment: 'positive' | 'negative' | 'neutral';
  detected_issues: string[];
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  resolution: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence_score?: number;
  feedback_count: number;
  approved_by?: string;
  approved_date?: string;
  created_at: string;
  updated_at: string;
}

// Feedback operations
export const feedbackService = {
  async getAll(filters: {
    search?: string;
    status?: string;
    service?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,review_text.ilike.%${filters.search}%`);
    }
    
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(feedback: Omit<Feedback, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedback])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Feedback>) {
    const { data, error } = await supabase
      .from('feedback')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getMetrics(filters: { dateRange?: string; service?: string; location?: string } = {}) {
    let query = supabase.from('feedback').select('*');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    // Apply date range filter
    if (filters.dateRange) {
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
    if (error) throw error;

    // Calculate metrics
    const total = data.length;
    const positive = data.filter(f => f.sentiment === 'positive').length;
    const negative = data.filter(f => f.sentiment === 'negative').length;
    const avgRating = data.length > 0 ? data.reduce((sum, f) => sum + f.review_rating, 0) / data.length : 0;

    return { total, positive, negative, avgRating, data };
  }
};

// Issue operations
export const issueService = {
  async getAll(status?: string) {
    let query = supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(issue: Omit<Issue, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('issues')
      .insert([issue])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Issue>) {
    const { data, error } = await supabase
      .from('issues')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async approve(id: string, approvedBy: string, resolution?: string) {
    const updates: Partial<Issue> = {
      status: 'approved',
      approved_by: approvedBy,
      approved_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (resolution) {
      updates.resolution = resolution;
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async reject(id: string) {
    const { data, error } = await supabase
      .from('issues')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

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
    
    // Group by month
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
    
    // Count issues by type
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
