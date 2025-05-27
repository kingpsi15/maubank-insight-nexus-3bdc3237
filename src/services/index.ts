
// Main export file for all database services
export { supabase, isDemoMode } from './supabase';
export type { Feedback, Issue } from './types';
export { feedbackService } from './feedbackService';
export { issueService } from './issueService';
export { analyticsService } from './analyticsService';

// Initialize table setup
import './tableSetup';
