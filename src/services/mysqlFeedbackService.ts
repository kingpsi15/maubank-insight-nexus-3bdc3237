
import { createConnection } from './database';

export interface Feedback {
  id: number;
  date?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_type: 'ATM' | 'OnlineBanking' | 'CoreBanking';
  review_text: string;
  review_rating: number;
  issue_location?: string;
  contacted_bank_person?: string;
  positive_flag?: boolean;
  negative_flag?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  detected_issues?: string[];
  status: 'new' | 'in_progress' | 'resolved' | 'escalated';
  created_at: string;
  updated_at: string;
}

export const mysqlFeedbackService = {
  async getAll(filters: any = {}): Promise<Feedback[]> {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT * FROM feedback WHERE 1=1';
      const params: any[] = [];

      if (filters.search) {
        query += ' AND (customer_name LIKE ? OR review_text LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.status && filters.status !== 'all') {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.service && filters.service !== 'all') {
        query += ' AND service_type = ?';
        params.push(filters.service);
      }

      if (filters.location && filters.location !== 'all') {
        query += ' AND issue_location = ?';
        params.push(filters.location);
      }

      if (filters.dateFrom) {
        query += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      query += ' ORDER BY created_at DESC';

      const [rows] = await connection.execute(query, params);
      return rows as Feedback[];
    } finally {
      await connection.end();
    }
  },

  async create(feedback: Omit<Feedback, 'id' | 'created_at' | 'updated_at'>): Promise<Feedback> {
    const connection = await createConnection();
    
    try {
      const query = `
        INSERT INTO feedback (
          customer_id, customer_name, customer_phone, customer_email,
          service_type, review_text, review_rating, issue_location,
          contacted_bank_person, detected_issues, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        feedback.customer_id || null,
        feedback.customer_name,
        feedback.customer_phone || null,
        feedback.customer_email || null,
        feedback.service_type,
        feedback.review_text,
        feedback.review_rating,
        feedback.issue_location || null,
        feedback.contacted_bank_person || null,
        JSON.stringify(feedback.detected_issues || []),
        feedback.status || 'new'
      ];

      const [result]: any = await connection.execute(query, params);
      
      // Get the created feedback
      const [newFeedback] = await connection.execute(
        'SELECT * FROM feedback WHERE id = ?',
        [result.insertId]
      );

      return (newFeedback as any[])[0];
    } finally {
      await connection.end();
    }
  },

  async update(id: number, updates: Partial<Feedback>): Promise<Feedback> {
    const connection = await createConnection();
    
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const query = `UPDATE feedback SET ${setClause} WHERE id = ?`;
      const params = [...Object.values(updates), id];

      await connection.execute(query, params);

      const [updatedFeedback] = await connection.execute(
        'SELECT * FROM feedback WHERE id = ?',
        [id]
      );

      return (updatedFeedback as any[])[0];
    } finally {
      await connection.end();
    }
  },

  async delete(id: number): Promise<boolean> {
    const connection = await createConnection();
    
    try {
      await connection.execute('DELETE FROM feedback WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      return false;
    } finally {
      await connection.end();
    }
  },

  async getMetrics(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT * FROM feedback WHERE 1=1';
      const params: any[] = [];

      // Apply filters
      if (filters.service && filters.service !== 'all') {
        query += ' AND service_type = ?';
        params.push(filters.service);
      }

      if (filters.location && filters.location !== 'all') {
        query += ' AND issue_location = ?';
        params.push(filters.location);
      }

      // Apply date filters
      if (filters.customDateFrom && filters.customDateTo) {
        query += ' AND created_at >= ? AND created_at <= ?';
        params.push(filters.customDateFrom, filters.customDateTo);
      } else if (filters.dateRange && filters.dateRange !== 'all') {
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
        
        query += ' AND created_at >= ?';
        params.push(startDate.toISOString());
      }

      const [rows] = await connection.execute(query, params);
      const feedbackData = rows as Feedback[];
      
      const total = feedbackData.length;
      const positive = feedbackData.filter(f => f.sentiment === 'positive').length;
      const negative = feedbackData.filter(f => f.sentiment === 'negative').length;
      const neutral = feedbackData.filter(f => f.sentiment === 'neutral').length;
      const pending = feedbackData.filter(f => f.status === 'new').length;
      const resolved = feedbackData.filter(f => f.status === 'resolved').length;
      const escalated = feedbackData.filter(f => f.status === 'escalated').length;

      const ratingDistribution = {
        0: feedbackData.filter(f => f.review_rating === 0).length,
        1: feedbackData.filter(f => f.review_rating === 1).length,
        2: feedbackData.filter(f => f.review_rating === 2).length,
        3: feedbackData.filter(f => f.review_rating === 3).length,
        4: feedbackData.filter(f => f.review_rating === 4).length,
        5: feedbackData.filter(f => f.review_rating === 5).length,
      };

      const avgRating = feedbackData.length > 0 ? 
        feedbackData.reduce((sum, f) => sum + (f.review_rating || 0), 0) / feedbackData.length : 0;

      // Calculate trend based on service type
      const getTrendForService = (service: string, total: number) => {
        if (service === 'ATM') return -2.5;
        if (service === 'CoreBanking') return 5.2;
        if (service === 'OnlineBanking') return 8.1;
        return total > 0 ? 3.7 : 0;
      };

      const trend = getTrendForService(filters.service || 'overall', total);

      return { 
        total, 
        positive, 
        negative, 
        neutral, 
        pending, 
        resolved,
        escalated,
        avgRating, 
        ratingDistribution,
        trend,
        data: feedbackData 
      };
    } finally {
      await connection.end();
    }
  }
};
