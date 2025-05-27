
// Main export file for all database services
export { supabase } from '@/integrations/supabase/client';
export type { Feedback, Issue } from './types';
export { feedbackService } from './feedbackService';
export { issueService } from './issueService';
export { analyticsService } from './analyticsService';
