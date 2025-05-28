
// MySQL Database Service
// This will connect to your local MySQL database

interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface FeedbackRecord {
  id: string;
  customer_name: string;
  service_type: 'ATM' | 'OnlineBanking' | 'CoreBanking';
  review_text: string;
  review_rating: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  status: 'new' | 'in_progress' | 'resolved' | 'escalated';
  created_at: string;
  issue_location?: string;
  positive_flag: boolean;
  negative_flag: boolean;
}

class MySQLService {
  private config: MySQLConfig;
  private apiBaseUrl: string;

  constructor() {
    // You'll need to set up a backend API server for MySQL connection
    this.apiBaseUrl = 'http://localhost:3001/api'; // Your backend API URL
    this.config = {
      host: 'localhost',
      port: 3306,
      user: 'root', // Your MySQL username
      password: '', // Your MySQL password
      database: 'feedback_db' // Your MySQL database name
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }

  async getFeedback(filters: any = {}): Promise<FeedbackRecord[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.service && filters.service !== 'all') {
        queryParams.append('service', filters.service);
      }
      
      if (filters.location && filters.location !== 'all') {
        queryParams.append('location', filters.location);
      }
      
      if (filters.dateRange && filters.dateRange !== 'all') {
        queryParams.append('dateRange', filters.dateRange);
      }

      const response = await fetch(`${this.apiBaseUrl}/feedback?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching MySQL feedback data:', error);
      throw error;
    }
  }

  async getMetrics(filters: any = {}) {
    try {
      const feedback = await this.getFeedback(filters);
      
      const total = feedback.length;
      const positive = feedback.filter(f => f.positive_flag).length;
      const negative = feedback.filter(f => f.negative_flag).length;
      const resolved = feedback.filter(f => f.status === 'resolved').length;
      const pending = feedback.filter(f => f.status === 'new' || f.status === 'in_progress').length;
      const avgRating = total > 0 ? feedback.reduce((sum, f) => sum + f.review_rating, 0) / total : 0;

      return {
        total,
        positive,
        negative,
        resolved,
        pending,
        avgRating,
        trend: 2.5 // Calculate based on your data
      };
    } catch (error) {
      console.error('Error calculating MySQL metrics:', error);
      throw error;
    }
  }

  async getSentimentData(filters: any = {}) {
    try {
      const feedback = await this.getFeedback(filters);
      
      const positive = feedback.filter(f => f.sentiment === 'positive').length;
      const negative = feedback.filter(f => f.sentiment === 'negative').length;
      const neutral = feedback.filter(f => f.sentiment === 'neutral').length;

      return [
        { name: 'Positive', value: positive, fill: '#10B981' },
        { name: 'Negative', value: negative, fill: '#EF4444' },
        { name: 'Neutral', value: neutral, fill: '#6B7280' }
      ];
    } catch (error) {
      console.error('Error getting MySQL sentiment data:', error);
      throw error;
    }
  }

  async getServiceData(filters: any = {}) {
    try {
      const feedback = await this.getFeedback(filters);
      
      const serviceStats: { [key: string]: { positive: number; negative: number } } = {};
      
      feedback.forEach(item => {
        const service = item.service_type;
        if (!serviceStats[service]) {
          serviceStats[service] = { positive: 0, negative: 0 };
        }
        
        if (item.sentiment === 'positive') {
          serviceStats[service].positive++;
        } else if (item.sentiment === 'negative') {
          serviceStats[service].negative++;
        }
      });
      
      return Object.entries(serviceStats).map(([service, stats]) => ({
        service,
        positive: stats.positive,
        negative: stats.negative
      }));
    } catch (error) {
      console.error('Error getting MySQL service data:', error);
      throw error;
    }
  }
}

export const mysqlService = new MySQLService();
