
import { supabase } from '@/integrations/supabase/client';
import { Feedback } from './types';

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
    return data || [];
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

    const feedbackData = data || [];
    const total = feedbackData.length;
    const positive = feedbackData.filter(f => f.sentiment === 'positive').length;
    const negative = feedbackData.filter(f => f.sentiment === 'negative').length;
    const avgRating = feedbackData.length > 0 ? feedbackData.reduce((sum, f) => sum + f.review_rating, 0) / feedbackData.length : 0;

    return { total, positive, negative, avgRating, data: feedbackData };
  }
};
