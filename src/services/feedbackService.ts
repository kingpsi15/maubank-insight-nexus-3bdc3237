
import { supabase } from '@/integrations/supabase/client';
import { Feedback } from './types';

// Simple issue detection based on keywords and sentiment
const detectIssues = (reviewText: string, sentiment: string, rating: number): string[] => {
  const issues: string[] = [];
  const text = reviewText.toLowerCase();
  
  // ATM related issues
  if (text.includes('atm') && (text.includes('not working') || text.includes('broken') || text.includes('down') || text.includes('error'))) {
    issues.push('ATM malfunction');
  }
  
  // Card issues
  if (text.includes('card') && (text.includes('blocked') || text.includes('not working') || text.includes('declined'))) {
    issues.push('Card issues');
  }
  
  // Service issues
  if (text.includes('service') && (text.includes('poor') || text.includes('bad') || text.includes('slow'))) {
    issues.push('Poor customer service');
  }
  
  // Charges issues
  if (text.includes('charge') && (text.includes('hidden') || text.includes('extra') || text.includes('unexpected'))) {
    issues.push('Unexpected charges');
  }
  
  // App/Online banking issues
  if ((text.includes('app') || text.includes('online') || text.includes('mobile')) && 
      (text.includes('crash') || text.includes('not working') || text.includes('error') || text.includes('slow'))) {
    issues.push('Mobile/Online banking issues');
  }
  
  // Branch issues
  if (text.includes('branch') && (text.includes('closed') || text.includes('long queue') || text.includes('wait'))) {
    issues.push('Branch service issues');
  }
  
  // General negative sentiment issues
  if (sentiment === 'negative' && rating <= 2) {
    if (issues.length === 0) {
      issues.push('General service dissatisfaction');
    }
  }
  
  return issues;
};

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
    // Auto-detect issues before creating
    const detectedIssues = detectIssues(feedback.review_text, feedback.sentiment || 'neutral', feedback.review_rating);
    
    const feedbackWithIssues = {
      ...feedback,
      detected_issues: detectedIssues
    };

    const { data, error } = await supabase
      .from('feedback')
      .insert([feedbackWithIssues])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async bulkCreate(feedbackList: Omit<Feedback, 'id' | 'created_at' | 'updated_at'>[]) {
    // Auto-detect issues for all feedback entries
    const feedbackWithIssues = feedbackList.map(feedback => {
      const detectedIssues = detectIssues(feedback.review_text, feedback.sentiment || 'neutral', feedback.review_rating);
      return {
        ...feedback,
        detected_issues: detectedIssues
      };
    });

    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackWithIssues)
      .select();
    
    if (error) throw error;
    return data || [];
  },

  async update(id: string, updates: Partial<Feedback>) {
    // Re-detect issues if review text or rating changed
    if (updates.review_text || updates.review_rating) {
      const { data: currentFeedback } = await supabase
        .from('feedback')
        .select('review_text, sentiment, review_rating')
        .eq('id', id)
        .single();
      
      if (currentFeedback) {
        const reviewText = updates.review_text || currentFeedback.review_text;
        const sentiment = updates.sentiment || currentFeedback.sentiment || 'neutral';
        const rating = updates.review_rating || currentFeedback.review_rating;
        
        const detectedIssues = detectIssues(reviewText, sentiment, rating);
        updates.detected_issues = detectedIssues;
      }
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
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getMetrics(filters: { 
    dateRange?: string; 
    service?: string; 
    location?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    let query = supabase.from('feedback').select('*');
    
    if (filters.service && filters.service !== 'all') {
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

    // Handle custom date range
    if (filters.dateFrom && filters.dateTo) {
      query = query.gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);
    } else if (filters.dateRange) {
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
    const neutral = feedbackData.filter(f => f.sentiment === 'neutral').length;
    const resolved = feedbackData.filter(f => f.status === 'resolved').length;
    const pending = feedbackData.filter(f => f.status === 'new' || f.status === 'in_progress').length;
    const escalated = feedbackData.filter(f => f.status === 'escalated').length;
    
    // Calculate rating distribution including 0 ratings
    const ratingDistribution = [0, 1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: feedbackData.filter(f => f.review_rating === rating).length
    }));

    const avgRating = feedbackData.length > 0 ? 
      feedbackData.reduce((sum, f) => sum + (f.review_rating || 0), 0) / feedbackData.length : 0;

    return { 
      total, 
      positive, 
      negative, 
      neutral,
      resolved,
      pending,
      escalated,
      avgRating, 
      ratingDistribution,
      data: feedbackData 
    };
  }
};
