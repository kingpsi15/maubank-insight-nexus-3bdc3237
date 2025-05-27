
import { supabase, isDemoMode } from './supabase';

// Table creation functions
const createTables = async () => {
  if (isDemoMode) {
    console.log('Demo mode: skipping table creation');
    return;
  }

  try {
    // Create feedback table
    const feedbackTableSQL = `
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_email TEXT,
        service_type TEXT CHECK (service_type IN ('ATM', 'OnlineBanking', 'CoreBanking')),
        review_text TEXT NOT NULL,
        review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
        issue_location TEXT,
        contacted_bank_person TEXT,
        status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'escalated')),
        sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
        detected_issues TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Create issues table
    const issuesTableSQL = `
      CREATE TABLE IF NOT EXISTS issues (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        resolution TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        confidence_score DECIMAL,
        feedback_count INTEGER DEFAULT 0,
        approved_by TEXT,
        approved_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Execute table creation
    const { error: feedbackError } = await supabase.rpc('exec_sql', { sql: feedbackTableSQL });
    if (feedbackError) {
      console.log('Feedback table creation result:', feedbackError);
    }

    const { error: issuesError } = await supabase.rpc('exec_sql', { sql: issuesTableSQL });
    if (issuesError) {
      console.log('Issues table creation result:', issuesError);
    }

    console.log('Tables creation completed');
  } catch (error) {
    console.log('Table creation not available, tables may need to be created manually in Supabase dashboard');
  }
};

// Initialize tables when module loads
if (!isDemoMode) {
  createTables();
}
