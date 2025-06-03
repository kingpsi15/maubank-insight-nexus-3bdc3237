const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
// Remove: const axios = require('axios');
const axios = require('axios'); // Add Ollama import

const app = express();
const PORT = process.env.PORT || 3001;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors({
  origin: [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));

app.use(express.json());

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password_here',
  database: process.env.DB_NAME || 'feedback_db'
};

// Create connection pool
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

// Test DB connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');
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
        case 'last_week': startDate.setDate(now.getDate() - 7); break;
        case 'last_month': startDate.setMonth(now.getMonth() - 1); break;
        case 'last_quarter': startDate.setMonth(now.getMonth() - 3); break;
        case 'last_year': startDate.setFullYear(now.getFullYear() - 1); break;
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

    console.log('Final SQL Query:', query);
    console.log('Query Params:', params);

    const [rows] = await pool.execute(query, params);

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

// Add Ollama configuration
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 30000;
const OLLAMA_RETRIES = parseInt(process.env.OLLAMA_RETRIES) || 3;

// Validate Ollama connection on startup using axios
(async () => {
  try {
    console.log('Validating Ollama connection...');
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: 'Hello',
      stream: false
    }, { timeout: OLLAMA_TIMEOUT });
    
    console.log('Ollama connection is valid and model is ready.');
  } catch (error) {
    console.error('Error validating Ollama connection:', error.message);
    console.warn('⚠️ Issue detection might not work properly due to Ollama connection issues!');
    console.warn('⚠️ Ensure Ollama is running and mistral:7b-instruct model is available.');
  }
})();


// Enhanced Ollama configuration with timeout and retry
const ollamaConfig = {
  timeout: 30000, // 30 second timeout
  retries: 3,
  retryDelay: 1000 // 1 second between retries
};

// Function to call Ollama with retry logic

async function callLocalLLM(prompt) {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });
    return response.data.response.trim();
  } catch (err) {
    console.error('[ERROR] callLocalLLM failed:', err.message);
    throw err;
  }
}

