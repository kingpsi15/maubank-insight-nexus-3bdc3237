const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root_123'
};

const DATABASE_NAME = process.env.DB_NAME || 'feedback_db';

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(dbConfig);
    
    // Create database if it doesn't exist
    console.log(`Creating database ${DATABASE_NAME} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`);
    
    // Close the initial connection
    await connection.end();
    
    // Reconnect with the database specified
    const dbConfigWithDB = {
      ...dbConfig,
      database: DATABASE_NAME
    };
    
    console.log(`Connecting to database ${DATABASE_NAME}...`);
    connection = await mysql.createConnection(dbConfigWithDB);
    
    // Create feedback table (main table)
    console.log('Creating feedback table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        customer_id VARCHAR(100),
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

    // Create bank_employees table for employee master data
    console.log('Creating bank_employees table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bank_employees (
        id VARCHAR(255) PRIMARY KEY,
        employee_id VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        branch_location VARCHAR(255),
        role VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create issues table for standardized issue tracking
    console.log('Creating issues table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS issues (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        resolution TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        confidence_score DECIMAL(3,2),
        feedback_count INT DEFAULT 0,
        approved_by VARCHAR(255),
        approved_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create pending_issues table for AI-detected issues awaiting approval
    console.log('Creating pending_issues table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pending_issues (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        confidence_score DECIMAL(3,2),
        feedback_count INT DEFAULT 1,
        detected_from_feedback_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (detected_from_feedback_id) REFERENCES feedback(id) ON DELETE SET NULL
      )
    `);

    // Create pending_resolutions table for AI-suggested resolutions
    console.log('Creating pending_resolutions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS pending_resolutions (
        id VARCHAR(255) PRIMARY KEY,
        pending_issue_id VARCHAR(255) NOT NULL,
        resolution_text TEXT NOT NULL,
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pending_issue_id) REFERENCES pending_issues(id) ON DELETE CASCADE
      )
    `);

    // Create rejected_issues table for tracking rejected issues
    console.log('Creating rejected_issues table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rejected_issues (
        id VARCHAR(255) PRIMARY KEY,
        original_title VARCHAR(500) NOT NULL,
        original_description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        rejection_reason TEXT,
        rejected_by VARCHAR(255),
        rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        original_pending_issue_id VARCHAR(255)
      )
    `);

    // Create feedback_resolutions table for detailed resolution tracking
    console.log('Creating feedback_resolutions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback_resolutions (
        id VARCHAR(255) PRIMARY KEY,
        feedback_id VARCHAR(255) NOT NULL,
        resolution_text TEXT NOT NULL,
        assigned_to VARCHAR(255),
        resolution_status ENUM('pending', 'in_progress', 'completed', 'escalated') DEFAULT 'pending',
        implementation_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES bank_employees(id) ON DELETE SET NULL
      )
    `);

    // Create employee_feedback_interactions table for detailed tracking
    console.log('Creating employee_feedback_interactions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employee_feedback_interactions (
        id VARCHAR(255) PRIMARY KEY,
        employee_id VARCHAR(255) NOT NULL,
        feedback_id VARCHAR(255) NOT NULL,
        interaction_type ENUM('contacted', 'resolved', 'escalated') NOT NULL,
        interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (employee_id) REFERENCES bank_employees(id) ON DELETE CASCADE,
        FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
      )
    `);

    // Create feedback_issues table for linking feedback to standardized issues
    console.log('Creating feedback_issues table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback_issues (
        id VARCHAR(255) PRIMARY KEY,
        feedback_id VARCHAR(255) NOT NULL,
        issue_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      )
    `);
    
    // Insert sample bank employees
    console.log('Inserting sample bank employees...');
    const employees = [
      ['emp_001', 'EMP001', 'Ahmad Hassan', 'Customer Service', 'Kuala Lumpur', 'Senior Customer Service Representative'],
      ['emp_002', 'EMP002', 'Siti Nurul', 'Technical Support', 'Selangor', 'Technical Support Specialist'],
      ['emp_003', 'EMP003', 'Lim Wei Chen', 'Branch Operations', 'Penang', 'Branch Manager'],
      ['emp_004', 'EMP004', 'Raj Kumar', 'Digital Banking', 'Johor Bahru', 'Digital Banking Specialist'],
      ['emp_005', 'EMP005', 'Fatimah Ali', 'Customer Service', 'Melaka', 'Customer Service Representative']
    ];

    for (const employee of employees) {
      await connection.execute(`
        INSERT IGNORE INTO bank_employees 
        (id, employee_id, name, department, branch_location, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, employee);
    }

    // Insert sample approved issues
    console.log('Inserting sample approved issues...');
    const issues = [
      ['issue_001', 'ATM Out of Service', 'ATM machines frequently going out of service causing customer inconvenience', 'ATM', 'Implement proactive maintenance schedule and backup power systems for ATMs', 'approved', 0.95, 3, 'System Admin'],
      ['issue_002', 'Slow Online Banking', 'Online banking platform experiencing slow response times during peak hours', 'OnlineBanking', 'Upgrade server infrastructure and implement load balancing to handle peak traffic', 'approved', 0.88, 2, 'System Admin'],
      ['issue_003', 'Long Queue Times', 'Customers experiencing long waiting times at branch counters', 'CoreBanking', 'Implement queue management system and increase staffing during peak hours', 'approved', 0.92, 4, 'System Admin']
    ];

    for (const issue of issues) {
      await connection.execute(`
        INSERT IGNORE INTO issues 
        (id, title, description, category, resolution, status, confidence_score, feedback_count, approved_by, approved_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, issue);
    }

    // Insert sample pending issues
    console.log('Inserting sample pending issues...');
    const pendingIssues = [
      ['pending_001', 'Mobile App Login Issues', 'Users reporting difficulty logging into mobile banking app', 'OnlineBanking', 0.85, 1],
      ['pending_002', 'Card Transaction Failures', 'Frequent debit card transaction failures at merchant locations', 'ATM', 0.78, 1]
    ];

    for (const pendingIssue of pendingIssues) {
      await connection.execute(`
        INSERT IGNORE INTO pending_issues 
        (id, title, description, category, confidence_score, feedback_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `, pendingIssue);
    }

    // Insert sample resolutions for pending issues
    console.log('Inserting sample pending resolutions...');
    const pendingResolutions = [
      ['res_001', 'pending_001', 'Update mobile app authentication system and provide user training materials', 0.85],
      ['res_002', 'pending_002', 'Review card processing systems and update merchant terminal compatibility', 0.78]
    ];

    for (const resolution of pendingResolutions) {
      await connection.execute(`
        INSERT IGNORE INTO pending_resolutions 
        (id, pending_issue_id, resolution_text, confidence_score)
        VALUES (?, ?, ?, ?)
      `, resolution);
    }

    // Insert original sample feedback data
    console.log('Inserting sample feedback data...');
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
    
    console.log('Enhanced database initialization completed successfully!');
    console.log(`Database: ${DATABASE_NAME}`);
    console.log('All tables created with sample data:');
    console.log('- feedback (main feedback data)');
    console.log('- bank_employees (employee master data)');
    console.log('- issues (standardized issue tracking)');
    console.log('- pending_issues (AI-detected issues)');
    console.log('- pending_resolutions (AI-suggested resolutions)');
    console.log('- rejected_issues (audit trail)');
    console.log('- feedback_resolutions (detailed resolution tracking)');
    console.log('- employee_feedback_interactions (employee performance)');
    console.log('- feedback_issues (feedback-issue linking)');
    
  } catch (error) {
    console.error('Error initializing enhanced database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the initialization
initializeDatabase();
