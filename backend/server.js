const express = require('express');  
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors({
  origin: [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3001', 'http://localhost:8082', 'http://localhost:8081'],
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
    
    // Check if rejected_issues table exists, create if it doesn't
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS rejected_issues (
          id VARCHAR(255) PRIMARY KEY,
          original_title VARCHAR(255) NOT NULL,
          original_description TEXT,
          category VARCHAR(50),
          rejection_reason TEXT,
          rejected_by VARCHAR(100),
          original_pending_issue_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX (created_at)
        )
      `);
      console.log('Checked/created rejected_issues table');
    } catch (tableError) {
      console.error('Error creating rejected_issues table:', tableError);
    }
    
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

// Add OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Validate OpenAI API key on startup
(async () => {
  try {
    console.log('Validating OpenAI API key...');
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    console.log('OpenAI API key is valid.');
  } catch (error) {
    console.error('Error validating OpenAI API key:', error.message);
    console.error('API response:', error.response?.data);
    console.warn('⚠️ Issue detection might not work properly due to invalid OpenAI API key!');
    console.warn('⚠️ Set a valid API key in the OPENAI_API_KEY environment variable or update the hardcoded key.');
  }
})();

// Issue detection helper function
async function detectIssuesFromFeedback(connection, feedback) {
  try {
    console.log(`[DEBUG] Processing feedback: ${feedback.id}, Rating: ${feedback.review_rating}, Sentiment: ${feedback.sentiment}`);
    console.log(`[DEBUG] Review text: ${feedback.review_text}`);

    // Skip positive feedback (rating 4 or 5)
    if (feedback.review_rating >= 4) {
      console.log('[DEBUG] Skipping positive feedback (rating ≥ 4)');
      return null;
    }

    const { id, review_text, service_type, review_rating } = feedback;
    if (!review_text || review_text.trim().length < 10) {
      console.log('[DEBUG] Skipping feedback with insufficient text');
      return null;
    }

    // First use OpenAI to detect the issue
    console.log('[DEBUG] Using OpenAI for issue detection');
    try {
      // Enhanced prompt with more explicit examples for better detection
      const prompt = `
        Analyze this bank customer feedback and identify potential issues.
        
        Service Type: ${service_type}
        Rating: ${review_rating}/5
        Feedback: "${review_text}"
        
        Examples of issues:
        - For ATM: "ATM not dispensing cash", "ATM receipt not printing", "Card stuck in ATM"
        - For OnlineBanking: "Login issues", "Slow website", "Transaction failed"
        - For CoreBanking: "Long waiting time", "Staff was unhelpful", "Process took too long"
        
        If there is a legitimate issue, extract the following information in JSON format:
        {
          "title": "Brief issue title",
          "description": "Detailed description of the issue",
          "category": "${service_type}",
          "confidence_score": decimal between 0 and 1,
          "resolution": "Detailed step-by-step resolution recommendation for bank staff"
        }
        
        If there is no legitimate issue, return null.
        
        The resolution should be actionable, specific, and follow best practices in banking.
      `;

      console.log('[DEBUG] Sending request to OpenAI API');
      
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );

      console.log('[DEBUG] Received response from OpenAI API');
      const content = response.data.choices[0].message.content.trim();
      console.log('[DEBUG] OpenAI response content:', content);
      
      // Parse the JSON response
      try {
        let result = null;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
          console.log('[DEBUG] Successfully parsed JSON from OpenAI response');
        } else {
          // If no JSON detected but the content contains useful info, create a simple issue
          console.log('[DEBUG] No JSON found in response, checking for manual detection');
          
          // Fallback method if OpenAI doesn't return proper JSON
          if (service_type === 'ATM' && review_text.toLowerCase().includes('receipt')) {
            console.log('[DEBUG] Manual detection: ATM receipt issue');
            result = {
              title: "ATM Receipt Issue",
              description: "Customer reported issues with ATM receipts not being provided or printed correctly.",
              category: "ATM",
              confidence_score: 0.85,
              resolution: "1. Check the receipt printer status in the ATM. 2. Verify if the transaction was completed successfully. 3. Provide transaction confirmation to the customer via SMS or email. 4. Schedule maintenance for the receipt printer if needed."
            };
          }
        }
        
        if (result === null) {
          console.log('[DEBUG] No issue detected in the feedback');
          return null;
        }
        
        console.log('[DEBUG] Issue detected:', result.title);
        const { title, description, category, confidence_score, resolution } = result;
        
        // Now check if we have a similar issue already in the database
        const [existingSimilarIssues] = await connection.execute(
          'SELECT * FROM pending_issues WHERE category = ? AND (title LIKE ? OR description LIKE ?) LIMIT 5',
          [category, `%${title.substring(0, 50)}%`, `%${description.substring(0, 50)}%`]
        );

        if (existingSimilarIssues && existingSimilarIssues.length > 0) {
          // We found a similar issue, increment the feedback count
          const existingIssue = existingSimilarIssues[0];
          await connection.execute(
            'UPDATE pending_issues SET feedback_count = feedback_count + 1 WHERE id = ?',
            [existingIssue.id]
          );
          console.log(`[DEBUG] Found similar existing issue: ${existingIssue.id}, incrementing count`);
          return existingIssue.id;
        }

        // No similar issue found, create a new one
        const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        // Save the new issue to database
        await connection.execute(
          `INSERT INTO pending_issues 
            (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [issueId, title, description, category, confidence_score, 1, id]
        );
        
        console.log(`[DEBUG] Created new issue with LLM: ${issueId}`);
        
        // Store the resolution
        const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        await connection.execute(
          `INSERT INTO pending_resolutions 
            (id, pending_issue_id, resolution_text, confidence_score, created_at)
            VALUES (?, ?, ?, ?, NOW())`,
          [resolutionId, issueId, resolution || '', confidence_score]
        );
        
        console.log(`[DEBUG] Created resolution for issue: ${resolutionId}`);
        
        return issueId;
      } catch (error) {
        console.error('[DEBUG] Error parsing OpenAI response:', error);
        
        // Fallback to manual issue detection for common problems
        if (service_type === 'ATM') {
          const atmKeywords = ['receipt', 'transaction', 'not working', 'card', 'cash', 'money', 'stuck'];
          for (const keyword of atmKeywords) {
            if (review_text.toLowerCase().includes(keyword)) {
              console.log(`[DEBUG] Keyword match found: ${keyword}`);
              // Create a fallback issue
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
              
              // Create fallback resolution
              const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
              await connection.execute(
                `INSERT INTO pending_resolutions 
                  (id, pending_issue_id, resolution_text, confidence_score, created_at)
                  VALUES (?, ?, ?, ?, NOW())`,
                [
                  resolutionId, 
                  issueId, 
                  `Please check the ATM for any issues related to ${keyword}. Verify the transaction status in the system and contact the customer to provide information about their transaction. Schedule maintenance if required.`, 
                  0.75
                ]
              );
              
              console.log(`[DEBUG] Created keyword-based issue and resolution: ${issueId}`);
              return issueId;
            }
          }
        } else if (service_type === 'CoreBanking') {
          const coreBankingKeywords = ['employee', 'staff', 'rude', 'arrogant', 'unhelpful', 'slow', 'wait', 'queue', 'counter', 'teller', 'attitude', 'behavior', 'unprofessional'];
          for (const keyword of coreBankingKeywords) {
            if (review_text.toLowerCase().includes(keyword)) {
              console.log(`[DEBUG] CoreBanking keyword match found: ${keyword}`);
              // Create a fallback issue
              const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
              await connection.execute(
                `INSERT INTO pending_issues 
                  (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                  issueId, 
                  `Staff ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Issue`, 
                  `Customer reported an issue related to ${keyword} with bank staff.`,
                  "CoreBanking",
                  0.85,
                  1,
                  id
                ]
              );
              
              // Create fallback resolution
              const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
              await connection.execute(
                `INSERT INTO pending_resolutions 
                  (id, pending_issue_id, resolution_text, confidence_score, created_at)
                  VALUES (?, ?, ?, ?, NOW())`,
                [
                  resolutionId, 
                  issueId, 
                  `1. Review customer complaint about bank staff ${keyword} issue. 2. Identify the specific employee involved. 3. Schedule a meeting with the employee to discuss the feedback. 4. Provide additional customer service training if needed. 5. Contact the customer to apologize and address their concerns. 6. Document the incident and follow up to ensure improvement.`, 
                  0.85
                ]
              );
              
              console.log(`[DEBUG] Created CoreBanking staff issue and resolution: ${issueId}`);
              return issueId;
            }
          }
        } else if (service_type === 'OnlineBanking') {
          const onlineBankingKeywords = ['login', 'password', 'error', 'failed', 'website', 'app', 'mobile', 'transaction', 'transfer', 'security', 'timeout'];
          for (const keyword of onlineBankingKeywords) {
            if (review_text.toLowerCase().includes(keyword)) {
              console.log(`[DEBUG] OnlineBanking keyword match found: ${keyword}`);
              // Create a fallback issue
              const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
              await connection.execute(
                `INSERT INTO pending_issues 
                  (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                  issueId, 
                  `Online Banking ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Issue`, 
                  `Customer reported an issue related to ${keyword} in the online banking platform.`,
                  "OnlineBanking",
                  0.80,
                  1,
                  id
                ]
              );
              
              // Create fallback resolution
              const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
              await connection.execute(
                `INSERT INTO pending_resolutions 
                  (id, pending_issue_id, resolution_text, confidence_score, created_at)
                  VALUES (?, ?, ?, ?, NOW())`,
                [
                  resolutionId, 
                  issueId, 
                  `1. Verify the specific online banking issue related to ${keyword}. 2. Check system logs for errors around the time of the incident. 3. Provide the customer with troubleshooting steps. 4. If needed, escalate to the IT department for technical investigation. 5. Follow up with the customer to confirm resolution.`, 
                  0.80
                ]
              );
              
              console.log(`[DEBUG] Created OnlineBanking issue and resolution: ${issueId}`);
              return issueId;
            }
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('[DEBUG] Error calling OpenAI API for issue detection:', error);
      console.error('[DEBUG] Error details:', error.response?.data || error.message);
      
      // Fallback to keyword-based detection
      console.log('[DEBUG] Using fallback keyword detection');
      
      // Check for common keywords by service type
      if (service_type === 'ATM') {
        const atmKeywords = ['receipt', 'transaction', 'not working', 'card', 'cash', 'money', 'stuck'];
        for (const keyword of atmKeywords) {
          if (review_text.toLowerCase().includes(keyword)) {
            console.log(`[DEBUG] Keyword match found: ${keyword}`);
            // Create a fallback issue
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
            
            // Create fallback resolution
            const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_resolutions 
                (id, pending_issue_id, resolution_text, confidence_score, created_at)
                VALUES (?, ?, ?, ?, NOW())`,
              [
                resolutionId, 
                issueId, 
                `Please check the ATM for any issues related to ${keyword}. Verify the transaction status in the system and contact the customer to provide information about their transaction. Schedule maintenance if required.`, 
                0.75
              ]
            );
            
            console.log(`[DEBUG] Created keyword-based issue and resolution: ${issueId}`);
            return issueId;
          }
        }
      } else if (service_type === 'CoreBanking') {
        const coreBankingKeywords = ['employee', 'staff', 'rude', 'arrogant', 'unhelpful', 'slow', 'wait', 'queue', 'counter', 'teller', 'attitude', 'behavior', 'unprofessional'];
        for (const keyword of coreBankingKeywords) {
          if (review_text.toLowerCase().includes(keyword)) {
            console.log(`[DEBUG] CoreBanking keyword match found: ${keyword}`);
            // Create a fallback issue
            const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_issues 
                (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                issueId, 
                `Staff ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Issue`, 
                `Customer reported an issue related to ${keyword} with bank staff.`,
                "CoreBanking",
                0.85,
                1,
                id
              ]
            );
            
            // Create fallback resolution
            const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_resolutions 
                (id, pending_issue_id, resolution_text, confidence_score, created_at)
                VALUES (?, ?, ?, ?, NOW())`,
              [
                resolutionId, 
                issueId, 
                `1. Review customer complaint about bank staff ${keyword} issue. 2. Identify the specific employee involved. 3. Schedule a meeting with the employee to discuss the feedback. 4. Provide additional customer service training if needed. 5. Contact the customer to apologize and address their concerns. 6. Document the incident and follow up to ensure improvement.`, 
                0.85
              ]
            );
            
            console.log(`[DEBUG] Created CoreBanking staff issue and resolution: ${issueId}`);
            return issueId;
          }
        }
      } else if (service_type === 'OnlineBanking') {
        const onlineBankingKeywords = ['login', 'password', 'error', 'failed', 'website', 'app', 'mobile', 'transaction', 'transfer', 'security', 'timeout'];
        for (const keyword of onlineBankingKeywords) {
          if (review_text.toLowerCase().includes(keyword)) {
            console.log(`[DEBUG] OnlineBanking keyword match found: ${keyword}`);
            // Create a fallback issue
            const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_issues 
                (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                issueId, 
                `Online Banking ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Issue`, 
                `Customer reported an issue related to ${keyword} in the online banking platform.`,
                "OnlineBanking",
                0.80,
                1,
                id
              ]
            );
            
            // Create fallback resolution
            const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            await connection.execute(
              `INSERT INTO pending_resolutions 
                (id, pending_issue_id, resolution_text, confidence_score, created_at)
                VALUES (?, ?, ?, ?, NOW())`,
              [
                resolutionId, 
                issueId, 
                `1. Verify the specific online banking issue related to ${keyword}. 2. Check system logs for errors around the time of the incident. 3. Provide the customer with troubleshooting steps. 4. If needed, escalate to the IT department for technical investigation. 5. Follow up with the customer to confirm resolution.`, 
                0.80
              ]
            );
            
            console.log(`[DEBUG] Created OnlineBanking issue and resolution: ${issueId}`);
            return issueId;
          }
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error('[DEBUG] Error in issue detection:', error);
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
    // Check if the table exists first
    try {
      const [tables] = await pool.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'rejected_issues'",
        [dbConfig.database]
      );
      
      // If table doesn't exist, create it
      if (tables.length === 0) {
        console.log('rejected_issues table does not exist, creating it now');
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS rejected_issues (
            id VARCHAR(255) PRIMARY KEY,
            original_title VARCHAR(255) NOT NULL,
            original_description TEXT,
            category VARCHAR(50),
            rejection_reason TEXT,
            rejected_by VARCHAR(100),
            original_pending_issue_id VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX (created_at)
          )
        `);
        // Return empty array since table was just created
        return res.json([]);
      }
    } catch (tableCheckError) {
      console.error('Error checking/creating rejected_issues table:', tableCheckError);
      // Continue to try the query anyway
    }

    const [rows] = await pool.execute(
      'SELECT * FROM rejected_issues ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching rejected issues:', error);
    
    // Provide more detailed error info for troubleshooting
    const errorDetails = {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    };
    
    res.status(500).json({ 
      error: 'Failed to fetch rejected issues', 
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
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

// GET a single feedback record by ID
app.get('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get feedback details
    const [rows] = await pool.execute(
      'SELECT * FROM feedback WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    const feedback = rows[0];
    
    // Check if this is an employee-related issue but incorrectly classified
    if (feedback.review_text && 
        (feedback.review_text.toLowerCase().includes('employee') || 
         feedback.review_text.toLowerCase().includes('staff') || 
         feedback.review_text.toLowerCase().includes('teller') ||
         feedback.review_text.toLowerCase().includes('counter') ||
         feedback.review_text.toLowerCase().includes('rude') ||
         feedback.review_text.toLowerCase().includes('arrogant') ||
         feedback.review_text.toLowerCase().includes('unhelpful') ||
         feedback.review_text.toLowerCase().includes('attitude') ||
         feedback.review_text.toLowerCase().includes('behavior')) && 
        feedback.service_type !== 'CoreBanking') {
      // This is likely a CoreBanking issue that was misclassified
      console.log(`[INFO] Detected employee-related issue in feedback ${id} but was classified as ${feedback.service_type}. Correcting to CoreBanking.`);
      
      // Update the service type in the database
      await pool.execute(
        'UPDATE feedback SET service_type = ? WHERE id = ?',
        ['CoreBanking', id]
      );
      
      // Update in-memory copy as well
      feedback.service_type = 'CoreBanking';
    }
    
    // Get detected issues for this feedback
    const [issues] = await pool.execute(
      'SELECT * FROM pending_issues WHERE detected_from_feedback_id = ?',
      [id]
    );
    
    // If no issues are detected but this is a negative feedback about staff, create one now
    if (issues.length === 0 && feedback.review_rating <= 3 && 
        feedback.service_type === 'CoreBanking' &&
        (feedback.review_text.toLowerCase().includes('employee') || 
         feedback.review_text.toLowerCase().includes('staff') || 
         feedback.review_text.toLowerCase().includes('rude') ||
         feedback.review_text.toLowerCase().includes('arrogant'))) {
      
      console.log(`[INFO] Creating employee issue for feedback ${id} as none was detected previously`);
      
      const issueId = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await pool.execute(
        `INSERT INTO pending_issues 
          (id, title, description, category, confidence_score, feedback_count, detected_from_feedback_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          issueId, 
          "Staff Behavior Issue", 
          "Customer reported issues with bank staff behavior or attitude.",
          "CoreBanking",
          0.9,
          1,
          id
        ]
      );
      
      const resolutionId = 'resolution_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      await pool.execute(
        `INSERT INTO pending_resolutions 
          (id, pending_issue_id, resolution_text, confidence_score, created_at)
          VALUES (?, ?, ?, ?, NOW())`,
        [
          resolutionId, 
          issueId, 
          "1. Review the customer complaint in detail. 2. Identify the specific employee involved. 3. Schedule a meeting with the employee to discuss the feedback. 4. Provide additional customer service training as needed. 5. Contact the customer to apologize and address their concerns. 6. Document the incident and follow up to ensure improvement.", 
          0.9
        ]
      );
      
      // Refresh issues query after creating a new one
      const [refreshedIssues] = await pool.execute(
        'SELECT * FROM pending_issues WHERE detected_from_feedback_id = ?',
        [id]
      );
      
      // Replace the issues array with the refreshed data
      issues = refreshedIssues;
    }
    
    // Get resolutions for these issues
    let resolutions = [];
    if (issues.length > 0) {
      const issueIds = issues.map(issue => issue.id);
      const placeholders = issueIds.map(() => '?').join(',');
      
      const [resolutionRows] = await pool.execute(
        `SELECT * FROM pending_resolutions WHERE pending_issue_id IN (${placeholders})`,
        issueIds
      );
      
      resolutions = resolutionRows;
    }
    
    // Format the response properly
    const formattedIssues = issues.map(issue => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      confidence_score: issue.confidence_score,
      created_at: issue.created_at
    }));
    
    // Add issues and resolutions to the response
    res.json({
      ...feedback,
      detected_issues: formattedIssues,
      resolutions: resolutions
    });
  } catch (error) {
    console.error('Error fetching feedback by ID:', error);
    res.status(500).json({ 
      error: 'Failed to fetch feedback', 
      details: error.message 
    });
  }
});

