
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'feedback_db'
};

// Create connection pool for better performance
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ 
      status: 'Connected to MySQL successfully', 
      timestamp: new Date().toISOString(),
      database: dbConfig.database
    });
  } catch (error) {
    console.error('MySQL connection error:', error);
    res.status(500).json({ 
      error: 'Failed to connect to MySQL', 
      details: error.message,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      }
    });
  }
});

// Get feedback data with filters
app.get('/api/feedback', async (req, res) => {
  try {
    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (req.query.service && req.query.service !== 'all') {
      query += ' AND service_type = ?';
      params.push(req.query.service);
    }
    
    if (req.query.location && req.query.location !== 'all') {
      query += ' AND issue_location = ?';
      params.push(req.query.location);
    }
    
    if (req.query.dateRange && req.query.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (req.query.dateRange) {
        case 'last_week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'last_month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'last_quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'last_year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      query += ' AND created_at >= ?';
      params.push(startDate.toISOString().slice(0, 19).replace('T', ' '));
    }

    if (req.query.customDateFrom) {
      query += ' AND created_at >= ?';
      params.push(new Date(req.query.customDateFrom).toISOString().slice(0, 19).replace('T', ' '));
    }

    if (req.query.customDateTo) {
      query += ' AND created_at <= ?';
      params.push(new Date(req.query.customDateTo).toISOString().slice(0, 19).replace('T', ' '));
    }
    
    query += ' ORDER BY created_at DESC';
    
    console.log('Executing query:', query);
    console.log('With parameters:', params);
    
    const [rows] = await pool.execute(query, params);
    
    console.log(`Returned ${rows.length} records`);
    res.json(rows);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch feedback data', 
      details: error.message,
      query: req.query
    });
  }
});

// Get metrics summary
app.get('/api/metrics', async (req, res) => {
  try {
    let query = 'SELECT COUNT(*) as total, SUM(positive_flag) as positive, SUM(negative_flag) as negative, AVG(review_rating) as avg_rating FROM feedback WHERE 1=1';
    const params = [];
    
    // Apply same filters as feedback endpoint
    if (req.query.service && req.query.service !== 'all') {
      query += ' AND service_type = ?';
      params.push(req.query.service);
    }
    
    if (req.query.location && req.query.location !== 'all') {
      query += ' AND issue_location = ?';
      params.push(req.query.location);
    }
    
    const [rows] = await pool.execute(query, params);
    
    const metrics = rows[0];
    res.json({
      total: parseInt(metrics.total),
      positive: parseInt(metrics.positive) || 0,
      negative: parseInt(metrics.negative) || 0,
      avgRating: parseFloat(metrics.avg_rating) || 0
    });
  } catch (error) {
    console.error('Metrics query error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Test connection at: http://localhost:${PORT}/api/test-connection`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});
