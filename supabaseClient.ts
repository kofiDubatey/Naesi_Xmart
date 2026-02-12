
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsbbjdehjjckybkihiqk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYmJqZGVoampja3lia2loaXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzYyODcsImV4cCI6MjA4NjMxMjI4N30.UAYia0rIbYBCXFBq36t-rTQh3h_IoLima0HVkKUGRCM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
