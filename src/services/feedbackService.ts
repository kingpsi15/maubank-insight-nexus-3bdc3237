
import { supabase } from '@/integrations/supabase/client';
import { Feedback } from './types';

// Enhanced issue detection using LLM
const detectIssuesWithLLM = async (reviewText: string, sentiment: string, rating: number, serviceType: string): Promise<{ issues: string[], resolutions: string[] }> => {
  try {
    // Use Hugging Face Inference API (free tier)
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Analyze this customer feedback for banking service issues and suggest resolutions:
        
Service: ${serviceType}
Rating: ${rating}/5
Sentiment: ${sentiment}
Feedback: "${reviewText}"

Please identify specific issues and suggest practical resolutions. Format as:
ISSUES: [list issues]
RESOLUTIONS: [list corresponding resolutions]`,
        parameters: {
          max_length: 200,
          temperature: 0.3
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      return parseLLMResponse(result[0]?.generated_text || '', reviewText, sentiment, rating, serviceType);
    }
  } catch (error) {
    console.log('LLM detection failed, using keyword detection:', error);
  }
  
  return detectIssuesKeywordBased(reviewText, sentiment, rating, serviceType);
};

const parseLLMResponse = (llmResponse: string, reviewText: string, sentiment: string, rating: number, serviceType: string) => {
  try {
    const issues: string[] = [];
    const resolutions: string[] = [];
    
    // Try to extract issues and resolutions from LLM response
    const issuesMatch = llmResponse.match(/ISSUES:\s*(.+?)(?=RESOLUTIONS:|$)/s);
    const resolutionsMatch = llmResponse.match(/RESOLUTIONS:\s*(.+)$/s);
    
    if (issuesMatch) {
      const issuesList = issuesMatch[1].split(/[,\n\-]/).map(i => i.trim()).filter(i => i.length > 0);
      issues.push(...issuesList);
    }
    
    if (resolutionsMatch) {
      const resolutionsList = resolutionsMatch[1].split(/[,\n\-]/).map(r => r.trim()).filter(r => r.length > 0);
      resolutions.push(...resolutionsList);
    }
    
    // If LLM didn't provide good results, fall back to keyword detection
    if (issues.length === 0) {
      return detectIssuesKeywordBased(reviewText, sentiment, rating, serviceType);
    }
    
    return { issues, resolutions };
  } catch (error) {
    console.log('Failed to parse LLM response, using keyword detection');
    return detectIssuesKeywordBased(reviewText, sentiment, rating, serviceType);
  }
};

const detectIssuesKeywordBased = (reviewText: string, sentiment: string, rating: number, serviceType: string) => {
  const issues: string[] = [];
  const resolutions: string[] = [];
  const text = reviewText.toLowerCase();
  
  // ATM related issues
  if (text.includes('atm') && (text.includes('not working') || text.includes('broken') || text.includes('down') || text.includes('error'))) {
    issues.push('ATM malfunction - machine not responding or displaying errors');
    resolutions.push('Check ATM maintenance log, restart machine if needed, and arrange for technical support. Provide alternative ATM locations to customer.');
  }
  
  if (text.includes('card') && (text.includes('stuck') || text.includes('trapped'))) {
    issues.push('Card stuck in ATM machine');
    resolutions.push('Contact customer immediately to verify card status, arrange card replacement, check ATM for mechanical issues, and initiate refund if transaction was incomplete.');
  }
  
  // Card issues
  if (text.includes('card') && (text.includes('blocked') || text.includes('not working') || text.includes('declined'))) {
    issues.push('Card transaction declined or blocked');
    resolutions.push('Verify customer account status, check for card expiry or damage, unlock card if blocked due to security, and guide customer through card replacement process if needed.');
  }
  
  // Online/Mobile banking issues
  if ((text.includes('app') || text.includes('online') || text.includes('mobile')) && 
      (text.includes('crash') || text.includes('not working') || text.includes('error') || text.includes('slow'))) {
    issues.push('Mobile/Online banking application issues');
    resolutions.push('Guide customer to update app to latest version, clear cache and data, check internet connection, and reinstall app if problem persists. Escalate to IT team for server-side issues.');
  }
  
  if (text.includes('login') && (text.includes('fail') || text.includes('not work') || text.includes('cannot'))) {
    issues.push('Login authentication failure');
    resolutions.push('Reset customer password, verify security questions, enable two-factor authentication, and provide step-by-step login guidance. Check for account lockout and unlock if necessary.');
  }
  
  // Transaction issues
  if (text.includes('transaction') && (text.includes('delay') || text.includes('slow') || text.includes('pending'))) {
    issues.push('Transaction processing delays');
    resolutions.push('Investigate transaction status in core banking system, check for system delays, provide transaction reference for tracking, and escalate to operations team if needed.');
  }
  
  // Service issues
  if (text.includes('service') && (text.includes('poor') || text.includes('bad') || text.includes('slow'))) {
    issues.push('Poor customer service experience');
    resolutions.push('Schedule follow-up call with customer, provide service recovery gesture, conduct staff retraining if needed, and implement service improvement measures.');
  }
  
  // Branch issues
  if (text.includes('branch') && (text.includes('closed') || text.includes('long queue') || text.includes('wait'))) {
    issues.push('Branch service accessibility issues');
    resolutions.push('Provide alternative branch locations, implement queue management system, extend operating hours if feasible, and promote digital banking alternatives.');
  }
  
  // Charges issues
  if (text.includes('charge') && (text.includes('hidden') || text.includes('extra') || text.includes('unexpected'))) {
    issues.push('Unexpected or unclear charges');
    resolutions.push('Review customer account for unauthorized charges, provide detailed fee breakdown, process refund if charges are incorrect, and improve fee transparency communication.');
  }
  
  // General negative sentiment
  if (sentiment === 'negative' && rating <= 2 && issues.length === 0) {
    issues.push('General service dissatisfaction');
    resolutions.push('Contact customer for detailed feedback, conduct service review, implement corrective measures, and follow up to ensure satisfaction.');
  }
  
  return { issues, resolutions };
};

const createPendingIssues = async (feedbackId: string, detectedIssues: string[], suggestedResolutions: string[], serviceType: string) => {
  for (let i = 0; i < detectedIssues.length; i++) {
    const issue = detectedIssues[i];
    const resolution = suggestedResolutions[i] || 'Manual review required for appropriate resolution.';
    
    const { data: existingIssues } = await supabase
      .from('pending_issues')
      .select('id, feedback_count')
      .ilike('title', `%${issue.substring(0, 20)}%`)
      .eq('category', serviceType);
    
    if (existingIssues && existingIssues.length > 0) {
      const existingIssue = existingIssues[0];
      await supabase
        .from('pending_issues')
        .update({ 
          feedback_count: existingIssue.feedback_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingIssue.id);
    } else {
      const { data: pendingIssue } = await supabase
        .from('pending_issues')
        .insert({
          title: issue,
          description: `Issue detected from customer feedback: ${issue}`,
          category: serviceType,
          confidence_score: 0.8,
          feedback_count: 1,
          detected_from_feedback_id: feedbackId
        })
        .select()
        .single();
      
      if (pendingIssue) {
        await supabase
          .from('pending_resolutions')
          .insert({
            pending_issue_id: pendingIssue.id,
            resolution_text: resolution,
            confidence_score: 0.75
          });
      }
    }
  }
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
    console.log('feedbackService.getAll called with filters:', filters);
    
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
      console.log('Applying service filter:', filters.service);
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
    
    console.log(`feedbackService.getAll returning ${data?.length || 0} records`);
    return data || [];
  },

  async create(feedback: Omit<Feedback, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('feedbackService.create called with:', feedback);
      
      const { issues, resolutions } = await detectIssuesWithLLM(
        feedback.review_text, 
        feedback.sentiment || 'neutral', 
        feedback.review_rating,
        feedback.service_type
      );
      
      const feedbackWithIssues = {
        ...feedback,
        detected_issues: issues
      };

      console.log('Creating feedback record with service_type:', feedbackWithIssues.service_type);

      const { data, error } = await supabase
        .from('feedback')
        .insert([feedbackWithIssues])
        .select()
        .single();
      
      if (error) {
        console.error('Database error creating feedback:', error);
        throw error;
      }

      console.log('Successfully created feedback record:', data.id);

      if (data && issues.length > 0) {
        await createPendingIssues(data.id, issues, resolutions, feedback.service_type);
      }
      
      return data;
    } catch (error) {
      console.error('Error in feedbackService.create:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Feedback>) {
    console.log('feedbackService.update called for id:', id, 'with updates:', updates);
    
    if (updates.review_text || updates.review_rating) {
      const { data: currentFeedback } = await supabase
        .from('feedback')
        .select('review_text, sentiment, review_rating, service_type')
        .eq('id', id)
        .single();
      
      if (currentFeedback) {
        const reviewText = updates.review_text || currentFeedback.review_text;
        const sentiment = updates.sentiment || currentFeedback.sentiment || 'neutral';
        const rating = updates.review_rating || currentFeedback.review_rating;
        const serviceType = currentFeedback.service_type;
        
        const { issues } = await detectIssuesWithLLM(reviewText, sentiment, rating, serviceType);
        updates.detected_issues = issues;
      }
    }

    const { data, error } = await supabase
      .from('feedback')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
    
    console.log('Successfully updated feedback:', data.id);
    return data;
  },

  async delete(id: string) {
    console.log('feedbackService.delete called for id:', id);
    
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
    
    console.log('Successfully deleted feedback:', id);
  },

  async getMetrics(filters: { 
    dateRange?: string; 
    service?: string; 
    location?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    console.log('feedbackService.getMetrics called with filters:', filters);
    
    let query = supabase.from('feedback').select('*');
    
    if (filters.service && filters.service !== 'all') {
      console.log('Applying service filter in metrics:', filters.service);
      query = query.eq('service_type', filters.service);
    }
    
    if (filters.location && filters.location !== 'all') {
      query = query.eq('issue_location', filters.location);
    }

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
    if (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }

    const feedbackData = data || [];
    console.log(`feedbackService.getMetrics: Fetched ${feedbackData.length} records for filters:`, filters);
    
    const total = feedbackData.length;
    const positive = feedbackData.filter(f => f.sentiment === 'positive').length;
    const negative = feedbackData.filter(f => f.sentiment === 'negative').length;
    const neutral = feedbackData.filter(f => f.sentiment === 'neutral').length;
    const resolved = feedbackData.filter(f => f.status === 'resolved').length;
    const pending = feedbackData.filter(f => f.status === 'new' || f.status === 'in_progress').length;
    const escalated = feedbackData.filter(f => f.status === 'escalated').length;
    
    const ratingDistribution = [0, 1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: feedbackData.filter(f => f.review_rating === rating).length
    }));

    const avgRating = feedbackData.length > 0 ? 
      feedbackData.reduce((sum, f) => sum + (f.review_rating || 0), 0) / feedbackData.length : 0;

    const metrics = { 
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
    
    console.log('feedbackService.getMetrics returning:', metrics);
    return metrics;
  }
};
