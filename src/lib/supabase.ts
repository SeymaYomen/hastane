import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase bağlantı bilgileri eksik. Lütfen .env dosyasını kontrol edin.');
}

// Create Supabase client with additional options for better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  // Add retry configuration for better reliability
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enhanced connection test function
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Using anon key:', supabaseAnonKey ? 'Yes' : 'No');
    
    // Test with a simple query that should work even with empty tables
    const { data, error } = await supabase
      .from('doctors')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Supabase connection successful');
    return { success: true, data };
  } catch (err) {
    console.error('Supabase connection error:', err);
    
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      const errorMsg = `
Network connection failed. Please check:
1. Internet connection is stable
2. Supabase project is active and running
3. CORS settings allow localhost:5173
4. Supabase URL and API key are correct
5. No firewall blocking the connection

Current Supabase URL: ${supabaseUrl}
`;
      console.error(errorMsg);
      return { success: false, error: 'Network connection failed' };
    }
    
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};
