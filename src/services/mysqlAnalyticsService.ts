
import { createConnection } from './database';

export const mysqlAnalyticsService = {
  async getSentimentData(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT sentiment FROM feedback WHERE 1=1';
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
      const data = rows as any[];

      const sentimentCounts = {
        positive: 0,
        negative: 0,
        neutral: 0
      };

      data.forEach(item => {
        if (item.sentiment === 'positive') sentimentCounts.positive++;
        else if (item.sentiment === 'negative') sentimentCounts.negative++;
        else sentimentCounts.neutral++;
      });

      return [
        { name: 'Positive', value: sentimentCounts.positive, fill: '#10B981' },
        { name: 'Negative', value: sentimentCounts.negative, fill: '#EF4444' },
        { name: 'Neutral', value: sentimentCounts.neutral, fill: '#6B7280' }
      ];
    } finally {
      await connection.end();
    }
  },

  async getServiceData(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT service_type, sentiment FROM feedback WHERE 1=1';
      const params: any[] = [];

      // Apply location and date filters but NOT service filter
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
      const data = rows as any[];

      const serviceData: { [key: string]: { positive: number, negative: number, total: number } } = {};

      data.forEach(item => {
        const service = item.service_type || 'Unknown';
        if (!serviceData[service]) {
          serviceData[service] = { positive: 0, negative: 0, total: 0 };
        }
        
        serviceData[service].total++;
        if (item.sentiment === 'positive') {
          serviceData[service].positive++;
        } else if (item.sentiment === 'negative') {
          serviceData[service].negative++;
        }
      });

      return Object.entries(serviceData).map(([service, data]) => ({
        service,
        positive: data.positive,
        negative: data.negative,
        total: data.total
      }));
    } finally {
      await connection.end();
    }
  },

  async getLocationData(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT issue_location, sentiment FROM feedback WHERE issue_location IS NOT NULL';
      const params: any[] = [];

      // Apply service and date filters but NOT location filter
      if (filters.service && filters.service !== 'all') {
        query += ' AND service_type = ?';
        params.push(filters.service);
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
      const data = rows as any[];

      const locationData: { [key: string]: { positive: number, negative: number, total: number } } = {};

      data.forEach(item => {
        const location = item.issue_location || 'Unknown';
        if (!locationData[location]) {
          locationData[location] = { positive: 0, negative: 0, total: 0 };
        }
        
        locationData[location].total++;
        if (item.sentiment === 'positive') {
          locationData[location].positive++;
        } else if (item.sentiment === 'negative') {
          locationData[location].negative++;
        }
      });

      return Object.entries(locationData).map(([location, data]) => ({
        location,
        positive: data.positive,
        negative: data.negative,
        total: data.total
      }));
    } finally {
      await connection.end();
    }
  },

  async getRatingDistribution(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT review_rating FROM feedback WHERE 1=1';
      const params: any[] = [];

      // Apply all filters
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
      const data = rows as any[];

      const ratingCounts: { [key: number]: number } = {};
      [0, 1, 2, 3, 4, 5].forEach(rating => ratingCounts[rating] = 0);

      data.forEach(item => {
        const rating = item.review_rating || 0;
        ratingCounts[rating]++;
      });

      return Object.entries(ratingCounts).map(([rating, count]) => ({
        rating: `${rating} Stars`,
        count: count,
        fill: rating === '5' ? '#10B981' : rating === '4' ? '#3B82F6' : rating === '3' ? '#F59E0B' : rating === '2' ? '#F97316' : rating === '1' ? '#EF4444' : '#6B7280'
      }));
    } finally {
      await connection.end();
    }
  },

  async getTimelineData(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      let query = 'SELECT created_at, sentiment FROM feedback WHERE 1=1';
      const params: any[] = [];

      // Apply all filters
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

      query += ' ORDER BY created_at ASC';

      const [rows] = await connection.execute(query, params);
      const data = rows as any[];

      // Group by date and sentiment
      const timelineData: { [key: string]: { positive: number, negative: number, neutral: number, date: string } } = {};

      data.forEach(item => {
        const date = new Date(item.created_at).toDateString();
        if (!timelineData[date]) {
          timelineData[date] = { positive: 0, negative: 0, neutral: 0, date };
        }
        
        if (item.sentiment === 'positive') {
          timelineData[date].positive++;
        } else if (item.sentiment === 'negative') {
          timelineData[date].negative++;
        } else {
          timelineData[date].neutral++;
        }
      });

      return Object.values(timelineData);
    } finally {
      await connection.end();
    }
  },

  async getTopIssues(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      const query = `
        SELECT title, feedback_count, category, status, description
        FROM issues 
        WHERE status = 'approved' AND feedback_count > 0
        ORDER BY feedback_count DESC
      `;

      const [rows] = await connection.execute(query);
      const data = rows as any[];

      return data.map(issue => ({
        issue: issue.title,
        count: issue.feedback_count || 0,
        category: issue.category,
        description: issue.description
      }));
    } finally {
      await connection.end();
    }
  },

  async getEmployeeStats(filters: any = {}) {
    const connection = await createConnection();
    
    try {
      const query = `
        SELECT 
          e.name as employee_name,
          e.department,
          e.branch_location,
          e.role,
          COUNT(f.id) as total_feedback,
          AVG(f.review_rating) as avg_rating,
          SUM(CASE WHEN f.sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
          SUM(CASE WHEN f.sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
          SUM(CASE WHEN f.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
        FROM bank_employees e
        LEFT JOIN feedback f ON e.name = f.contacted_bank_person
        GROUP BY e.id, e.name, e.department, e.branch_location, e.role
        HAVING total_feedback > 0
        ORDER BY total_feedback DESC
      `;

      const [rows] = await connection.execute(query);
      return rows as any[];
    } finally {
      await connection.end();
    }
  }
};
