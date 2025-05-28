
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Updated CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://7f2d692c-8d5a-4c52-9a62-393244085c35.lovableproject.com',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
      status: 'Connected to MySQL feedback_db successfully', 
      timestamp: new Date().toISOString(),
      database: dbConfig.database
    });
  } catch (error) {
    console.error('MySQL connection error:', error);
    res.status(500).json({ 
      error: 'Failed to connect to MySQL feedback_db', 
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
    
    console.log(`Returned ${rows.length} records from feedback_db`);
    res.json(rows);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch feedback data from feedback_db', 
      details: error.message,
      query: req.query
    });
  }
});

// Create new feedback record
app.post('/api/feedback', async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_id,
      service_type,
      review_text,
      review_rating,
      issue_location,
      contacted_bank_person,
      detected_issues = [],
      status = 'new',
      sentiment = 'neutral'
    } = req.body;

    // Calculate positive/negative flags based on rating
    const positive_flag = review_rating >= 4;
    const negative_flag = review_rating <= 3 && review_rating > 0;

    // Convert detected_issues array to JSON string for MySQL storage
    const detectedIssuesJson = JSON.stringify(detected_issues);

    const query = `
      INSERT INTO feedback (
        customer_name, customer_phone, customer_email, customer_id,
        service_type, review_text, review_rating, issue_location,
        contacted_bank_person, detected_issues, status, sentiment, 
        positive_flag, negative_flag, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      customer_name, customer_phone, customer_email, customer_id,
      service_type, review_text, review_rating, issue_location,
      contacted_bank_person, detectedIssuesJson, status, sentiment, 
      positive_flag, negative_flag
    ];

    const [result] = await pool.execute(query, params);
    
    console.log('Feedback created successfully with detected issues:', detected_issues);
    res.json({ 
      success: true, 
      id: result.insertId,
      detected_issues: detected_issues,
      message: 'Feedback created successfully in feedback_db'
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ 
      error: 'Failed to create feedback record', 
      details: error.message 
    });
  }
});

// Update feedback record
app.put('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const params = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Add updated timestamp
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    const query = `UPDATE feedback SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }
    
    console.log('Feedback updated successfully:', id);
    res.json({ 
      success: true, 
      message: 'Feedback updated successfully in feedback_db'
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ 
      error: 'Failed to update feedback record', 
      details: error.message 
    });
  }
});

// Delete feedback record
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM feedback WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }
    
    console.log('Feedback deleted successfully:', id);
    res.json({ 
      success: true, 
      message: 'Feedback deleted successfully from feedback_db'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ 
      error: 'Failed to delete feedback record', 
      details: error.message 
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
    res.status(500).json({ error: 'Failed to fetch metrics from feedback_db', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'feedback_db',
    message: 'Backend server connected to MySQL feedback_db'
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Connected to MySQL database: ${dbConfig.database}`);
  console.log(`Test connection at: http://localhost:${PORT}/api/test-connection`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});
