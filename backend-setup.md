
# MySQL Backend Setup Instructions

## Prerequisites
- Node.js installed
- MySQL server running locally
- Your MySQL database with feedback data

## Step 1: Create Backend API Server

Create a new directory for your backend:
```bash
mkdir feedback-backend
cd feedback-backend
npm init -y
```

## Step 2: Install Dependencies
```bash
npm install express mysql2 cors dotenv
npm install -D nodemon @types/node typescript
```

## Step 3: Create server.js
```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'feedback_db'
};

// Test connection endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.ping();
    await connection.end();
    res.json({ status: 'Connected to MySQL successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to MySQL', details: error.message });
  }
});

// Get feedback data
app.get('/api/feedback', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
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
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback data', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

## Step 4: Create .env file
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
```

## Step 5: Update package.json
Add this to scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

## Step 6: Expected MySQL Table Structure
Your feedback table should have these columns:
- id (varchar/int)
- customer_name (varchar)
- service_type (enum: 'ATM', 'OnlineBanking', 'CoreBanking')
- review_text (text)
- review_rating (int 1-5)
- sentiment (enum: 'positive', 'negative', 'neutral')
- status (enum: 'new', 'in_progress', 'resolved', 'escalated')
- created_at (datetime)
- issue_location (varchar)
- positive_flag (boolean)
- negative_flag (boolean)

## Step 7: Run the backend
```bash
npm run dev
```

## Step 8: Update Frontend Configuration
In the frontend, update the API URL in `src/services/mysqlService.ts` to match your backend server URL.

Your MySQL data will now be accessible through the dashboard!
