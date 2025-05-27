import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to demo mode if environment variables are not set
const demoUrl = 'https://demo.supabase.co';
const demoKey = 'demo-key';

export const supabase = createClient(
  supabaseUrl || demoUrl, 
  supabaseKey || demoKey
);

// Check if we're in demo mode
export const isDemoMode = !supabaseUrl || !supabaseKey;

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

// Table creation functions
const createTables = async () => {
  if (isDemoMode) {
    console.log('Demo mode: skipping table creation');
    return;
  }

  try {
    // Create feedback table
    const feedbackTableSQL = `
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_email TEXT,
        service_type TEXT CHECK (service_type IN ('ATM', 'OnlineBanking', 'CoreBanking')),
        review_text TEXT NOT NULL,
        review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
        issue_location TEXT,
        contacted_bank_person TEXT,
        status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'escalated')),
        sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
        detected_issues TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create issues table
    const issuesTableSQL = `
      CREATE TABLE IF NOT EXISTS issues (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        resolution TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        confidence_score DECIMAL,
        feedback_count INTEGER DEFAULT 0,
        approved_by TEXT,
        approved_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Execute table creation
    const { error: feedbackError } = await supabase.rpc('exec_sql', { sql: feedbackTableSQL });
    if (feedbackError) {
      console.log('Feedback table creation result:', feedbackError);
    }

    const { error: issuesError } = await supabase.rpc('exec_sql', { sql: issuesTableSQL });
    if (issuesError) {
      console.log('Issues table creation result:', issuesError);
    }

    console.log('Tables creation completed');
  } catch (error) {
    console.log('Table creation not available, tables may need to be created manually in Supabase dashboard');
  }
};

// Initialize tables when module loads
if (!isDemoMode) {
  createTables();
}

// Mock data for demo mode
const mockFeedback = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    service_type: 'ATM' as const,
    review_text: 'ATM was out of order',
    review_rating: 2,
    issue_location: 'Kuala Lumpur',
    status: 'new' as const,
    sentiment: 'negative' as const,
    detected_issues: ['Hardware Issue'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_email: 'jane@example.com',
    service_type: 'OnlineBanking' as const,
    review_text: 'Great online banking experience',
    review_rating: 5,
    issue_location: 'Selangor',
    status: 'resolved' as const,
    sentiment: 'positive' as const,
    detected_issues: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

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

// Issue operations
export const issueService = {
  async getAll(status?: string) {
    if (isDemoMode) {
      console.log('Demo mode: returning mock issues');
      return [];
    }

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
    if (isDemoMode) {
      console.log('Demo mode: would create issue', issue);
      return { ...issue, id: Date.now().toString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }

    const { data, error } = await supabase
      .from('issues')
      .insert([issue])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Issue>) {
    if (isDemoMode) {
      console.log('Demo mode: would update issue', id, updates);
      return updates;
    }

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
    if (isDemoMode) {
      console.log('Demo mode: would approve issue', id);
      return {};
    }

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
    if (isDemoMode) {
      console.log('Demo mode: would reject issue', id);
      return {};
    }

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
