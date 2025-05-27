
import { supabase, isDemoMode } from './supabase';
import { Issue } from './types';

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