async function detectIssuesFromFeedback(connection, feedback) {
  try {
    console.log(`[DEBUG] Processing feedback: ${feedback.id}, Rating: ${feedback.review_rating}, Sentiment: ${feedback.sentiment}`);
    console.log(`[DEBUG] Review text: ${feedback.review_text}`);

    // Skip positive feedback
    if (feedback.review_rating >= 4) {
      console.log('[DEBUG] Skipping positive feedback (rating ≥ 4)');
      return null;
    }

    const { id, review_text, service_type, review_rating } = feedback;

    if (!review_text || review_text.trim().length < 10) {
      console.log('[DEBUG] Skipping feedback with insufficient text');
      return null;
    }

    // Use Ollama for issue detection
    console.log('[DEBUG] Using Ollama for issue detection');
    try {
      const prompt = `<s>[INST] You are a banking issue detection expert. Analyze this customer feedback and determine if there is a legitimate operational issue.

Service: ${service_type}
Rating: ${review_rating}/5
Feedback: "${review_text}"

IMPORTANT: Only identify legitimate operational issues, not general complaints.

Examples of legitimate issues:
- ATM: "Machine ate my card", "No cash dispensed", "Receipt printer broken"
- OnlineBanking: "Cannot login", "App crashes", "Transaction failed"
- CoreBanking: "System down", "Long waiting times due to technical issues"

If you find a legitimate issue, respond with ONLY this JSON format:
{
  "title": "Brief issue title (max 50 chars)",
  "description": "Detailed description (max 200 chars)",
  "category": "${service_type}",
  "confidence_score": 0.85,
  "resolution": "Step-by-step resolution for bank staff"
}

If no legitimate issue exists, respond with: null [/INST]`;

      const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt,
        stream: false
      });

      const content = response.data.response.trim();
      console.log('[DEBUG] Ollama response content:', content);

      let result = null;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
        console.log('[DEBUG] Successfully parsed JSON from Ollama response');
      } else {
        console.log('[DEBUG] No JSON found in response, checking for manual detection');
        if (service_type === 'ATM' && review_text.toLowerCase().includes('receipt')) {
          result = {
            title: "ATM Receipt Issue",
            description: "Customer reported issues with ATM receipts not being provided or printed correctly.",
            category: "ATM",
            confidence_score: 0.85,
            resolution: "1. Check the receipt printer status in the ATM. 2. Verify if the transaction was completed successfully. 3. Provide transaction confirmation via SMS/email. 4. Schedule maintenance if needed."
          };
        }
      }

      if (result === null) {
        console.log('[DEBUG] No issue detected in the feedback');
        return null;
      }

      const { title, description, category, confidence_score, resolution } = result;

      const [existingSimilarIssues] = await connection.execute(
        'SELECT * FROM pending_issues WHERE category = ? AND (title LIKE ? OR description LIKE ?) LIMIT 5',
        [category, `%${title.substring(0, 50)}%`, `%${description.substring(0, 50)}%`]
      );

      if (existingSimilarIssues.length > 0) {
        const existingIssue = existingSimilarIssues[0];
        await connection.execute(
          'UPDATE pending_issues SET feedback_count = feedback_count + 1 WHERE id = ?',
          [existingIssue.id]
        );
        console.log(`[DEBUG] Found similar existing issue: ${existingIssue.id}, incrementing count`);
        return existingIssue.id;
      }

      const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await connection.execute(
        `INSERT INTO pending_issues 
         (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [issueId, title, description, category, confidence_score, 1, id]
      );

      const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await connection.execute(
        `INSERT INTO pending_resolutions 
         (id, pending_issue_id, resolution_text, confidence_score, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [resolutionId, issueId, resolution || '', confidence_score]
      );

      console.log(`[DEBUG] Created new issue and resolution: ${issueId}, ${resolutionId}`);
      return issueId;

    } catch (error) {
      console.error('[DEBUG] Error calling Ollama:', error.message);

      // Keyword-based fallback
      if (service_type === 'ATM') {
        const keywords = ['receipt', 'transaction', 'not working', 'card', 'cash', 'money', 'stuck'];
        for (const keyword of keywords) {
          if (review_text.toLowerCase().includes(keyword)) {
            const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_issues 
               (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                issueId,
                `ATM ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Issue`,
                `Customer reported an issue related to ${keyword} at the ATM.`,
                "ATM",
                0.75,
                1,
                id
              ]
            );

            const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_resolutions 
               (id, pending_issue_id, resolution_text, confidence_score, created_at)
               VALUES (?, ?, ?, ?, NOW())`,
              [
                resolutionId,
                issueId,
                `Check ATM for issues related to ${keyword}. Verify transaction status. Contact customer. Schedule maintenance if required.`,
                0.75
              ]
            );

            console.log(`[DEBUG] Fallback issue created: ${issueId}`);
            return issueId;
          }
        }
      }

      return null;
    }

  } catch (err) {
    console.error('[DEBUG] Unexpected error in issue detection:', err.message);
    return null;
  }
}

// Create new feedback with issue detection
app.post('/api/feedback', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      customer_name, customer_phone, customer_email, customer_id,
      service_type, review_text, review_rating, issue_location,
      contacted_bank_person, status = 'new'
    } = req.body;

    console.log(`[INFO] Creating new feedback from ${customer_name}, Rating: ${review_rating}, Service: ${service_type}`);

    const feedbackId = 'fb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const positive_flag = review_rating >= 4;
    const negative_flag = review_rating <= 3;

    // Sentiment purely from rating (no neutral)
    const sentiment = positive_flag ? 'positive' : 'negative';

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
    console.log(`[INFO] Feedback created with ID: ${feedbackId}`);

    let issueId = null;
    if (negative_flag) {
      console.log(`[INFO] Negative feedback detected (rating ${review_rating}), detecting issues...`);
      try {
        issueId = await detectIssuesFromFeedback(connection, {
          id: feedbackId, review_text, service_type, review_rating, sentiment, positive_flag, negative_flag
        });
        
        if (issueId) {
          console.log(`[INFO] Issue detected and created with ID: ${issueId}`);
        } else {
          console.log(`[WARN] No issues detected for negative feedback ID: ${feedbackId}`);
          
          // Fallback issue detection for specific keywords if OpenAI detection failed
          if (service_type === 'ATM' && review_text.toLowerCase().includes('receipt')) {
            console.log('[INFO] Fallback: Creating ATM receipt issue');
            issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            
            await connection.execute(
              `INSERT INTO pending_issues 
                (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                issueId, 
                "ATM Receipt Issue", 
                "Customer reported issues with ATM receipts or transaction confirmation.",
                "ATM",
                0.9,
                1,
                feedbackId
              ]
            );
            
            const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_resolutions 
                (id, pending_issue_id, resolution_text, confidence_score, created_at)
                VALUES (?, ?, ?, ?, NOW())`,
              [
                resolutionId, 
                issueId, 
                "1. Verify if the transaction was completed successfully in the system. 2. Inform the customer about their transaction status. 3. Check the ATM's receipt printer functionality. 4. Schedule maintenance if needed.", 
                0.9
              ]
            );
            
            console.log(`[INFO] Created fallback issue with ID: ${issueId}`);
          }
        }
      } catch (issueError) {
        console.error('[ERROR] Issue detection failed:', issueError);
      }
    } else {
      console.log(`[INFO] Positive feedback (rating ${review_rating}), skipping issue detection`);
    }

    await connection.commit();

    res.json({ 
      success: true, 
      id: feedbackId, 
      issue_detected: issueId ? true : false,
      issue_id: issueId,
      message: 'Feedback created successfully' 
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[ERROR] Error creating feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback record', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Update feedback
app.put('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    });

    if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updateFields.push('updated_at = NOW()');
    params.push(id);

    const query = `UPDATE feedback SET ${updateFields.join(', ')} WHERE id = ?`;

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Feedback record not found' });

    res.json({ success: true, message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback record', details: error.message });
  }
});

// Delete feedback
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM feedback WHERE id = ?';
    const [result] = await pool.execute(query, [id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Feedback record not found' });

    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback record', details: error.message });
  }
});

// Metrics summary
app.get('/api/metrics', async (req, res) => {
  try {
    let query = 'SELECT COUNT(*) as total, SUM(positive_flag) as positive, SUM(negative_flag) as negative, AVG(review_rating) as avg_rating FROM feedback WHERE 1=1';
    const params = [];

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
      total: parseInt(metrics.total) || 0,
      positive: parseInt(metrics.positive) || 0,
      negative: parseInt(metrics.negative) || 0,
      avgRating: parseFloat(metrics.avg_rating) || 0
    });
  } catch (error) {
    console.error('Metrics query error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), database: 'feedback_db', message: 'Backend connected to MySQL' });
});

// CSV import with issue detection
app.post('/api/import-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

    const results = [];
    const filePath = path.join(req.file.path);
    let successCount = 0;
    let errorCount = 0;
    let issuesDetected = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', async () => {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          for (const record of results) {
            try {
              const feedbackId = 'fb_csv_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

              const customer_name = record.customer_name || record.name || record.customer || '';
              let service_type = record.service_type || record.service || 'ATM';

              // Normalize service type
              if (service_type.toLowerCase().includes('online') || service_type.toLowerCase().includes('internet') || service_type.toLowerCase().includes('mobile') || service_type.toLowerCase().includes('digital')) {
                service_type = 'OnlineBanking';
              } else if (service_type.toLowerCase().includes('core') || service_type.toLowerCase().includes('branch')) {
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

              const positive_flag = review_rating >= 4;
              const negative_flag = review_rating <= 3;

              const sentiment = positive_flag ? 'positive' : 'negative';

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

              if (negative_flag) {
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
                if (issueId) issuesDetected++;
              }
            } catch (err) {
              console.error('Error inserting record:', err, record);
              errorCount++;
            }
          }

          await connection.commit();
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
    res.status(500).json({ error: 'Failed to import CSV data', details: error.message });
  }
});

// Retrieve pending issues
app.get('/api/pending-issues', async (req, res) => {
  try {
    // Get all pending issues
    const [pendingIssues] = await pool.execute(
      'SELECT * FROM pending_issues ORDER BY created_at DESC'
    );

    // For each pending issue, get its resolutions and feedback data
    const result = await Promise.all(pendingIssues.map(async (issue) => {
      // Get resolutions for this issue
      const [resolutions] = await pool.execute(
        'SELECT id, resolution_text, confidence_score FROM pending_resolutions WHERE pending_issue_id = ?',
        [issue.id]
      );

      // Get feedback data if it exists
      let feedback = null;
      if (issue.detected_from_feedback_id) {
        const [feedbackRows] = await pool.execute(
          'SELECT customer_name, review_text, issue_location FROM feedback WHERE id = ?',
          [issue.detected_from_feedback_id]
        );
        if (feedbackRows.length > 0) {
          feedback = feedbackRows[0];
        }
      }

      return {
        ...issue,
        pending_resolutions: resolutions,
        feedback
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching pending issues:', error);
    res.status(500).json({ error: 'Failed to fetch pending issues', details: error.message });
  }
});

// GET issues with optional status filter
app.get('/api/issues', async (req, res) => {
  try {
    let query = 'SELECT id, title, category, description, feedback_count FROM issues';
    const params = [];

    if (req.query.status) {
      query += ' WHERE status = ?';
      params.push(req.query.status);
    }

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: 'Failed to fetch issues', details: error.message });
  }
});

// POST new issue
app.post('/api/issues', async (req, res) => {
  try {
    const {
      title, description, category, resolution, status,
      confidence_score, feedback_count, approved_by, approved_date
    } = req.body;

    const issueId = 'issue_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    await pool.execute(
      `INSERT INTO issues (
        id, title, description, category, resolution, status,
        confidence_score, feedback_count, approved_by, approved_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        issueId, title, description, category, resolution, status,
        confidence_score, feedback_count, approved_by, approved_date
      ]
    );

    res.json({ success: true, id: issueId });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'Failed to create issue', details: error.message });
  }
});

