
import { supabase, isDemoMode } from './supabase';
import { Feedback } from './types';
import { mockFeedback } from './mockData';

// Feedback operations
export const feedbackService = {
  async getAll(filters: {
    search?: string;
    status?: string;
    service?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    if (isDemoMode) {
      console.log('Demo mode: returning mock feedback data');
      return mockFeedback;
    }

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
    if (isDemoMode) {
      console.log('Demo mode: would create feedback', feedback);
      return { ...feedback, id: Date.now().toString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert([feedback])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Feedback>) {
    if (isDemoMode) {
      console.log('Demo mode: would update feedback', id, updates);
      return { ...mockFeedback[0], ...updates };
    }

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
    if (isDemoMode) {
      console.log('Demo mode: would delete feedback', id);
      return;
    }

    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getMetrics(filters: { dateRange?: string; service?: string; location?: string } = {}) {
    if (isDemoMode) {
      const data = mockFeedback;
      const total = data.length;
      const positive = data.filter(f => f.sentiment === 'positive').length;
      const negative = data.filter(f => f.sentiment === 'negative').length;
      const avgRating = data.length > 0 ? data.reduce((sum, f) => sum + f.review_rating, 0) / data.length : 0;
      return { total, positive, negative, avgRating, data };
    }

    let query = supabase.from('feedback').select('*');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

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

    const total = data.length;
    const positive = data.filter(f => f.sentiment === 'positive').length;
    const negative = data.filter(f => f.sentiment === 'negative').length;
    const avgRating = data.length > 0 ? data.reduce((sum, f) => sum + f.review_rating, 0) / data.length : 0;

    return { total, positive, negative, avgRating, data };
  }
};
