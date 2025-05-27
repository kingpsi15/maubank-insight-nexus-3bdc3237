
import { supabase } from '@/integrations/supabase/client';
import { BankEmployee, EmployeeFeedbackInteraction } from './types';

export const employeeService = {
  async getAll() {
    const { data, error } = await supabase
      .from('bank_employees')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('bank_employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getInteractions(employeeId?: string) {
    let query = supabase
      .from('employee_feedback_interactions')
      .select(`
        *,
        feedback:feedback_id(*),
        employee:employee_id(*)
      `);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query.order('interaction_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createInteraction(interaction: Omit<EmployeeFeedbackInteraction, 'id' | 'interaction_date'>) {
    const { data, error } = await supabase
      .from('employee_feedback_interactions')
      .insert([interaction])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getEmployeeStats(filters: { dateRange?: string; employeeId?: string } = {}) {
    let query = supabase
      .from('employee_feedback_interactions')
      .select(`
        *,
        feedback:feedback_id(sentiment, review_rating, status),
        employee:employee_id(name, department, branch_location)
      `);

    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
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
      
      query = query.gte('interaction_date', startDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Process data to create employee statistics
    const employeeStats = (data || []).reduce((acc: any, interaction: any) => {
      const employeeId = interaction.employee_id;
      const employee = interaction.employee;
      
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employee_id: employeeId,
          name: employee?.name || 'Unknown',
          department: employee?.department || 'Unknown',
          branch_location: employee?.branch_location || 'Unknown',
          total_interactions: 0,
          resolved_count: 0,
          escalated_count: 0,
          contacted_count: 0,
          positive_feedback_handled: 0,
          negative_feedback_handled: 0,
          avg_rating: 0,
          ratings: []
        };
      }

      acc[employeeId].total_interactions++;
      acc[employeeId][`${interaction.interaction_type}_count`]++;
      
      if (interaction.feedback) {
        if (interaction.feedback.sentiment === 'positive') {
          acc[employeeId].positive_feedback_handled++;
        } else if (interaction.feedback.sentiment === 'negative') {
          acc[employeeId].negative_feedback_handled++;
        }
        
        if (interaction.feedback.review_rating) {
          acc[employeeId].ratings.push(interaction.feedback.review_rating);
        }
      }

      return acc;
    }, {});

    // Calculate average ratings
    Object.values(employeeStats).forEach((stat: any) => {
      if (stat.ratings.length > 0) {
        stat.avg_rating = stat.ratings.reduce((a: number, b: number) => a + b, 0) / stat.ratings.length;
      }
      delete stat.ratings; // Remove ratings array from final result
    });

    return Object.values(employeeStats);
  }
};
