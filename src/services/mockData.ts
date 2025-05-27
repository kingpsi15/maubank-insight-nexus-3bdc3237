
import { Feedback } from './types';

// Mock data for demo mode
export const mockFeedback: Feedback[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    service_type: 'ATM' as const,
    review_text: 'ATM was out of order',
    review_rating: 2,
    issue_location: 'Kuala Lumpur',
    status: 'new' as const,
    sentiment: 'negative' as const,
    detected_issues: ['Hardware Issue'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_email: 'jane@example.com',
    service_type: 'OnlineBanking' as const,
    review_text: 'Great online banking experience',
    review_rating: 5,
    issue_location: 'Selangor',
    status: 'resolved' as const,
    sentiment: 'positive' as const,
    detected_issues: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
