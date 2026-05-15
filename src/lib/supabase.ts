import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhbiafoyhvmvyyzwdzhd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmlhZm95aHZtdnl5endkemhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTk0MzEsImV4cCI6MjA2NDk3NTQzMX0.TFXb4-2xDydDVTPHIerDYNq7jFk4FoEZWmUxEjszFhE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
