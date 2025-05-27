
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to demo mode if environment variables are not set
const demoUrl = 'https://demo.supabase.co';
const demoKey = 'demo-key';

export const supabase = createClient(
  supabaseUrl || demoUrl, 
  supabaseKey || demoKey
);

// Check if we're in demo mode
export const isDemoMode = !supabaseUrl || !supabaseKey;