// GET pending issues for a specific feedback ID
app.get('/api/pending-issues', async (req, res) => {
  try {
    let query = 'SELECT * FROM pending_issues';
    const params = [];
    
    // Check if filtering by feedback ID
    if (req.query.feedback_id) {
      query = 'SELECT * FROM pending_issues WHERE detected_from_feedback_id = ?';
      params.push(req.query.feedback_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending issues:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending issues', 
      details: error.message 
    });
  }
});

// GET resolutions for a specific feedback ID
app.get('/api/pending-resolutions', async (req, res) => {
  try {
    let query = 'SELECT * FROM pending_resolutions';
    const params = [];
    
    // Check if filtering by feedback ID
    if (req.query.feedback_id) {
      query = `
        SELECT pr.*
        FROM pending_resolutions pr
        JOIN pending_issues pi ON pr.pending_issue_id = pi.id
        WHERE pi.detected_from_feedback_id = ?
      `;
      params.push(req.query.feedback_id);
    } else if (req.query.pending_issue_id) {
      query = 'SELECT * FROM pending_resolutions WHERE pending_issue_id = ?';
      params.push(req.query.pending_issue_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching resolutions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch resolutions', 
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Connected to MySQL database: ${dbConfig.database}`);
  console.log(`Test connection at: http://localhost:${PORT}/api/test-connection`);
  console.log(`Health check at: http://localhost:${PORT}/api/health`);
});
