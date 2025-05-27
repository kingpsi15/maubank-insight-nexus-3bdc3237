
// Main export file for all database services
export { supabase } from '@/integrations/supabase/client';
export type { 
  Feedback, 
  Issue, 
  PendingIssue, 
  PendingResolution, 
  RejectedIssue, 
  BankEmployee, 
  EmployeeFeedbackInteraction,
  FeedbackIssue 
} from './types';
export { feedbackService } from './feedbackService';
export { issueService } from './issueService';
export { analyticsService } from './analyticsService';
export { employeeService } from './employeeService';
export { pendingIssueService } from './pendingIssueService';