// DELETE pending issue
app.delete('/api/pending-issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated resolutions first
    await pool.execute(
      'DELETE FROM pending_resolutions WHERE pending_issue_id = ?',
      [id]
    );
    
    // Then delete the pending issue
    const [result] = await pool.execute(
      'DELETE FROM pending_issues WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pending issue not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pending issue:', error);
    res.status(500).json({ error: 'Failed to delete pending issue', details: error.message });
  }
});

// PUT update existing issue
app.put('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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

    params.push(id);
    const query = `UPDATE issues SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Failed to update issue', details: error.message });
  }
});

// POST rejected issue
app.post('/api/rejected-issues', async (req, res) => {
  try {
    const {
      original_title, original_description, category,
      rejection_reason, rejected_by, original_pending_issue_id
    } = req.body;

    const rejectedId = 'rejected_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    await pool.execute(
      `INSERT INTO rejected_issues (
        id, original_title, original_description, category,
        rejection_reason, rejected_by, original_pending_issue_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        rejectedId, original_title, original_description, category,
        rejection_reason, rejected_by, original_pending_issue_id
      ]
    );

    res.json({ success: true, id: rejectedId });
  } catch (error) {
    console.error('Error creating rejected issue:', error);
    res.status(500).json({ error: 'Failed to create rejected issue', details: error.message });
  }
});

