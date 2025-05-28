const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors({
  origin: [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root_123',
  database: process.env.DB_NAME || 'feedback_db'
};

// Create connection pool for better performance
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');
    
    // Check if feedback table has records
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM feedback');
    console.log(`Feedback table has ${rows[0].count} records`);
    
    connection.release();
  } catch (error) {
    console.error('Error connecting to database on startup:', error);
  }
})();

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

// Helper function to detect issues from feedback text
async function detectIssuesFromFeedback(connection, feedback) {
  try {
    // Skip positive feedback for issue detection
    if (feedback.positive_flag || feedback.sentiment === 'positive' || feedback.review_rating >= 4) {
      return null;
    }

    // Extract text and other relevant fields
    const { id, review_text, service_type, review_rating } = feedback;
    
    if (!review_text || review_text.trim().length < 10) {
      return null; // Skip short or empty reviews
    }
    
    // Simple keyword-based issue detection
    const issueKeywords = {
      'ATM': ['broken', 'out of service', 'not working', 'error', 'card', 'stuck', 'ate', 'receipt', 'cash', 'dispenser'],
      'OnlineBanking': ['slow', 'crash', 'error', 'login', 'password', 'reset', 'timeout', 'connection', 'app', 'mobile'],
      'CoreBanking': ['queue', 'wait', 'long time', 'staff', 'service', 'branch', 'counter', 'rude', 'unhelpful', 'process']
    };
    
    const lowerText = review_text.toLowerCase();
    const relevantKeywords = issueKeywords[service_type] || [];
    
    // Find matching keywords
    const matchedKeywords = relevantKeywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
    
    if (matchedKeywords.length === 0) {
      return null; // No keywords matched
    }
    
    // Generate a title based on service type and keywords
    let issueTitle = '';
    if (service_type === 'ATM' && matchedKeywords.includes('card')) {
      issueTitle = 'ATM Card Issues';
    } else if (service_type === 'ATM' && (matchedKeywords.includes('broken') || matchedKeywords.includes('out of service'))) {
      issueTitle = 'ATM Out of Service';
    } else if (service_type === 'OnlineBanking' && matchedKeywords.includes('slow')) {
      issueTitle = 'Slow Online Banking';
    } else if (service_type === 'OnlineBanking' && (matchedKeywords.includes('login') || matchedKeywords.includes('password'))) {
      issueTitle = 'Online Banking Login Issues';
    } else if (service_type === 'CoreBanking' && (matchedKeywords.includes('queue') || matchedKeywords.includes('wait'))) {
      issueTitle = 'Long Queue Times';
    } else {
      issueTitle = `${service_type} Issue Reported`;
    }
    
    // Generate a unique ID for the pending issue
    const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Calculate confidence score based on review rating and number of keywords
    const confidenceScore = Math.min(0.95, (0.5 + (matchedKeywords.length * 0.1) + ((5 - review_rating) * 0.1)));
    
    // Create a description from the review text
    const issueDescription = review_text;
    
    // Check if a similar issue already exists
    const [existingIssues] = await connection.execute(
      'SELECT * FROM pending_issues WHERE title = ? AND category = ?',
      [issueTitle, service_type]
    );
    
    if (existingIssues.length > 0) {
      // Update the existing issue's feedback count
      const existingIssue = existingIssues[0];
      await connection.execute(
        'UPDATE pending_issues SET feedback_count = feedback_count + 1 WHERE id = ?',
        [existingIssue.id]
      );
      
      console.log(`Updated existing issue ${existingIssue.id} with new feedback reference`);
      return existingIssue.id;
    } else {
      // Insert the new pending issue
      await connection.execute(`
        INSERT INTO pending_issues 
        (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [issueId, issueTitle, issueDescription, service_type, confidenceScore, 1, id]);
      
      console.log(`Created new pending issue ${issueId} from feedback ${id}`);
      return issueId;
    }
  } catch (error) {
    console.error('Error detecting issues from feedback:', error);
    return null;
  }
}

// Modify the feedback creation endpoint to include issue detection
app.post('/api/feedback', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
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
      status = 'new',
      sentiment = 'neutral'
    } = req.body;

    // Generate a unique ID for the feedback
    const feedbackId = 'fb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // Calculate positive/negative flags based on rating
    const positive_flag = review_rating >= 4;
    const negative_flag = review_rating <= 3 && review_rating > 0;

    const query = `
      INSERT INTO feedback (
        id, customer_name, customer_phone, customer_email, customer_id,
        service_type, review_text, review_rating, issue_location,
        contacted_bank_person, status, sentiment, positive_flag, negative_flag,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      feedbackId, customer_name, customer_phone, customer_email, customer_id,
      service_type, review_text, review_rating, issue_location,
      contacted_bank_person, status, sentiment, positive_flag, negative_flag
    ];

    await connection.execute(query, params);
    
    // Perform issue detection if the feedback is negative
    if (negative_flag || sentiment === 'negative') {
      const feedback = {
        id: feedbackId,
        review_text,
        service_type,
        review_rating,
        sentiment,
        positive_flag,
        negative_flag
      };
      
      await detectIssuesFromFeedback(connection, feedback);
    }
    
    await connection.commit();
    
    console.log('Feedback created successfully:', feedbackId);
    res.json({ 
      success: true, 
      id: feedbackId,
      message: 'Feedback created successfully in feedback_db'
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating feedback:', error);
    res.status(500).json({ 
      error: 'Failed to create feedback record', 
      details: error.message 
    });
  } finally {
    if (connection) {
      connection.release();
    }
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
    console.log('Metrics API called with filters:', req.query);
    
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
    
    console.log('Metrics query:', query);
    console.log('Metrics params:', params);
    
    const [rows] = await pool.execute(query, params);
    
    console.log('Raw metrics data:', rows[0]);
    
    const metrics = rows[0];
    const response = {
      total: parseInt(metrics.total) || 0,
      positive: parseInt(metrics.positive) || 0,
      negative: parseInt(metrics.negative) || 0,
      avgRating: parseFloat(metrics.avg_rating) || 0
    };
    
    console.log('Sending metrics response:', response);
    
    res.json(response);
  } catch (error) {
    console.error('Metrics query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch metrics from feedback_db', 
      details: error.message,
      query: req.query
    });
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

// Modify the CSV import endpoint to include issue detection
app.post('/api/import-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    
    const results = [];
    const filePath = path.join(req.file.path);
    let successCount = 0;
    let errorCount = 0;
    let issuesDetected = 0;
    
    // Read and parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`Parsed ${results.length} records from CSV`);
        
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          
          for (const record of results) {
            try {
              // Generate a unique ID for each feedback
              const feedbackId = 'fb_csv_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
              
              // Map CSV fields to database fields - handle various column name possibilities
              const customer_name = record.customer_name || record.name || record.customer || '';
              
              // Handle different service type formats
              let service_type = record.service_type || record.service || 'ATM';
              // Normalize service type values
              if (service_type.toLowerCase().includes('online') || 
                  service_type.toLowerCase().includes('internet') || 
                  service_type.toLowerCase().includes('mobile') || 
                  service_type.toLowerCase().includes('digital')) {
                service_type = 'OnlineBanking';
              } else if (service_type.toLowerCase().includes('core') || 
                         service_type.toLowerCase().includes('branch')) {
                service_type = 'CoreBanking';
              } else {
                service_type = 'ATM';
              }
              
              const review_text = record.review_text || record.review || record.feedback || record.comment || '';
              const review_rating = parseInt(record.review_rating || record.rating || '3');
              const customer_phone = record.customer_phone || record.phone || '';
              const customer_email = record.customer_email || record.email || '';
              const customer_id = record.customer_id || record.id || '';
              const issue_location = record.issue_location || record.location || '';
              
              // Calculate sentiment flags
              const positive_flag = review_rating >= 4;
              const negative_flag = review_rating <= 3 && review_rating > 0;
              const sentiment = positive_flag ? 'positive' : (negative_flag ? 'negative' : 'neutral');
              
              const query = `
                INSERT INTO feedback (
                  id, customer_name, customer_phone, customer_email, customer_id,
                  service_type, review_text, review_rating, issue_location,
                  sentiment, status, positive_flag, negative_flag, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
              `;
              
              const params = [
                feedbackId,
                customer_name,
                customer_phone,
                customer_email,
                customer_id,
                service_type,
                review_text,
                review_rating,
                issue_location,
                sentiment,
                'new',
                positive_flag,
                negative_flag
              ];
              
              await connection.execute(query, params);
              successCount++;
              
              // Perform issue detection if the feedback is negative
              if (negative_flag || sentiment === 'negative') {
                const feedback = {
                  id: feedbackId,
                  review_text,
                  service_type,
                  review_rating,
                  sentiment,
                  positive_flag,
                  negative_flag
                };
                
                const issueId = await detectIssuesFromFeedback(connection, feedback);
                if (issueId) {
                  issuesDetected++;
                }
              }
              
              console.log(`Inserted record ${successCount}: ${customer_name}`);
            } catch (err) {
              console.error('Error inserting record:', err, record);
              errorCount++;
            }
          }
          
          await connection.commit();
          
          // Clean up the uploaded file
          fs.unlinkSync(filePath);
          
          res.json({
            success: true,
            message: `CSV import completed. Imported ${successCount} records, detected ${issuesDetected} issues. Failed: ${errorCount}`,
            imported: successCount,
            issues_detected: issuesDetected,
            failed: errorCount
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ 
      error: 'Failed to import CSV data', 
      details: error.message 
    });
  }
});

// Add a new endpoint to retrieve pending issues
app.get('/api/pending-issues', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM pending_issues ORDER BY created_at DESC');
    
    console.log(`Returned ${rows.length} pending issues`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending issues:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending issues', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Connected to MySQL database: ${dbConfig.database}`);
  console.log(`Test connection at: http://localhost:${PORT}/api/test-connection`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});
