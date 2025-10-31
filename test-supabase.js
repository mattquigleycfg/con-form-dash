// Quick Supabase Connection Test
// Run with: node test-supabase.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env file
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Testing Supabase Connection\n');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 20)}...` : 'MISSING');
console.log('');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   VITE_SUPABASE_PUBLISHABLE_KEY:', SUPABASE_KEY ? '✅' : '❌');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Testing connection...\n');

// Test auth endpoint
try {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.message.includes('Invalid API key') || error.message.includes('401')) {
      console.error('\n🔑 API Key Issue:');
      console.error('   The anon/public key appears to be invalid or expired.');
      console.error('   Get the correct key from:');
      console.error('   https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj/settings/api');
    }
  } else {
    console.log('✅ Successfully connected to Supabase!');
    console.log('   Session:', data.session ? 'Active' : 'No active session (normal)');
    console.log('\n✅ Your Supabase credentials are working correctly!');
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
}