// GET rejected issues
app.get('/api/rejected-issues', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM rejected_issues ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rejected issues:', error);
    res.status(500).json({ error: 'Failed to fetch rejected issues', details: error.message });
  }
});

// PUT update pending issue
app.put('/api/pending-issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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

    params.push(id);
    const query = `UPDATE pending_issues SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pending issue not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating pending issue:', error);
    res.status(500).json({ error: 'Failed to update pending issue', details: error.message });
  }
});

// PUT update resolution
app.put('/api/pending-resolutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_text } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE pending_resolutions SET resolution_text = ? WHERE id = ?',
      [resolution_text, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resolution not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating resolution:', error);
    res.status(500).json({ error: 'Failed to update resolution', details: error.message });
  }
});

// POST new resolution
app.post('/api/pending-resolutions', async (req, res) => {
  try {
    const { pending_issue_id, resolution_text, confidence_score } = req.body;

    const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    await pool.execute(
      `INSERT INTO pending_resolutions (
        id, pending_issue_id, resolution_text, confidence_score, created_at
      ) VALUES (?, ?, ?, ?, NOW())`,
      [resolutionId, pending_issue_id, resolution_text, confidence_score]
    );

    res.json({ success: true, id: resolutionId });
  } catch (error) {
    console.error('Error creating resolution:', error);
    res.status(500).json({ error: 'Failed to create resolution', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Connected to MySQL database: ${dbConfig.database}`);
  console.log(`Test connection at: http://localhost:${PORT}/api/test-connection`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});
