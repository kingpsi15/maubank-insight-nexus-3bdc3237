
// Database types
export interface Feedback {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_type: 'ATM' | 'OnlineBanking' | 'CoreBanking';
  review_text: string;
  review_rating: number;
  issue_location?: string;
  contacted_bank_person?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'escalated';
  sentiment: 'positive' | 'negative' | 'neutral';
  detected_issues: string[];
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  resolution: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence_score?: number;
  feedback_count: number;
  approved_by?: string;
  approved_date?: string;
  created_at: string;
  updated_at: string;
}
