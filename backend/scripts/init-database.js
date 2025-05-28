
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

const DATABASE_NAME = process.env.DB_NAME || 'feedback_db';

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(dbConfig);
    
    // Create database if it doesn't exist
    console.log(`Creating database ${DATABASE_NAME} if it doesn't exist...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`);
    
    // Use the database
    await connection.execute(`USE ${DATABASE_NAME}`);
    
    // Create feedback table
    console.log('Creating feedback table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        service_type ENUM('ATM', 'OnlineBanking', 'CoreBanking') NOT NULL,
        review_text TEXT NOT NULL,
        review_rating INT CHECK (review_rating >= 1 AND review_rating <= 5),
        sentiment ENUM('positive', 'negative', 'neutral') DEFAULT 'neutral',
        status ENUM('new', 'in_progress', 'resolved', 'escalated') DEFAULT 'new',
        issue_location VARCHAR(255),
        contacted_bank_person VARCHAR(255),
        positive_flag BOOLEAN DEFAULT FALSE,
        negative_flag BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insert sample data
    console.log('Inserting sample data...');
    const sampleData = [
      {
        id: 'fb_001',
        customer_name: 'Ahmad Rahman',
        service_type: 'ATM',
        review_text: 'The ATM was out of order for 3 days. Very inconvenient.',
        review_rating: 2,
        sentiment: 'negative',
        status: 'new',
        issue_location: 'Kuala Lumpur',
        positive_flag: false,
        negative_flag: true
      },
      {
        id: 'fb_002',
        customer_name: 'Siti Aminah',
        service_type: 'OnlineBanking',
        review_text: 'Online banking is very user-friendly and fast. Love it!',
        review_rating: 5,
        sentiment: 'positive',
        status: 'resolved',
        issue_location: 'Selangor',
        positive_flag: true,
        negative_flag: false
      },
      {
        id: 'fb_003',
        customer_name: 'Lim Wei Ming',
        service_type: 'CoreBanking',
        review_text: 'Staff at the branch were very helpful with my loan application.',
        review_rating: 4,
        sentiment: 'positive',
        status: 'resolved',
        issue_location: 'Penang',
        positive_flag: true,
        negative_flag: false
      },
      {
        id: 'fb_004',
        customer_name: 'Raj Kumar',
        service_type: 'ATM',
        review_text: 'ATM interface is confusing and slow.',
        review_rating: 2,
        sentiment: 'negative',
        status: 'in_progress',
        issue_location: 'Johor Bahru',
        positive_flag: false,
        negative_flag: true
      },
      {
        id: 'fb_005',
        customer_name: 'Fatimah Hassan',
        service_type: 'OnlineBanking',
        review_text: 'Great mobile app features. Easy to transfer money.',
        review_rating: 5,
        sentiment: 'positive',
        status: 'resolved',
        issue_location: 'Melaka',
        positive_flag: true,
        negative_flag: false
      }
    ];
    
    for (const feedback of sampleData) {
      await connection.execute(`
        INSERT IGNORE INTO feedback 
        (id, customer_name, service_type, review_text, review_rating, sentiment, status, issue_location, positive_flag, negative_flag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        feedback.id,
        feedback.customer_name,
        feedback.service_type,
        feedback.review_text,
        feedback.review_rating,
        feedback.sentiment,
        feedback.status,
        feedback.issue_location,
        feedback.positive_flag,
        feedback.negative_flag
      ]);
    }
    
    console.log('Database initialization completed successfully!');
    console.log(`Database: ${DATABASE_NAME}`);
    console.log('Sample data inserted.');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the initialization
initializeDatabase();
