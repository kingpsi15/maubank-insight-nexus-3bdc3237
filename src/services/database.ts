
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'password', // Update with your MySQL password
  database: 'maubank_voc',
  charset: 'utf8mb4'
};

// Create database connection
export const createConnection = async () => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

// Initialize database and create tables
export const initializeDatabase = async () => {
  try {
    // First connect without database to create it
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    // Connect to the database
    const connection = await createConnection();

    // Create all tables
    await createTables(connection);
    
    await connection.end();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const createTables = async (connection: mysql.Connection) => {
  // Customer Feedback table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      customer_id VARCHAR(50),
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(20),
      customer_email VARCHAR(255),
      service_type ENUM('ATM', 'OnlineBanking', 'CoreBanking') NOT NULL,
      review_text TEXT NOT NULL,
      review_rating INT NOT NULL CHECK (review_rating >= 0 AND review_rating <= 5),
      issue_location VARCHAR(255),
      contacted_bank_person VARCHAR(255),
      positive_flag BOOLEAN,
      negative_flag BOOLEAN,
      sentiment ENUM('positive', 'negative', 'neutral'),
      detected_issues JSON,
      status ENUM('new', 'in_progress', 'resolved', 'escalated') DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_service_type (service_type),
      INDEX idx_sentiment (sentiment),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    )
  `);

  // Issues table (approved issues)
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      resolution TEXT,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
      confidence_score DECIMAL(3,2),
      feedback_count INT DEFAULT 0,
      approved_by VARCHAR(255),
      approved_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_category (category)
    )
  `);

  // Pending Issues table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS pending_issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      confidence_score DECIMAL(3,2),
      feedback_count INT DEFAULT 1,
      detected_from_feedback_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (detected_from_feedback_id) REFERENCES feedback(id)
    )
  `);

  // Pending Resolutions table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS pending_resolutions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pending_issue_id INT,
      resolution_text TEXT NOT NULL,
      confidence_score DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pending_issue_id) REFERENCES pending_issues(id) ON DELETE CASCADE
    )
  `);

  // Rejected Issues table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS rejected_issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      original_title VARCHAR(255) NOT NULL,
      original_description TEXT,
      category VARCHAR(100),
      rejection_reason TEXT,
      rejected_by VARCHAR(255),
      rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      original_pending_issue_id INT
    )
  `);

  // Feedback Issues junction table (many-to-many)
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS feedback_issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      feedback_id INT,
      issue_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
      UNIQUE KEY unique_feedback_issue (feedback_id, issue_id)
    )
  `);

  // Bank Employees table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bank_employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      department VARCHAR(100),
      branch_location VARCHAR(255),
      role VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Employee Feedback Interactions table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS employee_feedback_interactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT,
      feedback_id INT,
      interaction_type ENUM('contacted', 'resolved', 'escalated') NOT NULL,
      interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (employee_id) REFERENCES bank_employees(id),
      FOREIGN KEY (feedback_id) REFERENCES feedback(id)
    )
  `);

  // Create triggers for sentiment calculation
  await connection.execute(`
    CREATE TRIGGER IF NOT EXISTS update_sentiment_flags
    BEFORE INSERT ON feedback
    FOR EACH ROW
    BEGIN
      SET NEW.positive_flag = (NEW.review_rating >= 4);
      SET NEW.negative_flag = (NEW.review_rating <= 3 AND NEW.review_rating > 0);
      
      IF NEW.review_rating >= 4 THEN
        SET NEW.sentiment = 'positive';
      ELSEIF NEW.review_rating <= 3 AND NEW.review_rating > 0 THEN
        SET NEW.sentiment = 'negative';
      ELSE
        SET NEW.sentiment = 'neutral';
      END IF;
    END
  `);

  await connection.execute(`
    CREATE TRIGGER IF NOT EXISTS update_sentiment_flags_update
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    BEGIN
      SET NEW.positive_flag = (NEW.review_rating >= 4);
      SET NEW.negative_flag = (NEW.review_rating <= 3 AND NEW.review_rating > 0);
      
      IF NEW.review_rating >= 4 THEN
        SET NEW.sentiment = 'positive';
      ELSEIF NEW.review_rating <= 3 AND NEW.review_rating > 0 THEN
        SET NEW.sentiment = 'negative';
      ELSE
        SET NEW.sentiment = 'neutral';
      END IF;
    END
  `);

  console.log('All tables created successfully');
};

// Seed initial data
export const seedInitialData = async () => {
  const connection = await createConnection();
  
  try {
    // Insert sample bank employees
    await connection.execute(`
      INSERT IGNORE INTO bank_employees (employee_id, name, department, branch_location, role) VALUES
      ('EMP001', 'Ahmad Rahman', 'Customer Service', 'Kuala Lumpur', 'Senior Manager'),
      ('EMP002', 'Siti Nurhaliza', 'IT Support', 'Selangor', 'Technical Lead'),
      ('EMP003', 'Raj Kumar', 'Operations', 'Penang', 'Operations Manager'),
      ('EMP004', 'Fatimah Ali', 'Customer Service', 'Johor Bahru', 'Service Representative'),
      ('EMP005', 'Wong Wei Ming', 'IT Support', 'Kuala Lumpur', 'Developer')
    `);

    // Insert sample approved issues
    await connection.execute(`
      INSERT IGNORE INTO issues (title, description, category, resolution, status, feedback_count, approved_by, approved_date) VALUES
      ('ATM Transaction Timeout', 'ATM takes too long to process transactions', 'ATM', 'Upgrade ATM software and increase processing speed', 'approved', 45, 'Ahmad Rahman', NOW()),
      ('Card Stuck in ATM', 'Customer cards getting stuck in ATM machines', 'ATM', 'Regular maintenance of card reader mechanisms', 'approved', 23, 'Ahmad Rahman', NOW()),
      ('Online Banking Login Issues', 'Customers unable to login to online banking', 'OnlineBanking', 'Implement robust authentication system and clear error messages', 'approved', 67, 'Siti Nurhaliza', NOW()),
      ('Mobile App Crashes', 'Mobile banking app crashes during transactions', 'OnlineBanking', 'Update mobile app with bug fixes and performance improvements', 'approved', 34, 'Siti Nurhaliza', NOW()),
      ('Account Balance Discrepancy', 'Incorrect account balance displayed', 'CoreBanking', 'Synchronize all systems and implement real-time balance updates', 'approved', 12, 'Raj Kumar', NOW()),
      ('Transfer Delays', 'Inter-bank transfers taking longer than expected', 'CoreBanking', 'Optimize transfer processing and provide real-time status updates', 'approved', 28, 'Raj Kumar', NOW())
    `);

    // Insert sample feedback data
    await connection.execute(`
      INSERT IGNORE INTO feedback (customer_name, customer_email, customer_phone, service_type, review_text, review_rating, issue_location, contacted_bank_person, detected_issues) VALUES
      ('John Doe', 'john@email.com', '+60123456789', 'ATM', 'ATM was very slow today, took 5 minutes to withdraw cash', 2, 'Kuala Lumpur', 'Ahmad Rahman', '["ATM Transaction Timeout"]'),
      ('Mary Tan', 'mary@email.com', '+60198765432', 'OnlineBanking', 'Cannot login to my account, getting error messages', 1, 'Selangor', 'Siti Nurhaliza', '["Online Banking Login Issues"]'),
      ('David Lim', 'david@email.com', '+60112233445', 'CoreBanking', 'My account balance is showing wrong amount', 2, 'Penang', 'Raj Kumar', '["Account Balance Discrepancy"]'),
      ('Sarah Ahmad', 'sarah@email.com', '+60156789012', 'ATM', 'Great service, ATM was fast and efficient', 5, 'Johor Bahru', 'Fatimah Ali', '[]'),
      ('Robert Chen', 'robert@email.com', '+60134567890', 'OnlineBanking', 'Excellent online banking experience, very user friendly', 4, 'Melaka', 'Wong Wei Ming', '[]'),
      ('Lisa Wong', 'lisa@email.com', '+60145678901', 'ATM', 'My card got stuck in the ATM machine', 1, 'Kuala Lumpur', 'Ahmad Rahman', '["Card Stuck in ATM"]'),
      ('Ali Hassan', 'ali@email.com', '+60167890123', 'CoreBanking', 'Transfer took too long to process', 2, 'Selangor', 'Raj Kumar', '["Transfer Delays"]'),
      ('Emma Johnson', 'emma@email.com', '+60178901234', 'OnlineBanking', 'Mobile app keeps crashing during payment', 2, 'Penang', 'Siti Nurhaliza', '["Mobile App Crashes"]'),
      ('Kumar Selvam', 'kumar@email.com', '+60189012345', 'ATM', 'Very satisfied with the ATM service', 4, 'Johor Bahru', 'Fatimah Ali', '[]'),
      ('Mei Lin', 'meilin@email.com', '+60190123456', 'CoreBanking', 'Good banking service overall', 4, 'Melaka', 'Wong Wei Ming', '[]')
    `);

    console.log('Initial data seeded successfully');
  } finally {
    await connection.end();
  }
};
